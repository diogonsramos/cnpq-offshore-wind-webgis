import { useEffect, useMemo, useRef, useState, memo, lazy, Suspense } from 'react'
import {
  MODELS, DATASETS, VARIABLES, HEIGHTS,
  datasetLabel, varLabel, modelLabel, datasetFolder,
  type Model, type Dataset, type Variable, type Height,
} from '../lib/cogCatalog'
import { queryDashboardLocation, loadParquet, seasonStat, type DashboardLocationData } from '../lib/pixelQuery'
import {
  SEASON_ORDER, SEASON_LABELS, SECTOR_LABELS,
  HEIGHT_TICKVALS, HEIGHT_TICKTEXT, CHART_COLORS, PLOT_CONFIG,
  CHART_FONT, HOVER_LABEL_STYLE,
} from '../lib/dashboardChartConstants'
import { WINDROSE_PLOT_CONFIG } from '../lib/windroseConfig'
import MiniMap from './MiniMap'
import DashboardSkeleton from './DashboardSkeleton'
import { t } from '../i18n/t'

const Plot = lazy(() => import('react-plotly.js'))

type ComparisonMode = 'experiments' | 'models'

interface Pair { model: Model; dataset: Dataset }

interface DashboardComparisonViewProps {
  mode: ComparisonMode
  currentModel: Model
  currentDataset: Dataset
}

const MAX_EXPERIMENT_PAIRS = 3

function pairKey(p: Pair): string {
  return `${p.model}-${p.dataset}`
}

function pairLabel(p: Pair): string {
  return `${modelLabel(p.model)} — ${datasetLabel(p.dataset)}`
}

function traceStyle(mode: ComparisonMode, index: number): { color: string; dash: 'solid' | 'dash' } {
  if (mode === 'models') return { color: CHART_COLORS[0], dash: index === 0 ? 'solid' : 'dash' }
  return { color: CHART_COLORS[index % CHART_COLORS.length], dash: 'solid' }
}

function DashboardComparisonViewInner({ mode, currentModel, currentDataset }: DashboardComparisonViewProps) {
  const [variable, setVariable] = useState<Variable>('ws')
  const [height, setHeight] = useState<Height>(100)
  const [latInput, setLatInput] = useState('')
  const [lonInput, setLonInput] = useState('')
  const [locError, setLocError] = useState('')
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)

  const [selectedPairs, setSelectedPairs] = useState<Pair[]>([])
  const [selectedDataset, setSelectedDataset] = useState<Dataset>(currentDataset)

  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())
  const [dataVersion, setDataVersion] = useState(0)
  const dataMapRef = useRef<Map<string, DashboardLocationData | null>>(new Map())
  const locationKeyRef = useRef<string | null>(null)
  const loadGenRef = useRef(0)

  const pairs = useMemo<Pair[]>(() => {
    if (mode === 'models') return [{ model: 'wrf', dataset: selectedDataset }, { model: 'mpas', dataset: selectedDataset }]
    return selectedPairs
  }, [mode, selectedDataset, selectedPairs])

  useEffect(() => {
    if (!location || pairs.length === 0) return
    const locKey = `${location.lat.toFixed(4)},${location.lon.toFixed(4)}`
    if (locationKeyRef.current !== locKey) {
      dataMapRef.current.clear()
      locationKeyRef.current = locKey
    }
    const pending = pairs.filter(p => !dataMapRef.current.has(pairKey(p)))
    if (pending.length === 0) return

    const myGen = ++loadGenRef.current
    setLoadingKeys(prev => new Set([...prev, ...pending.map(pairKey)]))
    ;(async () => {
      for (const p of pending) {
        if (loadGenRef.current !== myGen) return
        try {
          const data = await queryDashboardLocation(location.lat, location.lon, p.model, datasetFolder(p.dataset))
          dataMapRef.current.set(pairKey(p), data)
        } catch {
          dataMapRef.current.set(pairKey(p), null)
        }
      }
      // Restore the singleton parquet slot to the globally selected pair so a
      // subsequent map click in the "WebGIS Map" tab queries the right dataset.
      await loadParquet(datasetFolder(currentDataset), currentModel).catch(() => {})
      if (loadGenRef.current !== myGen) return
      setLoadingKeys(new Set())
      setDataVersion(v => v + 1)
    })()
  }, [location, pairs, currentDataset, currentModel])

  const handleSetLocation = (lat: number, lon: number) => {
    setLocation({ lat, lon })
    setLocError('')
  }

  const handleManualSetLocation = () => {
    const lat = parseFloat(latInput)
    const lon = parseFloat(lonInput)
    if (isNaN(lat) || isNaN(lon)) {
      setLocError(t('dashboard.compare.invalid_coords'))
      return
    }
    handleSetLocation(lat, lon)
  }

  const togglePair = (p: Pair) => {
    setSelectedPairs(prev => {
      const key = pairKey(p)
      if (prev.some(x => pairKey(x) === key)) return prev.filter(x => pairKey(x) !== key)
      if (prev.length >= MAX_EXPERIMENT_PAIRS) return prev
      return [...prev, p]
    })
  }

  const entries = pairs.map((p, i) => ({
    pair: p,
    key: pairKey(p),
    label: pairLabel(p),
    style: traceStyle(mode, i),
    loading: loadingKeys.has(pairKey(p)),
    data: dataMapRef.current.get(pairKey(p)),
  }))

  const varUnit = variable === 'ws' ? 'm/s' : 'W/m²'
  const profileYAxis = {
    title: { text: 'Altura do Perfil (m)', standoff: 10 },
    tickmode: 'array' as const,
    tickvals: HEIGHT_TICKVALS,
    ticktext: HEIGHT_TICKTEXT,
    range: [0, 210],
  }

  const diffStat = useMemo(() => {
    if (mode !== 'models') return null
    const wrf = entries.find(e => e.pair.model === 'wrf')?.data
    const mpas = entries.find(e => e.pair.model === 'mpas')?.data
    if (!wrf || !mpas) return null
    const wrfMean = seasonStat(wrf, variable, height, 'ANNUAL', 'mean')
    const mpasMean = seasonStat(mpas, variable, height, 'ANNUAL', 'mean')
    if (wrfMean === null || mpasMean === null || wrfMean === 0) return null
    return { wrfMean, mpasMean, diffPct: ((mpasMean - wrfMean) / wrfMean) * 100 }
  }, [mode, entries, variable, height])

  const readyEntries = entries.filter(
    (e): e is (typeof entries)[number] & { data: DashboardLocationData } => e.data != null,
  )

  return (
    <div className="dv-compare">
      <div className="dv-filter-bar">
        {mode === 'models' && (
          <div className="dv-filter-group">
            <label className="dv-label">{t('dashboard.filters.experiment_label')}</label>
            <select value={selectedDataset} onChange={e => setSelectedDataset(e.target.value as Dataset)} className="dv-select">
              {DATASETS.map(d => (
                <option key={d} value={d}>{datasetLabel(d)}</option>
              ))}
            </select>
          </div>
        )}
        <div className="dv-filter-group">
          <label className="dv-label">{t('dashboard.filters.variable_label')}</label>
          <select value={variable} onChange={e => setVariable(e.target.value as Variable)} className="dv-select">
            {VARIABLES.map(v => (
              <option key={v} value={v}>{varLabel(v).label}</option>
            ))}
          </select>
        </div>
        <div className="dv-filter-group">
          <label className="dv-label">{t('dashboard.filters.height_label')}</label>
          <select value={height} onChange={e => setHeight(Number(e.target.value) as Height)} className="dv-select">
            {HEIGHTS.map(h => (
              <option key={h} value={h}>{h}m</option>
            ))}
          </select>
        </div>
      </div>

      {mode === 'experiments' && (
        <div className="dv-pair-picker">
          <p className="dv-pair-picker-title">
            {t('dashboard.compare.pick_pairs', { max: MAX_EXPERIMENT_PAIRS })}
          </p>
          <div className="dv-pair-grid">
            {MODELS.map(m => (
              <div key={m} className="dv-pair-col">
                <p className="dv-pair-col-title">{modelLabel(m)}</p>
                {DATASETS.map(d => {
                  const p = { model: m, dataset: d }
                  const checked = selectedPairs.some(x => pairKey(x) === pairKey(p))
                  const disabled = !checked && selectedPairs.length >= MAX_EXPERIMENT_PAIRS
                  return (
                    <label key={d} className="dv-pair-checkbox">
                      <input type="checkbox" checked={checked} disabled={disabled} onChange={() => togglePair(p)} />
                      <span>{datasetLabel(d)}</span>
                    </label>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dv-location-bar">
        <input className="dv-input" type="number" step="any" placeholder="Latitude" value={latInput} onChange={e => setLatInput(e.target.value)} />
        <input className="dv-input" type="number" step="any" placeholder="Longitude" value={lonInput} onChange={e => setLonInput(e.target.value)} />
        <button className="dv-add-btn" onClick={handleManualSetLocation}>{t('dashboard.compare.set_location')}</button>
        <span className="dv-hint">{t('dashboard.compare.location_hint')}</span>
        {locError && <span className="dv-error">{locError}</span>}
      </div>

      <div className="dv-chips">
        {entries.map(e => (
          <span key={e.key} className="dv-legend-chip" style={{ borderLeftColor: e.style.color }}>
            <span className={`dv-legend-swatch ${e.style.dash === 'dash' ? 'dv-legend-swatch--dash' : ''}`} style={{ background: e.style.color }} />
            {e.label}
            {e.loading && <em className="dv-legend-state"> — {t('dashboard.compare.loading')}</em>}
            {!e.loading && e.data === null && <em className="dv-legend-state"> — {t('dashboard.compare.no_data')}</em>}
          </span>
        ))}
      </div>

      {diffStat && (
        <div className="dv-diff-stat">
          {t('dashboard.compare.diff_label', { pct: diffStat.diffPct.toFixed(1) })}
        </div>
      )}

      {!location ? (
        <div className="dv-empty">{t('dashboard.compare.no_location')}</div>
      ) : pairs.length === 0 ? (
        <div className="dv-empty">{t('dashboard.compare.no_pairs')}</div>
      ) : readyEntries.length === 0 ? (
        <div className="dv-empty">{t('dashboard.compare.waiting_data')}</div>
      ) : (
        <div className="dv-main">
          <Suspense fallback={<DashboardSkeleton />}>
          <div className="dv-chart-grid">
            <div className="chart-card" data-testid="chart-seasonal">
              <Plot
                data={readyEntries.map(e => ({
                  x: SEASON_ORDER.map(s => SEASON_LABELS[s]),
                  y: SEASON_ORDER.map(s => seasonStat(e.data, variable, height, s, 'mean')),
                  type: 'bar',
                  name: e.label,
                  marker: { color: e.style.color, pattern: e.style.dash === 'dash' ? { shape: '/' } : undefined },
                  hovertemplate: '%{y:.2f}<extra></extra>',
                }))}
                layout={{
                  title: { text: `Média Sazonal — ${varLabel(variable).label} ${height}m` },
                  xaxis: { title: { text: 'Sazonalidade', standoff: 10 } },
                  yaxis: {
                    title: { text: `${varLabel(variable).label} (${varUnit})`, standoff: 10 },
                    range: variable === 'ws' ? [0, 25] : [0, 1500],
                    zeroline: false,
                    hoverformat: '.2f',
                  },
                  height: 260,
                  margin: { t: 40, b: 40, l: 55, r: 20 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: CHART_FONT,
                  showlegend: false,
                  hovermode: 'x unified',
                  hoverlabel: HOVER_LABEL_STYLE,
                }}
                config={PLOT_CONFIG}
                style={{ width: '100%' }}
                useResizeHandler
              />
            </div>

            <div className="chart-card" data-testid="chart-weibull">
              <Plot
                data={readyEntries.map(e => {
                  const w = e.data.weibull?.[height]
                  if (!w) return { x: [], y: [], type: 'scatter' as const, name: e.label }
                  const maxX = 30
                  const step = maxX / 60
                  const xs: number[] = [], ys: number[] = []
                  for (let x = 0; x <= maxX; x += step) {
                    xs.push(x)
                    const k = w.k, c = w.c
                    ys.push(k > 0 && c > 0 ? (k / c) * Math.pow(x / c, k - 1) * Math.exp(-Math.pow(x / c, k)) : 0)
                  }
                  return {
                    x: xs, y: ys, type: 'scatter' as const, mode: 'lines' as const,
                    name: `${e.label} (k=${w.k.toFixed(2)}, c=${w.c.toFixed(2)})`,
                    line: { color: e.style.color, width: 2, dash: e.style.dash },
                    hovertemplate: '%{y:.4f}<extra></extra>',
                  }
                })}
                layout={{
                  title: { text: `Distribuição Weibull — ${height}m` },
                  xaxis: { title: { text: 'Velocidade do Vento (m/s)', standoff: 10 }, range: [0, 30], zeroline: false, hoverformat: '.2f' },
                  yaxis: { title: { text: 'Densidade de Probabilidade f(v)', standoff: 10 }, range: [0, 0.3], zeroline: false, hoverformat: '.4f' },
                  height: 260,
                  margin: { t: 40, b: 40, l: 55, r: 20 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: CHART_FONT,
                  showlegend: true,
                  legend: { x: 1, xanchor: 'right', y: 1 },
                  hovermode: 'x unified',
                  hoverlabel: HOVER_LABEL_STYLE,
                }}
                config={PLOT_CONFIG}
                style={{ width: '100%' }}
                useResizeHandler
              />
            </div>

            <div className="chart-card" data-testid="chart-windrose">
              <Plot
                data={readyEntries.map(e => {
                  const wr = e.data.wind_rose?.[height]
                  if (!wr) return { r: [], theta: [], type: 'scatterpolar' as const, name: e.label }
                  return {
                    r: SECTOR_LABELS.map(s => wr[s]?.freq ?? 0),
                    theta: SECTOR_LABELS,
                    type: 'scatterpolar' as const,
                    fill: 'toself',
                    name: e.label,
                    marker: { color: e.style.color },
                    line: { dash: e.style.dash },
                    hovertemplate: '%{theta}: %{r:.1f}%<extra></extra>',
                    hoverlabel: { bgcolor: e.style.color },
                  }
                })}
                layout={{
                  title: { text: `Rosa dos Ventos — ${height}m` },
                  height: 260,
                  margin: { t: 40, b: 30, l: 50, r: 50 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: CHART_FONT,
                  showlegend: false,
                  hoverlabel: { font: { size: 12, color: '#fff' } },
                  polar: {
                    angularaxis: { direction: 'clockwise', rotation: 90 },
                    radialaxis: { visible: true, title: { text: 'Frequência (%)' }, ticksuffix: '%' },
                  },
                }}
                config={WINDROSE_PLOT_CONFIG}
                style={{ width: '100%' }}
                useResizeHandler
              />
            </div>

            <div className="chart-card">
              <Plot
                data={readyEntries.map(e => ({
                  x: e.data.profile_means,
                  y: e.data.profile_heights,
                  type: 'scatter' as const,
                  mode: 'lines+markers' as const,
                  name: e.label,
                  line: { color: e.style.color, width: 2, dash: e.style.dash },
                  marker: { color: e.style.color, size: 6 },
                  hovertemplate: '%{x:.2f}<extra></extra>',
                }))}
                layout={{
                  title: { text: 'Perfil Vertical — Velocidade do Vento' },
                  xaxis: { title: { text: 'Velocidade do Vento (m/s)', standoff: 10 }, range: [0, 25], zeroline: false, hoverformat: '.2f' },
                  yaxis: profileYAxis,
                  height: 260,
                  margin: { t: 40, b: 40, l: 55, r: 20 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: CHART_FONT,
                  showlegend: false,
                  hovermode: 'y unified',
                  hoverlabel: HOVER_LABEL_STYLE,
                }}
                config={PLOT_CONFIG}
                style={{ width: '100%' }}
                useResizeHandler
              />
            </div>
          </div>
          </Suspense>

          <div className="dv-sidebar">
            <div className="minimap">
              <MiniMap pinnedLocations={location ? [location] : []} onPinClick={handleSetLocation} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(DashboardComparisonViewInner)
