import { memo } from 'react'

interface BasemapSwitcherProps {
  basemap: string
  onChange: (id: string) => void
}

const BASEMAPS = [
  { id: 'street', label: 'Street', icon: '🗺' },
  { id: 'satellite', label: 'Satellite', icon: '🛰' },
  { id: 'dark', label: 'Dark', icon: '🌙' },
  { id: 'terrain', label: 'Terrain', icon: '⛰' },
  { id: 'night', label: 'Night', icon: '🌃' },
  { id: 'topo', label: 'Topo', icon: '🗻' },
]

function BasemapSwitcherInner({ basemap, onChange }: BasemapSwitcherProps) {
  return (
    <div className="basemap-switcher">
      {BASEMAPS.map(b => (
        <button
          key={b.id}
          className={`basemap-btn ${basemap === b.id ? 'active' : ''}`}
          onClick={() => onChange(b.id)}
          title={b.label}
        >
          <span className="basemap-icon">{b.icon}</span>
          <span className="basemap-label">{b.label}</span>
        </button>
      ))}
    </div>
  )
}

export default memo(BasemapSwitcherInner)
