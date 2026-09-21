import type { TabId, BasemapId, BathyLayerId } from './types'
import type { Model, Dataset, Variable, Height, Season } from './lib/cogCatalog'
import type { PixelDataSummary, DashboardLocationData } from './lib/pixelQuery'

export interface AppState {
  tab: TabId
  model: Model
  dataset: Dataset
  variable: Variable
  height: Height
  season: Season
  showBathymetry: boolean
  bathyLayer: BathyLayerId
  pixelData: PixelDataSummary | null
  parquetLoaded: boolean
  parquetLoading: boolean
  parquetCount: number
  basemap: BasemapId
  cogOpacity: number
  pinnedLocations: DashboardLocationData[]
  showFAQ: boolean
  showProject: boolean
  // Gates the first mount of DashboardView (and its Plotly-carrying subtree) to an
  // actual visit — once true it stays true, so switching back to Map (display:none)
  // keeps the Dashboard's local UI state (filters, fullscreen, inner tab) intact.
  dashboardVisited: boolean
}

export const initialAppState: AppState = {
  tab: 'home',
  model: 'wrf',
  dataset: 'era5',
  variable: 'ws',
  height: 100,
  season: 'annual',
  showBathymetry: true,
  bathyLayer: 'bathy_0_100_nacional',
  pixelData: null,
  parquetLoaded: false,
  parquetLoading: false,
  parquetCount: 0,
  basemap: 'street',
  cogOpacity: 0.7,
  pinnedLocations: [],
  showFAQ: false,
  showProject: false,
  dashboardVisited: false,
}

export type AppAction =
  | { type: 'SET_TAB'; tab: TabId }
  | { type: 'SET_MODEL'; model: Model }
  | { type: 'SET_DATASET'; dataset: Dataset }
  | { type: 'SET_VARIABLE'; variable: Variable }
  | { type: 'SET_HEIGHT'; height: Height }
  | { type: 'SET_SEASON'; season: Season }
  | { type: 'SET_BASEMAP'; basemap: BasemapId }
  | { type: 'SET_BATHY_LAYER'; layer: BathyLayerId }
  | { type: 'SET_SHOW_BATHYMETRY'; show: boolean }
  | { type: 'SET_COG_OPACITY'; opacity: number }
  | { type: 'SET_PIXEL_DATA'; data: PixelDataSummary | null }
  | { type: 'SET_PARQUET_LOADING'; loading: boolean }
  | { type: 'SET_PARQUET_LOADED'; loaded: boolean; count: number }
  | { type: 'ADD_PIN'; loc: DashboardLocationData }
  | { type: 'REMOVE_PIN'; idx: number }
  | { type: 'REMOVE_ALL_PINS' }
  | { type: 'REFRESH_PINNED_LOCATIONS'; locations: DashboardLocationData[] }
  | { type: 'SET_SHOW_FAQ'; show: boolean }
  | { type: 'SET_SHOW_PROJECT'; show: boolean }

const MAX_PINS = 3

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, tab: action.tab, dashboardVisited: state.dashboardVisited || action.tab === 'dashboard' }
    case 'SET_MODEL':
      return { ...state, model: action.model }
    case 'SET_DATASET': {
      const isFuture = action.dataset === 'ssp245' || action.dataset === 'ssp585'
      return { ...state, dataset: action.dataset, season: isFuture ? 'annual' : state.season }
    }
    case 'SET_VARIABLE':
      return { ...state, variable: action.variable }
    case 'SET_HEIGHT':
      return { ...state, height: action.height }
    case 'SET_SEASON':
      return { ...state, season: action.season }
    case 'SET_BASEMAP':
      return { ...state, basemap: action.basemap }
    case 'SET_BATHY_LAYER':
      return { ...state, bathyLayer: action.layer }
    case 'SET_SHOW_BATHYMETRY':
      return { ...state, showBathymetry: action.show }
    case 'SET_COG_OPACITY':
      return { ...state, cogOpacity: action.opacity }
    case 'SET_PIXEL_DATA':
      return { ...state, pixelData: action.data }
    case 'SET_PARQUET_LOADING':
      return { ...state, parquetLoading: action.loading }
    case 'SET_PARQUET_LOADED':
      return { ...state, parquetLoaded: action.loaded, parquetCount: action.count }
    case 'ADD_PIN':
      return state.pinnedLocations.length >= MAX_PINS
        ? state
        : { ...state, pinnedLocations: [...state.pinnedLocations, action.loc] }
    case 'REMOVE_PIN':
      return { ...state, pinnedLocations: state.pinnedLocations.filter((_, i) => i !== action.idx) }
    case 'REMOVE_ALL_PINS':
      return { ...state, pinnedLocations: [] }
    case 'REFRESH_PINNED_LOCATIONS':
      return { ...state, pinnedLocations: action.locations }
    case 'SET_SHOW_FAQ':
      return { ...state, showFAQ: action.show }
    case 'SET_SHOW_PROJECT':
      return { ...state, showProject: action.show }
  }
}
