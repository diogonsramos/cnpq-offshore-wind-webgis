import type { TranslationKey } from '../i18n/types'

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string

export type Model = 'wrf' | 'mpas'
export type Dataset = 'era5' | 'hist' | 'ssp245' | 'ssp585'
export type Variable = 'ws' | 'wpd'
export type Height = 10 | 50 | 100 | 150 | 200
export type Season = 'annual' | 'djf' | 'mam' | 'jja' | 'son'
export type Region = 'nacional' | 'estadual'
export type BathyBand = '0_20' | '20_50' | '50_100' | '0_100'

export const MODELS: Model[] = ['wrf', 'mpas']
export const DATASETS: Dataset[] = ['era5', 'hist', 'ssp245', 'ssp585']
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
  era5: 'cogcatalog.dataset.era5',
  hist: 'cogcatalog.dataset.hist',
  ssp245: 'cogcatalog.dataset.ssp245',
  ssp585: 'cogcatalog.dataset.ssp585',
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

// COG file schema: {model}/{dataset}/{anual|sazonal}/{VAR}_{height}_avg[_{SEASON}].tif
// Only the `avg` statistic is served to the map renderer (statistical layers
// like p5/p95/std are for download, not for real-time tile rendering).
export function buildCogUrl(
  dataset: Dataset,
  variable: Variable,
  height: Height,
  season: Season,
  model: Model = 'wrf',
): string {
  const VAR = variable.toUpperCase() // 'WS' | 'WPD'
  if (season === 'annual') {
    return `/data/cogs/${model}/${dataset}/anual/${VAR}_${height}_avg.tif`
  }
  const seasonSuffix = season.toUpperCase() // 'DJF' | 'MAM' | 'JJA' | 'SON'
  return `/data/cogs/${model}/${dataset}/sazonal/${VAR}_${height}_avg_${seasonSuffix}.tif`
}
