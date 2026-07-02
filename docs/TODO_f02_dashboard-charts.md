# f02 — dashboard-charts

## Goal

Improve the existing chart components: enlarge the Weibull chart in PixelInfoPanel, add Wind Power Density (WPD) vertical profile to both PixelInfoPanel and Dashboard, and display the heatmap data that is already returned by `pixelQuery.ts` but never rendered.

## Files to modify

- `src/components/PixelInfoPanel.tsx`
- `src/components/DashboardView.tsx`
- `src/components/ProfileChart.tsx` (or create `src/components/ProfileChartDual.tsx`)
- `src/components/WeibullChart.tsx`
- `src/App.css`

## Acceptance criteria

- [ ] **Weibull chart enlarged** — minimum height increased from `120px` to `200px`; chart remains responsive
- [ ] **WPD profile in PixelInfoPanel** — new section "Vertical Profile — Power Density" using `data.wpd_profile_means` shown below the existing wind speed profile
- [ ] **WPD profile in Dashboard** — the `wpdProfileData` useMemo already exists in DashboardView; ensure it renders correctly (currently may be hidden or broken)
- [ ] **Heatmap visualization** — create a new small component `<DirectionalHeatmap>` that renders the heatmap grid (wind speed × direction bins) as a styled HTML table or lightweight canvas; data comes from `loc.heatmap` (already populated by `queryDashboardLocation`)
- [ ] **PixelInfoPanel shows heatmap** — when heatmap data is available, render it inside a section titled "Directional Distribution"

## Behavior details

- Weibull chart: keep Chart.js (already used), just increase height. Ensure tooltips and labels remain readable.
- WPD profile: reuse the same Chart.js approach as the wind speed profile, but with different colors (`#D55E00` orange) and axis unit "W/m²"
- Heatmap: the data structure is `Record<string, number[] | null>` where keys are like `ws10_heatmap`, `ws100_heatmap`, etc. Render as a grid: rows = direction sectors (N, NNE, ..., NNW), columns = wind speed bins. Show one heatmap per height selected.
- All charts must handle empty/missing data gracefully (show `<div className="chart-empty">`)

### Self-explanatory charts (mandatory for ALL charts in this feature)

Every chart must be fully self-explanatory. This means:

- **Main title** — descriptive, centered at the top (e.g. "Distribuição Weibull — 100m")
- **X-axis label** — clear text on every X axis (e.g. "Velocidade do Vento (m/s)")
- **Y-axis label** — clear text on every Y axis (e.g. "Densidade de Probabilidade f(v)")
- **Legend** — shown whenever there are multiple datasets/traces; hidden when only one trace
- **Fixed axis ranges** — do NOT auto-scale per location. Use consistent bounds so users can visually compare across different locations without the scale jumping:
  - Weibull PDF: X fixed [0, 30] m/s, Y fixed [0, 0.3]
  - Wind speed profile: X fixed [0, 20] m/s, Y [0, 210] m with tick labels at 10, 50, 100, 150, 200
  - Power density profile: X fixed [0, 1500] W/m², Y [0, 210] m with same tick labels
  - Seasonal bars: Y fixed [0, 20] m/s for ws, [0, 1200] W/m² for wpd
- **Tooltips** — show exact values on hover with units
- **Empty state** — if data is missing for a chart, show `<div className="chart-empty">` with a descriptive message (e.g. "Wind rose data not available for current selection")

### i18n compliance

All text rendered in charts — titles, axis labels, legend entries, tooltips, empty-state messages — must use i18n keys from f06 (`t('dashboard.chart.xxx')`). Even during f02 implementation (before f06 is merged), use the `t('key')` pattern with a comment placeholder so that when f06 is implemented, the keys are already wired.

```ts
// Example: use a simple t() stub during f02
const t = (key: string) => {
  const fallback: Record<string, string> = {
    'dashboard.chart.weibull_title': 'Distribuição Weibull — {height}m',
    'dashboard.chart.wind_speed_axis': 'Velocidade do Vento (m/s)',
    // ... all keys needed
  }
  return fallback[key] || key
}
```

When f06 is merged, this stub is replaced by the real `useLocale()` hook.

## Data flow

```
pixelQuery.queryDashboardLocation()
  → returns DashboardLocationData.heatmap (already implemented)
  → DashboardView passes it to <DirectionalHeatmap>
  → PixelInfoPanel receives via PixelDataSummary (extend if needed)
```

## Test expectations

- [ ] Add note in `docs/TODO.md`: f02 completed
- [ ] Manual check: pixel info panel shows both profiles (ws + wpd)
- [ ] Manual check: Weibull chart is visibly larger
- [ ] Manual check: heatmap grid renders with correct dimensions
- [ ] Manual check: all axes have fixed ranges (zoom into a low-wind location → axis still shows 0–30 m/s)
- [ ] Manual check: chart titles and axis labels display correctly in Portuguese
- [ ] Manual check: empty-state messages appear when data is unavailable

## Claude Code constraints

- No `any`, no `// @ts-ignore`
- Prefer Chart.js over Plotly for the new heatmap to keep bundle size low
- Handle null/undefined heatmap data without breaking the panel
- Remove the non-null assertion `data.weibull[10]!.k` in PixelInfoPanel — use optional chaining
- **Fixed axis ranges are NOT optional** — auto-scaling is explicitly forbidden for all dashboard charts
- All chart text must be compatible with i18n (use the `t('key')` stub pattern if f06 is not yet merged)
