import { useState, useMemo, useEffect, memo, lazy, Suspense, type ReactNode, type Dispatch } from 'react'
import {
  MODELS, DATASETS, VARIABLES, HEIGHTS,
  datasetLabel, varLabel, modelLabel,
  type Model, type Dataset, type Variable, type Height,
} from '../lib/cogCatalog'
import { type DashboardLocationData, queryPixelStat, seasonStat } from '../lib/pixelQuery'
import type { AppAction } from '../reducer'
import {
  SEASON_ORDER, SEASON_LABELS, SECTOR_LABELS,
  HEIGHT_TICKVALS, HEIGHT_TICKTEXT, CHART_COLORS as COLORS, PLOT_CONFIG,
  CHART_FONT, HOVER_LABEL_STYLE, windSpeedColor, WS_LEGEND_GRADIENT,
} from '../lib/dashboardChartConstants'
import { WINDROSE_PLOT_CONFIG } from '../lib/windroseConfig'
import MiniMap from './MiniMap'
import DashboardComparisonView from './DashboardComparisonView'
import GeoParquetExplorer from './GeoParquetExplorer'
import DirectionalHeatmap from './DirectionalHeatmap'
import DashboardSkeleton from './DashboardSkeleton'
import { useLocale } from '../i18n/provider'
import './DashboardView.css'

// Deferred so the ~1MB plotly.js payload only downloads once a chart actually
// renders, instead of the moment DashboardView's own chunk loads.
const Plot = lazy(() => import('react-plotly.js'))

type DashboardTab = 'simple' | 'compare_exp' | 'compare_model' | 'geoparquet'

function fmtCsvValue(v: number | null): string {
  return v == null || !isFinite(v) ? '' : String(v)
}

// Shared fullscreen toggle chrome for every `.chart-card` — extracted because the
// same button/backdrop/class logic would otherwise repeat across 6+ chart cards.
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
  const [dvTab, setDvTab] = useState<DashboardTab>('simple')
  const [visitedTabs, setVisitedTabs] = useState<Set<DashboardTab>>(new Set(['simple']))
  const [dashboardVar, setDashboardVar] = useState<Variable>('ws')
  const [dashboardHeight, setDashboardHeight] = useState<Height>(100)
  const [latInput, setLatInput] = useState('')
  const [lonInput, setLonInput] = useState('')
  const [locError, setLocError] = useState('')
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null)

  const toggleFullscreen = (id: string) => {
    setFullscreenChart(prev => (prev === id ? null : id))
    // react-plotly.js's useResizeHandler only recomputes on a window 'resize'
    // event — the chart-card growing to viewport size doesn't fire one itself.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
  }

  // Plotly layout.height is a fixed pixel number, not CSS — grow it explicitly
  // when its card is fullscreen so the chart actually fills the extra space.
  const plotHeight = (id: string): number =>
    fullscreenChart === id ? Math.max(400, window.innerHeight - 160) : 260

  useEffect(() => {
    if (!fullscreenChart) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenChart(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreenChart])

  const handleDownloadCsv = () => {
    const header = ['location', 'variable', 'height', 'season', 'mean', 'min', 'max', 'std']
    const rows: string[] = [header.join(',')]
    const seasonsToExport = (dataset === 'era5' || dataset === 'hist') ? SEASON_ORDER : ['ANNUAL']
    pinnedLocations.forEach((loc, i) => {
      const label = locLabel(loc, i)
      seasonsToExport.forEach(season => {
        ; (['ws', 'wpd'] as const).forEach(v => {
          HEIGHTS.forEach(h => {
            const mean = seasonStat(loc, v, h, season, 'mean')
            const min = seasonStat(loc, v, h, season, 'min')
            const max = seasonStat(loc, v, h, season, 'max')
            const std = seasonStat(loc, v, h, season, 'std')
            rows.push([label, v, String(h), season, fmtCsvValue(mean), fmtCsvValue(min), fmtCsvValue(max), fmtCsvValue(std)].join(','))
          })
        })
      })
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `webgis-dashboard-${dateStr}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const modelLabelStr = modelLabel(model, t)
  const datasetLabelStr = datasetLabel(dataset, t)

  const handleManualAdd = () => {
    const lat = parseFloat(latInput)
    const lon = parseFloat(lonInput)
    if (isNaN(lat) || isNaN(lon)) {
      setLocError(t('dashboard.invalid_coords'))
      return
    }
    if (pinnedLocations.length >= 3) {
      setLocError(t('dashboard.max_locations'))
      return
    }
    onAddLocation(lat, lon)
    setLatInput('')
    setLonInput('')
    setLocError('')
  }

  // Model/experiment/variable/height are already explicit in the filter bar above,
  // so the legend only needs to disambiguate which pinned point each trace is.
  const locLabel = (_loc: DashboardLocationData, i: number): string =>
    `Loc ${i + 1}`

  const varUnit = dashboardVar === 'ws' ? 'm/s' : 'W/m²'

  const seasonChartData = useMemo(() => ({
    labels: SEASON_ORDER,
    datasets: pinnedLocations.map((loc, i) => ({
      label: locLabel(loc, i),
      data: SEASON_ORDER.map(s => queryPixelStat(loc.pixel_id, dashboardVar, dashboardHeight, s, 'mean') ?? null),
      backgroundColor: COLORS[i] + '88',
      borderColor: COLORS[i],
      borderWidth: 1,
    })),
  }), [pinnedLocations, dashboardVar, dashboardHeight, modelLabelStr, datasetLabelStr])

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

  // Shared across every pinned location's wind rose trace so sector fill color
  // is comparable between locations instead of each being scaled to its own max.
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

  const emptyMsg = pinnedLocations.length === 0
    ? t('dashboard.empty_state')
    : null

  const profileYAxis = {
    title: { text: t('dashboard.chart.profile_height_axis'), standoff: 10 },
    tickmode: 'array' as const,
    tickvals: HEIGHT_TICKVALS,
    ticktext: HEIGHT_TICKTEXT,
    range: [0, 210],
  }

  return (
    <div className="dashboard-view">
      <div className="dv-inner-tabs">
        <button
          className={`dv-inner-tab-btn ${dvTab === 'simple' ? 'active' : ''}`}
          onClick={() => { setDvTab('simple'); setVisitedTabs(prev => new Set(prev).add('simple')) }}
        >
          {t('dashboard.tab.simple')}
        </button>
        <button
          className={`dv-inner-tab-btn ${dvTab === 'compare_exp' ? 'active' : ''}`}
          onClick={() => { setDvTab('compare_exp'); setVisitedTabs(prev => new Set(prev).add('compare_exp')) }}
        >
          {t('dashboard.tab.compare_exp')}
        </button>
        <button
          className={`dv-inner-tab-btn ${dvTab === 'compare_model' ? 'active' : ''}`}
          onClick={() => { setDvTab('compare_model'); setVisitedTabs(prev => new Set(prev).add('compare_model')) }}
        >
          {t('dashboard.tab.compare_model')}
        </button>
        <button
          className={`dv-inner-tab-btn ${dvTab === 'geoparquet' ? 'active' : ''}`}
          onClick={() => { setDvTab('geoparquet'); setVisitedTabs(prev => new Set(prev).add('geoparquet')) }}
        >
          {t('dashboard.tab.geoparquet')}
        </button>
      </div>

      <div className="dv-tab-panel" style={{ display: dvTab === 'simple' ? 'flex' : 'none' }}>
        <div className="dv-body">
          <div className="dv-filter-bar">
            <div className="dv-filter-group">
              <label className="dv-label">{t('dashboard.filters.model_label')}</label>
              <select value={model} onChange={e => dispatch({ type: 'SET_MODEL', model: e.target.value as Model })} className="dv-select">
                {MODELS.map(m => (
                  <option key={m} value={m}>{modelLabel(m, t)}</option>
                ))}
              </select>
            </div>
            <div className="dv-filter-group">
              <label className="dv-label">{t('dashboard.filters.experiment_label')}</label>
              <select value={dataset} onChange={e => dispatch({ type: 'SET_DATASET', dataset: e.target.value as Dataset })} className="dv-select">
                {DATASETS.map(d => (
                  <option key={d} value={d}>{datasetLabel(d, t)}</option>
                ))}
              </select>
            </div>
            <div className="dv-filter-group">
              <label className="dv-label">{t('dashboard.filters.variable_label')}</label>
              <select value={dashboardVar} onChange={e => setDashboardVar(e.target.value as Variable)} className="dv-select">
                {VARIABLES.map(v => (
                  <option key={v} value={v}>{varLabel(v, t).label}</option>
                ))}
              </select>
            </div>
            <div className="dv-filter-group">
              <label className="dv-label">{t('dashboard.filters.height_label')}</label>
              <select value={dashboardHeight} onChange={e => setDashboardHeight(Number(e.target.value) as Height)} className="dv-select">
                {HEIGHTS.map(h => (
                  <option key={h} value={h}>{h}m</option>
                ))}
              </select>
            </div>
            <button
              className="dv-export-btn"
              onClick={handleDownloadCsv}
              disabled={pinnedLocations.length === 0}
              title={t('dashboard.download_csv_tooltip')}
            >
              {t('dashboard.download_csv')}
            </button>
          </div>

          <div className="dv-location-bar">
            <input className="dv-input" type="number" step="any" placeholder={t('pixel.lat')} value={latInput} onChange={e => setLatInput(e.target.value)} />
            <input className="dv-input" type="number" step="any" placeholder={t('pixel.lon')} value={lonInput} onChange={e => setLonInput(e.target.value)} />
            <button className="dv-add-btn" onClick={handleManualAdd}>{t('dashboard.add_location')}</button>
            <span className="dv-hint">{t('dashboard.add_location_hint')}</span>
            {locError && <span className="dv-error">{locError}</span>}
          </div>



          <div className="dv-chips">
            {pinnedLocations.map((loc, i) => (
              <span key={i} className="dv-legend-chip" style={{ borderLeftColor: COLORS[i] }}>
                <span className="dv-legend-swatch" style={{ background: COLORS[i] }} />
                {locLabel(loc, i)} — {modelLabelStr} ({loc.lat.toFixed(2)}, {loc.lon.toFixed(2)})
                <button className="chip-remove" onClick={() => onRemoveLocation(i)}>&times;</button>
              </span>
            ))}
            {pinnedLocations.length > 0 && (
              <button
                className="dv-remove-all"
                onClick={() => {
                  // Removing ascending indices while onRemoveLocation splices the array
                  // (idx: number) => void shifts every later index down, so removing
                  // 0,1,2 in order only ever removes 0 and what becomes the new 1 —
                  // descending order removes each item before the shift can affect it.
                  for (let i = pinnedLocations.length - 1; i >= 0; i--) onRemoveLocation(i)
                }}
              >
                {t('dashboard.remove_all')}
              </button>
            )}
          </div>

          {emptyMsg ? (
            <div className="dv-empty">{emptyMsg}</div>
          ) : (
            <div className="dv-main">
              <Suspense fallback={<DashboardSkeleton />}>
                <div className="dv-chart-grid">
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
                          line: { color: COLORS[i], width: 2 },
                          fill: 'tozeroy',
                          fillcolor: COLORS[i] + '22',
                          hovertemplate: '%{y:.4f}<extra></extra>',
                        }
                      })}
                      layout={{
                        title: { text: t('dashboard.chart.weibull_title', { height: `${dashboardHeight}m` }) },
                        xaxis: {
                          title: { text: t('dashboard.chart.wind_speed_axis'), standoff: 10 },
                          range: [0, 30],
                          zeroline: false,
                          hoverformat: '.2f',
                        },
                        yaxis: {
                          title: { text: t('dashboard.chart.pdf_axis'), standoff: 10 },
                          range: [0, 0.3],
                          zeroline: false,
                          hoverformat: '.4f',
                        },
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
                          marker: {
                            color: speeds.map(v => windSpeedColor(v, windRoseMaxSpeed)),
                            line: { color: COLORS[i], width: 1.5 },
                          },
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
                        polar: {
                          angularaxis: {
                            direction: 'clockwise',
                            rotation: 90,
                          },
                          radialaxis: { visible: true, title: { text: t('dashboard.chart.freq_axis') }, ticksuffix: '%' },
                        },
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

                  <ChartCard id="ws-profile" fullscreenId={fullscreenChart} onToggleFullscreen={toggleFullscreen}>
                    <Plot
                      data={wsProfileData.datasets.map((ds, i) => ({
                        x: ds.data,
                        y: wsProfileData.heights,
                        type: 'scatter' as const,
                        mode: 'lines+markers' as const,
                        name: ds.label,
                        line: { color: COLORS[i], width: 2 },
                        marker: { color: COLORS[i], size: 6 },
                        hovertemplate: '%{x:.2f}<extra></extra>',
                      }))}
                      layout={{
                        title: { text: t('dashboard.chart.ws_profile_title') },
                        xaxis: {
                          title: { text: t('dashboard.chart.wind_speed_axis'), standoff: 10 },
                          range: [0, 20],
                          zeroline: false,
                          hoverformat: '.2f',
                        },
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

                  <ChartCard id="wpd-profile" testId="chart-wpd-profile" fullscreenId={fullscreenChart} onToggleFullscreen={toggleFullscreen}>
                    {hasWpdProfileData ? (
                      <Plot
                        data={wpdProfileData.datasets.map((ds, i) => ({
                          x: ds.data,
                          y: wpdProfileData.heights,
                          type: 'scatter' as const,
                          mode: 'lines+markers' as const,
                          name: ds.label,
                          line: { color: COLORS[i], width: 2 },
                          marker: { color: COLORS[i], size: 6 },
                          hovertemplate: `%{x:.1f} ${t('dashboard.chart.wpd_unit')}<extra></extra>`,
                        }))}
                        layout={{
                          title: { text: t('dashboard.chart.wpd_profile_title') },
                          xaxis: {
                            title: { text: t('dashboard.chart.wpd_axis'), standoff: 10 },
                            range: [0, 1500],
                            zeroline: false,
                            hoverformat: '.1f',
                          },
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
                    ) : (
                      <div className="chart-empty">{t('dashboard.chart.profile_empty')}</div>
                    )}
                  </ChartCard>

                  {pinnedLocations.map((loc, i) => (
                    <ChartCard key={i} id={`heatmap-${i}`} wide testId="chart-heatmap" fullscreenId={fullscreenChart} onToggleFullscreen={toggleFullscreen}>
                      <div className="heatmap-loc-label" style={{ borderLeftColor: COLORS[i] }}>{locLabel(loc, i)}</div>
                      <DirectionalHeatmap
                        data={loc.heatmap[`${dashboardVar}${dashboardHeight}_heatmap`]}
                        variable={dashboardVar}
                        height={dashboardHeight}
                      />
                    </ChartCard>
                  ))}
                </div>
              </Suspense>
            </div>
          )}
        </div>

        <div className="dv-sidebar">
          <div className="minimap">
            <MiniMap pinnedLocations={pinnedLocations} onPinClick={onAddLocation} />
          </div>
        </div>
      </div>

      <div className="dv-tab-panel" style={{ display: dvTab === 'compare_exp' ? 'flex' : 'none' }}>
        {visitedTabs.has('compare_exp') && <DashboardComparisonView mode="experiments" currentModel={model} currentDataset={dataset} pinnedLocations={pinnedLocations} />}
      </div>

      <div className="dv-tab-panel" style={{ display: dvTab === 'compare_model' ? 'flex' : 'none' }}>
        {visitedTabs.has('compare_model') && <DashboardComparisonView mode="models" currentModel={model} currentDataset={dataset} pinnedLocations={pinnedLocations} />}
      </div>

      <div className="dv-tab-panel" style={{ display: dvTab === 'geoparquet' ? 'flex' : 'none' }}>
        {visitedTabs.has('geoparquet') && <GeoParquetExplorer currentModel={model} currentDataset={dataset} />}
      </div>
    </div>
  )
}

export default memo(DashboardViewInner)
