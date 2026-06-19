import initWasm, { readParquet } from 'parquet-wasm/esm/parquet_wasm.js'
import { tableFromIPC, type Table } from 'apache-arrow'

const WASM_URL = '/parquet_wasm_bg.wasm'

function safeArray(v: unknown): number[] {
  if (Array.isArray(v)) return v as number[]
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  if (v === null || v === undefined) return []
  if (typeof v === 'number' || typeof v === 'bigint') return [Number(v)]
  return []
}

export interface PixelDataSummary {
  pixel_id: number
  lat: number
  lon: number
  state: string
  bathy_zone: string
  ws100: { mean: number | null; min: number | null; max: number | null; std: number | null }
  ws10: { mean: number | null; min: number | null; max: number | null; std: number | null }
  profile_heights: number[]
  profile_means: number[]
  weibull: { k_10m: number | null; c_10m: number | null; k_100m: number | null; c_100m: number | null } | null
}

interface RawPixel {
  pixel_id: number
  lat: number
  lon: number
  state: string
  bathy_zone: string
  ws100_ANNUAL_mean: number | null
  ws100_ANNUAL_min: number | null
  ws100_ANNUAL_max: number | null
  ws100_ANNUAL_std: number | null
  ws10_ANNUAL_mean: number | null
  ws10_ANNUAL_min: number | null
  ws10_ANNUAL_max: number | null
  ws10_ANNUAL_std: number | null
  profile_heights: number[]
  profile_means: number[]
  weibull_10m: { k: number; c: number } | null
  weibull_100m: { k: number; c: number } | null
}

export interface SeasonalStats {
  season: string
  ws10_mean: number | null
  ws10_min: number | null
  ws10_max: number | null
  ws10_std: number | null
  ws100_mean: number | null
  ws100_min: number | null
  ws100_max: number | null
  ws100_std: number | null
}

export interface DashboardLocationData {
  pixel_id: number
  lat: number
  lon: number
  state: string
  bathy_zone: string
  seasons: SeasonalStats[]
  profile_heights: number[]
  profile_means: number[]
  weibull_10m: { k: number; c: number } | null
  weibull_100m: { k: number; c: number } | null
  wind_rose: Record<string, { freq: number; mean_ws: number }> | null
}

const SEASONS = ['ANNUAL', 'DJF', 'MAM', 'JJA', 'SON']

let records: RawPixel[] = []
let loaded = false
let loading: Promise<void> | null = null
let currentExperiment = ''
let allSeasonMap: Map<number, Map<string, Record<string, unknown>>> | null = null

function parquetUrl(experiment: string): string {
  return `/data/geoparquet/wrf/${experiment.toLowerCase()}/all_seasons.parquet`
}

export async function loadParquet(experiment: string = 'ERA5_atlas'): Promise<void> {
  if (loaded && currentExperiment === experiment) return
  loaded = false
  loading = null
  currentExperiment = ''
  allSeasonMap = null
  if (loading) return loading
  loading = (async () => {
    const url = parquetUrl(experiment)
    try {
      await initWasm(WASM_URL)
    } catch (e) {
      console.warn('initWasm failed:', e)
      throw e
    }
    const resp = await fetch(url)
    if (!resp.ok) {
      throw new Error(`Failed to fetch parquet: ${resp.status} ${resp.statusText}`)
    }
    const buf = new Uint8Array(await resp.arrayBuffer())
    const wasmTable = readParquet(buf)
    const arrowTable = tableFromIPC(wasmTable.intoIPCStream())

    const recordsMap = new Map<number, RawPixel>()
    const seasonMap = new Map<number, Map<string, Record<string, unknown>>>()

    for (let i = 0; i < arrowTable.numRows; i++) {
      const row = arrowTable.get(i)
      if (!row) continue
      const pixel_id = (row.pixel_id as number | bigint)
      const id = Number(pixel_id)
      const season = String(row.season || '')

      // Build per-season map
      if (!seasonMap.has(id)) seasonMap.set(id, new Map())
      const raw: Record<string, unknown> = {}
      for (const key of Object.keys(row)) {
        raw[key] = (row as Record<string, unknown>)[key]
      }
      seasonMap.get(id)!.set(season, raw)

      if (!recordsMap.has(id)) {
        const lat = Number(row.lat)
        const lon = Number(row.lon)
        recordsMap.set(id, {
          pixel_id: id, lat, lon,
          state: String(row.state ?? ''),
          bathy_zone: String(row.bathy_zone ?? ''),
          ws100_ANNUAL_mean: null,
          ws100_ANNUAL_min: null,
          ws100_ANNUAL_max: null,
          ws100_ANNUAL_std: null,
          ws10_ANNUAL_mean: null,
          ws10_ANNUAL_min: null,
          ws10_ANNUAL_max: null,
          ws10_ANNUAL_std: null,
          profile_heights: [],
          profile_means: [],
          weibull_10m: null,
          weibull_100m: null,
        })
      }

      const p = recordsMap.get(id)!
      if (season === 'ANNUAL') {
        p.ws100_ANNUAL_mean = Number(row.ws100_ANNUAL_mean ?? null)
        p.ws100_ANNUAL_min = Number(row.ws100_ANNUAL_min ?? null)
        p.ws100_ANNUAL_max = Number(row.ws100_ANNUAL_max ?? null)
        p.ws100_ANNUAL_std = Number(row.ws100_ANNUAL_std ?? null)
        p.ws10_ANNUAL_mean = Number(row.ws10_ANNUAL_mean ?? null)
        p.ws10_ANNUAL_min = Number(row.ws10_ANNUAL_min ?? null)
        p.ws10_ANNUAL_max = Number(row.ws10_ANNUAL_max ?? null)
        p.ws10_ANNUAL_std = Number(row.ws10_ANNUAL_std ?? null)
        p.weibull_10m = row.weibull_10m ? (row.weibull_10m as any as { k: number; c: number }) : null
        p.weibull_100m = row.weibull_100m ? (row.weibull_100m as any as { k: number; c: number }) : null
        p.profile_heights = safeArray(row.profile_heights)
        p.profile_means = safeArray(row.profile_means)
      }
    }

    records = Array.from(recordsMap.values())
    allSeasonMap = seasonMap
    loaded = true
    currentExperiment = experiment
    console.log(`PixelQuery: loaded ${records.length} pixels, ${seasonMap.size} seasonal maps for ${experiment}`)
  })().catch((e: unknown) => {
    console.error('PixelQuery load failed:', e)
    loaded = false
    currentExperiment = ''
    loading = null
  })
  return loading
}

export function queryNearest(lat: number, lon: number): PixelDataSummary | null {
  if (records.length === 0) return null
  let best: RawPixel | null = null
  let bestDist = Infinity
  for (const r of records) {
    const dlat = r.lat - lat
    const dlon = r.lon - lon
    const dist = dlat * dlat + dlon * dlon
    if (dist < bestDist) {
      bestDist = dist
      best = r
    }
  }
  if (!best) return null

  const weibull = best.weibull_10m || best.weibull_100m
    ? { k_10m: best.weibull_10m?.k ?? null, c_10m: best.weibull_10m?.c ?? null, k_100m: best.weibull_100m?.k ?? null, c_100m: best.weibull_100m?.c ?? null }
    : null

  return {
    pixel_id: best.pixel_id,
    lat: best.lat,
    lon: best.lon,
    state: best.state,
    bathy_zone: best.bathy_zone,
    ws100: {
      mean: best.ws100_ANNUAL_mean,
      min: best.ws100_ANNUAL_min,
      max: best.ws100_ANNUAL_max,
      std: best.ws100_ANNUAL_std,
    },
    ws10: {
      mean: best.ws10_ANNUAL_mean,
      min: best.ws10_ANNUAL_min,
      max: best.ws10_ANNUAL_max,
      std: best.ws10_ANNUAL_std,
    },
    profile_heights: safeArray(best.profile_heights),
    profile_means: safeArray(best.profile_means),
    weibull,
  }
}

export function queryDashboardLocation(lat: number, lon: number): DashboardLocationData | null {
  if (records.length === 0) return null
  if (!allSeasonMap) return null

  let best: RawPixel | null = null
  let bestDist = Infinity
  for (const r of records) {
    const dlat = r.lat - lat
    const dlon = r.lon - lon
    const dist = dlat * dlat + dlon * dlon
    if (dist < bestDist) {
      bestDist = dist
      best = r
    }
  }
  if (!best) return null

  const seasonRows = allSeasonMap.get(best.pixel_id)
  if (!seasonRows) return null

  const seasons: SeasonalStats[] = []
  for (const s of SEASONS) {
    const row = seasonRows.get(s)
    if (!row) continue
    seasons.push({
      season: s,
      ws10_mean: num(row.ws10_mean ?? row[`ws10_${s}_mean`]),
      ws10_min: num(row.ws10_min ?? row[`ws10_${s}_min`]),
      ws10_max: num(row.ws10_max ?? row[`ws10_${s}_max`]),
      ws10_std: num(row.ws10_std ?? row[`ws10_${s}_std`]),
      ws100_mean: num(row.ws100_mean ?? row[`ws100_${s}_mean`]),
      ws100_min: num(row.ws100_min ?? row[`ws100_${s}_min`]),
      ws100_max: num(row.ws100_max ?? row[`ws100_${s}_max`]),
      ws100_std: num(row.ws100_std ?? row[`ws100_${s}_std`]),
    })
  }

  const annualRow = seasonRows.get('ANNUAL')
  return {
    pixel_id: best.pixel_id,
    lat: best.lat,
    lon: best.lon,
    state: best.state,
    bathy_zone: best.bathy_zone,
    seasons,
    profile_heights: safeArray(annualRow?.profile_heights ?? best.profile_heights),
    profile_means: safeArray(annualRow?.profile_means ?? best.profile_means),
    weibull_10m: annualRow?.weibull_10m ? (annualRow.weibull_10m as any as { k: number; c: number }) : null,
    weibull_100m: annualRow?.weibull_100m ? (annualRow.weibull_100m as any as { k: number; c: number }) : null,
    wind_rose: annualRow?.wind_rose_100m ? (annualRow.wind_rose_100m as any as Record<string, { freq: number; mean_ws: number }>) : null,
  }
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return isFinite(n) ? n : null
}

export function isLoading(): boolean {
  return !loaded && loading !== null
}

export function queryPixelStat(
  pixelId: number,
  variable: string,
  height: number,
  season: string,
  stat: string,
): number | null {
  if (!allSeasonMap) return null
  const seasonRows = allSeasonMap.get(pixelId)
  if (!seasonRows) return null
  const row = seasonRows.get(season.toUpperCase())
  if (!row) return null
  const colName = `${variable}${height}_${season.toUpperCase()}_${stat}`
  const val = row[colName]
  if (val === null || val === undefined) return null
  const n = Number(val)
  return isFinite(n) ? n : null
}

export function queryPixelProfile(
  pixelId: number,
  variable: string,
): { heights: number[]; means: number[] } | null {
  if (!allSeasonMap) return null
  const seasonRows = allSeasonMap.get(pixelId)
  if (!seasonRows) return null
  const annualRow = seasonRows.get('ANNUAL')
  if (!annualRow) return null
  const heightsKey = `${variable}_profile_heights`
  const meansKey = `${variable}_profile_means`
  const heights = safeArray(annualRow[heightsKey] ?? annualRow['profile_heights'])
  const means = safeArray(annualRow[meansKey] ?? annualRow['profile_means'])
  if (heights.length === 0 || means.length === 0) return null
  return { heights, means }
}

export function isLoaded(): boolean {
  return loaded
}

export function getRecordCount(): number {
  return records.length
}
