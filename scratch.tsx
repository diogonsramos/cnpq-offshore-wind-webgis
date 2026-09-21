import { useState, useMemo, useEffect, memo, lazy, Suspense, type ReactNode, type Dispatch, useRef } from 'react'
import {
  MODELS, DATASETS, VARIABLES, HEIGHTS,
  datasetLabel, varLabel, modelLabel, COASTAL_STATES, stateNorthSouthIndex,
  type Model, type Dataset, type Variable, type Height,
} from '../lib/cogCatalog'
import { type DashboardLocationData, queryPixelStat, seasonStat, loadParquet, queryFilteredPixels, type FilterCriteria, type FilteredAggregates } from '../lib/pixelQuery'
import type { AppAction } from '../reducer'
import {
  SEASON_ORDER, SEASON_LABELS, SECTOR_LABELS,
  HEIGHT_TICKVALS, HEIGHT_TICKTEXT, CHART_COLORS as COLORS, PLOT_CONFIG,
  CHART_FONT, HOVER_LABEL_STYLE, windSpeedColor, WS_LEGEND_GRADIENT,
  BATHY_ZONE_OPTIONS, DISTANCE_MAX_NM, DISTANCE_ZONE_OPTIONS
} from '../lib/dashboardChartConstants'
import { WINDROSE_PLOT_CONFIG } from '../lib/windroseConfig'
import MiniMap from './MiniMap'

import DashboardSkeleton from './DashboardSkeleton'
import { useLocale } from '../i18n/provider'
import './DashboardView.css'

const Plot = lazy(() => import('react-plotly.js'))

function fmtCsvValue(v: number | null): string {
  return v == null || !isFinite(v) ? '' : String(v)
}

function ChartCard({
  id, wide, testId, fullscreenId, onToggleFullscreen, children,
}: {
  id: string
  wide?: boolean
  testId?: string
  fullscreenId: string | null
  onToggleFullscreen: (id: string) => void
  children: ReactNode
}) {
  const { t } = useLocale()
  const isFullscreen = fullscreenId === id
  const cls = `chart-card${wide ? ' chart-card--wide' : ''}${isFullscreen ? ' chart-card--fullscreen' : ''}`
  return (
    <>
      {isFullscreen && <div className="chart-fullscreen-backdrop" onClick={() => onToggleFullscreen(id)} />}
      <div className={cls} data-testid={testId}>
        <button
          className="chart-fullscreen-btn"
          onClick={() => onToggleFullscreen(id)}
          title={isFullscreen ? t('dashboard.chart.restore') : t('dashboard.chart.fullscreen')}
          aria-label={isFullscreen ? t('dashboard.chart.restore_aria') : t('dashboard.chart.expand_aria')}
        >
          {isFullscreen ? '✕' : '⛶'}
        </button>
        {children}
      </div>
    </>
  )
}

function fingerprint(f: FilterCriteria): string {
  return JSON.stringify({
    model: f.model, experiment: f.experiment, variable: f.variable, height: f.height,
    states: [...(f.states ?? [])].sort(),
    bathyZones: [...(f.bathyZones ?? [])].sort(),
    distanceMin: f.distanceMin, distanceMax: f.distanceMax,
  })
}

function stateLabel(code: string): string {
  return COASTAL_STATES.find(s => s.val === code)?.label ?? code
}

function distanceMaxFromZones(zones: string[]): number {
  if (zones.length === 0) return DISTANCE_MAX_NM
  return Math.max(...zones.map(z => DISTANCE_ZONE_OPTIONS.find(o => o.val === z)?.max ?? DISTANCE_MAX_NM))
}

interface DashboardViewProps {
  model: Model
  dataset: Dataset
  pinnedLocations: DashboardLocationData[]
  onAddLocation: (lat: number, lon: number) => void
  onRemoveLocation: (idx: number) => void
  dispatch: Dispatch<AppAction>
}

function DashboardViewInner({
  model,
  dataset,
  pinnedLocations,
  onAddLocation,
  onRemoveLocation,
  dispatch,
}: DashboardViewProps) {
  const { t } = useLocale()
  const [dashboardVar, setDashboardVar] = useState<Variable>('ws')
  const [dashboardHeight, setDashboardHeight] = useState<Height>(100)
  const [latInput, setLatInput] = useState('')
  const [lonInput, setLonInput] = useState('')
  const [locError, setLocError] = useState('')
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null)

  // GeoParquet States
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
    await loadParquet(dataset, model).catch(() => { })
    if (loadGenRef.current !== myGen) return

    const filters: FilterCriteria = {
      model, experiment: dataset, variable: dashboardVar, height: dashboardHeight,
      states, bathyZones, distanceMin: 0, distanceMax: distanceMaxFromZones(distanceZones),
    }
    const fp = fingerprint(filters)
    let r = cacheRef.current.get(fp)
    if (!r) {
      r = queryFilteredPixels(filters)
      cacheRef.current.set(fp, r)
    }
    setAppliedFilters(filters)
    setResult(r)
    setLoading(false)
  }

  // Pre-fetch global data when component loads if no filter applied yet
  useEffect(() => {
    if (!appliedFilters && !loading && !result) {
      handleApply()
    }
  }, [model, dataset, dashboardVar, dashboardHeight])

  const toggleFullscreen = (id: string) => {
    setFullscreenChart(prev => (prev === id ? null : id))
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
  }

  const plotHeight = (id: string): number => fullscreenChart === id ? Math.max(400, window.innerHeight - 160) : 260

  useEffect(() => {
    if (!fullscreenChart) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreenChart(null) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreenChart])

  const handleManualAdd = () => {
    const lat = parseFloat(latInput)
    const lon = parseFloat(lonInput)
    if (isNaN(lat) || isNaN(lon)) { setLocError(t('dashboard.invalid_coords')); return }
    if (pinnedLocations.length >= 3) { setLocError(t('dashboard.max_locations')); return }
    onAddLocation(lat, lon)
    setLatInput('')
    setLonInput('')
    setLocError('')
  }

  const locLabel = (_loc: DashboardLocationData, i: number): string => `Loc ${i + 1}`
  const modelLabelStr = modelLabel(model, t)
  const datasetLabelStr = datasetLabel(dataset, t)
  const varUnit = dashboardVar === 'ws' ? 'm/s' : 'W/m²'

  // Boxplot computations
  const showBoxplotByState = appliedFilters !== null && (appliedFilters.states?.length ?? 0) !== 1
  const showBoxplotByBathy = appliedFilters !== null && (appliedFilters.bathyZones?.length ?? 0) !== 1
  const xRange: [number, number] = dashboardVar === 'ws' ? [0, 20] : [0, 1500]

  const byStateOrdered = useMemo(
    () => result ? [...result.byState].sort((a, b) => stateNorthSouthIndex(a.state) - stateNorthSouthIndex(b.state)) : [],
    [result]
  )
  const byBathyOrdered = useMemo(() => {
    if (!result) return []
    const order = BATHY_ZONE_OPTIONS.map(b => b.val)
    return [...result.byBathyZone].sort((a, b) => order.indexOf(a.zone) - order.indexOf(b.zone))
  }, [result])
  
  const histogramTrace = useMemo(() => {
    if (!result) return null
    return {
      x: result.histogram.map(b => `${b.binStart.toFixed(0)}–${b.binEnd.toFixed(0)}`),
      y: result.histogram.map(b => b.count),
      type: 'bar' as const,
      marker: { color: COLORS[0] },
    }
  }, [result])

  const wsProfileData = useMemo(() => {
    if (pinnedLocations.length === 0) return { heights: [] as number[], datasets: [] as { label: string; data: number[]; borderColor: string }[] }
    return {
      heights: pinnedLocations[0].profile_heights,
      datasets: pinnedLocations.map((loc, i) => ({
        label: locLabel(loc, i),
        data: loc.profile_means.length > 0 ? loc.profile_means : [],
        borderColor: COLORS[i],
      })),
    }
  }, [pinnedLocations, modelLabelStr, datasetLabelStr])

  const wpdProfileData = useMemo(() => {
    if (pinnedLocations.length === 0) return { heights: [] as number[], datasets: [] as { label: string; data: number[]; borderColor: string }[] }
    return {
      heights: pinnedLocations[0].profile_heights,
      datasets: pinnedLocations.map((loc, i) => ({
        label: locLabel(loc, i),
        data: loc.wpd_profile_means.length > 0 ? loc.wpd_profile_means : [],
        borderColor: COLORS[i],
      })),
    }
  }, [pinnedLocations, modelLabelStr, datasetLabelStr])

  const hasWpdProfileData = wpdProfileData.datasets.some(ds => ds.data.some(v => v != null && isFinite(v)))

  const windRoseMaxSpeed = useMemo(() => {
    let max = 0
    for (const loc of pinnedLocations) {
      const wr = loc.wind_rose?.[dashboardHeight]
      if (!wr) continue
      for (const s of SECTOR_LABELS) {
        const v = wr[s]?.mean_ws ?? 0
        if (v > max) max = v
      }
    }
    return max
  }, [pinnedLocations, dashboardHeight])

  const profileYAxis = {
    title: { text: t('dashboard.chart.profile_height_axis'), standoff: 10 },
    tickmode: 'array' as const,
    tickvals: HEIGHT_TICKVALS,
    ticktext: HEIGHT_TICKTEXT,
    range: [0, 210],
  }

  return (
    <div className="dashboard-view" style={{ overflowY: 'hidden' }}>
      
      {/* Top Filter Bar */}
      <div className="dv-filter-bar-unified">
        <div className="dv-filter-group">
          <label className="dv-label">{t('dashboard.filters.model_label')}</label>
          <select value={model} onChange={e => dispatch({ type: 'SET_MODEL', model: e.target.value as Model })} className="dv-select">
            {MODELS.map(m => <option key={m} value={m}>{modelLabel(m, t)}</option>)}
          </select>
        </div>
        <div className="dv-filter-group">
          <label className="dv-label">{t('dashboard.filters.experiment_label')}</label>
          <select value={dataset} onChange={e => dispatch({ type: 'SET_DATASET', dataset: e.target.value as Dataset })} className="dv-select">
            {DATASETS.map(d => <option key={d} value={d}>{datasetLabel(d, t)}</option>)}
          </select>
        </div>
        <div className="dv-filter-group">
          <label className="dv-label">{t('dashboard.filters.variable_label')}</label>
          <select value={dashboardVar} onChange={e => setDashboardVar(e.target.value as Variable)} className="dv-select">
            {VARIABLES.map(v => <option key={v} value={v}>{varLabel(v, t).label}</option>)}
          </select>
        </div>
        <div className="dv-filter-group">
          <label className="dv-label">{t('dashboard.filters.height_label')}</label>
          <select value={dashboardHeight} onChange={e => setDashboardHeight(Number(e.target.value) as Height)} className="dv-select">
            {HEIGHTS.map(h => <option key={h} value={h}>{h}m</option>)}
          </select>
        </div>
      </div>

      <div className="unified-dashboard-container">
        
        {/* Left Sidebar */}
        <div className="dv-sidebar">
          <div className="minimap-container">
            <MiniMap pinnedLocations={pinnedLocations} onPinClick={onAddLocation} />
            <div className="dv-location-inputs">
              <input className="dv-input" type="number" step="any" placeholder={t('pixel.lat')} value={latInput} onChange={e => setLatInput(e.target.value)} />
              <input className="dv-input" type="number" step="any" placeholder={t('pixel.lon')} value={lonInput} onChange={e => setLonInput(e.target.value)} />
              <button className="dv-add-btn" onClick={handleManualAdd}>{t('dashboard.add_location')}</button>
            </div>
            {locError && <span className="dv-error">{locError}</span>}
            
            <div className="dv-chips">
              {pinnedLocations.map((loc, i) => (
                <span key={i} className="dv-legend-chip" style={{ borderLeftColor: COLORS[i] }}>
                  <span className="dv-legend-swatch" style={{ background: COLORS[i] }} />
                  {locLabel(loc, i)} — ({loc.lat.toFixed(2)}, {loc.lon.toFixed(2)})
                  <button className="chip-remove" onClick={() => onRemoveLocation(i)}>&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div className="geoparquet-filters">
            <h3 className="gpe-title">Filtros GeoParquet</h3>
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
            <div className="gpe-apply-row">
              <button className="dv-apply-btn" onClick={handleApply} disabled={loading}>
                {t('geoparquet_explorer.filters.apply_btn')}
              </button>
              {loading && <span className="dv-hint">{t('geoparquet_explorer.loading')}</span>}
              {!loading && result && (
                <span className="dv-hint">{t('geoparquet_explorer.filters.pixel_count', { count: result.count })} pixels</span>
              )}
            </div>
          </div>

          {result && result.count > 0 && (
            <div className="gpe-stats-grid">
              <div className="gpe-stat-chip"><span className="gpe-stat-label">{t('geoparquet_explorer.stats.mean')}</span><span className="gpe-stat-value">{result.mean?.toFixed(1)} {varUnit}</span></div>
              <div className="gpe-stat-chip"><span className="gpe-stat-label">{t('geoparquet_explorer.stats.median')}</span><span className="gpe-stat-value">{result.median?.toFixed(1)} {varUnit}</span></div>
              <div className="gpe-stat-chip"><span className="gpe-stat-label">{t('geoparquet_explorer.stats.std')}</span><span className="gpe-stat-value">{result.std?.toFixed(2)}</span></div>
              <div className="gpe-stat-chip"><span className="gpe-stat-label">{t('geoparquet_explorer.stats.min')}</span><span className="gpe-stat-value">{result.min?.toFixed(1)} {varUnit}</span></div>
              <div className="gpe-stat-chip"><span className="gpe-stat-label">{t('geoparquet_explorer.stats.max')}</span><span className="gpe-stat-value">{result.max?.toFixed(1)} {varUnit}</span></div>
              <div className="gpe-stat-chip"><span className="gpe-stat-label">{t('geoparquet_explorer.stats.cv')}</span><span className="gpe-stat-value">{result.cv?.toFixed(1)}%</span></div>
            </div>
          )}
        </div>

        {/* Right Main Content */}
        <div className="dv-main">
          <Suspense fallback={<DashboardSkeleton />}>
            <div className="dv-chart-grid">
              
              {pinnedLocations.length > 0 && (
                <ChartCard id="weibull" testId="chart-weibull" fullscreenId={fullscreenChart} onToggleFullscreen={toggleFullscreen}>
                  <Plot
                    data={pinnedLocations.map((loc, i) => {
                      const w = loc.weibull?.[dashboardHeight]
                      if (!w) return { x: [], y: [], type: 'scatter', name: locLabel(loc, i) }
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
                        name: `${locLabel(loc, i)} (k=${w.k.toFixed(2)}, c=${w.c.toFixed(2)})`,
                        line: { color: COLORS[i], width: 3 },
                        fill: 'tozeroy',
                        fillcolor: COLORS[i] + '22',
                        hovertemplate: '%{y:.4f}<extra></extra>',
                      }
                    })}
                    layout={{
                      title: { text: t('dashboard.chart.weibull_title', { height: `${dashboardHeight}m` }) },
                      xaxis: { title: { text: t('dashboard.chart.wind_speed_axis'), standoff: 10 }, range: [0, 30], zeroline: false, hoverformat: '.2f' },
                      yaxis: { title: { text: t('dashboard.chart.pdf_axis'), standoff: 10 }, range: [0, 0.3], zeroline: false, hoverformat: '.4f' },
                      height: plotHeight('weibull'),
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
                </ChartCard>
              )}

              {pinnedLocations.length > 0 && (
                <ChartCard id="windrose" testId="chart-windrose" fullscreenId={fullscreenChart} onToggleFullscreen={toggleFullscreen}>
                  <Plot
                    data={pinnedLocations.map((loc, i) => {
                      const wr = loc.wind_rose?.[dashboardHeight]
                      if (!wr) return { r: [], theta: [], type: 'barpolar', name: locLabel(loc, i) }
                      const speeds = SECTOR_LABELS.map(s => wr[s]?.mean_ws ?? 0)
                      return {
                        r: SECTOR_LABELS.map(s => wr[s]?.freq ?? 0),
                        theta: SECTOR_LABELS,
                        type: 'barpolar' as const,
                        name: locLabel(loc, i),
                        marker: { color: speeds.map(v => windSpeedColor(v, windRoseMaxSpeed)), line: { color: COLORS[i], width: 2.5 } },
                        opacity: 0.85,
                        customdata: speeds,
                        hovertemplate: `%{theta}: %{r:.1f}%<br>${t('dashboard.chart.windrose_avg_speed')}: %{customdata:.2f} m/s<extra></extra>`,
                      }
                    })}
                    layout={{
                      title: { text: t('dashboard.chart.windrose_title', { height: `${dashboardHeight}m` }) },
                      height: plotHeight('windrose'),
                      margin: { t: 40, b: 30, l: 50, r: 50 },
                      paper_bgcolor: 'transparent',
                      plot_bgcolor: 'transparent',
                      font: CHART_FONT,
                      showlegend: false,
                      barmode: 'overlay',
                      hoverlabel: { font: { size: 12, color: '#fff' } },
                      polar: { angularaxis: { direction: 'clockwise', rotation: 90 }, radialaxis: { visible: true, title: { text: t('dashboard.chart.freq_axis') }, ticksuffix: '%' } },
                    }}
                    config={WINDROSE_PLOT_CONFIG}
                    style={{ width: '100%' }}
                    useResizeHandler
                  />
                  {windRoseMaxSpeed > 0 && (
                    <div className="windrose-legend">
                      <span className="windrose-legend-label">0 m/s</span>
                      <div className="windrose-legend-bar" style={{ background: WS_LEGEND_GRADIENT }} />
                      <span className="windrose-legend-label">{windRoseMaxSpeed.toFixed(1)} m/s</span>
                    </div>
                  )}
                </ChartCard>
              )}

              {result && result.count > 0 && showBoxplotByState && (
                <ChartCard id="boxplot-state" testId="chart-boxplot-state" fullscreenId={fullscreenChart} onToggleFullscreen={toggleFullscreen}>
                  <Plot
                    data={byStateOrdered.map((g, i) => ({
                      y: g.values, type: 'box' as const, name: stateLabel(g.state),
                      marker: { color: CHART_COLORS[i % CHART_COLORS.length] },
                      boxpoints: false as const,
                    }))}
                    layout={{
                      title: { text: t('geoparquet_explorer.charts.boxplot_state_title') },
                      xaxis: { tickangle: -45 },
                      yaxis: { title: { text: `${varLabel(dashboardVar, t).label} (${varUnit})`, standoff: 10 }, range: xRange, zeroline: false, hoverformat: '.2f' },
                      height: plotHeight('boxplot-state'),
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
                </ChartCard>
              )}

              {result && result.count > 0 && showBoxplotByBathy && (
                <ChartCard id="boxplot-bathy" testId="chart-boxplot-bathy" fullscreenId={fullscreenChart} onToggleFullscreen={toggleFullscreen}>
                  <Plot
                    data={byBathyOrdered.map((g, i) => ({
                      y: g.values, type: 'box' as const, name: bathyOptionLabel(g.zone),
                      marker: { color: CHART_COLORS[i % CHART_COLORS.length] },
                      boxpoints: false as const,
                    }))}
                    layout={{
                      title: { text: t('geoparquet_explorer.charts.boxplot_bathy_title') },
                      xaxis: { tickangle: -45 },
                      yaxis: { title: { text: `${varLabel(dashboardVar, t).label} (${varUnit})`, standoff: 10 }, range: xRange, zeroline: false, hoverformat: '.2f' },
                      height: plotHeight('boxplot-bathy'),
                      margin: { t: 40, b: 80, l: 55, r: 20 },
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
                </ChartCard>
              )}

              {pinnedLocations.length > 0 && (
                <ChartCard id="ws-profile" testId="chart-ws-profile" fullscreenId={fullscreenChart} onToggleFullscreen={toggleFullscreen}>
                  <Plot
                    data={wsProfileData.datasets.map((ds, i) => ({
                      x: ds.data, y: wsProfileData.heights, type: 'scatter' as const, mode: 'lines+markers' as const,
                      name: ds.label, line: { color: COLORS[i], width: 3 }, marker: { color: COLORS[i], size: 6 },
                      hovertemplate: '%{x:.2f}<extra></extra>',
                    }))}
                    layout={{
                      title: { text: t('dashboard.chart.ws_profile_title') },
                      xaxis: { title: { text: t('dashboard.chart.wind_speed_axis'), standoff: 10 }, range: [0, 20], zeroline: false, hoverformat: '.2f' },
                      yaxis: profileYAxis,
                      height: plotHeight('ws-profile'),
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
                </ChartCard>
              )}

              {pinnedLocations.length > 0 && hasWpdProfileData && (
                <ChartCard id="wpd-profile" testId="chart-wpd-profile" fullscreenId={fullscreenChart} onToggleFullscreen={toggleFullscreen}>
                  <Plot
                    data={wpdProfileData.datasets.map((ds, i) => ({
                      x: ds.data, y: wpdProfileData.heights, type: 'scatter' as const, mode: 'lines+markers' as const,
                      name: ds.label, line: { color: COLORS[i], width: 3 }, marker: { color: COLORS[i], size: 6 },
                      hovertemplate: `%{x:.1f} ${t('dashboard.chart.wpd_unit')}<extra></extra>`,
                    }))}
                    layout={{
                      title: { text: t('dashboard.chart.wpd_profile_title') },
                      xaxis: { title: { text: t('dashboard.chart.wpd_axis'), standoff: 10 }, range: [0, 1500], zeroline: false, hoverformat: '.1f' },
                      yaxis: profileYAxis,
                      height: plotHeight('wpd-profile'),
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
                </ChartCard>
              )}

            </div>
          </Suspense>
        </div>

      </div>
    </div>
  )
}

export default memo(DashboardViewInner)
