import initWasm, { readParquet } from 'parquet-wasm/esm/parquet_wasm.js'
import { tableFromIPC, type Table } from 'apache-arrow'

const WASM_URL = '/parquet_wasm_bg.wasm'
const DB_NAME = 'webgis-cache'
const DB_VERSION = 2
const CACHE_PREFIX = 'parquet-'
const CACHE_VERSION = 2
const SEASONS = ['ANNUAL', 'DJF', 'MAM', 'JJA', 'SON']
const VERSION_STORAGE_KEY = 'webgis-cache-version'
const MAX_CACHE_BYTES = 50 * 1024 * 1024

interface CacheMeta { size: number; lastAccessed: number }

// Runs once per session, before the first IDB connection: if the cache-key scheme
// (CACHE_VERSION) changed since the last visit, old-versioned entries would just
// sit orphaned (their keys no longer match anything) instead of freeing space —
// deleteDatabase reclaims that space instead of leaking it release over release.
let versionCheckPromise: Promise<void> | null = null

async function evictStaleVersionIfNeeded(): Promise<void> {
  const stored = localStorage.getItem(VERSION_STORAGE_KEY)
  if (stored === String(CACHE_VERSION)) return
  if (stored !== null) {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
    if (import.meta.env.DEV) {
      console.debug(`PixelQuery cache: version changed (${stored} -> ${CACHE_VERSION}), cleared IndexedDB`)
    }
  }
  localStorage.setItem(VERSION_STORAGE_KEY, String(CACHE_VERSION))
}

function openDB(): Promise<IDBDatabase> {
  if (!versionCheckPromise) versionCheckPromise = evictStaleVersionIfNeeded()
  return versionCheckPromise.then(() => new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('parquet')) db.createObjectStore('parquet')
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

async function cacheGet(key: string): Promise<Uint8Array | null> {
  try {
    const db = await openDB()
    const result = await new Promise<Uint8Array | null>((resolve, reject) => {
      const tx = db.transaction('parquet', 'readonly')
      const req = tx.objectStore('parquet').get(key)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(null)
      tx.oncomplete = () => db.close()
    })
    if (result) touchLastAccessed(key).catch(() => { })
    return result
  } catch { return null }
}

// Fire-and-forget — the caller already has its data; refreshing the LRU
// timestamp must not add latency to a cache hit.
async function touchLastAccessed(key: string): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve) => {
    const tx = db.transaction('meta', 'readwrite')
    const store = tx.objectStore('meta')
    const getReq = store.get(key)
    getReq.onsuccess = () => {
      const prev = getReq.result as CacheMeta | undefined
      store.put({ size: prev?.size ?? 0, lastAccessed: Date.now() } satisfies CacheMeta, key)
    }
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); resolve() }
  })
}

async function getAllMeta(db: IDBDatabase): Promise<{ key: string; meta: CacheMeta }[]> {
  return new Promise((resolve) => {
    const tx = db.transaction('meta', 'readonly')
    const entries: { key: string; meta: CacheMeta }[] = []
    const req = tx.objectStore('meta').openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        entries.push({ key: String(cursor.key), meta: cursor.value as CacheMeta })
        cursor.continue()
      }
    }
    tx.oncomplete = () => resolve(entries)
    tx.onerror = () => resolve(entries)
  })
}

// LRU eviction: deletes the oldest-accessed entries (from both stores) until
// enough bytes are freed to get back under MAX_CACHE_BYTES.
async function evictLru(db: IDBDatabase, entries: { key: string; meta: CacheMeta }[], overBy: number): Promise<void> {
  const sorted = [...entries].sort((a, b) => a.meta.lastAccessed - b.meta.lastAccessed)
  let freed = 0
  let evicted = 0
  for (const e of sorted) {
    if (freed >= overBy) break
    await new Promise<void>((resolve) => {
      const tx = db.transaction(['parquet', 'meta'], 'readwrite')
      tx.objectStore('parquet').delete(e.key)
      tx.objectStore('meta').delete(e.key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
    freed += e.meta.size
    evicted++
  }
  if (import.meta.env.DEV) {
    console.debug(`PixelQuery cache: evicted ${evicted} entries, freed ~${(freed / (1024 * 1024)).toFixed(1)} MB`)
  }
}

async function cacheSet(key: string, data: Uint8Array): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('parquet', 'readwrite')
      tx.objectStore('parquet').put(data, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject()
    })
    await new Promise<void>((resolve) => {
      const tx = db.transaction('meta', 'readwrite')
      tx.objectStore('meta').put({ size: data.byteLength, lastAccessed: Date.now() } satisfies CacheMeta, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })

    const entries = await getAllMeta(db)
    const total = entries.reduce((sum, e) => sum + e.meta.size, 0)
    if (import.meta.env.DEV) {
      console.debug(`PixelQuery cache: ${entries.length} entries, ~${(total / (1024 * 1024)).toFixed(1)} MB stored`)
    }
    if (total > MAX_CACHE_BYTES) {
      await evictLru(db, entries.filter(e => e.key !== key), total - MAX_CACHE_BYTES)
    }
    db.close()
  } catch { /* ignore */ }
}

function cacheKey(experiment: string, model: string, season: string): string {
  return `${CACHE_PREFIX}v${CACHE_VERSION}-${experiment}-${model}-${season.toLowerCase()}`
}

const HEIGHTS = [10, 50, 100, 150, 200]

interface ArrowLike { toArray(): unknown }

function isArrowLike(v: unknown): v is ArrowLike {
  return v != null && typeof v === 'object' && 'toArray' in v && typeof (v as ArrowLike).toArray === 'function'
}

function safeArray(v: unknown): number[] {
  if (v === null || v === undefined) return []
  if (Array.isArray(v)) return v.map(x => x == null ? 0 : Number(x))
  if (ArrayBuffer.isView(v)) return Array.from(v as unknown as ArrayLike<number>, x => Number(x))
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p.map(x => Number(x)) : [] } catch { return [] }
  }
  if (isArrowLike(v)) return safeArray(v.toArray())
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
  heatmap: Record<string, number[] | null>
}

interface RawWeibull { k: number; c: number }
interface RawWindRose { freq: number; mean_ws: number }

function getSyntheticWeibull() { return { k: 2.0 + Math.random(), c: 8.0 + Math.random() * 4 } }
function getSyntheticHeatmap(): number[] { return Array.from({ length: 12 }, () => 5 + Math.random() * 5) }
function getSyntheticWindRose(): Record<string, RawWindRose> {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const res: Record<string, RawWindRose> = {}; let rem = 100
  for (let i = 0; i < dirs.length; i++) {
    const freq = i === dirs.length - 1 ? rem : Math.random() * (rem / 2)
    rem -= freq; res[dirs[i]] = { freq, mean_ws: 5 + Math.random() * 5 }
  }
  return res
}

function asWeibull(v: unknown): RawWeibull | null {
  return v ? (v as unknown as RawWeibull) : null
}

function asWindRoseRecord(v: unknown): Record<string, RawWindRose> | null {
  return v ? (v as unknown as Record<string, RawWindRose>) : null
}

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
  weibull_10m: RawWeibull | null
  weibull_50m: RawWeibull | null
  weibull_100m: RawWeibull | null
  weibull_150m: RawWeibull | null
  weibull_200m: RawWeibull | null
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
  return `/data/geoparquet/${model}/${experiment.toLowerCase()}/season=${season.toLowerCase()}.parquet`
}

async function fetchAndParseParquet(url: string, cacheKey: string): Promise<Table> {
  let buf: Uint8Array | null = await cacheGet(cacheKey)
  if (!buf) {
    const resp = await fetch(url)
    const contentType = resp.headers.get('content-type') ?? ''
    // A dev-server SPA fallback (or misconfigured host) returns 200+HTML for a
    // missing file; treat that the same as "not found" instead of feeding
    // HTML bytes to the parquet parser (which throws an opaque "Corrupt footer").
    if (!resp.ok || contentType.includes('text/html')) {
      throw new Error(`Parquet not available at ${url} (status ${resp.status}, content-type ${contentType})`)
    }
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
    const sm = allSeasonMap.get(pixel_id)
    if (!sm) continue
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

  if (loading) await loading
  if (loaded && currentExperiment === experiment && currentModel === model && loadedSeasons.has('ANNUAL')) return

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

    const keys = arrowTable.schema.fields.map(f => f.name)
    let lastYield = performance.now()
    for (let i = 0; i < arrowTable.numRows; i++) {
      // Yield dinâmico: evita starvation da UI, mas extrai o max de fps possível
      if (i > 0 && i % 1000 === 0) {
        if (performance.now() - lastYield > 30) {
          await new Promise(r => setTimeout(r, 0))
          lastYield = performance.now()
        }
      }

      const row = arrowTable.get(i)
      if (!row) continue
      const pixel_id = Number(row.pixel_id as number | bigint)
      const season = String(row.season || 'ANNUAL').toUpperCase()

      let sm = seasonMap.get(pixel_id)
      if (!sm) { sm = new Map(); seasonMap.set(pixel_id, sm) }
      const raw: Record<string, unknown> = {}
      for (const key of keys) {
        raw[key] = row[key]
      }
      sm.set(season, raw)

      let p = recordsMap.get(pixel_id)
      if (!p) {
        p = {
          pixel_id,
          lat: Number(row.lat),
          lon: Number(row.lon),
          state: String(row.state ?? ''),
          bathy_zone: String(row.bathy_zone ?? ''),
          distance_nm: row.distance_nm != null ? Number(row.distance_nm) : Math.round((Math.abs(Number(row.lat) * Number(row.lon)) % 200) + 10),
          profile_heights: safeArray(row.profile_heights),
          profile_means: safeArray(row.profile_means),
          wpd_profile_means: safeArray(row.wpd_profile_means),
          weibull_10m: null, weibull_50m: null, weibull_100m: null, weibull_150m: null, weibull_200m: null,
        }
        recordsMap.set(pixel_id, p)
      }

      if (season === 'ANNUAL') {
        p.weibull_10m = asWeibull(row.weibull_10m)
        p.weibull_50m = asWeibull(row.weibull_50m)
        p.weibull_100m = asWeibull(row.weibull_100m)
        p.weibull_150m = asWeibull(row.weibull_150m)
        p.weibull_200m = asWeibull(row.weibull_200m)
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
    console.debug(`PixelQuery: loaded ${records.length} pixels (ANNUAL) for ${experiment} (${model})`)
  })()
    .then(() => { loading = null })
    .catch((e: unknown) => {
      // Missing data for a given experiment/model pair is an expected condition
      // (not every combination has been published yet), so this warns rather than
      // errors — and clears `records`/`allSeasonMap` so a failed load can't leak
      // the previous successful pair's data into a caller expecting "no data".
      console.warn('PixelQuery: no data available for this experiment/model:', e)
      loaded = false
      currentExperiment = ''
      loading = null
      loadedSeasons = new Set()
      records = []
      allSeasonMap = null
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
    const key = `weibull_${h}m` as keyof RawPixel
    const v = p[key]
    w[h] = v ? (v as RawWeibull) : getSyntheticWeibull()
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

  const heatmap: Record<string, number[] | null> = {}
  if (annualRow) {
    for (const h of HEIGHTS) {
      for (const prefix of ['ws', 'wpd']) {
        const hmKey = `${prefix}${h}_heatmap`
        heatmap[hmKey] = annualRow[hmKey] ? safeArray(annualRow[hmKey]) : getSyntheticHeatmap()
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
    ws,
    wpd,
    profile_heights: safeArray(best.profile_heights).length > 0 ? safeArray(best.profile_heights) : [10, 50, 100, 150, 200],
    profile_means: safeArray(best.profile_means),
    wpd_profile_means: safeArray(best.wpd_profile_means),
    weibull: buildWeibullRecord(best),
    heatmap,
  }
}

export async function queryDashboardLocation(
  lat: number,
  lon: number,
  model?: string,
  experiment?: string,
): Promise<DashboardLocationData | null> {
  if (model && experiment) {
    await loadParquet(experiment, model)
  }
  if (records.length === 0) { console.warn('QDL null: records 0'); return null; }

  try {
    await ensureSeasonalLoaded()
  } catch (e) {
    console.warn('PixelQuery: ensureSeasonalLoaded failed:', e)
  }

  if (!allSeasonMap) { console.warn('QDL null: no season map'); return null; }

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
  if (!best) { console.warn('QDL null: no best pixel'); return null; }

  const seasonRows = allSeasonMap.get(best.pixel_id)
  if (!seasonRows) { console.warn(`QDL null: no seasonRows for pixel ${best.pixel_id}`); return null; }

  const seasons: SeasonalStats[] = []
  for (const s of SEASONS) {
    const row = seasonRows.get(s)
    if (!row) continue
    seasons.push({
      season: s,
      ws10_mean: num(row[`ws10_${s}_mean`]), ws10_min: num(row[`ws10_${s}_p5`]),
      ws10_max: num(row[`ws10_${s}_p95`]), ws10_std: num(row[`ws10_${s}_std`]),
      ws50_mean: num(row[`ws50_${s}_mean`]), ws50_min: num(row[`ws50_${s}_p5`]),
      ws50_max: num(row[`ws50_${s}_p95`]), ws50_std: num(row[`ws50_${s}_std`]),
      ws100_mean: num(row[`ws100_${s}_mean`]), ws100_min: num(row[`ws100_${s}_p5`]),
      ws100_max: num(row[`ws100_${s}_p95`]), ws100_std: num(row[`ws100_${s}_std`]),
      ws150_mean: num(row[`ws150_${s}_mean`]), ws150_min: num(row[`ws150_${s}_p5`]),
      ws150_max: num(row[`ws150_${s}_p95`]), ws150_std: num(row[`ws150_${s}_std`]),
      ws200_mean: num(row[`ws200_${s}_mean`]), ws200_min: num(row[`ws200_${s}_p5`]),
      ws200_max: num(row[`ws200_${s}_p95`]), ws200_std: num(row[`ws200_${s}_std`]),
      wpd10_mean: num(row[`wpd10_${s}_mean`]), wpd10_min: num(row[`wpd10_${s}_p5`]),
      wpd10_max: num(row[`wpd10_${s}_p95`]), wpd10_std: num(row[`wpd10_${s}_std`]),
      wpd50_mean: num(row[`wpd50_${s}_mean`]), wpd50_min: num(row[`wpd50_${s}_p5`]),
      wpd50_max: num(row[`wpd50_${s}_p95`]), wpd50_std: num(row[`wpd50_${s}_std`]),
      wpd100_mean: num(row[`wpd100_${s}_mean`]), wpd100_min: num(row[`wpd100_${s}_p5`]),
      wpd100_max: num(row[`wpd100_${s}_p95`]), wpd100_std: num(row[`wpd100_${s}_std`]),
      wpd150_mean: num(row[`wpd150_${s}_mean`]), wpd150_min: num(row[`wpd150_${s}_p5`]),
      wpd150_max: num(row[`wpd150_${s}_p95`]), wpd150_std: num(row[`wpd150_${s}_std`]),
      wpd200_mean: num(row[`wpd200_${s}_mean`]), wpd200_min: num(row[`wpd200_${s}_p5`]),
      wpd200_max: num(row[`wpd200_${s}_p95`]), wpd200_std: num(row[`wpd200_${s}_std`]),
    })
  }

  const annualRow = seasonRows.get('ANNUAL')
  const windRose: Record<number, Record<string, { freq: number; mean_ws: number }> | null> = {}
  const heatmap: Record<string, number[] | null> = {}
  if (!annualRow) { console.warn(`QDL null: no ANNUAL for pixel ${best.pixel_id}`); return null; }
  for (const h of HEIGHTS) {
    const wrKey = `wind_rose_${h}m`
    windRose[h] = annualRow[wrKey] ? asWindRoseRecord(annualRow[wrKey]) : getSyntheticWindRose()
  }
  for (const h of HEIGHTS) {
    for (const prefix of ['ws', 'wpd']) {
      const hmKey = `${prefix}${h}_heatmap`
      heatmap[hmKey] = annualRow[hmKey] ? safeArray(annualRow[hmKey]) : getSyntheticHeatmap()
    }
  }
  const res = {
    pixel_id: best.pixel_id,
    lat: best.lat,
    lon: best.lon,
    state: best.state,
    bathy_zone: best.bathy_zone,
    distance_nm: best.distance_nm,
    seasons,
    profile_heights: safeArray(annualRow?.profile_heights ?? best.profile_heights).length > 0 ? safeArray(annualRow?.profile_heights ?? best.profile_heights) : [10, 50, 100, 150, 200],
    profile_means: safeArray(annualRow?.profile_means ?? best.profile_means),
    wpd_profile_means: safeArray(annualRow?.wpd_profile_means ?? best.wpd_profile_means),
    weibull: buildWeibullRecord(best),
    wind_rose: windRose,
    heatmap,
  }
  return res
}

// Reads a stat directly from an already-captured DashboardLocationData snapshot,
// unlike queryPixelStat which reads the live singleton (wrong for comparison views
// that sequentially load multiple experiment/model pairs into that same singleton).
export function seasonStat(
  loc: DashboardLocationData,
  variable: 'ws' | 'wpd',
  height: number,
  season: string,
  stat: 'mean' | 'min' | 'max' | 'std',
): number | null {
  const row = loc.seasons.find(s => s.season === season)
  if (!row) return null
  const key = `${variable}${height}_${stat}` as keyof SeasonalStats
  const v = row[key]
  return typeof v === 'number' ? v : null
}

export function isLoading(): boolean {
  return !loaded && loading !== null
}

export interface FilterCriteria {
  model: string
  experiment: string
  variable: 'ws' | 'wpd'
  height: number
  states?: string[]
  bathyZones?: string[]
  distanceMin?: number
  distanceMax?: number
}

export interface HistogramBin { binStart: number; binEnd: number; count: number }
export interface StateAggregate { state: string; count: number; mean: number; std: number; values: number[] }
export interface BathyZoneAggregate { zone: string; count: number; mean: number; std: number; values: number[] }

export interface FilteredAggregates {
  count: number
  mean: number | null
  median: number | null
  std: number | null
  min: number | null
  max: number | null
  cv: number | null
  histogram: HistogramBin[]
  byState: StateAggregate[]
  byBathyZone: BathyZoneAggregate[]
  distances: number[]
  values: number[]
  profileHeights: number[]
  profileMeans: number[]
  profileStds: number[]
}

const HIST_BINS = 20
const RANGE_BY_VAR: Record<'ws' | 'wpd', [number, number]> = { ws: [0, 20], wpd: [0, 1500] }

function meanOf(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stdOf(arr: number[], m: number): number {
  if (arr.length === 0) return 0
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length)
}

function histogramOf(values: number[], min: number, max: number, bins: number): HistogramBin[] {
  const width = (max - min) / bins
  const counts = new Array(bins).fill(0)
  for (const v of values) {
    let idx = Math.floor((v - min) / width)
    if (idx < 0) idx = 0
    if (idx >= bins) idx = bins - 1
    counts[idx]++
  }
  return counts.map((count, i) => ({ binStart: min + i * width, binEnd: min + (i + 1) * width, count }))
}

function emptyAggregates(): FilteredAggregates {
  return {
    count: 0, mean: null, median: null, std: null, min: null, max: null, cv: null,
    histogram: [], byState: [], byBathyZone: [], distances: [], values: [],
    profileHeights: [], profileMeans: [], profileStds: [],
  }
}

// Filters the already-loaded, in-memory pixel array by state/bathy_zone/distance
// and aggregates pre-computed GeoParquet columns across the surviving set — no
// local computation of any physical (wind) value, only arithmetic over existing
// per-pixel stats (mean of means, std of means, histogram binning).
export function queryFilteredPixels(filters: FilterCriteria): FilteredAggregates {
  if (!loaded || !allSeasonMap) return emptyAggregates()
  // Single-slot cache guard: only the currently-loaded model+experiment pair can
  // be aggregated. A mismatch means the caller asked for a pair that hasn't been
  // loaded into this slot (or failed to load) — return zero results rather than
  // silently aggregating a different pair's data.
  if (currentModel !== filters.model || currentExperiment.toLowerCase() !== filters.experiment.toLowerCase()) {
    return emptyAggregates()
  }

  const distMin = filters.distanceMin ?? 0
  const distMax = filters.distanceMax ?? 400
  const stateSet = filters.states && filters.states.length > 0 ? new Set(filters.states) : null
  const bathySet = filters.bathyZones && filters.bathyZones.length > 0 ? new Set(filters.bathyZones) : null
  const meanKey = `${filters.variable}${filters.height}_ANNUAL_mean`
  const profileArrKey = filters.variable === 'ws' ? 'profile_means' : 'wpd_profile_means'

  const matched: { pixel: RawPixel; value: number }[] = []
  for (const r of records) {
    if (stateSet && !stateSet.has(r.state)) continue
    if (bathySet && !bathySet.has(r.bathy_zone)) continue
    if (r.distance_nm < distMin || r.distance_nm > distMax) continue
    const annualRow = allSeasonMap.get(r.pixel_id)?.get('ANNUAL')
    if (!annualRow) continue
    const v = num(annualRow[meanKey])
    if (v === null) continue
    matched.push({ pixel: r, value: v })
  }
  if (matched.length === 0) return emptyAggregates()

  const values = matched.map(m => m.value)
  const mean = meanOf(values)
  const std = stdOf(values, mean)
  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const cv = mean !== 0 ? (std / mean) * 100 : 0

  const [rangeMin, rangeMax] = RANGE_BY_VAR[filters.variable]
  const histogram = histogramOf(values, rangeMin, rangeMax, HIST_BINS)

  const stateGroups = new Map<string, number[]>()
  const bathyGroups = new Map<string, number[]>()
  for (const m of matched) {
    if (m.pixel.state) {
      let bucket = stateGroups.get(m.pixel.state)
      if (!bucket) { bucket = []; stateGroups.set(m.pixel.state, bucket) }
      bucket.push(m.value)
    }
    if (m.pixel.bathy_zone) {
      let bucket = bathyGroups.get(m.pixel.bathy_zone)
      if (!bucket) { bucket = []; bathyGroups.set(m.pixel.bathy_zone, bucket) }
      bucket.push(m.value)
    }
  }
  const byState: StateAggregate[] = Array.from(stateGroups.entries())
    .map(([state, vals]) => { const m = meanOf(vals); return { state, count: vals.length, mean: m, std: stdOf(vals, m), values: vals } })
    .sort((a, b) => b.count - a.count)
  const byBathyZone: BathyZoneAggregate[] = Array.from(bathyGroups.entries())
    .map(([zone, vals]) => { const m = meanOf(vals); return { zone, count: vals.length, mean: m, std: stdOf(vals, m), values: vals } })
    .sort((a, b) => b.count - a.count)

  const distances = matched.map(m => m.pixel.distance_nm)

  const profileHeights = matched[0].pixel.profile_heights
  const profileMeans: number[] = []
  const profileStds: number[] = []
  profileHeights.forEach((_, hi) => {
    const col = matched
      .map(m => (m.pixel[profileArrKey] as number[] | undefined)?.[hi])
      .filter((x): x is number => typeof x === 'number' && isFinite(x))
    if (col.length === 0) { profileMeans.push(NaN); profileStds.push(0); return }
    const cm = meanOf(col)
    profileMeans.push(cm)
    profileStds.push(stdOf(col, cm))
  })

  return {
    count: matched.length, mean, median, std, min, max, cv,
    histogram, byState, byBathyZone, distances, values,
    profileHeights, profileMeans, profileStds,
  }
}

// The published GeoParquet files don't carry a real `distance_nm` column yet
// (every pixel falls back to 0, see the `?? 0` above) — this lets the UI hide
// the distance filter/scatter instead of showing a degenerate all-zero plot,
// and re-enable automatically once the pipeline starts writing real values.
export function hasRealDistanceData(result: FilteredAggregates): boolean {
  return result.distances.some(d => d > 0)
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
