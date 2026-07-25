import { memo } from 'react'
import type { BasemapId } from '../types'
import { useLocale } from '../i18n/provider'
import type { TranslationKey } from '../i18n/types'

interface BasemapSwitcherProps {
  basemap: BasemapId
  onChange: (id: BasemapId) => void
}

const BASEMAPS: { id: BasemapId; labelKey: TranslationKey; icon: string }[] = [
  { id: 'street', labelKey: 'basemap.street', icon: '🗺' },
  { id: 'satellite', labelKey: 'basemap.satellite', icon: '🛰' },
  { id: 'dark', labelKey: 'basemap.dark', icon: '🌙' },
  { id: 'terrain', labelKey: 'basemap.terrain', icon: '⛰' },
  { id: 'night', labelKey: 'basemap.night', icon: '🌃' },
  { id: 'topo', labelKey: 'basemap.topo', icon: '🗻' },
]

function BasemapSwitcherInner({ basemap, onChange }: BasemapSwitcherProps) {
  const { t } = useLocale()
  return (
    <div className="basemap-switcher">
      {BASEMAPS.map(b => {
        const label = t(b.labelKey)
        return (
          <button
            key={b.id}
            className={`basemap-btn ${basemap === b.id ? 'active' : ''}`}
            onClick={() => onChange(b.id)}
            title={label}
          >
            <span className="basemap-icon">{b.icon}</span>
            <span className="basemap-label">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default memo(BasemapSwitcherInner)
