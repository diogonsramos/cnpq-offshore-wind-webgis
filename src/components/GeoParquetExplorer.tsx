import { useMemo, useRef, useState, memo } from 'react'
import Plot from 'react-plotly.js'
import {
  MODELS, DATASETS, VARIABLES, HEIGHTS,
  datasetLabel, varLabel, modelLabel, datasetFolder, COASTAL_STATES,
  type Model, type Dataset, type Variable, type Height,
} from '../lib/cogCatalog'
import { loadParquet, queryFilteredPixels, type FilterCriteria, type FilteredAggregates } from '../lib/pixelQuery'
import {
  HEIGHT_TICKVALS, HEIGHT_TICKTEXT, CHART_COLORS, BATHY_ZONE_OPTIONS,
  DISTANCE_MAX_NM, DISTANCE_MIN_GAP_NM,
} from '../lib/dashboardChartConstants'
import { t } from '../i18n/t'

interface GeoParquetExplorerProps {
  currentModel: Model
  currentDataset: Dataset
}

function fingerprint(f: FilterCriteria): string {
  return JSON.stringify({
    model: f.model, experiment: f.experiment, variable: f.variable, height: f.height,
    states: [...(f.states ?? [])].sort(),
    bathyZones: [...(f.bathyZones ?? [])].sort(),
    distanceMin: f.distanceMin, distanceMax: f.distanceMax,
  })
}

function meanOf(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  if (xs.length < 2) return null
  const mx = meanOf(xs), my = meanOf(ys)
  let num = 0, den = 0
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  if (den === 0) return null
  const slope = num / den
  return { slope, intercept: my - slope * mx }
}

function stateLabel(code: string): string {
  return COASTAL_STATES.find(s => s.val === code)?.label ?? code
}

const bathyOptionLabel = (val: string): string => BATHY_ZONE_OPTIONS.find(b => b.val === val)?.label ?? val

function GeoParquetExplorerInner({ currentModel, currentDataset }: GeoParquetExplorerProps) {
  const [model, setModel] = useState<Model>(currentModel)
  const [dataset, setDataset] = useState<Dataset>(currentDataset)
  const [variable, setVariable] = useState<Variable>('ws')
  const [height, setHeight] = useState<Height>(100)
  const [bathyZones, setBathyZones] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])
  const [distMin, setDistMin] = useState(0)
  const [distMax, setDistMax] = useState(DISTANCE_MAX_NM)

  const [appliedFilters, setAppliedFilters] = useState<FilterCriteria | null>(null)
  const [result, setResult] = useState<FilteredAggregates | null>(null)
  const [loading, setLoading] = useState(false)

  const cacheRef = useRef<Map<string, FilteredAggregates>>(new Map())
  const loadGenRef = useRef(0)

  const toggleBathy = (v: string) => setBathyZones(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  const toggleState = (v: string) => setStates(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])

  const handleDistMinChange = (v: number) => setDistMin(Math.min(v, distMax - DISTANCE_MIN_GAP_NM))
  const handleDistMaxChange = (v: number) => setDistMax(Math.max(v, distMin + DISTANCE_MIN_GAP_NM))

  const handleApply = async () => {
    const myGen = ++loadGenRef.current
    setLoading(true)
    await loadParquet(datasetFolder(dataset), model).catch(() => {})
    if (loadGenRef.current !== myGen) return

    const filters: FilterCriteria = {
      model, experiment: datasetFolder(dataset), variable, height,
      states, bathyZones, distanceMin: distMin, distanceMax: distMax,
    }
    const fp = fingerprint(filters)
    let r = cacheRef.current.get(fp)
    if (!r) {
      r = queryFilteredPixels(filters)
      cacheRef.current.set(fp, r)
    }

    // Restore the singleton parquet slot to the globally selected pair so a
    // subsequent map click in the "WebGIS Map" tab queries the right dataset.
    await loadParquet(datasetFolder(currentDataset), currentModel).catch(() => {})
    if (loadGenRef.current !== myGen) return

    setAppliedFilters(filters)
    setResult(r)
    setLoading(false)
  }

  const appliedVariable = appliedFilters?.variable ?? variable
  const appliedHeight = appliedFilters?.height ?? height
  const varUnit = appliedVariable === 'ws' ? 'm/s' : 'W/m²'
  const xRange: [number, number] = appliedVariable === 'ws' ? [0, 20] : [0, 1500]

  const histogramTrace = useMemo(() => {
    if (!result) return null
    return {
      x: result.histogram.map(b => `${b.binStart.toFixed(0)}–${b.binEnd.toFixed(0)}`),
      y: result.histogram.map(b => b.count),
      type: 'bar' as const,
      marker: { color: CHART_COLORS[0] },
    }
  }, [result])

  const regression = useMemo(() => {
    if (!result) return null
    return linearRegression(result.distances, result.values)
  }, [result])

  const showBoxplotByState = appliedFilters !== null && (appliedFilters.states?.length ?? 0) === 0
  const showBoxplotByBathy = appliedFilters !== null && (appliedFilters.bathyZones?.length ?? 0) === 0

  const profileYAxis = {
    title: { text: 'Altura do Perfil (m)', standoff: 10 },
    tickmode: 'array' as const,
    tickvals: HEIGHT_TICKVALS,
    ticktext: HEIGHT_TICKTEXT,
    range: [0, 210],
  }

  return (
    <div className="gpe">
      <div className="dv-filter-bar">
        <div className="dv-filter-group">
          <label className="dv-label">{t('dashboard.filters.model_label')}</label>
          <select value={model} onChange={e => setModel(e.target.value as Model)} className="dv-select">
            {MODELS.map(m => <option key={m} value={m}>{modelLabel(m)}</option>)}
          </select>
        </div>
        <div className="dv-filter-group">
          <label className="dv-label">{t('dashboard.filters.experiment_label')}</label>
          <select value={dataset} onChange={e => setDataset(e.target.value as Dataset)} className="dv-select">
            {DATASETS.map(d => <option key={d} value={d}>{datasetLabel(d)}</option>)}
          </select>
        </div>
        <div className="dv-filter-group">
          <label className="dv-label">{t('dashboard.filters.variable_label')}</label>
          <select value={variable} onChange={e => setVariable(e.target.value as Variable)} className="dv-select">
            {VARIABLES.map(v => <option key={v} value={v}>{varLabel(v).label}</option>)}
          </select>
        </div>
        <div className="dv-filter-group">
          <label className="dv-label">{t('dashboard.filters.height_label')}</label>
          <select value={height} onChange={e => setHeight(Number(e.target.value) as Height)} className="dv-select">
            {HEIGHTS.map(h => <option key={h} value={h}>{h}m</option>)}
          </select>
        </div>
      </div>

      <div className="gpe-checkbox-panel">
        <div className="gpe-checkbox-col">
          <p className="dv-pair-picker-title">{t('geoparquet_explorer.filters.bathy_title')}</p>
          {BATHY_ZONE_OPTIONS.map(b => (
            <label key={b.val} className="dv-pair-checkbox">
              <input type="checkbox" checked={bathyZones.includes(b.val)} onChange={() => toggleBathy(b.val)} />
              <span>{b.label}</span>
            </label>
          ))}
        </div>
        <div className="gpe-checkbox-col gpe-checkbox-col--states">
          <p className="dv-pair-picker-title">{t('geoparquet_explorer.filters.state_title')}</p>
          <div className="gpe-state-grid">
            {COASTAL_STATES.map(s => (
              <label key={s.val} className="dv-pair-checkbox">
                <input type="checkbox" checked={states.includes(s.val)} onChange={() => toggleState(s.val)} />
                <span>{s.val}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="gpe-distance-row">
        <label className="dv-label">{t('geoparquet_explorer.filters.distance_title')}: {distMin} – {distMax} nm</label>
        <div className="gpe-range-pair">
          <input
            type="range" min={0} max={DISTANCE_MAX_NM} value={distMin}
            onChange={e => handleDistMinChange(Number(e.target.value))}
          />
          <input
            type="range" min={0} max={DISTANCE_MAX_NM} value={distMax}
            onChange={e => handleDistMaxChange(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="gpe-apply-row">
        <button className="dv-add-btn" onClick={handleApply} disabled={loading}>
          {t('geoparquet_explorer.filters.apply_btn')}
        </button>
        {loading && <span className="dv-hint">{t('geoparquet_explorer.loading')}</span>}
        {!loading && result && (
          <span className="dv-hint">{t('geoparquet_explorer.filters.pixel_count', { count: result.count })}</span>
        )}
        {!loading && !result && <span className="dv-hint">{t('geoparquet_explorer.filters.hint')}</span>}
      </div>

      {!appliedFilters ? (
        <div className="dv-empty">{t('geoparquet_explorer.empty.not_applied')}</div>
      ) : !result || result.count === 0 ? (
        <div className="dv-empty">{t('geoparquet_explorer.empty.no_results')}</div>
      ) : (
        <>
          <div className="gpe-stats-bar">
            <div className="gpe-stat-chip"><span className="gpe-stat-label">{t('geoparquet_explorer.stats.mean')}</span><span className="gpe-stat-value">{result.mean?.toFixed(1)} {varUnit}</span></div>
            <div className="gpe-stat-chip"><span className="gpe-stat-label">{t('geoparquet_explorer.stats.median')}</span><span className="gpe-stat-value">{result.median?.toFixed(1)} {varUnit}</span></div>
            <div className="gpe-stat-chip"><span className="gpe-stat-label">{t('geoparquet_explorer.stats.std')}</span><span className="gpe-stat-value">{result.std?.toFixed(2)}</span></div>
            <div className="gpe-stat-chip"><span className="gpe-stat-label">{t('geoparquet_explorer.stats.min')}</span><span className="gpe-stat-value">{result.min?.toFixed(1)} {varUnit}</span></div>
            <div className="gpe-stat-chip"><span className="gpe-stat-label">{t('geoparquet_explorer.stats.max')}</span><span className="gpe-stat-value">{result.max?.toFixed(1)} {varUnit}</span></div>
            <div className="gpe-stat-chip"><span className="gpe-stat-label">{t('geoparquet_explorer.stats.cv')}</span><span className="gpe-stat-value">{result.cv?.toFixed(1)}%</span></div>
          </div>

          <div className="dv-chart-grid">
            <div className="chart-card">
              <Plot
                data={histogramTrace ? [histogramTrace] : []}
                layout={{
                  title: { text: `${t('geoparquet_explorer.charts.histogram_title')} — ${varLabel(appliedVariable).label} ${appliedHeight}m` },
                  xaxis: { title: { text: `${varLabel(appliedVariable).label} (${varUnit})`, standoff: 10 } },
                  yaxis: { title: { text: 'Nº de pixels', standoff: 10 }, zeroline: false },
                  height: 260,
                  margin: { t: 40, b: 40, l: 55, r: 20 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { size: 11 },
                  showlegend: false,
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
                useResizeHandler
              />
            </div>

            {showBoxplotByState ? (
              <div className="chart-card">
                <Plot
                  data={result.byState.map((g, i) => ({
                    y: g.values, type: 'box' as const, name: stateLabel(g.state),
                    marker: { color: CHART_COLORS[i % CHART_COLORS.length] },
                    boxpoints: false as const,
                  }))}
                  layout={{
                    title: { text: t('geoparquet_explorer.charts.boxplot_state_title') },
                    yaxis: { title: { text: `${varLabel(appliedVariable).label} (${varUnit})`, standoff: 10 }, range: xRange, zeroline: false },
                    height: 260,
                    margin: { t: 40, b: 60, l: 55, r: 20 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { size: 10 },
                    showlegend: false,
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%' }}
                  useResizeHandler
                />
              </div>
            ) : (
              <div className="chart-card chart-empty">{t('geoparquet_explorer.charts.boxplot_state_hidden')}</div>
            )}

            {showBoxplotByBathy ? (
              <div className="chart-card">
                <Plot
                  data={result.byBathyZone.map((g, i) => ({
                    y: g.values, type: 'box' as const, name: bathyOptionLabel(g.zone),
                    marker: { color: CHART_COLORS[i % CHART_COLORS.length] },
                    boxpoints: false as const,
                  }))}
                  layout={{
                    title: { text: t('geoparquet_explorer.charts.boxplot_bathy_title') },
                    yaxis: { title: { text: `${varLabel(appliedVariable).label} (${varUnit})`, standoff: 10 }, range: xRange, zeroline: false },
                    height: 260,
                    margin: { t: 40, b: 40, l: 55, r: 20 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { size: 11 },
                    showlegend: false,
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%' }}
                  useResizeHandler
                />
              </div>
            ) : (
              <div className="chart-card chart-empty">{t('geoparquet_explorer.charts.boxplot_bathy_hidden')}</div>
            )}

            <div className="chart-card">
              <Plot
                data={[
                  {
                    x: result.distances, y: result.values, type: 'scatter' as const, mode: 'markers' as const,
                    name: 'Pixels', marker: { color: CHART_COLORS[0], size: 5, opacity: 0.6 },
                  },
                  ...(regression ? [{
                    x: [0, DISTANCE_MAX_NM],
                    y: [regression.intercept, regression.intercept + regression.slope * DISTANCE_MAX_NM],
                    type: 'scatter' as const, mode: 'lines' as const, name: 'Tendência (linear)',
                    line: { color: CHART_COLORS[1], width: 2, dash: 'dash' as const },
                  }] : []),
                ]}
                layout={{
                  title: { text: t('geoparquet_explorer.charts.scatter_title') },
                  xaxis: { title: { text: 'Distância da Costa (nm)', standoff: 10 }, range: [0, DISTANCE_MAX_NM], zeroline: false },
                  yaxis: { title: { text: `${varLabel(appliedVariable).label} (${varUnit})`, standoff: 10 }, range: xRange, zeroline: false },
                  height: 260,
                  margin: { t: 40, b: 40, l: 55, r: 20 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { size: 11 },
                  showlegend: true,
                  legend: { x: 1, xanchor: 'right', y: 1 },
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
                useResizeHandler
              />
            </div>

            <div className="chart-card">
              <Plot
                data={[{
                  x: result.profileMeans, y: result.profileHeights, type: 'scatter' as const, mode: 'lines+markers' as const,
                  name: 'Perfil médio',
                  line: { color: CHART_COLORS[0], width: 2 },
                  marker: { color: CHART_COLORS[0], size: 6 },
                  error_x: { type: 'data' as const, array: result.profileStds, visible: true, color: CHART_COLORS[0] + '88' },
                }]}
                layout={{
                  title: { text: t('geoparquet_explorer.charts.profile_title') },
                  xaxis: { title: { text: `${varLabel(appliedVariable).label} (${varUnit})`, standoff: 10 }, range: xRange, zeroline: false },
                  yaxis: profileYAxis,
                  height: 260,
                  margin: { t: 40, b: 40, l: 55, r: 20 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { size: 11 },
                  showlegend: false,
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
                useResizeHandler
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default memo(GeoParquetExplorerInner)
