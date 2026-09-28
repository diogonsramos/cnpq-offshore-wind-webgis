import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useLocale } from '../i18n/provider'

interface MiniMapProps {
  pinnedLocations: { lat: number; lon: number }[]
  onPinClick: (lat: number, lon: number) => void
  states?: string[]
}

const PIN_COLORS = ['#4a90d9', '#e67e22', '#2ecc71']

const STATE_BOUNDS: Record<string, [number, number, number, number]> = {
  AP: [-51.5, -0.5, -49.5, 4.5],
  PA: [-55.0, -1.5, -46.0, 1.0],
  MA: [-46.0, -2.5, -41.5, -1.0],
  PI: [-42.0, -3.0, -41.0, -2.5],
  CE: [-41.5, -5.0, -37.0, -2.5],
  RN: [-37.5, -6.5, -34.5, -4.5],
  PB: [-35.0, -7.5, -34.5, -6.0],
  PE: [-35.5, -9.0, -34.5, -7.5],
  AL: [-36.0, -10.5, -35.0, -8.5],
  SE: [-37.5, -11.5, -36.0, -10.0],
  BA: [-39.5, -18.5, -37.0, -11.5],
  ES: [-40.5, -21.5, -39.0, -18.0],
  RJ: [-44.5, -23.5, -41.0, -21.0],
  SP: [-48.0, -25.5, -44.0, -23.0],
  PR: [-49.0, -26.0, -48.0, -25.0],
  SC: [-49.0, -29.5, -48.0, -25.5],
  RS: [-53.5, -34.0, -49.5, -29.0],
}

function MiniMap({ pinnedLocations, onPinClick, states = [] }: MiniMapProps) {
  const { t } = useLocale()
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [ready, setReady] = useState(false)

  const onPinClickRef = useRef(onPinClick)
  useEffect(() => {
    onPinClickRef.current = onPinClick
  }, [onPinClick])

  useEffect(() => {
    if (!container.current || map.current) return
    const m = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {
          osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '&copy; OpenStreetMap' },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [-38, -13],
      zoom: 4,
      minZoom: 2,
      maxZoom: 8,
      attributionControl: false,
    })
    m.addControl(new maplibregl.NavigationControl({ showZoom: true, showCompass: false }), 'bottom-right')
    m.on('load', () => setReady(true))
    m.on('click', (e: maplibregl.MapMouseEvent) => {
      onPinClickRef.current(e.lngLat.lat, e.lngLat.lng)
    })
    map.current = m
    return () => { m.remove(); map.current = null }
  }, [])

  // Update pin markers when pinnedLocations changes
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return

    const srcId = 'pins-src'
    const lyrId = 'pins-lyr'

    if (m.getLayer(lyrId)) m.removeLayer(lyrId)
    if (m.getSource(srcId)) m.removeSource(srcId)

    if (pinnedLocations.length === 0) return

    const features = pinnedLocations.map((loc, i) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [loc.lon, loc.lat] },
      properties: { color: PIN_COLORS[i % PIN_COLORS.length], label: `Loc ${i + 1}` },
    }))

    m.addSource(srcId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    })
    m.addLayer({
      id: lyrId,
      type: 'circle',
      source: srcId,
      paint: {
        'circle-radius': 6,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    })
  }, [pinnedLocations, ready])

  // Update states highlight
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return

    const srcId = 'states-src'
    const fillLyrId = 'states-fill-lyr'
    const lineLyrId = 'states-line-lyr'

    if (!m.getSource(srcId)) {
      m.addSource(srcId, {
        type: 'geojson',
        data: `${import.meta.env.BASE_URL}data/bathymetry/mn_zee_estadual.geojson`,
      })
      // Add below pins layer
      m.addLayer({
        id: fillLyrId,
        type: 'fill',
        source: srcId,
        paint: {
          'fill-color': '#4a90d9',
          'fill-opacity': 0, // dynamic
        },
      }, m.getLayer('pins-lyr') ? 'pins-lyr' : undefined)
      m.addLayer({
        id: lineLyrId,
        type: 'line',
        source: srcId,
        paint: {
          'line-color': '#1a5a9e',
          'line-width': 0.5,
          'line-opacity': 0, // dynamic
        },
      }, m.getLayer('pins-lyr') ? 'pins-lyr' : undefined)
    }

    if (m.getLayer(fillLyrId)) {
      if (states.length === 0) {
        m.setPaintProperty(fillLyrId, 'fill-opacity', 0)
        m.setPaintProperty(lineLyrId, 'line-opacity', 0)
      } else {
        m.setPaintProperty(fillLyrId, 'fill-opacity', ['case', ['in', ['get', 'estado'], ['literal', states]], 0.35, 0])
        m.setPaintProperty(lineLyrId, 'line-opacity', ['case', ['in', ['get', 'estado'], ['literal', states]], 0.8, 0])
      }
    }
  }, [states, ready])

  // Fit bounds logic
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return

    if (states.length > 0 || pinnedLocations.length >= 2) {
      const bounds = new maplibregl.LngLatBounds()
      let hasBounds = false

      states.forEach(st => {
        const b = STATE_BOUNDS[st]
        if (b) {
          bounds.extend([b[0], b[1]])
          bounds.extend([b[2], b[3]])
          hasBounds = true
        }
      })

      pinnedLocations.forEach(loc => {
        bounds.extend([loc.lon, loc.lat])
        hasBounds = true
      })

      if (hasBounds) {
        m.fitBounds(bounds, { padding: 40, duration: 800, maxZoom: 8 })
      }
    } else if (pinnedLocations.length === 1) {
      m.easeTo({ center: [pinnedLocations[0].lon, pinnedLocations[0].lat], zoom: 5, duration: 800 })
    } else if (states.length === 0 && pinnedLocations.length === 0) {
      m.easeTo({ center: [-38, -13], zoom: 4, duration: 800 })
    }
  }, [states, pinnedLocations, ready])

  return (
    <div className="minimap" style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(255, 255, 255, 0.9)', padding: '4px 12px',
        borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
        color: '#334155', pointerEvents: 'none', zIndex: 2,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', whiteSpace: 'nowrap'
      }}>
        {t('dashboard.minimap_overlay')}
      </div>
      <div ref={container} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

export default MiniMap
