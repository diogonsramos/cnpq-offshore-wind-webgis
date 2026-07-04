export type Model = 'wrf' | 'mpas'
export type Dataset = 'ERA5_atlas_historico' | 'ERA5_atlas_presente' | 'HIST_historico' | 'SSP2-4.5_presente' | 'SSP2-4.5_futuro' | 'SSP5-8.5_presente' | 'SSP5-8.5_futuro'
export type Variable = 'ws' | 'wpd'
export type Height = 10 | 50 | 100 | 150 | 200
export type Season = 'annual' | 'djf' | 'mam' | 'jja' | 'son'
export type Region = 'nacional' | 'estadual'
export type BathyBand = '0_20' | '20_50' | '50_100' | '0_100'
export const MODELS: Model[] = ['wrf', 'mpas']
export const DATASETS: Dataset[] = [
  'ERA5_atlas_historico', 'ERA5_atlas_presente',
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

const VAR_LABEL: Record<Variable, { label: string; unit: string }> = {
  ws: { label: 'Vel. Vento', unit: 'm/s' },
  wpd: { label: 'Dens. Potência', unit: 'W/m²' },
}

const DATASET_LABEL: Record<Dataset, string> = {
  ERA5_atlas_historico: 'ERA5 Reanálise (Histórico)',
  ERA5_atlas_presente: 'ERA5 Reanálise (Presente)',
  HIST_historico: 'Histórico',
  'SSP2-4.5_presente': 'SSP2-4.5 (Presente)',
  'SSP2-4.5_futuro': 'SSP2-4.5 (Futuro)',
  'SSP5-8.5_presente': 'SSP5-8.5 (Presente)',
  'SSP5-8.5_futuro': 'SSP5-8.5 (Futuro)',
}

const MODEL_LABEL: Record<Model, string> = {
  wrf: 'WRF',
  mpas: 'MPAS',
}

const BATHY_LABEL: Record<BathyBand, string> = {
  '0_20': '0 a -20 m',
  '20_50': '-20 a -50 m',
  '50_100': '-50 a -100 m',
  '0_100': '0 a -100 m (Plataforma)',
}

export function datasetLabel(d: Dataset): string {
  return DATASET_LABEL[d]
}

export function modelLabel(m: Model): string {
  return MODEL_LABEL[m]
}

export function varLabel(v: Variable): { label: string; unit: string } {
  return VAR_LABEL[v]
}

export function bathyLabel(b: BathyBand): string {
  return BATHY_LABEL[b]
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
