import type { TranslationKey } from '../i18n/types'

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string

export type Model = 'wrf' | 'mpas'
export type Dataset = 'ERA5_atlas_historico' | 'HIST_historico' | 'SSP2-4.5_presente' | 'SSP2-4.5_futuro' | 'SSP5-8.5_presente' | 'SSP5-8.5_futuro'
export type Variable = 'ws' | 'wpd'
export type Height = 10 | 50 | 100 | 150 | 200
export type Season = 'annual' | 'djf' | 'mam' | 'jja' | 'son'
export type Region = 'nacional' | 'estadual'
export type BathyBand = '0_20' | '20_50' | '50_100' | '0_100'
export const MODELS: Model[] = ['wrf', 'mpas']
export const DATASETS: Dataset[] = [
  'ERA5_atlas_historico',
  'HIST_historico',
  'SSP2-4.5_presente', 'SSP2-4.5_futuro',
  'SSP5-8.5_presente', 'SSP5-8.5_futuro',
]
export const VARIABLES: Variable[] = ['ws', 'wpd']
export const HEIGHTS: Height[] = [10, 50, 100, 150, 200]
export const SEASONS: Season[] = ['annual', 'djf', 'mam', 'jja', 'son']
export const REGIONS: Region[] = ['nacional', 'estadual']
export const BATHY_BANDS: BathyBand[] = ['0_20', '20_50', '50_100', '0_100']

export interface StateDef {
  val: string
  label: string
}

export const COASTAL_STATES: StateDef[] = [
  { val: 'AL', label: 'Alagoas' },
  { val: 'AP', label: 'Amapá' },
  { val: 'BA', label: 'Bahia' },
  { val: 'CE', label: 'Ceará' },
  { val: 'ES', label: 'Espírito Santo' },
  { val: 'MA', label: 'Maranhão' },
  { val: 'PA', label: 'Pará' },
  { val: 'PB', label: 'Paraíba' },
  { val: 'PE', label: 'Pernambuco' },
  { val: 'PI', label: 'Piauí' },
  { val: 'PR', label: 'Paraná' },
  { val: 'RJ', label: 'Rio de Janeiro' },
  { val: 'RN', label: 'Rio Grande do Norte' },
  { val: 'RS', label: 'Rio Grande do Sul' },
  { val: 'SC', label: 'Santa Catarina' },
  { val: 'SE', label: 'Sergipe' },
  { val: 'SP', label: 'São Paulo' },
]

// Geographic Norte→Sul ordering of the coastal states, used to sort the
// per-state boxplot so it reads as a latitudinal gradient down the coast.
// COASTAL_STATES itself stays alphabetical (easier to locate a state in the
// checkbox grid); this is the separate geographic axis.
export const STATE_ORDER_NORTH_SOUTH: string[] = [
  'AP', 'PA', 'MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA', 'ES', 'RJ', 'SP', 'PR', 'SC', 'RS',
]

export function stateNorthSouthIndex(code: string): number {
  const i = STATE_ORDER_NORTH_SOUTH.indexOf(code)
  return i === -1 ? STATE_ORDER_NORTH_SOUTH.length : i
}

const VAR_LABEL_KEY: Record<Variable, { labelKey: TranslationKey; unit: string }> = {
  ws: { labelKey: 'cogcatalog.variable.ws', unit: 'm/s' },
  wpd: { labelKey: 'cogcatalog.variable.wpd', unit: 'W/m²' },
}

const DATASET_LABEL_KEY: Record<Dataset, TranslationKey> = {
  ERA5_atlas_historico: 'cogcatalog.dataset.era5_atlas_historico',
  HIST_historico: 'cogcatalog.dataset.hist_historico',
  'SSP2-4.5_presente': 'cogcatalog.dataset.ssp245_presente',
  'SSP2-4.5_futuro': 'cogcatalog.dataset.ssp245_futuro',
  'SSP5-8.5_presente': 'cogcatalog.dataset.ssp585_presente',
  'SSP5-8.5_futuro': 'cogcatalog.dataset.ssp585_futuro',
}

const MODEL_LABEL_KEY: Record<Model, TranslationKey> = {
  wrf: 'cogcatalog.model.wrf',
  mpas: 'cogcatalog.model.mpas',
}

const BATHY_LABEL_KEY: Record<BathyBand, TranslationKey> = {
  '0_20': 'cogcatalog.bathy.0_20',
  '20_50': 'cogcatalog.bathy.20_50',
  '50_100': 'cogcatalog.bathy.50_100',
  '0_100': 'cogcatalog.bathy.0_100',
}

export function datasetLabel(d: Dataset, t: Translate): string {
  return t(DATASET_LABEL_KEY[d])
}

export function modelLabel(m: Model, t: Translate): string {
  return t(MODEL_LABEL_KEY[m])
}

export function varLabel(v: Variable, t: Translate): { label: string; unit: string } {
  return { label: t(VAR_LABEL_KEY[v].labelKey), unit: VAR_LABEL_KEY[v].unit }
}

export function bathyLabel(b: BathyBand, t: Translate): string {
  return t(BATHY_LABEL_KEY[b])
}

// Dataset ids carry a _historico/_presente/_futuro suffix that has no counterpart
// on disk — the real geoparquet/cog folders only exist per base experiment.
export function datasetFolder(d: Dataset): string {
  return d.replace(/_(historico|presente|futuro)$/, '')
}

export function buildCogUrl(
  dataset: Dataset,
  variable: Variable,
  height: Height,
  season: Season,
  model: Model = 'wrf',
): string {
  const varLower = variable === 'ws' ? `ws${height}` : `wpd${height}`
  const folder = datasetFolder(dataset)
  return `/data/cogs/${model}/${folder}/${varLower}/${height}m/${season}_nacional_0_100.tif`
}
