// Imports the prebuilt UMD dist bundle (not the bare 'plotly.js' entry) — the
// source entry's image trace pulls in a `require('buffer/')` shim that esbuild
// can't resolve in this project; the dist bundle has it inlined already.
import * as Plotly from 'plotly.js/dist/plotly'
import type { Config, Layout } from 'plotly.js'
import { PLOT_CONFIG } from './dashboardChartConstants'

// Split out of dashboardChartConstants.ts so components that only need plain
// data (e.g. DirectionalHeatmap's SECTOR_LABELS) don't transitively pull in the
// full plotly.js payload just by importing that module.

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
export const WINDROSE_PLOT_CONFIG: Partial<Config> = {
  ...PLOT_CONFIG,
  modeBarButtonsToAdd: [{
    name: 'resetPolarView',
    title: 'Resetar zoom',
    icon: RESET_POLAR_ICON,
    // @types/plotly.js only enumerates xaxis/yaxis dotted relayout paths (see its
    // own comment on Layout) — polar.radialaxis.autorange is a valid runtime path
    // Plotly supports but the type doesn't model, hence the unknown pivot.
    click: (gd: HTMLElement) => Plotly.relayout(gd, { 'polar.radialaxis.autorange': true } as unknown as Partial<Layout>),
  }],
}

// Bins for stacked wind rose (based on 'Plasma_r' or similar perceptually uniform palette)
export const WIND_BINS = [
  { min: 0, max: 2, color: '#f0f921', label: '0-2 m/s' },
  { min: 2, max: 4, color: '#fdc527', label: '2-4 m/s' },
  { min: 4, max: 6, color: '#f89540', label: '4-6 m/s' },
  { min: 6, max: 8, color: '#e66c5c', label: '6-8 m/s' },
  { min: 8, max: 10, color: '#cc4778', label: '8-10 m/s' },
  { min: 10, max: 12, color: '#aa2395', label: '10-12 m/s' },
  { min: 12, max: 14, color: '#7e03a8', label: '12-14 m/s' },
  { min: 14, max: 16, color: '#4c02a1', label: '14-16 m/s' },
  { min: 16, max: Infinity, color: '#0d0887', label: '16+ m/s' },
]

// Simple polynomial approximation for Gamma(x) where 1 <= x <= 2
function gammaApproximation(z: number): number {
  const x = z - 1
  return 1.0 - 0.5771 * x + 0.9882 * x * x - 0.8970 * Math.pow(x, 3) + 0.9182 * Math.pow(x, 4) - 0.7567 * Math.pow(x, 5) + 0.4821 * Math.pow(x, 6) - 0.1935 * Math.pow(x, 7) + 0.03586 * Math.pow(x, 8)
}

// Generates frequency distribution across speed bins given a sector's total frequency and mean speed,
// assuming the shape parameter (k) is roughly constant and applying a Weibull distribution.
export function getWeibullBinFreqs(freq: number, mean_ws: number, overall_k: number | null): number[] {
  if (!mean_ws || mean_ws <= 0 || freq <= 0) return WIND_BINS.map(() => 0)
  
  const k = (overall_k && overall_k > 1) ? overall_k : 2.0
  const z = 1 + 1 / k
  const g = gammaApproximation(z)
  const c = mean_ws / g

  return WIND_BINS.map(bin => {
    const pMin = bin.min === 0 ? 0 : (1 - Math.exp(-Math.pow(bin.min / c, k)))
    const pMax = bin.max === Infinity ? 1 : (1 - Math.exp(-Math.pow(bin.max / c, k)))
    return freq * Math.max(0, pMax - pMin)
  })
}
