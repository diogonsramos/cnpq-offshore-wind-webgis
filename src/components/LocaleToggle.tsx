import { memo } from 'react'
import { useLocale } from '../i18n/provider'
import type { Locale } from '../i18n/types'

interface LocaleToggleProps {
  className?: string
}

function LocaleToggleInner({ className }: LocaleToggleProps) {
  const { locale, setLocale, t } = useLocale()
  return (
    <div className={`locale-toggle${className ? ` ${className}` : ''}`} role="group" aria-label={t('tabbar.locale_switch_aria')}>
      {(['pt-BR', 'en'] as Locale[]).map(l => (
        <button
          key={l}
          className={`locale-btn ${locale === l ? 'active' : ''}`}
          onClick={() => setLocale(l)}
        >
          {l === 'pt-BR' ? 'PT' : 'EN'}
        </button>
      ))}
    </div>
  )
}

export default memo(LocaleToggleInner)
