import { memo } from 'react'
import type { PixelDataSummary } from '../lib/pixelQuery'
import { lazy, Suspense } from 'react'
import { SECTOR_LABELS, windSpeedColor, CHART_COLORS } from '../lib/dashboardChartConstants'
import { WINDROSE_PLOT_CONFIG } from '../lib/windroseConfig'

const Plot = lazy(() => import('react-plotly.js'))

const MINI_PLOT_LAYOUT = {
  margin: { t: 5, b: 20, l: 30, r: 5 },
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { size: 10, color: '#000000' },
  showlegend: false,
}

const MINI_PLOT_CONFIG = {
  displayModeBar: false,
  responsive: true,
}
import { useLocale } from '../i18n/provider'
import './PixelInfoPanel.css'

interface PixelInfoPanelProps {
  data: PixelDataSummary | null
  loading: boolean
  loaded: boolean
  recordCount: number
  pinnedCount: number
  height: number
  onClose: () => void
  onOpenDashboard: () => void
  onAddPin: (lat: number, lon: number) => void
}

function PixelInfoPanelInner({ data, loading, loaded, recordCount, pinnedCount, height, onClose, onOpenDashboard, onAddPin }: PixelInfoPanelProps) {
  const { t } = useLocale()
  const className = `pixel-panel${(data || loading) ? ' open' : ''}`

  return (
    <div className={className}>
      <div className="pixel-panel-header">
        <span>{t('pixel.header')}</span>
        {data && <button className="pixel-panel-close" onClick={onClose}>&times;</button>}
      </div>
      <div className="pixel-panel-content">
        {loading && <p className="pixel-panel-status">{t('pixel.loading')}</p>}
        {!loaded && !loading && <p className="pixel-panel-status">{t('pixel.click_hint')}</p>}
        {loaded && !data && (
          <p className="pixel-panel-status">
            {recordCount > 0
              ? t('pixel.click_hint_with_count', { count: recordCount })
              : t('pixel.no_data_loaded')}
          </p>
        )}
        {data && (
          <div className="pixel-panel-data">

            <Section title={t('pixel.section.location')}>
              <Row label={t('pixel.lat')} value={data.lat.toFixed(4)} />
              <Row label={t('pixel.lon')} value={data.lon.toFixed(4)} />
              <Row label={t('pixel.pixel_id')} value={String(data.pixel_id)} />
              {data.state && <Row label={t('pixel.state')} value={data.state} />}
              {data.bathy_zone && data.bathy_zone !== 'out_of_range' && <Row label={t('pixel.bathy')} value={data.bathy_zone.replace('_', '-') + 'm'} />}
            </Section>

            <Section title={t('pixel.section.wind_speed', { height: `${height}m` })}>
              <Row label={t('pixel.mean')} value={fmt(data.ws[height]?.mean, ' m/s')} />
              <Row label={t('pixel.min')} value={fmt(data.ws[height]?.min, ' m/s')} />
              <Row label={t('pixel.max')} value={fmt(data.ws[height]?.max, ' m/s')} />
              <Row label={t('pixel.std')} value={fmt(data.ws[height]?.std, ' m/s')} />
            </Section>

            {data.profile_heights.length > 0 && (
              <Section title={t('pixel.section.vertical_profile')}>
                <div style={{ height: '140px', width: '100%' }}>
                  <Suspense fallback={null}>
                    <Plot
                      data={[{
                        x: data.profile_means, y: data.profile_heights,
                        type: 'scatter', mode: 'lines+markers',
                        line: { color: CHART_COLORS[0], width: 2 }, marker: { size: 4 }
                      }]}
                      layout={{
                        ...MINI_PLOT_LAYOUT,
                        xaxis: { range: [0, 20], tickfont: { size: 9, color: '#000000' } },
                        yaxis: { tickvals: [10, 50, 100, 150, 200], ticktext: ['10m', '50m', '100m', '150m', '200m'], tickfont: { size: 9, color: '#000000' } },
                      }}
                      config={MINI_PLOT_CONFIG}
                      style={{ width: '100%', height: '100%' }}
                      useResizeHandler
                    />
                  </Suspense>
                </div>
              </Section>
            )}

            <Section title={t('dashboard.chart.wpd_profile_title')}>
              <div style={{ height: '140px', width: '100%' }}>
                <Suspense fallback={null}>
                  <Plot
                    data={[{
                      x: data.wpd_profile_means, y: data.profile_heights,
                      type: 'scatter', mode: 'lines+markers',
                      line: { color: CHART_COLORS[1], width: 2 }, marker: { size: 4 }
                    }]}
                    layout={{
                      ...MINI_PLOT_LAYOUT,
                      xaxis: { range: [0, 1500], tickfont: { size: 9, color: '#000000' } },
                      yaxis: { tickvals: [10, 50, 100, 150, 200], ticktext: ['10m', '50m', '100m', '150m', '200m'], tickfont: { size: 9, color: '#000000' } },
                    }}
                    config={MINI_PLOT_CONFIG}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler
                  />
                </Suspense>
              </div>
            </Section>

            {data.weibull[height] && (
              <Section title={t('pixel.section.weibull')}>
                <Row label={`WS${height} k`} value={fmt(data.weibull[height]?.k)} />
                <Row label={`WS${height} c`} value={fmt(data.weibull[height]?.c, ' m/s')} />
                <div style={{ height: '140px', width: '100%' }}>
                  <Suspense fallback={null}>
                    {(() => {
                      const k = data.weibull[height]?.k ?? 0
                      const c = data.weibull[height]?.c ?? 0
                      if (k <= 0 || c <= 0) return null
                      const xs: number[] = [], ys: number[] = []
                      for (let x = 0; x <= 30; x += 0.5) {
                        xs.push(x)
                        ys.push((k / c) * Math.pow(x / c, k - 1) * Math.exp(-Math.pow(x / c, k)))
                      }
                      return (
                        <Plot
                          data={[{
                            x: xs, y: ys, type: 'scatter', mode: 'lines',
                            line: { color: CHART_COLORS[2], width: 2 },
                            fill: 'tozeroy', fillcolor: CHART_COLORS[2] + '44'
                          }]}
                          layout={{
                            ...MINI_PLOT_LAYOUT,
                            xaxis: { range: [0, 30], tickfont: { size: 9, color: '#000000' } },
                            yaxis: { range: [0, 0.25], tickfont: { size: 9, color: '#000000' } },
                          }}
                          config={MINI_PLOT_CONFIG}
                          style={{ width: '100%', height: '100%' }}
                          useResizeHandler
                        />
                      )
                    })()}
                  </Suspense>
                </div>
              </Section>
            )}

            <Section title={t('pixel.section.directional')}>
              {data.wind_rose[height] ? (
                <div className="chart-wrapper" style={{ height: '180px', width: '100%' }}>
                  <Suspense fallback={null}>
                    {(() => {
                      const wr = data.wind_rose[height]
                      if (!wr) return null
                      const speeds = SECTOR_LABELS.map(s => wr[s]?.mean_ws ?? 0)
                      const maxSpeed = Math.max(...speeds, 1)
                      return (
                        <Plot
                          data={[{
                            r: SECTOR_LABELS.map(s => wr[s]?.freq ?? 0),
                            theta: SECTOR_LABELS,
                            type: 'barpolar',
                            marker: { color: speeds.map(v => windSpeedColor(v, maxSpeed)), line: { color: '#333', width: 0.5 } },
                            opacity: 0.85
                          }]}
                          layout={{
                            margin: { t: 10, b: 10, l: 20, r: 20 },
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            font: { size: 9, color: '#000000' },
                            showlegend: false,
                            polar: {
                              angularaxis: { direction: 'clockwise', rotation: 90, tickfont: { size: 8, color: '#000000' } },
                              radialaxis: { visible: true, ticksuffix: '%', tickfont: { size: 8, color: '#000000' } }
                            }
                          }}
                          config={WINDROSE_PLOT_CONFIG}
                          style={{ width: '100%', height: '100%' }}
                          useResizeHandler
                        />
                      )
                    })()}
                  </Suspense>
                </div>
              ) : null}
            </Section>

            <div className="pixel-panel-actions">
              <button className="pin-button" onClick={() => onAddPin(data.lat, data.lon)} disabled={pinnedCount >= 3}>
                {pinnedCount >= 3 ? t('pixel.pin_max') : t('pixel.pin_button', { count: pinnedCount })}
              </button>
              <button className="dashboard-button" onClick={onOpenDashboard}>
                {t('pixel.open_dashboard')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pixel-section">
      <div className="pixel-section-title">{title}</div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="pixel-row">
      <span className="pixel-row-label">{label}</span>
      <span className="pixel-row-value">{value}</span>
    </div>
  )
}

function fmt(v: number | null | undefined, suffix = ''): string {
  if (v == null || !isFinite(v)) return '-'
  return v.toFixed(2) + suffix
}

export default memo(PixelInfoPanelInner)
