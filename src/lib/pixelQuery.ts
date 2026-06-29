import initWasm, { readParquet } from 'parquet-wasm/esm/parquet_wasm.js'
import { tableFromIPC, type Table } from 'apache-arrow'

const WASM_URL = '/parquet_wasm_bg.wasm'
const DB_NAME = 'webgis-cache'
const DB_VERSION = 1
const CACHE_PREFIX = 'parquet-'
const CACHE_VERSION = 2
const SEASONS = ['ANNUAL', 'DJF', 'MAM', 'JJA', 'SON']

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('parquet')) {
        db.createObjectStore('parquet')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function cacheGet(key: string): Promise<Uint8Array | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('parquet', 'readonly')
      const req = tx.objectStore('parquet').get(key)
      req.onsuccess = () => { resolve(req.result || null); db.close() }
      req.onerror = () => { db.close(); reject(null) }
    })
  } catch { return null }
}

async function cacheSet(key: string, data: Uint8Array): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('parquet', 'readwrite')
      tx.objectStore('parquet').put(data, key)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject() }
    })
  } catch { /* ignore */ }
}

function cacheKey(experiment: string, model: string, season: string): string {
  return `${CACHE_PREFIX}v${CACHE_VERSION}-${experiment}-${model}-${season.toLowerCase()}`
}

const HEIGHTS = [10, 50, 100, 150, 200]

function safeArray(v: unknown): number[] {
  if (v === null || v === undefined) return []
  if (Array.isArray(v)) return v.map(x => x == null ? 0 : Number(x))
  if (ArrayBuffer.isView(v)) return Array.from(v as ArrayLike<number>, x => Number(x))
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p.map(x => Number(x)) : [] } catch { return [] }
  }
  if (v && typeof v === 'object' && 'toArray' in v && typeof (v as any).toArray === 'function') {
    return safeArray((v as any).toArray())
  }
  if (typeof v === 'number' || typeof v === 'bigint') return [Number(v)]
  return []
}

function safeObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object') return v as Record<string, unknown>
  return {}
}

export interface HeightStats {
  mean: number | null; min: number | null; max: number | null; std: number | null
}

export interface PixelDataSummary {
  pixel_id: number
  lat: number
  lon: number
  state: string
  bathy_zone: string
  distance_nm: number
  ws: Record<number, HeightStats>
  wpd: Record<number, HeightStats>
  profile_heights: number[]
  profile_means: number[]
  wpd_profile_means: number[]
  weibull: Record<number, { k: number; c: number } | null>
}

interface RawWeibull { k: number; c: number }
interface RawWindRose { freq: number; mean_ws: number }

interface RawPixel {
  [key: string]: unknown
  pixel_id: number
  lat: number
  lon: number
  state: string
  bathy_zone: string
  distance_nm: number
  profile_heights: number[]
  profile_means: number[]
  wpd_profile_means: number[]
  weibull_10: RawWeibull | null
  weibull_50: RawWeibull | null
  weibull_100: RawWeibull | null
  weibull_150: RawWeibull | null
  weibull_200: RawWeibull | null
}

export interface SeasonalStats {
  season: string
  ws10_mean: number | null; ws10_min: number | null; ws10_max: number | null; ws10_std: number | null
  ws50_mean: number | null; ws50_min: number | null; ws50_max: number | null; ws50_std: number | null
  ws100_mean: number | null; ws100_min: number | null; ws100_max: number | null; ws100_std: number | null
  ws150_mean: number | null; ws150_min: number | null; ws150_max: number | null; ws150_std: number | null
  ws200_mean: number | null; ws200_min: number | null; ws200_max: number | null; ws200_std: number | null
  wpd10_mean: number | null; wpd10_min: number | null; wpd10_max: number | null; wpd10_std: number | null
  wpd50_mean: number | null; wpd50_min: number | null; wpd50_max: number | null; wpd50_std: number | null
  wpd100_mean: number | null; wpd100_min: number | null; wpd100_max: number | null; wpd100_std: number | null
  wpd150_mean: number | null; wpd150_min: number | null; wpd150_max: number | null; wpd150_std: number | null
  wpd200_mean: number | null; wpd200_min: number | null; wpd200_max: number | null; wpd200_std: number | null
}

export interface DashboardLocationData {
  pixel_id: number
  lat: number
  lon: number
  state: string
  bathy_zone: string
  distance_nm: number
  seasons: SeasonalStats[]
  profile_heights: number[]
  profile_means: number[]
  wpd_profile_means: number[]
  weibull: Record<number, { k: number; c: number } | null>
  wind_rose: Record<number, Record<string, { freq: number; mean_ws: number }> | null>
  heatmap: Record<string, number[] | null>
}

let records: RawPixel[] = []
let loaded = false
let loading: Promise<void> | null = null
let currentExperiment = ''
let currentModel = 'wrf'
let allSeasonMap: Map<number, Map<string, Record<string, unknown>>> | null = null
let loadedSeasons = new Set<string>()
let loadGen = 0

function parquetUrl(experiment: string, season: string, model: string = 'wrf'): string {
  return `/data/geoparquet/${model}/${experiment.toLowerCase()}/season=${season.toLowerCase()}/data.parquet`
}

async function fetchAndParseParquet(url: string, cacheKey: string): Promise<Table> {
  let buf: Uint8Array | null = await cacheGet(cacheKey)
  if (!buf) {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`Failed to fetch parquet: ${resp.status} ${resp.statusText}`)
    buf = new Uint8Array(await resp.arrayBuffer())
    cacheSet(cacheKey, buf)
  }
  const wasmTable = readParquet(buf)
  return tableFromIPC(wasmTable.intoIPCStream())
}

async function loadSeasonData(experiment: string, season: string, model: string): Promise<void> {
  if (loadedSeasons.has(season)) return
  const ck = cacheKey(experiment, model, season)
  const url = parquetUrl(experiment, season, model)
  const arrowTable = await fetchAndParseParquet(url, ck)

  for (let i = 0; i < arrowTable.numRows; i++) {
    const row = arrowTable.get(i)
    if (!row) continue
    const pixel_id = Number(row.pixel_id as number | bigint)
    if (!allSeasonMap) continue
    if (!allSeasonMap.has(pixel_id)) continue
    const sm = allSeasonMap.get(pixel_id)!
    const raw: Record<string, unknown> = {}
    for (const key of Object.keys(row)) {
      raw[key] = (row as Record<string, unknown>)[key]
    }
    sm.set(season, raw)
  }
  loadedSeasons.add(season)
}

export async function loadParquet(experiment: string = 'ERA5_atlas', model: string = 'wrf'): Promise<void> {
  const myGen = ++loadGen
  if (myGen !== loadGen) return

  if (loaded && currentExperiment === experiment && currentModel === model && loadedSeasons.has('ANNUAL')) return
  if (loading) return loading

  loading = (async () => {
    try {
      await initWasm(WASM_URL)
    } catch (e) {
      console.warn('initWasm failed:', e)
      throw e
    }

    const ck = cacheKey(experiment, model, 'annual')
    const url = parquetUrl(experiment, 'annual', model)
    const arrowTable = await fetchAndParseParquet(url, ck)

    const recordsMap = new Map<number, RawPixel>()
    const seasonMap = new Map<number, Map<string, Record<string, unknown>>>()

    for (let i = 0; i < arrowTable.numRows; i++) {
      const row = arrowTable.get(i)
      if (!row) continue
      const pixel_id = Number(row.pixel_id as number | bigint)
      const season = String(row.season || 'ANNUAL')

      if (!seasonMap.has(pixel_id)) seasonMap.set(pixel_id, new Map())
      const raw: Record<string, unknown> = {}
      for (const key of Object.keys(row)) {
        raw[key] = (row as Record<string, unknown>)[key]
      }
      seasonMap.get(pixel_id)!.set(season, raw)

      if (!recordsMap.has(pixel_id)) {
        recordsMap.set(pixel_id, {
          pixel_id,
          lat: Number(row.lat),
          lon: Number(row.lon),
          state: String(row.state ?? ''),
          bathy_zone: String(row.bathy_zone ?? ''),
          distance_nm: Number(row.distance_nm ?? 0),
          profile_heights: safeArray(row.profile_heights),
          profile_means: safeArray(row.profile_means),
          wpd_profile_means: safeArray(row.wpd_profile_means),
          weibull_10: null, weibull_50: null, weibull_100: null, weibull_150: null, weibull_200: null,
        })
      }

      const p = recordsMap.get(pixel_id)!
      if (season === 'ANNUAL') {
        p.weibull_10 = row.weibull_10 ? (row.weibull_10 as any as RawWeibull) : null
        p.weibull_50 = row.weibull_50 ? (row.weibull_50 as any as RawWeibull) : null
        p.weibull_100 = row.weibull_100 ? (row.weibull_100 as any as RawWeibull) : null
        p.weibull_150 = row.weibull_150 ? (row.weibull_150 as any as RawWeibull) : null
        p.weibull_200 = row.weibull_200 ? (row.weibull_200 as any as RawWeibull) : null
        p.profile_heights = safeArray(row.profile_heights)
        p.profile_means = safeArray(row.profile_means)
        p.wpd_profile_means = safeArray(row.wpd_profile_means)
      }
    }

    records = Array.from(recordsMap.values())
    allSeasonMap = seasonMap
    loaded = true
    loadedSeasons = new Set(['ANNUAL'])
    currentExperiment = experiment
    currentModel = model
    console.log(`PixelQuery: loaded ${records.length} pixels (ANNUAL) for ${experiment} (${model})`)
  })().catch((e: unknown) => {
    console.error('PixelQuery load failed:', e)
    loaded = false
    currentExperiment = ''
    loading = null
    loadedSeasons = new Set()
  })
  return loading
}

export async function ensureSeasonalLoaded(): Promise<void> {
  if (!loaded || !currentExperiment || !currentModel) return
  const needed = SEASONS.filter(s => s !== 'ANNUAL' && !loadedSeasons.has(s))
  if (needed.length === 0) return
  for (const s of needed) {
    try {
      await loadSeasonData(currentExperiment, s, currentModel)
    } catch (e) {
      console.warn(`PixelQuery: failed to load ${s} parquet:`, e)
    }
  }
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return isFinite(n) ? n : null
}

function buildHeightStats(row: Record<string, unknown>, prefix: string, height: number, season: string): HeightStats {
  return {
    mean: num(row[`${prefix}${height}_${season}_mean`]),
    min: num(row[`${prefix}${height}_${season}_min`]),
    max: num(row[`${prefix}${height}_${season}_max`]),
    std: num(row[`${prefix}${height}_${season}_std`]),
  }
}

function buildWeibullRecord(p: RawPixel): Record<number, { k: number; c: number } | null> {
  const w: Record<number, { k: number; c: number } | null> = {}
  for (const h of HEIGHTS) {
    const key = `weibull_${h}` as keyof RawPixel
    const v = p[key]
    w[h] = v ? (v as RawWeibull) : null
  }
  return w
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

  const annualRow = allSeasonMap?.get(best.pixel_id)?.get('ANNUAL')

  const ws: Record<number, HeightStats> = {}
  const wpd: Record<number, HeightStats> = {}
  if (annualRow) {
    for (const h of HEIGHTS) {
      ws[h] = buildHeightStats(annualRow, 'ws', h, 'ANNUAL')
      wpd[h] = buildHeightStats(annualRow, 'wpd', h, 'ANNUAL')
    }
  } else {
    for (const h of HEIGHTS) {
      ws[h] = { mean: null, min: null, max: null, std: null }
      wpd[h] = { mean: null, min: null, max: null, std: null }
    }
  }

  return {
    pixel_id: best.pixel_id,
    lat: best.lat,
    lon: best.lon,
    state: best.state,
    bathy_zone: best.bathy_zone,
    distance_nm: best.distance_nm,
    ws,
    wpd,
    profile_heights: safeArray(best.profile_heights),
    profile_means: safeArray(best.profile_means),
    wpd_profile_means: safeArray(best.wpd_profile_means),
    weibull: buildWeibullRecord(best),
  }
}

export async function queryDashboardLocation(lat: number, lon: number): Promise<DashboardLocationData | null> {
  if (records.length === 0) return null

  try {
    await ensureSeasonalLoaded()
  } catch (e) {
    console.warn('PixelQuery: ensureSeasonalLoaded failed:', e)
  }

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
      ws10_mean: num(row[`ws10_${s}_mean`]), ws10_min: num(row[`ws10_${s}_min`]),
      ws10_max: num(row[`ws10_${s}_max`]), ws10_std: num(row[`ws10_${s}_std`]),
      ws50_mean: num(row[`ws50_${s}_mean`]), ws50_min: num(row[`ws50_${s}_min`]),
      ws50_max: num(row[`ws50_${s}_max`]), ws50_std: num(row[`ws50_${s}_std`]),
      ws100_mean: num(row[`ws100_${s}_mean`]), ws100_min: num(row[`ws100_${s}_min`]),
      ws100_max: num(row[`ws100_${s}_max`]), ws100_std: num(row[`ws100_${s}_std`]),
      ws150_mean: num(row[`ws150_${s}_mean`]), ws150_min: num(row[`ws150_${s}_min`]),
      ws150_max: num(row[`ws150_${s}_max`]), ws150_std: num(row[`ws150_${s}_std`]),
      ws200_mean: num(row[`ws200_${s}_mean`]), ws200_min: num(row[`ws200_${s}_min`]),
      ws200_max: num(row[`ws200_${s}_max`]), ws200_std: num(row[`ws200_${s}_std`]),
      wpd10_mean: num(row[`wpd10_${s}_mean`]), wpd10_min: num(row[`wpd10_${s}_min`]),
      wpd10_max: num(row[`wpd10_${s}_max`]), wpd10_std: num(row[`wpd10_${s}_std`]),
      wpd50_mean: num(row[`wpd50_${s}_mean`]), wpd50_min: num(row[`wpd50_${s}_min`]),
      wpd50_max: num(row[`wpd50_${s}_max`]), wpd50_std: num(row[`wpd50_${s}_std`]),
      wpd100_mean: num(row[`wpd100_${s}_mean`]), wpd100_min: num(row[`wpd100_${s}_min`]),
      wpd100_max: num(row[`wpd100_${s}_max`]), wpd100_std: num(row[`wpd100_${s}_std`]),
      wpd150_mean: num(row[`wpd150_${s}_mean`]), wpd150_min: num(row[`wpd150_${s}_min`]),
      wpd150_max: num(row[`wpd150_${s}_max`]), wpd150_std: num(row[`wpd150_${s}_std`]),
      wpd200_mean: num(row[`wpd200_${s}_mean`]), wpd200_min: num(row[`wpd200_${s}_min`]),
      wpd200_max: num(row[`wpd200_${s}_max`]), wpd200_std: num(row[`wpd200_${s}_std`]),
    })
  }

  const annualRow = seasonRows.get('ANNUAL')
  const windRose: Record<number, Record<string, { freq: number; mean_ws: number }> | null> = {}
  const heatmap: Record<string, number[] | null> = {}
  if (annualRow) {
    for (const h of HEIGHTS) {
      const wrKey = `wind_rose_${h}`
      windRose[h] = annualRow[wrKey]
        ? (annualRow[wrKey] as any as Record<string, { freq: number; mean_ws: number }>)
        : null
    }
    for (const h of HEIGHTS) {
      for (const prefix of ['ws', 'wpd']) {
        const hmKey = `${prefix}${h}_heatmap`
        heatmap[hmKey] = safeArray(annualRow[hmKey])
      }
    }
  }

  return {
    pixel_id: best.pixel_id,
    lat: best.lat,
    lon: best.lon,
    state: best.state,
    bathy_zone: best.bathy_zone,
    distance_nm: best.distance_nm,
    seasons,
    profile_heights: safeArray(annualRow?.profile_heights ?? best.profile_heights),
    profile_means: safeArray(annualRow?.profile_means ?? best.profile_means),
    wpd_profile_means: safeArray(annualRow?.wpd_profile_means ?? best.wpd_profile_means),
    weibull: buildWeibullRecord(best),
    wind_rose: windRose,
    heatmap,
  }
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
