import { useEffect, useRef, useState, memo, useCallback, type Dispatch } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { renderCog } from '../lib/cogTileRenderer'
import { buildCogUrl, datasetFolder, datasetLabel, modelLabel, varLabel, type Model, type Dataset, type Variable, type Height, type Season } from '../lib/cogCatalog'
import { loadParquet, queryNearest, isLoading, isLoaded, getRecordCount } from '../lib/pixelQuery'
import type { PixelDataSummary, DashboardLocationData } from '../lib/pixelQuery'
import type { BasemapId, BathyLayerId } from '../types'
import type { AppAction } from '../reducer'
import BasemapSwitcher from './BasemapSwitcher'
import { useLocale } from '../i18n/provider'
import './MapView.css'

interface MapViewProps {
  model: Model
  dataset: Dataset
  variable: Variable
  height: Height
  season: Season
  showBathymetry: boolean
  bathyLayer: BathyLayerId
  opacity: number
  basemap: BasemapId
  onPixelClick: (data: PixelDataSummary | null, loading: boolean, loaded: boolean, count: number) => void
  pinnedLocations: DashboardLocationData[]
  onAddPin: (lat: number, lon: number) => void
  onRemovePin: (idx: number) => void
  dispatch: Dispatch<AppAction>
}

const SR = 'cog-src'
const LR = 'cog-lyr'
const BS = 'bathy-src'
const BF = 'bathy-fill'
const BL = 'bathy-line'

// mn_zee_nacional/mn_zee_estadual have no published file yet (no ZEE boundary
// data delivered so far) — same "not published" class as MPAS in pixelQuery.ts.
const BATHY_FILES: Record<BathyLayerId, string> = {
  mn_zee_nacional: '/data/shp/mn_zee_nacional.geojson',
  mn_zee_estadual: '/data/shp/mn_zee_estadual.geojson',
  bathy_0_100_nacional: '/data/bathymetry/batimetria_0_100m_cured.geojson',
  bathy_0_100_estadual: '/data/bathymetry/batimetria_0_100m_estadual_cured.geojson',
  bathy_0_20_50_75_100_nacional: '/data/bathymetry/batimetria_0_20_50_75_100m_cured.geojson',
  bathy_0_20_50_75_100_estadual: '/data/bathymetry/batimetria_subfaixas_estadual_cured.geojson',
}

const BASEMAP_TILES: Record<BasemapId, { tiles: string[]; attribution: string }> = {
  street: {
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '&copy; OpenStreetMap',
  },
  satellite: {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: '&copy; Esri',
  },
  dark: {
    tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
    attribution: '&copy; CARTO',
  },
  terrain: {
    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    attribution: 'Terrain tiles &copy; Mapzen, AWS Open Data Terrain Tiles',
  },
  night: {
    tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg'],
    attribution: '&copy; NASA EOSDIS GIBS / Black Marble',
  },
  topo: {
    tiles: [
      'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
    ],
    attribution: '&copy; OpenTopoMap (CC-BY-SA)',
  },
}

const BASEMAP_SRC_IDS = ['basemap-street', 'basemap-satellite', 'basemap-dark', 'basemap-terrain', 'basemap-night', 'basemap-topo']
const PIN_SRC = 'pin-src'
const PIN_LYR = 'pin-lyr'
const PIN_OUTLINE_LYR = 'pin-outline-lyr'
const PIN_COLORS = ['#4a90d9', '#e67e22', '#2ecc71']

function MapViewInner(props: MapViewProps) {
  const { model, dataset, variable, height, season, showBathymetry, bathyLayer, opacity, basemap, onPixelClick, pinnedLocations, onAddPin, onRemovePin, dispatch } = props
  const { t } = useLocale()
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const datasetRef = useRef(dataset)
  datasetRef.current = dataset
  const modelRef = useRef(model)
  modelRef.current = model
  const opacityRef = useRef(opacity)
  opacityRef.current = opacity
  const [ready, setReady] = useState(false)
  const [cogLoading, setCogLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const cache = useRef<Map<string, GeoJSON.GeoJSON>>(new Map())
  const cogAbort = useRef<AbortController | null>(null)
  // Fingerprint of the last COG actually rendered (filters + viewport). MapLibre's
  // resize() (fired by the ResizeObserver below when switching back to this tab)
  // internally emits movestart/move/moveend even though nothing panned or zoomed —
  // without this guard that spuriously re-triggers the 300ms moveend debounce and
  // re-fetches/re-renders the exact same tile.
  const lastCogParamsRef = useRef<string | null>(null)

  useEffect(() => {
    if (!container.current || map.current) return
    const m = new maplibregl.Map({
      container: container.current,
      // Required so map.getCanvas() still holds pixel data after the WebGL
      // context's frame buffer would otherwise be cleared — the map-screenshot
      // feature reads this canvas via toDataURL() outside the render loop.
      preserveDrawingBuffer: true,
      style: {
        version: 8,
        sources: {
          'basemap-street': { type: 'raster', tiles: BASEMAP_TILES.street.tiles, tileSize: 256, attribution: BASEMAP_TILES.street.attribution },
          'basemap-satellite': { type: 'raster', tiles: BASEMAP_TILES.satellite.tiles, tileSize: 256, attribution: BASEMAP_TILES.satellite.attribution },
          'basemap-dark': { type: 'raster', tiles: BASEMAP_TILES.dark.tiles, tileSize: 256, attribution: BASEMAP_TILES.dark.attribution },
          'basemap-terrain': { type: 'raster-dem', tiles: BASEMAP_TILES.terrain.tiles, tileSize: 256, encoding: 'terrarium', attribution: BASEMAP_TILES.terrain.attribution },
          'basemap-night': { type: 'raster', tiles: BASEMAP_TILES.night.tiles, tileSize: 256, maxzoom: 8, attribution: BASEMAP_TILES.night.attribution },
          'basemap-topo': { type: 'raster', tiles: BASEMAP_TILES.topo.tiles, tileSize: 256, attribution: BASEMAP_TILES.topo.attribution },
        },
        layers: [
          { id: 'basemap-street-lyr', type: 'raster', source: 'basemap-street' },
          { id: 'basemap-satellite-lyr', type: 'raster', source: 'basemap-satellite', layout: { visibility: 'none' } },
          { id: 'basemap-dark-lyr', type: 'raster', source: 'basemap-dark', layout: { visibility: 'none' } },
          { id: 'basemap-terrain-lyr', type: 'hillshade', source: 'basemap-terrain', layout: { visibility: 'none' }, paint: { 'hillshade-exaggeration': 0.6 } },
          { id: 'basemap-night-lyr', type: 'raster', source: 'basemap-night', layout: { visibility: 'none' } },
          { id: 'basemap-topo-lyr', type: 'raster', source: 'basemap-topo', layout: { visibility: 'none' } },
        ],
      },
      center: [-38, -13],
      zoom: 5,
      minZoom: 3,
      maxZoom: 10,
    })
    m.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    m.on('load', () => { setReady(true) })
    m.on('click', (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat
      const exp = datasetRef.current
      const mdl = modelRef.current
      if (!isLoaded()) {
        onPixelClick(null, true, false, 0)
        loadParquet(datasetFolder(exp), mdl).then(() => {
          const p = queryNearest(lat, lng)
          onPixelClick(p, false, true, getRecordCount())
        })
        return
      }
      const p = queryNearest(lat, lng)
      onPixelClick(p, false, true, getRecordCount())
    })
    map.current = m
    return () => { m.remove(); map.current = null }
  }, [])

  // Basemap switching
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    for (const id of BASEMAP_SRC_IDS) {
      const lyrId = `${id}-lyr`
      if (m.getLayer(lyrId)) {
        m.setLayoutProperty(lyrId, 'visibility', id === `basemap-${basemap}` ? 'visible' : 'none')
      }
    }
  }, [basemap, ready])

  // Live opacity update on the already-rendered COG layer, no tile refetch
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    if (m.getLayer(LR)) m.setPaintProperty(LR, 'raster-opacity', opacity)
  }, [opacity, ready])

  // Keep the pixel-query parquet in sync with the selected experiment/model.
  // Compares against the last-synced value (captured at mount) instead of a
  // boolean "first run" flag: a flag flips permanently on its first call, so
  // React StrictMode's dev-only double-invoke of mount effects would treat the
  // replay as a genuine change and fire a spurious fetch of the initial dataset.
  const lastSyncedRef = useRef({ dataset, model })
  useEffect(() => {
    if (lastSyncedRef.current.dataset === dataset && lastSyncedRef.current.model === model) return
    lastSyncedRef.current = { dataset, model }
    loadParquet(datasetFolder(dataset), model)
  }, [dataset, model])

  const drawCog = useCallback(async () => {
    const m = map.current
    if (!m || !ready) return

    const mb = m.getBounds()
    const zoom = m.getZoom()
    const vb = {
      west: Math.max(mb.getWest(), -55),
      south: Math.max(mb.getSouth(), -35),
      east: Math.min(mb.getEast(), -25),
      north: Math.min(mb.getNorth(), 6),
    }
    if (vb.north <= vb.south || vb.east <= vb.west) return

    const cogKey = [
      dataset, variable, height, season, model,
      vb.west.toFixed(4), vb.south.toFixed(4), vb.east.toFixed(4), vb.north.toFixed(4), zoom.toFixed(2),
    ].join('|')
    if (cogKey === lastCogParamsRef.current) return

    if (cogAbort.current) cogAbort.current.abort()
    const ac = new AbortController()
    cogAbort.current = ac
    const signal = ac.signal
    setCogLoading(true)

    try {
      const url = buildCogUrl(dataset, variable, height, season, model)

      if (m.getLayer(LR)) m.removeLayer(LR)
      if (m.getSource(SR)) m.removeSource(SR)

      const result = await renderCog(url, vb, zoom, variable, signal)
      if (signal.aborted || !result || !map.current) return

      const { dataUrl, coords } = result
      const [west, south, east, north] = coords
      if (!isFinite(west) || !isFinite(south) || !isFinite(east) || !isFinite(north)) return

      // Only mark this fingerprint "rendered" on success — a failed/aborted fetch
      // must stay retriable (e.g. a transient network error shouldn't permanently
      // suppress redraws for the same viewport+filters).
      lastCogParamsRef.current = cogKey

      if (m.getSource(SR)) m.removeSource(SR)
      if (m.getLayer(LR)) m.removeLayer(LR)

      m.addSource(SR, {
        type: 'image',
        url: dataUrl,
        coordinates: [
          [west, north],
          [east, north],
          [east, south],
          [west, south],
        ],
      })
      m.addLayer({ id: LR, type: 'raster', source: SR, paint: { 'raster-opacity': opacityRef.current, 'raster-fade-duration': 0 } })
      if (m.getLayer(PIN_OUTLINE_LYR)) m.moveLayer(PIN_OUTLINE_LYR)
      if (m.getLayer(PIN_LYR)) m.moveLayer(PIN_LYR)
    } finally {
      // A newer drawCog call already aborted this one and set loading back to
      // true for itself — clearing it here would hide the spinner mid-fetch.
      if (!signal.aborted) setCogLoading(false)
    }
  }, [dataset, variable, height, season, model, ready])

  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    if (m.getLayer(BL)) m.removeLayer(BL)
    if (m.getLayer(BF)) m.removeLayer(BF)
    if (m.getSource(BS)) m.removeSource(BS)
    if (!showBathymetry) return

    const file = BATHY_FILES[bathyLayer]
    if (!file) return

    const gj = cache.current.get(bathyLayer)
    if (gj) {
      m.addSource(BS, { type: 'geojson', data: gj })
      m.addLayer({ id: BF, type: 'fill', source: BS, paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.15 } })
      m.addLayer({ id: BL, type: 'line', source: BS, paint: { 'line-color': '#1a5a9e', 'line-width': 0.8, 'line-opacity': 0.5 } })
      return
    }
    fetch(file).then(r => {
      // A dev-server SPA fallback (or a layer with no published file yet, e.g.
      // mn_zee_*) returns 200+HTML instead of 404 — treat both as "unavailable"
      // instead of feeding HTML to r.json() (which throws an unhandled rejection).
      const contentType = r.headers.get('content-type') ?? ''
      if (!r.ok || contentType.includes('text/html')) {
        throw new Error(`Bathymetry layer not available at ${file} (status ${r.status})`)
      }
      return r.json()
    }).then(gj => {
      cache.current.set(bathyLayer, gj)
      if (!map.current) return
      map.current.addSource(BS, { type: 'geojson', data: gj })
      map.current.addLayer({ id: BF, type: 'fill', source: BS, paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.15 } })
      map.current.addLayer({ id: BL, type: 'line', source: BS, paint: { 'line-color': '#1a5a9e', 'line-width': 0.8, 'line-opacity': 0.5 } })
    }).catch(e => {
      console.warn('MapView: bathymetry layer unavailable:', e)
    })
  }, [showBathymetry, bathyLayer, ready])

  // Pinned location markers
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return

    // Clean up previous
    if (m.getLayer(PIN_OUTLINE_LYR)) m.removeLayer(PIN_OUTLINE_LYR)
    if (m.getLayer(PIN_LYR)) m.removeLayer(PIN_LYR)
    if (m.getSource(PIN_SRC)) m.removeSource(PIN_SRC)

    if (pinnedLocations.length === 0) return

    const features = pinnedLocations.map((loc, i) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [loc.lon, loc.lat] },
      properties: { color: PIN_COLORS[i % PIN_COLORS.length], idx: i },
    }))

    m.addSource(PIN_SRC, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    })

    // Outline circle (white border)
    m.addLayer({
      id: PIN_OUTLINE_LYR,
      type: 'circle',
      source: PIN_SRC,
      paint: {
        'circle-radius': 11,
        'circle-color': '#fff',
        'circle-opacity': 0.95,
      },
    })

    // Filled circle
    m.addLayer({
      id: PIN_LYR,
      type: 'circle',
      source: PIN_SRC,
      paint: {
        'circle-radius': 7,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(0,0,0,0.15)',
      },
    })

    // Move pins above COG if COG layer exists
    if (m.getLayer(LR)) {
      m.moveLayer(PIN_OUTLINE_LYR)
      m.moveLayer(PIN_LYR)
    }

    // Click to remove pin
    m.on('click', PIN_LYR, (e) => {
      if (e.features && e.features[0] && e.features[0].properties) {
        const idx = e.features[0].properties.idx
        if (typeof idx === 'number') onRemovePin(idx)
      }
    })
    m.on('mouseenter', PIN_LYR, () => { m.getCanvas().style.cursor = 'pointer' })
    m.on('mouseleave', PIN_LYR, () => { m.getCanvas().style.cursor = '' })
  }, [pinnedLocations, ready])

  // After COG redraws, re-stack pins on top
  const drawCogWithPins = useCallback(async () => {
    await drawCog()
    const m = map.current
    if (!m) return
    if (m.getLayer(PIN_OUTLINE_LYR)) m.moveLayer(PIN_OUTLINE_LYR)
    if (m.getLayer(PIN_LYR)) m.moveLayer(PIN_LYR)
  }, [drawCog])

  useEffect(() => {
    if (!ready || !map.current) return
    const m = map.current
    const idle = () => {
      m.off('idle', idle)
      drawCogWithPins()
    }
    m.on('idle', idle)
    return () => { m.off('idle', idle) }
  }, [drawCogWithPins, ready])

  useEffect(() => {
    if (!ready || !map.current) return
    const m = map.current
    const debounce = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(drawCogWithPins, 300)
    }
    m.on('moveend', debounce)
    return () => { m.off('moveend', debounce); if (timer.current) clearTimeout(timer.current) }
  }, [drawCogWithPins, ready])

  // ResizeObserver: auto-resize map when tab panel becomes visible (display:none→flex)
  useEffect(() => {
    const el = container.current
    const m = map.current
    if (!el || !m) return
    const ro = new ResizeObserver(() => {
      if (map.current) map.current.resize()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ready])

  const handleScreenshot = useCallback(() => {
    const m = map.current
    if (!m) return
    const src = m.getCanvas()
    const dataUrl = src.toDataURL('image/png')
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0)

      const label = `CNPq WebGIS — ${modelLabel(modelRef.current, t)} ${datasetLabel(datasetRef.current, t)} ${varLabel(variable, t).label} ${height}m`
      ctx.font = '14px sans-serif'
      const textWidth = ctx.measureText(label).width
      const padX = 8
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(10, canvas.height - 34, textWidth + padX * 2, 24)
      ctx.fillStyle = '#fff'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, 10 + padX, canvas.height - 22)

      const a = document.createElement('a')
      const dateStr = new Date().toISOString().slice(0, 10)
      a.href = canvas.toDataURL('image/png')
      a.download = `webgis-map-${dateStr}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    img.src = dataUrl
  }, [variable, height, t])

  return (
    <>
      <div ref={container} className="map-container" />
      <BasemapSwitcher basemap={basemap} onChange={id => dispatch({ type: 'SET_BASEMAP', basemap: id })} />
      {cogLoading && (
        <div className="cog-loading">
          <div className="cog-spinner" />
          <span>{t('mapview.loading')}</span>
        </div>
      )}
      <button className="map-screenshot-btn" onClick={handleScreenshot} title={t('mapview.screenshot_title')}>
        📷 Screenshot
      </button>
    </>
  )
}

export default memo(MapViewInner)
