# f06 — i18n (pt-BR / English)

## Goal

Add full internationalization support so the entire application can switch between Brazilian Portuguese and English. All UI text — landing page, WebGIS sidebar, dashboard, pixel info panel, FAQ, project info, and metadata — must be translated without hardcoding strings.

## Architecture decision

Use **React Context** for locale state — no external i18n library. The project already avoids Zustand/Redux, and adding `react-intl` or `i18next` would be overkill for only two locales.

```
src/
  i18n/
    pt-BR.ts       # Portuguese translations (flat key-value object)
    en.ts          # English translations
    provider.tsx   # LocaleProvider + useLocale() hook
    types.ts       # TranslationKeys type derived from the objects
```

## Files to create

- `src/i18n/pt-BR.ts` — all Portuguese strings (~200+ keys)
- `src/i18n/en.ts` — all English strings (same shape as pt-BR, ~200+ keys)
- `src/i18n/provider.tsx` — `LocaleProvider` with `useState<'pt-BR' | 'en'>`, `useLocale()` hook returning `(key: string, params?) => string`
- `src/i18n/types.ts` — type generation from translation objects

## Files to modify

- `src/App.tsx` — wrap children with `<LocaleProvider>`; add locale toggle state/UI
- `src/components/LandingPage.tsx` — replace all hardcoded strings with `t('key')`
- `src/components/SidePanel.tsx` — labels, placeholders, footer text
- `src/components/DashboardView.tsx` — filter labels, empty states, button text
- `src/components/PixelInfoPanel.tsx` — section titles, labels, button text
- `src/components/BasemapSwitcher.tsx` — basemap names
- `src/components/TabBar.tsx` — tab labels
- `src/components/FAQPanel.tsx` — all Q&A pairs (may need to dual-source from i18n)
- `src/components/ProjectInfoPanel.tsx` — all text (may need to dual-source from i18n)
- `src/lib/metadata.ts` — no changes if FAQ/ProjectInfo read from i18n keys instead

### No changes needed
- `src/components/MapView.tsx` — no user-facing strings (map is visual)
- `src/lib/cogCatalog.ts` — data labels (datasetLabel, varLabel) are technical terms
- `src/lib/pixelQuery.ts` — no UI strings

## Translation key organization

Group keys by component/section with dot notation:

```ts
// pt-BR.ts (shape)
{
  landing: {
    hero: {
      title: "Cenário atual e futuro do recurso eólico offshore no Brasil",
      subtitle: "Plataforma WebGIS para visualização e análise...",
      cta_primary: "Abrir WebGIS Map",
      cta_secondary: "Abrir Analytical Dashboard",
    },
    nav: { ... },
    stats: { ... },
    tech: { ... },
    scenarios: { ... },
    gallery: { ... },
    team: { ... },
    publications: { ... },
    faq: { ... },
    footer: { ... },
  },
  sidepanel: {
    header_title: "CNPq WebGIS",
    header_subtitle: "Visualizador de COGs — {model}",
    model_label: "Modelo",
    experiment_label: "Experimento",
    variable_label: "Variável",
    height_label: "Altura",
    season_label: "Estação",
    bathy_label: "Mostrar shapefiles",
    faq_button: "FAQ",
    project_button: "Projeto",
    dashboard_button: "Dashboard",
  },
  dashboard: {
    experiment_label: "Experimento",
    model_label: "Modelo",
    variable_label: "Variável",
    height_label: "Altura",
    add_location: "+ Add Location",
    remove_all: "Remove All",
    empty_state: "Click the map or enter coordinates to add locations.",
    download_csv: "Download CSV",
  },
  pixel: {
    header: "Pixel Info",
    loading: "Loading data...",
    click_hint: "Click map to query",
    lat: "Latitude",
    lon: "Longitude",
    pixel_id: "Pixel ID",
    state: "State",
    bathy: "Bathymetry",
    dist_coast: "Dist. Costa",
    wind_speed: "Wind Speed",
    weibull: "Weibull Parameters",
    pin: "Pin This Location",
    dashboard: "Open Global Time-Series Dashboard",
  },
  basemap: {
    street: "Street",
    satellite: "Satellite",
    dark: "Dark",
    terrain: "Terrain",
    night: "Night",
    topo: "Topographic",
  },
  tabbar: {
    home: "← Home",
    map: "WebGIS Map",
    dashboard: "Analytical Dashboard",
  },
  faq: [
    // 20 items, each with { q, a } both translated
  ],
  project: {
    funding_title: "...",
    grant_number: "...",
    // etc
  },
}
```

## Acceptance criteria

- [ ] All user-facing strings in LandingPage, SidePanel, DashboardView, PixelInfoPanel, FAQPanel, ProjectInfoPanel, TabBar, BasemapSwitcher are wrapped with `t('key')`
- [ ] Locale switcher UI: a small toggle in TabBar or SidePanel footer showing "PT | EN"
- [ ] Changing locale instantly re-renders all text without page reload
- [ ] FAQ and ProjectInfo texts are fully translated (20 Q&A pairs + funding/research text)
- [ ] Locale choice persists in `localStorage` across sessions
- [ ] Numbers/formats: keep "." decimal separator (no locale-aware number formatting needed for scientific data)
- [ ] Fallback: missing key shows `!!keyName!!` for easy debugging
- [ ] No untranslated strings remain in the two locale files

## What NOT to translate

- Data values (lat/lon, wind speed, units like "m/s", "W/m²")
- Technical acronyms (WRF, MPAS, COG, ERA5, SSP2-4.5, CMIP6, QDM)
- Variable names (ws, wpd)
- Coastal state abbreviations (AL, AP, BA, ...)
- CSS classes, HTML attributes, aria-labels that are structural

## Test expectations

- [ ] `pnpm test` passes (existing tests check Portuguese strings — default locale is pt-BR)
- [ ] Manual: switch to English → all text changes, no broken layout
- [ ] Manual: switch back to Portuguese → all text reverts
- [ ] Manual: refresh → locale persists from localStorage

## Claude Code constraints

- No `any`, no `// @ts-ignore`
- No external i18n packages — pure React Context
- `t()` signature: `(key: string, params?: Record<string, string | number>) => string`
- Translation files must be strongly typed — missing key causes TS error
- Keep locale state in App.tsx, read via context in leaf components
