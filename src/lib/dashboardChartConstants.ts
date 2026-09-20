import type { Config } from 'plotly.js'

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
  { val: '0 a -20 m', label: '0 – 20 m' },
  { val: '-20 a -50 m', label: '20 – 50 m' },
  { val: '-50 a -100 m', label: '50 – 100 m' },
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
export const PLOT_CONFIG: Partial<Config> = {
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: [
    'lasso2d', 'select2d',
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
