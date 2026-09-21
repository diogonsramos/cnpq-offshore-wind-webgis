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
- `src/lib/pixelQuery.ts` — extend `queryDashboardLocation` to accept experiment+model pair OR ensure multiple pairs can be queried; add `queryFilteredPixels()` for GeoParquet Explorer
- `src/components/GeoParquetExplorer.tsx` (new) — filter form + aggregate statistics + charts for the 4th dashboard tab
- `src/components/FilterHistogram.tsx` (new) — histogram of per-pixel means across filtered set
- `src/components/FilterBoxplot.tsx` (new) — boxplot by filter category (state, bathy zone, etc.)
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

### GeoParquet Explorer (4th dashboard tab)

- [ ] **New internal tab "GeoParquet Explorer"** — add a 4th tab to the secondary tab bar inside DashboardView
- [ ] **Filter panel** — user selects:
  - Model (WRF/MPAS)
  - Experiment (any of the 7)
  - Variable (ws/wpd)
  - Height (10/50/100/150/200 m)
  - Bathy zone (checkboxes: 0–20m, 20–50m, 50–100m, 100+)
  - State (checkboxes: BA, RN, CE, PE, ... 17 coastal states)
  - Distance from coast (range slider: 0–400 nm, dual-handle)
- [ ] **Filters are applied by querying pre-computed GeoParquet data** — NO local computation of physical values; the GeoParquet already stores per-pixel stats (mean, std, min, max, weibull, profile, wind_rose) for each pixel. The explorer aggregates these pre-computed values across the filtered pixel set.
- [ ] **Aggregate statistics** — after filtering, display:
  - Pixel count matching filters
  - Aggregated mean (mean of per-pixel means)
  - Aggregated std (std of per-pixel means)
  - Min and max of per-pixel means
  - Coefficient of variation (CV = σ/μ)
- [ ] **Histogram** — distribution of per-pixel means for the selected variable+height across all filtered pixels
- [ ] **Boxplot by filter category** — if a categorical filter is active (e.g. state or bathy_zone), show a boxplot grouping per-pixel means by category
- [ ] **Scatter plot** — distance from coast (x-axis) vs per-pixel mean (y-axis), with optional regression line overlay
- [ ] **Profile comparison** — overlay mean vertical profiles for each selected categorical group (e.g. WRF profile vs MPAS profile for the same filtered region)
- [ ] **All charts self-explanatory** — fixed axis ranges, titles, axis labels, legends (same rule as other dashboard tabs)
- [ ] **i18n keys** — all filter labels, section titles, chart titles, axis labels use `t('geoparquet_explorer.xxx')` pattern
- [ ] **No re-render on unrelated state change** — memo guards prevent unnecessary queries when toggling other tabs

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

### GeoParquet Explorer tab

**Core principle: ALL data comes from pre-computed GeoParquet columns. No local computation of wind speed, Weibull parameters, or any physical value.** The GeoParquet already stores per-pixel aggregate statistics. The explorer simply:
1. Loads the parquet for the selected experiment+model (already implemented in `pixelQuery.ts`)
2. Filters the in-memory pixel array by user criteria (state, bathy_zone, distance range)
3. Aggregates the pre-computed per-pixel stats across the filtered set
4. Renders charts (histogram, boxplot, scatter, profile) using these aggregates

**Filter controls layout:**

```
┌─ GeoParquet Explorer ──────────────────────────────────────┐
│  Modelo: [WRF ▼]   Experimento: [ERA5 Histórico ▼]        │
│  ───────────────────────────────────────────────────────── │
│  ☑ Batimetria:  □ 0–20m  □ 20–50m  □ 50–100m  □ 100m+   │
│  ☑ Estado:      □ BA  □ RN  □ CE  □ PE  □ SE ...         │
│  ☑ Dist. costa: [●────●───────────]  0 – 120 nm           │
│  ☑ Altura:      [100m ▼]   Variável: [ws ▼]              │
│  [🔄 Aplicar Filtros]    ↻ 1.240 pixels encontrados       │
├─ Estatísticas Agregadas ───────────────────────────────────┤
│  Média: 8.7 m/s   Mediana: 8.5 m/s   Desv. Padrão: 1.2   │
│  Mín: 4.2 m/s     Máx: 12.1 m/s      CV: 14.2%           │
├─ Gráficos ─────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Histograma  │  │ Boxplot por  │  │ Distância vs │    │
│  │  ws(100m)    │  │ estado       │  │ ws(100m)     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐                                        │
│  │ Perfil vert. │  [📥 Exportar CSV dos resultados]     │
│  │ WRF vs MPAS  │                                        │
│  └──────────────┘                                        │
└───────────────────────────────────────────────────────────┘
```

**Filter behavior:**
- "Aplicar Filtros" button triggers the query. Filters are NOT applied on every change (to avoid recomputation during multi-select adjustments).
- If no filter is selected for a category, that category is ignored (all states, all bathy zones).
- The distance slider has a minimum range of 10 nm to avoid zero-pixel results.
- Results are cached in memory keyed by `model+experiment+variable+height+fingerprint(hash of selected filters)`.

**Available per-pixel columns for aggregation** (all pre-computed in GeoParquet, no local calculus):
- `mean_ws_10m` through `mean_ws_200m`
- `mean_wpd_10m` through `mean_wpd_200m`
- `ws_profile_means`, `wpd_profile_means`
- `weibull_k`, `weibull_c` per height
- `state`, `bathy_zone`, `distance_nm` (from original pixel metadata)

**Charts:**
- **Histogram:** 20 bins, X axis: wind speed (0–20 m/s for ws) or power density (0–1500 W/m² for wpd), Y axis: pixel count. Fixed axis ranges (same as other dashboard charts).
- **Boxplot by state:** one box per coastal state that has pixels in the filtered set. Y axis: wind speed or power density (same fixed range). Only shown when state filter is NOT active (i.e., all states are included).
- **Boxplot by bathy zone:** one box per bathy zone. Only shown when bathy zone filter is NOT active.
- **Scatter:** distance_nm (X, 0–400 nm) vs per-pixel mean (Y, 0–20 m/s or 0–1500 W/m²). Optional linear regression trendline (computed locally — this is a simple statistical fit, not a physical model).
- **Profile comparison:** if filtering across multiple models (e.g. state=BA, no model filter), show WRF mean profile vs MPAS mean profile as two overlaid traces. If only one model selected, show a single profile trace with confidence interval (mean ± std).

**Fixed axis ranges (same as other tabs):**
- Histogram ws X: 0–20 m/s
- Histogram wpd X: 0–1500 W/m²
- Boxplot Y: 0–20 m/s (ws) or 0–1500 W/m² (wpd)
- Scatter X: 0–400 nm, Y: 0–20 m/s or 0–1500 W/m²
- Profile X: 0–20 m/s or 0–1500 W/m², Y: 0–210 m (tick labels at 10, 50, 100, 150, 200)

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
        ├── CompareModels
        │     └── for selected experiment:
        │           queryDashboardLocation(lat, lon, 'wrf', experiment)
        │           queryDashboardLocation(lat, lon, 'mpas', experiment)
        │           render dual-trace charts with WRF/MPAS comparison
        └── GeoParquetExplorer
              └── for selected {model, experiment, variable, height, filters}:
                    loadParquet(model, experiment)  ← already cached from other tabs
                    queryFilteredPixels(filters)    ← NEW function
                    → returns { count, mean, std, min, max, histogram[], boxplot_data, scatter_data }
                    render aggregate stats + charts
```

The `pixelQuery.ts` module must be extended:
- `queryDashboardLocation(lat, lon, model?, experiment?)` — current signature already accepts model in `loadParquet`. Make `queryDashboardLocation` work with arbitrary model+experiment pairs, not just the globally loaded one.
- Cache results in a `Map<string, DashboardLocationData>` to avoid redundant fetches.
- **NEW**: `queryFilteredPixels(filters: FilterCriteria): FilteredAggregates` — filters already-loaded pixels by state/bathy_zone/distance and returns aggregate statistics across the set. NO local computation of physical values — only aggregates existing per-pixel stats (mean, std, min, max) from the GeoParquet.
- **FilterCriteria interface:**
  ```ts
  interface FilterCriteria {
    model: string
    experiment: string
    variable: 'ws' | 'wpd'
    height: number  // 10 | 50 | 100 | 150 | 200
    states?: string[]      // empty = all states
    bathyZones?: string[]  // empty = all zones
    distanceMin?: number   // nm
    distanceMax?: number   // nm
  }
  ```
- **FilteredAggregates return type:**
  ```ts
  interface FilteredAggregates {
    count: number
    mean: number
    median: number
    std: number
    min: number
    max: number
    cv: number
    histogram: { binStart: number; binEnd: number; count: number }[]
    byState?: { state: string; count: number; mean: number; std: number; values: number[] }[]
    byBathyZone?: { zone: string; count: number; mean: number; std: number; values: number[] }[]
    distances: number[]   // for scatter plot
    values: number[]      // matching per-pixel means for scatter
    profiles?: { height: number; wrfMean: number; mpasMean: number }[]  // when both models loaded
  }
  ```

## Test expectations

### GeoParquet Explorer
- [ ] Manual check: 4th tab "GeoParquet Explorer" visible in dashboard tab bar
- [ ] Manual check: filter panel shows Model, Experiment, Variable, Height, Bathy zone checkboxes, State checkboxes, Distance slider
- [ ] Manual check: selecting state=BA, bathy=0–20m, dist=0–50 nm → results update with pixel count > 0
- [ ] Manual check: histogram renders with correct bin count and fixed X axis range
- [ ] Manual check: boxplot shows one box per state (when no state filter applied)
- [ ] Manual check: scatter plot shows distance vs mean with correct axis ranges
- [ ] Manual check: profile comparison appears when multiple models selected
- [ ] Manual check: "Aplicar Filtros" button must be clicked to trigger query (no auto-query on every filter change)
- [ ] Manual check: switching to English → all filter labels, section titles, chart axes update
- [ ] Manual check: console shows no errors during filter operations
- [ ] Manual check: switching away from the tab and back preserves filter state

### All tabs
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
- **GeoParquet Explorer MUST NOT compute physical values locally** — all aggregate statistics must derive from pre-computed columns in the GeoParquet files. Only simple arithmetic (mean of means, std of means, histogram binning) is allowed.
- The `queryFilteredPixels` function filters the in-memory pixel array; it does NOT fetch new data from the network (the parquet is already loaded via `loadParquet`)
