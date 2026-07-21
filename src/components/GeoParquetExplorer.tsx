import { useMemo, useRef, useState, memo, lazy, Suspense } from 'react'
import {
  MODELS, DATASETS, VARIABLES, HEIGHTS,
  datasetLabel, varLabel, modelLabel, datasetFolder, COASTAL_STATES, stateNorthSouthIndex,
  type Model, type Dataset, type Variable, type Height,
} from '../lib/cogCatalog'
import { loadParquet, queryFilteredPixels, hasRealDistanceData, type FilterCriteria, type FilteredAggregates } from '../lib/pixelQuery'
import {
  HEIGHT_TICKVALS, HEIGHT_TICKTEXT, CHART_COLORS, BATHY_ZONE_OPTIONS,
  DISTANCE_MAX_NM, DISTANCE_ZONE_OPTIONS, PLOT_CONFIG, CHART_FONT, HOVER_LABEL_STYLE,
} from '../lib/dashboardChartConstants'
import DashboardSkeleton from './DashboardSkeleton'
import { t } from '../i18n/t'

const Plot = lazy(() => import('react-plotly.js'))

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

// Distance zones nest from 0 (0-12 ⊂ 0-20 ⊂ 0-200), so multiple checked boxes
// just widen the range to the largest selected boundary rather than union of bins.
function distanceMaxFromZones(zones: string[]): number {
  if (zones.length === 0) return DISTANCE_MAX_NM
  return Math.max(...zones.map(z => DISTANCE_ZONE_OPTIONS.find(o => o.val === z)?.max ?? DISTANCE_MAX_NM))
}

function GeoParquetExplorerInner({ currentModel, currentDataset }: GeoParquetExplorerProps) {
  const [model, setModel] = useState<Model>(currentModel)
  const [dataset, setDataset] = useState<Dataset>(currentDataset)
  const [variable, setVariable] = useState<Variable>('ws')
  const [height, setHeight] = useState<Height>(100)
  const [bathyZones, setBathyZones] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])
  const [distanceZones, setDistanceZones] = useState<string[]>([])

  const [appliedFilters, setAppliedFilters] = useState<FilterCriteria | null>(null)
  const [result, setResult] = useState<FilteredAggregates | null>(null)
  const [loading, setLoading] = useState(false)

  const cacheRef = useRef<Map<string, FilteredAggregates>>(new Map())
  const loadGenRef = useRef(0)

  const toggleBathy = (v: string) => setBathyZones(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  const toggleState = (v: string) => setStates(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  const toggleDistanceZone = (v: string) => setDistanceZones(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])

  const handleApply = async () => {
    const myGen = ++loadGenRef.current
    setLoading(true)
    await loadParquet(datasetFolder(dataset), model).catch(() => {})
    if (loadGenRef.current !== myGen) return

    const filters: FilterCriteria = {
      model, experiment: datasetFolder(dataset), variable, height,
      states, bathyZones, distanceMin: 0, distanceMax: distanceMaxFromZones(distanceZones),
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
  const appliedDistanceMin = appliedFilters?.distanceMin ?? 0
  const appliedDistanceMax = appliedFilters?.distanceMax ?? DISTANCE_MAX_NM

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

  // Boxplots compare distributions across categories, so they only make sense with
  // 0 selected (all categories) or 2+ selected. Exactly 1 selected collapses to a
  // single meaningless box — hide it then.
  const showBoxplotByState = appliedFilters !== null && (appliedFilters.states?.length ?? 0) !== 1
  const showBoxplotByBathy = appliedFilters !== null && (appliedFilters.bathyZones?.length ?? 0) !== 1

  // Order the per-category boxes geographically (states Norte→Sul, bathy by depth)
  // instead of by pixel count, so the axis reads as a physical gradient.
  const byStateOrdered = useMemo(
    () => result ? [...result.byState].sort((a, b) => stateNorthSouthIndex(a.state) - stateNorthSouthIndex(b.state)) : [],
    [result],
  )
  const byBathyOrdered = useMemo(() => {
    if (!result) return []
    const order = BATHY_ZONE_OPTIONS.map(b => b.val)
    return [...result.byBathyZone].sort((a, b) => order.indexOf(a.zone) - order.indexOf(b.zone))
  }, [result])

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
        <div className="gpe-checkbox-col">
          <p className="dv-pair-picker-title">{t('geoparquet_explorer.filters.distance_title')}</p>
          {DISTANCE_ZONE_OPTIONS.map(d => (
            <label
              key={d.val}
              className="dv-pair-checkbox dv-pair-checkbox--disabled"
              title={t('geoparquet_explorer.filters.distance_disabled_hint')}
            >
              <input type="checkbox" checked={distanceZones.includes(d.val)} onChange={() => toggleDistanceZone(d.val)} disabled />
              <span>{d.label}</span>
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

          <Suspense fallback={<DashboardSkeleton />}>
          <div className="dv-chart-grid">
            <div className="chart-card">
              <Plot
                data={histogramTrace ? [{ ...histogramTrace, hovertemplate: '%{y} pixels<extra></extra>' }] : []}
                layout={{
                  title: { text: `${t('geoparquet_explorer.charts.histogram_title')} — ${varLabel(appliedVariable).label} ${appliedHeight}m` },
                  xaxis: { title: { text: `${varLabel(appliedVariable).label} (${varUnit})`, standoff: 10 } },
                  yaxis: { title: { text: 'Nº de pixels', standoff: 10 }, zeroline: false },
                  height: 260,
                  margin: { t: 40, b: 40, l: 55, r: 20 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: CHART_FONT,
                  showlegend: false,
                  hoverlabel: HOVER_LABEL_STYLE,
                }}
                config={PLOT_CONFIG}
                style={{ width: '100%' }}
                useResizeHandler
              />
            </div>

            {showBoxplotByState ? (
              <div className="chart-card">
                <Plot
                  data={byStateOrdered.map((g, i) => ({
                    y: g.values, type: 'box' as const, name: stateLabel(g.state),
                    marker: { color: CHART_COLORS[i % CHART_COLORS.length] },
                    boxpoints: false as const,
                  }))}
                  layout={{
                    title: { text: t('geoparquet_explorer.charts.boxplot_state_title') },
                    yaxis: { title: { text: `${varLabel(appliedVariable).label} (${varUnit})`, standoff: 10 }, range: xRange, zeroline: false, hoverformat: '.2f' },
                    height: 260,
                    margin: { t: 40, b: 60, l: 55, r: 20 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: CHART_FONT,
                    showlegend: false,
                    hoverlabel: HOVER_LABEL_STYLE,
                  }}
                  config={PLOT_CONFIG}
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
                  data={byBathyOrdered.map((g, i) => ({
                    y: g.values, type: 'box' as const, name: bathyOptionLabel(g.zone),
                    marker: { color: CHART_COLORS[i % CHART_COLORS.length] },
                    boxpoints: false as const,
                  }))}
                  layout={{
                    title: { text: t('geoparquet_explorer.charts.boxplot_bathy_title') },
                    yaxis: { title: { text: `${varLabel(appliedVariable).label} (${varUnit})`, standoff: 10 }, range: xRange, zeroline: false, hoverformat: '.2f' },
                    height: 260,
                    margin: { t: 40, b: 40, l: 55, r: 20 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: CHART_FONT,
                    showlegend: false,
                    hoverlabel: HOVER_LABEL_STYLE,
                  }}
                  config={PLOT_CONFIG}
                  style={{ width: '100%' }}
                  useResizeHandler
                />
              </div>
            ) : (
              <div className="chart-card chart-empty">{t('geoparquet_explorer.charts.boxplot_bathy_hidden')}</div>
            )}

            {hasRealDistanceData(result) ? (
              <div className="chart-card">
                <Plot
                  data={[
                    {
                      x: result.distances, y: result.values, type: 'scatter' as const, mode: 'markers' as const,
                      name: 'Pixels', marker: { color: CHART_COLORS[0], size: 5, opacity: 0.6 },
                      hovertemplate: '%{x:.1f} nm, %{y:.2f}<extra></extra>',
                    },
                    ...(regression ? [{
                      x: [appliedDistanceMin, appliedDistanceMax],
                      y: [
                        regression.intercept + regression.slope * appliedDistanceMin,
                        regression.intercept + regression.slope * appliedDistanceMax,
                      ],
                      type: 'scatter' as const, mode: 'lines' as const, name: 'Tendência (linear)',
                      line: { color: CHART_COLORS[1], width: 2, dash: 'dash' as const },
                      hovertemplate: '%{y:.2f}<extra></extra>',
                    }] : []),
                  ]}
                  layout={{
                    title: { text: t('geoparquet_explorer.charts.scatter_title') },
                    xaxis: { title: { text: 'Distância da Costa (nm)', standoff: 10 }, range: [appliedDistanceMin, appliedDistanceMax], zeroline: false, hoverformat: '.1f' },
                    yaxis: { title: { text: `${varLabel(appliedVariable).label} (${varUnit})`, standoff: 10 }, range: xRange, zeroline: false, hoverformat: '.2f' },
                    height: 260,
                    margin: { t: 40, b: 40, l: 55, r: 20 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: CHART_FONT,
                    showlegend: true,
                    legend: { x: 1, xanchor: 'right', y: 1 },
                    hoverlabel: HOVER_LABEL_STYLE,
                  }}
                  config={PLOT_CONFIG}
                  style={{ width: '100%' }}
                  useResizeHandler
                />
              </div>
            ) : (
              <div className="chart-card chart-empty" data-testid="scatter-distance-hidden">
                {t('geoparquet_explorer.charts.scatter_hidden')}
              </div>
            )}

            <div className="chart-card">
              <Plot
                data={[{
                  x: result.profileMeans, y: result.profileHeights, type: 'scatter' as const, mode: 'lines+markers' as const,
                  name: 'Perfil médio',
                  line: { color: CHART_COLORS[0], width: 2 },
                  marker: { color: CHART_COLORS[0], size: 6 },
                  error_x: { type: 'data' as const, array: result.profileStds, visible: true, color: CHART_COLORS[0] + '88' },
                  hovertemplate: '%{x:.2f}<extra></extra>',
                }]}
                layout={{
                  title: { text: t('geoparquet_explorer.charts.profile_title') },
                  xaxis: { title: { text: `${varLabel(appliedVariable).label} (${varUnit})`, standoff: 10 }, range: xRange, zeroline: false, hoverformat: '.2f' },
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
        </>
      )}
    </div>
  )
}

export default memo(GeoParquetExplorerInner)
