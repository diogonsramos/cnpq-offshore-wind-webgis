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

// Matches the bathy_zone categories actually present in the per-pixel GeoParquet
// data (not the COG raster's BathyBand crop regions, which include '0_100').
export const BATHY_ZONE_OPTIONS: { val: string; label: string }[] = [
  { val: '0_20', label: '0 – 20 m' },
  { val: '20_50', label: '20 – 50 m' },
  { val: '50_100', label: '50 – 100 m' },
]

export const DISTANCE_MAX_NM = 400
export const DISTANCE_MIN_GAP_NM = 10

// Shared Plotly config for every dashboard chart: enables the modebar (zoom, pan,
// reset, PNG export) while dropping the lasso/box-select tools that only clutter
// read-only analytical charts. displaylogo:false removes the Plotly watermark.
export const PLOT_CONFIG = {
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  responsive: true,
  toImageButtonOptions: {
    format: 'png',
    filename: 'webgis-chart',
    height: 600,
    width: 900,
  },
}
