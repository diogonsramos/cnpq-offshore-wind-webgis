import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ptBR } from './pt-BR'
import { en } from './en'
import type { Locale, TranslationKey } from './types'

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { 'pt-BR': ptBR, en }
const STORAGE_KEY = 'cnpq-webgis-locale'

type TranslateFn = (key: TranslationKey, vars?: Record<string, string | number>) => string

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslateFn
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStoredLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'en' ? 'en' : 'pt-BR'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readStoredLocale)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const t = useCallback<TranslateFn>((key, vars) => {
    const dict = DICTIONARIES[locale]
    let str = dict[key] ?? `!!${key}!!`
    if (vars) {
      for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{{${k}}}`, String(v))
    }
    return str
  }, [locale])

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale, t }), [locale, t])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider')
  return ctx
}
