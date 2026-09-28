import { memo } from 'react'
import { useLocale } from '../i18n/provider'
import type { Locale } from '../i18n/types'

interface LocaleToggleProps {
  className?: string
}

function LocaleToggleInner({ className }: LocaleToggleProps) {
  const { locale, setLocale, t } = useLocale()
  
  const labels: Record<Locale, string> = {
    'pt-BR': 'BR',
    'en': 'US',
    'es': 'ES'
  }

  const flags: Record<Locale, string> = {
    'pt-BR': '🇧🇷',
    'en': '🇺🇸',
    'es': '🇪🇸'
  }

  return (
    <div className={`locale-toggle${className ? ` ${className}` : ''}`} role="group" aria-label={t('tabbar.locale_switch_aria')}>
      {(['pt-BR', 'en', 'es'] as Locale[]).map(l => (
        <button
          key={l}
          className={`locale-btn ${locale === l ? 'active' : ''}`}
          onClick={() => setLocale(l)}
          title={l}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}
        >
          <span>{labels[l]}</span>
          <span style={{ fontSize: '0.8em', marginTop: '2px' }}>{flags[l]}</span>
        </button>
      ))}
    </div>
  )
}

export default memo(LocaleToggleInner)
