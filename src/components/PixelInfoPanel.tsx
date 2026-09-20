import { memo } from 'react'
import type { PixelDataSummary } from '../lib/pixelQuery'
import ProfileChart from './ProfileChart'
import WeibullChart from './WeibullChart'
import DirectionalHeatmap from './DirectionalHeatmap'
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
              <Row label={t('pixel.dist_coast')} value={fmt(data.distance_nm, ' nm')} />
            </Section>

            <Section title={t('pixel.section.wind_speed', { height: `${height}m` })}>
              <Row label={t('pixel.mean')} value={fmt(data.ws[height]?.mean, ' m/s')} />
              <Row label={t('pixel.min')} value={fmt(data.ws[height]?.min, ' m/s')} />
              <Row label={t('pixel.max')} value={fmt(data.ws[height]?.max, ' m/s')} />
              <Row label={t('pixel.std')} value={fmt(data.ws[height]?.std, ' m/s')} />
            </Section>

            {data.profile_heights.length > 0 && (
              <Section title={t('pixel.section.vertical_profile')}>
                <ProfileChart heights={data.profile_heights} means={data.profile_means} variant="ws" />
              </Section>
            )}

            <Section title={t('dashboard.chart.wpd_profile_title')}>
              <ProfileChart heights={data.profile_heights} means={data.wpd_profile_means} variant="wpd" />
            </Section>

            {data.weibull[height] && (
              <Section title={t('pixel.section.weibull')}>
                <Row label={`WS${height} k`} value={fmt(data.weibull[height]?.k)} />
                <Row label={`WS${height} c`} value={fmt(data.weibull[height]?.c, ' m/s')} />
                <WeibullChart k={data.weibull[height]?.k ?? null} c={data.weibull[height]?.c ?? null} label={`${height}m`} />
              </Section>
            )}

            <Section title={t('pixel.section.directional')}>
              {data.heatmap[`ws${height}_heatmap`]?.length ? (
                <DirectionalHeatmap data={data.heatmap[`ws${height}_heatmap`] as number[]} variable="ws" height={height} />
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
