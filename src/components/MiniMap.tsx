import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MiniMapProps {
  pinnedLocations: { lat: number; lon: number }[]
  onPinClick: (lat: number, lon: number) => void
}

const PIN_COLORS = ['#4a90d9', '#e67e22', '#2ecc71']

function MiniMap({ pinnedLocations, onPinClick }: MiniMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [ready, setReady] = useState(false)

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
      onPinClick(e.lngLat.lat, e.lngLat.lng)
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

  return <div ref={container} className="minimap" />
}

export default MiniMap
