import { useEffect, useRef, useState, memo, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { renderCog } from '../lib/cogTileRenderer'
import { buildCogUrl, datasetFolder, type Model, type Dataset, type Variable, type Height, type Season } from '../lib/cogCatalog'
import { loadParquet, queryNearest, isLoading, isLoaded, getRecordCount } from '../lib/pixelQuery'
import type { PixelDataSummary, DashboardLocationData } from '../lib/pixelQuery'
import BasemapSwitcher from './BasemapSwitcher'

interface MapViewProps {
  model: Model
  dataset: Dataset
  variable: Variable
  height: Height
  season: Season
  showBathymetry: boolean
  bathyLayer: string
  opacity: number
  basemap: string
  onBasemapChange: (id: string) => void
  onPixelClick: (data: PixelDataSummary | null, loading: boolean, loaded: boolean, count: number) => void
  pinnedLocations: DashboardLocationData[]
  onAddPin: (lat: number, lon: number) => void
  onRemovePin: (idx: number) => void
}

const SR = 'cog-src'
const LR = 'cog-lyr'
const BS = 'bathy-src'
const BF = 'bathy-fill'
const BL = 'bathy-line'

// mn_zee_nacional/mn_zee_estadual have no published file yet (no ZEE boundary
// data delivered so far) — same "not published" class as MPAS in pixelQuery.ts.
const BATHY_FILES: Record<string, string> = {
  mn_zee_nacional: '/data/shp/mn_zee_nacional.geojson',
  mn_zee_estadual: '/data/shp/mn_zee_estadual.geojson',
  bathy_0_100_nacional: '/data/bathymetry/batimetria_0_100m_cured.geojson',
  bathy_0_100_estadual: '/data/bathymetry/batimetria_0_100m_estadual_cured.geojson',
  bathy_0_20_50_75_100_nacional: '/data/bathymetry/batimetria_0_20_50_75_100m_cured.geojson',
  bathy_0_20_50_75_100_estadual: '/data/bathymetry/batimetria_subfaixas_estadual_cured.geojson',
}

const BASEMAP_TILES: Record<string, { tiles: string[]; attribution: string }> = {
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
}

const BASEMAP_SRC_IDS = ['basemap-street', 'basemap-satellite', 'basemap-dark']
const PIN_SRC = 'pin-src'
const PIN_LYR = 'pin-lyr'
const PIN_OUTLINE_LYR = 'pin-outline-lyr'
const PIN_COLORS = ['#4a90d9', '#e67e22', '#2ecc71']

function MapViewInner(props: MapViewProps) {
  const { model, dataset, variable, height, season, showBathymetry, bathyLayer, opacity, basemap, onBasemapChange, onPixelClick, pinnedLocations, onAddPin, onRemovePin } = props
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const datasetRef = useRef(dataset)
  datasetRef.current = dataset
  const modelRef = useRef(model)
  modelRef.current = model
  const opacityRef = useRef(opacity)
  opacityRef.current = opacity
  const [ready, setReady] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const cache = useRef<Map<string, any>>(new Map())
  const cogAbort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!container.current || map.current) return
    const m = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {
          'basemap-street': { type: 'raster', tiles: BASEMAP_TILES.street.tiles, tileSize: 256, attribution: BASEMAP_TILES.street.attribution },
          'basemap-satellite': { type: 'raster', tiles: BASEMAP_TILES.satellite.tiles, tileSize: 256, attribution: BASEMAP_TILES.satellite.attribution },
          'basemap-dark': { type: 'raster', tiles: BASEMAP_TILES.dark.tiles, tileSize: 256, attribution: BASEMAP_TILES.dark.attribution },
        },
        layers: [
          { id: 'basemap-street-lyr', type: 'raster', source: 'basemap-street' },
          { id: 'basemap-satellite-lyr', type: 'raster', source: 'basemap-satellite', layout: { visibility: 'none' } },
          { id: 'basemap-dark-lyr', type: 'raster', source: 'basemap-dark', layout: { visibility: 'none' } },
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

    if (cogAbort.current) cogAbort.current.abort()
    const ac = new AbortController()
    cogAbort.current = ac
    const signal = ac.signal

    const url = buildCogUrl(dataset, variable, height, season, model)

    if (m.getLayer(LR)) m.removeLayer(LR)
    if (m.getSource(SR)) m.removeSource(SR)

    const mb = m.getBounds()
    const zoom = m.getZoom()
    const vb = {
      west: Math.max(mb.getWest(), -55),
      south: Math.max(mb.getSouth(), -35),
      east: Math.min(mb.getEast(), -25),
      north: Math.min(mb.getNorth(), 6),
    }
    if (vb.north <= vb.south || vb.east <= vb.west) return

    const result = await renderCog(url, vb, zoom, variable, signal)
    if (signal.aborted || !result || !map.current) return

    const { dataUrl, coords } = result
    const [west, south, east, north] = coords
    if (!isFinite(west) || !isFinite(south) || !isFinite(east) || !isFinite(north)) return

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
    if (!ready) return
    const m = map.current!
    const idle = () => {
      m.off('idle', idle)
      drawCogWithPins()
    }
    m.on('idle', idle)
    return () => { m.off('idle', idle) }
  }, [drawCogWithPins, ready])

  useEffect(() => {
    if (!ready) return
    const m = map.current!
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

  return <div ref={container} className="map-container" />
}

export default memo(MapViewInner)
