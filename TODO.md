# f03 — ui-enhancements

## Goal

Improve user feedback and add convenience features: loading indicators for COG rendering, console.log cleanup, CSV data export from Dashboard, fullscreen chart toggle, and an enhanced wind rose with mean wind speed coloring.

## Files to modify

- `src/components/MapView.tsx`
- `src/components/DashboardView.tsx`
- `src/components/PixelInfoPanel.tsx`
- `src/components/BasemapSwitcher.tsx`
- `src/lib/pixelQuery.ts`
- `src/App.css`

## Acceptance criteria

### Loading state for COG

- [x] Add a subtle spinner or skeleton overlay while `renderCog` is in progress
- [x] Use a `<div className="cog-loading">` positioned over the map container, visible only during COG fetch/render
- [x] The loading indicator should not block map interactions (pointer-events: none)

### Console.log removal

- [x] Remove or guard the `console.log('PixelQuery: loaded...')` in `pixelQuery.ts:190` — replace with `console.debug` or remove entirely in production

### CSV export

- [x] Add a "Download CSV" button in DashboardView, positioned in the `.dv-filter-bar` area
- [x] Export format: columns = location, variable, height, season, mean, min, max, std
- [x] Include all pinned locations and all seasons in one CSV file
- [x] File name: `webgis-dashboard-{YYYY-MM-DD}.csv`
- [x] Use `Blob` + `URL.createObjectURL` + hidden `<a>` click pattern (no extra dependency)

### Fullscreen charts

- [x] Add a fullscreen toggle button (expand icon) to each `.chart-card` in DashboardView
- [x] On click, the chart card expands to fill the viewport (position fixed, z-index overlay)
- [x] Use a CSS class `.chart-card--fullscreen` with backdrop
- [x] Second click or Escape key restores original layout

### Enhanced wind rose

- [x] Current wind rose shows frequency only. Add color mapping: sectors with higher mean wind speed get darker/warmer fill
- [x] Use `wr[s]?.mean_ws` to determine color intensity via a simple linear scale
- [x] Add a small color legend next to the wind rose

### Extra basemaps

- [x] Expand `BasemapSwitcher.tsx` to include more options:
  - `terrain` — MapLibre terrain RGB tiles with hillshading
  - `night` — NASA Black Marble or CARTO dark matter (already have dark, consider a lights-at-night variant)
  - `topo` — OpenTopoMap or USGS topo tiles
- [x] Each new basemap needs its tile URL, attribution, and entry in `BASEMAP_TILES` inside `MapView.tsx`
- [x] Update `BASEMAP_SRC_IDS` and layer management to handle 5+ basemaps
- [x] Basemap switcher UI: keep compact, consider a scrollable row or dropdown if too many buttons

### Export map / chart as image

- [x] **Map screenshot:** Add a "📷 Screenshot" button on the map area (top-right corner). On click:
  - Capture the map canvas via `map.getCanvas().toDataURL()`
  - Overlay a watermark "CNPq WebGIS — {model} {dataset} {variable} {height}m"
  - Download as PNG with filename `webgis-map-{YYYY-MM-DD}.png`
- [x] **Chart export via Plotly toolbar:** Re-enable `displayModeBar` selectively — keep only `toImageAsImage` and `downloadImage` buttons (remove zoom/pan to avoid clutter). Alternatively, add a custom "Download Chart" button per chart-card that uses `Plotly.downloadImage(graphDiv, {format: 'png'})`
- [x] Both exports must work offline (no external services)

## Test expectations

- [x] Add note in `docs/TODO.md`: f03 completed
- [x] Manual check: loading spinner appears briefly when panning the map
- [x] Manual check: CSV downloads with correct data
- [x] Manual check: fullscreen toggle works for each chart
- [x] Manual check: wind rose shows color variation by speed
- [x] Manual check: each new basemap loads without console errors
- [x] Manual check: map screenshot downloads a valid PNG with watermark
- [x] Manual check: chart image download produces a readable PNG

## Claude Code constraints

- No `any`, no `// @ts-ignore`
- No new npm packages
- CSV export must handle missing/null values gracefully (write empty string)
- Fullscreen overlay must have a close button for touch devices
- Spinner should use CSS animation (no external GIF/SVG assets)
