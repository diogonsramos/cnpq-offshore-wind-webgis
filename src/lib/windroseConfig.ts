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
