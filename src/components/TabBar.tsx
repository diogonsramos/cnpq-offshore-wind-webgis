import { memo } from 'react'
import type { TabId } from '../types'
import { useLocale } from '../i18n/provider'
import LocaleToggle from './LocaleToggle'

interface TabBarProps {
  tab: TabId
  onChange: (id: TabId) => void
}

function TabBarInner({ tab, onChange }: TabBarProps) {
  const { t } = useLocale()

  const TABS: { id: TabId; label: string }[] = [
    { id: 'map', label: t('tabbar.map') },
    { id: 'dashboard', label: t('tabbar.dashboard') },
  ]

  return (
    <div className="tab-bar">
      <button className="tab-home-btn" onClick={() => onChange('home')} title={t('tabbar.home_title')}>
        {t('tabbar.home')}
      </button>
      <div className="tab-bar-divider" />
      {TABS.map(tb => (
        <button
          key={tb.id}
          className={`tab-btn ${tab === tb.id ? 'active' : ''}`}
          onClick={() => onChange(tb.id)}
        >
          {tb.label}
        </button>
      ))}
      <div className="tab-bar-spacer" />
      <LocaleToggle className="tab-bar-locale" />
    </div>
  )
}

export default memo(TabBarInner)
