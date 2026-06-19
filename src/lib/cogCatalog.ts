export type Dataset = 'ERA5_atlas' | 'HIST' | 'SSP2-4.5' | 'SSP5-8.5'
export type Variable = 'ws' | 'wpd'
export type Height = 10 | 100
export type Season = 'annual' | 'djf' | 'mam' | 'jja' | 'son'
export type Region = 'nacional' | 'estadual'
export type BathyBand = '0_20' | '20_50' | '50_100' | '0_100'

export const DATASETS: Dataset[] = ['ERA5_atlas', 'HIST', 'SSP2-4.5', 'SSP5-8.5']
export const VARIABLES: Variable[] = ['ws', 'wpd']
export const HEIGHTS: Height[] = [10, 100]
export const SEASONS: Season[] = ['annual', 'djf', 'mam', 'jja', 'son']
export const BATHY_BANDS: BathyBand[] = ['0_20', '20_50', '50_100', '0_100']
export const REGIONS: Region[] = ['nacional', 'estadual']

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
  ERA5_atlas: 'ERA5 Reanálise',
  HIST: 'WRF Histórico',
  'SSP2-4.5': 'WRF SSP2-4.5',
  'SSP5-8.5': 'WRF SSP5-8.5',
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

export function varLabel(v: Variable): { label: string; unit: string } {
  return VAR_LABEL[v]
}

export function bathyLabel(b: BathyBand): string {
  return BATHY_LABEL[b]
}

export function buildCogUrl(
  dataset: Dataset,
  variable: Variable,
  height: Height,
  season: Season,
  region: Region,
  state?: string,
  bathyBand?: BathyBand,
): string {
  const base = `/data/cogs/wrf/${dataset}/${variable}${height}/${height}m/${season}`
  if (region === 'nacional') {
    if (bathyBand === '0_100') {
      return `${base}_nacional_0_100.tif`
    }
    return `${base}_nacional_completo.tif`
  }
  const uf = (state || 'BA').toLowerCase()
  const band = bathyBand || '0_20'
  return `${base}_${uf}_${band}.tif`
}
