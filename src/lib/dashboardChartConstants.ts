import Plotly from 'plotly.js/dist/plotly'

export const SEASON_ORDER = ['ANNUAL', 'DJF', 'MAM', 'JJA', 'SON']

export const SEASON_LABELS: Record<string, string> = {
  ANNUAL: 'Anual', DJF: 'DJF (Verão)',
  MAM: 'MAM (Outono)', JJA: 'JJA (Inverno)', SON: 'SON (Primavera)',
}

export const SECTOR_LABELS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

export const HEIGHT_TICKVALS = [10, 50, 100, 150, 200]
export const HEIGHT_TICKTEXT = ['10m', '50m', '100m', '150m', '200m']

// Okabe-Ito colorblind-safe palette (ColorBrewer/Tableau-equivalent accessibility)
export const CHART_COLORS = ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#F0E442', '#56B4E9', '#E69F00', '#000000']

// Same low/high gradient endpoints as DirectionalHeatmap.tsx, reused for the wind
// rose's sector fill so "warmer = faster" reads consistently across the dashboard.
const WS_LOW_COLOR: [number, number, number] = [0, 114, 178] // Okabe-Ito blue
const WS_HIGH_COLOR: [number, number, number] = [213, 94, 0] // Okabe-Ito vermillion

export function windSpeedColor(value: number, max: number): string {
  if (max <= 0 || !isFinite(value)) return 'rgba(150,150,150,0.5)'
  const ratio = Math.max(0, Math.min(1, value / max))
  const r = Math.round(WS_LOW_COLOR[0] + (WS_HIGH_COLOR[0] - WS_LOW_COLOR[0]) * ratio)
  const g = Math.round(WS_LOW_COLOR[1] + (WS_HIGH_COLOR[1] - WS_LOW_COLOR[1]) * ratio)
  const b = Math.round(WS_LOW_COLOR[2] + (WS_HIGH_COLOR[2] - WS_LOW_COLOR[2]) * ratio)
  return `rgb(${r},${g},${b})`
}

export const WS_LEGEND_GRADIENT = `linear-gradient(to right, rgb(${WS_LOW_COLOR.join(',')}), rgb(${WS_HIGH_COLOR.join(',')}))`

// Matches the bathy_zone categories actually present in the per-pixel GeoParquet
// data (not the COG raster's BathyBand crop regions, which include '0_100').
export const BATHY_ZONE_OPTIONS: { val: string; label: string }[] = [
  { val: '0_20', label: '0 – 20 m' },
  { val: '20_50', label: '20 – 50 m' },
  { val: '50_100', label: '50 – 100 m' },
]

export const DISTANCE_MAX_NM = 400

// Official maritime distance-from-coast boundaries (mar territorial, zona
// contígua-equivalente, ZEE) — nested from 0, unlike the disjoint bathymetry
// bins, so picking one just sets the upper bound of the filtered range.
export const DISTANCE_ZONE_OPTIONS: { val: string; label: string; max: number }[] = [
  { val: '0_12', label: '0 – 12 nm', max: 12 },
  { val: '0_20', label: '0 – 20 nm', max: 20 },
  { val: '0_200', label: '0 – 200 nm', max: 200 },
]

// Shared font size for every dashboard chart's title/axis/legend text, so
// switching between subplots doesn't shift the reading size.
export const CHART_FONT = { size: 12 }

// Shared hover box styling: a translucent panel (readable over any subplot
// background) sized to match CHART_FONT instead of Plotly's tiny default.
export const HOVER_LABEL_STYLE = {
  bgcolor: 'rgba(255,255,255,0.92)',
  bordercolor: 'rgba(0,0,0,0.15)',
  font: { size: 12 },
}

// Shared Plotly config for every dashboard chart: enables the modebar but keeps
// only the PNG-export button — zoom/pan/lasso/select/hover-mode tools are dropped
// since these are read-only analytical charts where that cluster is just clutter.
// displaylogo:false removes the Plotly watermark.
export const PLOT_CONFIG = {
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: [
    'lasso2d', 'select2d', 'zoom2d', 'pan2d',
    'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d',
    'hoverClosestCartesian', 'hoverCompareCartesian',
  ],
  responsive: true,
  toImageButtonOptions: {
    format: 'png',
    filename: 'webgis-chart',
    height: 600,
    width: 900,
  },
}

// Plotly's built-in "home" icon (fonts/ploticon.js), reused for a custom modebar
// button — polar/scatterpolar charts get no built-in reset button (only
// cartesian/geo/3d/mapbox subplots do), so a zoomed wind rose has no way back
// to the original view besides reloading the page.
const RESET_POLAR_ICON = {
  width: 928.6,
  height: 1000,
  path: 'm786 296v-267q0-15-11-26t-25-10h-214v214h-143v-214h-214q-15 0-25 10t-11 26v267q0 1 0 2t0 2l321 264 321-264q1-1 1-4z m124 39l-34-41q-5-5-12-6h-2q-7 0-12 3l-386 322-386-322q-7-4-13-4-7 2-12 7l-35 41q-4 5-3 13t6 12l401 334q18 15 42 15t43-15l136-114v109q0 8 5 13t13 5h107q8 0 13-5t5-13v-227l122-102q5-5 6-12t-4-13z',
  transform: 'matrix(1 0 0 -1 0 850)',
}

// Wind rose-only variant of PLOT_CONFIG: adds a "reset zoom" button that
// restores the radial axis to autorange after the user zooms in.
export const WINDROSE_PLOT_CONFIG = {
  ...PLOT_CONFIG,
  modeBarButtonsToAdd: [{
    name: 'resetPolarView',
    title: 'Resetar zoom',
    icon: RESET_POLAR_ICON,
    click: (gd: HTMLElement) => Plotly.relayout(gd, { 'polar.radialaxis.autorange': true }),
  }],
}
