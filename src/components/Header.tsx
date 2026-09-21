import { memo, useCallback } from 'react'
import type { TabId } from '../types'
import { useLocale } from '../i18n/provider'
import LocaleToggle from './LocaleToggle'
import './Header.css'

interface HeaderProps {
  tab: TabId
  onNavigate: (id: TabId) => void
  onOpenFAQ?: () => void
}

function HeaderInner({ tab, onNavigate, onOpenFAQ }: HeaderProps) {
  const { t } = useLocale()
  const logoBase = import.meta.env.BASE_URL + 'images/logos/'

  const handleNav = useCallback((targetTab: TabId, anchorId?: string) => {
    onNavigate(targetTab)
    if (anchorId) {
      setTimeout(() => {
        const el = document.getElementById(anchorId)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [onNavigate])

  return (
    <header className="global-header">
      <div className="gh-inner">
        <div className="gh-logos" onClick={() => handleNav('home')} style={{ cursor: 'pointer' }}>
          <img src={logoBase + 'logo-cnpq.png'} alt="CNPq" className="gh-logo-img" />
          <div className="gh-logo-divider" />
          <img src={logoBase + 'logo-senai-cimatec.png'} alt="SENAI CIMATEC" className="gh-logo-img" />
        </div>

        <nav className="gh-nav">
          <button 
            className={`gh-nav-link ${tab === 'home' ? 'active' : ''}`} 
            onClick={() => handleNav('home', 'inicio')}
          >
            Home
          </button>
          <button 
            className="gh-nav-link" 
            onClick={() => handleNav('home', 'metodologia')}
          >
            Projeto & Metodologia
          </button>
          <button 
            className={`gh-nav-link ${tab === 'map' ? 'active' : ''}`} 
            onClick={() => handleNav('map')}
          >
            WebGIS
          </button>
          <button 
            className={`gh-nav-link ${tab === 'dashboard' ? 'active' : ''}`} 
            onClick={() => handleNav('dashboard')}
          >
            Dashboard
          </button>
        </nav>

        <div className="gh-actions">
          <LocaleToggle className="gh-locale" />
        </div>
      </div>
    </header>
  )
}

export default memo(HeaderInner)
