# f01 — dashboard-controls

## Goal

Enable experiment/model selectors inside the Dashboard tab, add a COG opacity slider to the SidePanel, and wire everything through global state in `App.tsx`. Additionally, extend the Dashboard with a **multi-experiment and multi-model comparison mode** using **internal tabs** for different analysis views.

## Background

Currently the Dashboard's experiment `<select>` is hardcoded with `disabled`, and there is no model selector (WRF/MPAS) inside the Dashboard view. The COG raster overlay uses a fixed `raster-opacity: 0.7` with no user control. Furthermore, the Dashboard only shows data for a single experiment/model at a time — users cannot compare ERA5 presente vs SSP2 presente, ERA5 histórico vs CMIP6 histórico, or WRF vs MPAS side by side.

## Files to modify

- `src/components/DashboardView.tsx` — major refactor
- `src/components/DashboardComparisonView.tsx` (new) — dedicated comparison view
- `src/components/MapView.tsx`
- `src/components/SidePanel.tsx`
- `src/components/BasemapSwitcher.tsx` (if needed)
- `src/App.tsx`
- `src/App.css`
- `src/lib/pixelQuery.ts` — extend `queryDashboardLocation` to accept experiment+model pair OR ensure multiple pairs can be queried
- `src/i18n/pt-BR.ts` and `src/i18n/en.ts` (after f06 merge) — ensure all new labels, titles and legends are translated

## Acceptance criteria

### Selectors & opacity

- [ ] **Experiment selector enabled** — remove `disabled` from `<select className="dv-select">` in DashboardView; changing the experiment updates the map COG and parquet query
- [ ] **Model selector added to Dashboard** — a `<select>` for WRF/MPAS synced with the same state in App.tsx; changing the model in either Dashboard or SidePanel updates both
- [ ] **COG opacity slider** — a range input (0.1–1.0, step 0.1) in SidePanel → "Shapefiles de Batimetria" accordion or a new accordion section named "Camada COG"
- [ ] **Opacity state lives in App.tsx** — `useState<number>(0.7)` passed down to SidePanel and MapView
- [ ] **MapView applies dynamic opacity** — replace the hardcoded `0.7` in `raster-opacity` paint property with the prop value
- [ ] **No re-render loops** — memo guards prevent cascade updates when unrelated state changes

### Multi-experiment & multi-model comparison

- [ ] **Internal dashboard tabs** — add a secondary tab bar inside DashboardView with at least 3 tabs:
  - `"Simple View"` — current single-experiment, single-model dashboard (default)
  - `"Compare Experiments"` — select 2 or more experiment/model pairs to overlay on all charts
  - `"Compare Models"` — pin a location and compare WRF vs MPAS output for the same experiment
- [ ] **Compare Experiments tab** — user can select multiple (2 or 3) experiment+model pairs via checkboxes or multi-select. All charts render traces for each selected pair with distinct colors and a unified legend.
- [ ] **Compare Models tab** — user selects one experiment and one location. Charts show WRF trace vs MPAS trace side by side/overlaid.
- [ ] **Data loading** — `queryDashboardLocation` must be called once per experiment+model pair. Cache results in memory to avoid re-fetching on tab switch.
- [ ] **Colors** — use a consistent, accessible color palette (ColorBrewer or Tableau 10). Each experiment/model pair gets a fixed color across all charts.
- [ ] **Legend** — a single unified legend at the top or side of the chart grid, shared across all charts in the comparison view.

## Behavior details

### Simple View (existing, extended)
- Experiment selector: label "Experimento", options matching SidePanel, with scientific labels (e.g. "ERA5 Histórico" not "ERA5_atlas_historico")
- Model selector: label "Modelo", two options "WRF" and "MPAS"
- COG slider: label "Opacidade do COG", displays percentage
- All changes reflect on map immediately

### Compare Experiments tab
- Multi-select interface: checkboxes for each experiment+model pair (e.g. ☐ WRF ERA5 Histórico, ☐ WRF SSP2-4.5 Presente, ☐ MPAS SSP5-8.5 Futuro, etc.)
- Limit to 3 simultaneous selections to keep charts readable
- Charts: seasonal bars, wind profiles, Weibull PDF, wind rose — each overlays traces for all selected pairs
- A single shared legend identifies each trace by experiment+model+color

### Compare Models tab
- Single experiment selector + single location
- Two traces per chart: WRF (solid line) vs MPAS (dashed line) with same color hue
- Charts: all 5 chart types with dual traces
- "Difference" metric shown as annotation or subplot (e.g. WRF vs MPAS % difference for mean wind speed)

### Self-explanatory charts (apply to all tabs)
- Every chart must have: **main title**, **X-axis label**, **Y-axis label**, **legend** (when multiple traces)
- **Fixed axis ranges** — do NOT auto-scale per location. Set consistent bounds so users can visually compare across locations:
  - Weibull PDF X: 0–30 m/s, Y: 0–0.3
  - Wind rose: 0–100% radial
  - Profile (WS) X: 0–20 m/s, Y: height labels (10, 50, 100, 150, 200m)
  - Profile (WPD) X: 0–1500 W/m², Y: height labels (10, 50, 100, 150, 200m)
  - Seasonal bars Y: 0–20 m/s (ws) or 0–1200 W/m² (wpd)
- All text labels, titles, axis labels and legends must use i18n keys (for pt-BR/EN switching after f06)

### i18n requirements
- All dashboard labels, chart titles, axis labels, legends, tab names, button texts must use the `t('dashboard.xxx')` pattern from f06
- Chart titles: e.g. `t('dashboard.chart.seasonal_title', { variable, height })`
- Axis labels: `t('dashboard.chart.wind_speed_axis')`, `t('dashboard.chart.height_axis')`
- Tab labels: `t('dashboard.tab.simple')`, `t('dashboard.tab.compare_exp')`, `t('dashboard.tab.compare_model')`

## Data flow

```
App.tsx (global state: model, dataset)
  │
  └── DashboardView
        ├── SimpleView (single model+experiment → single queryDashboardLocation call)
        ├── CompareExperiments
        │     └── for each selected pair {model, experiment}:
        │           queryDashboardLocation(lat, lon, model, experiment)  ← extend function signature
        │           store in Map<"model-experiment-key", DashboardLocationData>
        │           render multi-trace charts
        └── CompareModels
              └── for selected experiment:
                    queryDashboardLocation(lat, lon, 'wrf', experiment)
                    queryDashboardLocation(lat, lon, 'mpas', experiment)
                    render dual-trace charts with WRF/MPAS comparison
```

The `pixelQuery.ts` module must be extended:
- `queryDashboardLocation(lat, lon, model?, experiment?)` — current signature already accepts model in `loadParquet`. Make `queryDashboardLocation` work with arbitrary model+experiment pairs, not just the globally loaded one.
- Cache results in a `Map<string, DashboardLocationData>` to avoid redundant fetches.

## Test expectations

- [ ] Add note in `docs/TODO.md`: f01 completed
- [ ] Manual check: switch experiment in Dashboard → map COG layer reloads
- [ ] Manual check: slide opacity → raster becomes more/less transparent
- [ ] Manual check: Compare Experiments tab renders 2–3 traces per chart
- [ ] Manual check: Compare Models tab shows WRF vs MPAS dual traces
- [ ] Manual check: all axes have fixed ranges (same bounds regardless of location or data range)
- [ ] Manual check: switch to English → all chart titles, legends, tabs, labels update
- [ ] Manual check: switch language → axis labels update

## Claude Code constraints

- No `any` types, no `// @ts-ignore`
- No new packages — pure React + TypeScript
- All new UI strings must go through i18n (use `t('key')` pattern, even if the key is created in this feature and the actual translations will be completed in f06)
- Fixed axis ranges must be enforced at the component level — do NOT rely on Plotly/Chart.js auto-scaling
- Use `useMemo` + `React.memo` extensively — comparison mode renders 3× the chart data
- Do NOT modify existing E2E test files — add new tests only
- Chart color palette: use ColorBrewer Set1 or Tableau 10 for accessibility
