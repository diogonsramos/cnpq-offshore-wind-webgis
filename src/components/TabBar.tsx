import { memo } from 'react'

export type TabId = 'map' | 'dashboard'

interface TabBarProps {
  tab: TabId
  onChange: (id: TabId) => void
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'map', label: 'WebGIS Map' },
  { id: 'dashboard', label: 'Analytical Dashboard' },
]

function TabBarInner({ tab, onChange }: TabBarProps) {
  return (
    <div className="tab-bar">
      {TABS.map(t => (
        <button
          key={t.id}
          className={`tab-btn ${tab === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export default memo(TabBarInner)
