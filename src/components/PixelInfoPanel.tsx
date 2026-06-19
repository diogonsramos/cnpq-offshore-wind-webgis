import { memo } from 'react'
import type { PixelDataSummary } from '../lib/pixelQuery'
import ProfileChart from './ProfileChart'
import WeibullChart from './WeibullChart'

interface PixelInfoPanelProps {
  data: PixelDataSummary | null
  loading: boolean
  loaded: boolean
  recordCount: number
  pinnedCount: number
  onClose: () => void
  onOpenDashboard: () => void
  onAddPin: (lat: number, lon: number) => void
}

function PixelInfoPanelInner({ data, loading, loaded, recordCount, pinnedCount, onClose, onOpenDashboard, onAddPin }: PixelInfoPanelProps) {
  const className = `pixel-panel${data ? ' open' : ''}`

  return (
    <div className={className}>
      <div className="pixel-panel-header">
        <span>Pixel Info</span>
        {data && <button className="pixel-panel-close" onClick={onClose}>&times;</button>}
      </div>
      <div className="pixel-panel-content">
        {loading && <p className="pixel-panel-status">Loading data...</p>}
        {!loaded && !loading && <p className="pixel-panel-status">Click map to query</p>}
        {loaded && !data && (
          <p className="pixel-panel-status">
            {recordCount > 0
              ? `Click on the map to see wind statistics (${recordCount} points loaded)`
              : 'No point data loaded'}
          </p>
        )}
        {data && (
          <div className="pixel-panel-data">
            <Section title="Location">
              <Row label="Latitude" value={data.lat.toFixed(4)} />
              <Row label="Longitude" value={data.lon.toFixed(4)} />
              <Row label="Pixel ID" value={String(data.pixel_id)} />
              {data.state && <Row label="State" value={data.state} />}
              {data.bathy_zone && <Row label="Bathymetry" value={data.bathy_zone.replace('_', '-') + 'm'} />}
            </Section>

            <Section title="Wind Speed 100m">
              <Row label="Mean" value={fmt(data.ws100.mean, ' m/s')} />
              <Row label="Min" value={fmt(data.ws100.min, ' m/s')} />
              <Row label="Max" value={fmt(data.ws100.max, ' m/s')} />
              <Row label="Std Dev" value={fmt(data.ws100.std, ' m/s')} />
            </Section>

            <Section title="Wind Speed 10m">
              <Row label="Mean" value={fmt(data.ws10.mean, ' m/s')} />
              <Row label="Min" value={fmt(data.ws10.min, ' m/s')} />
              <Row label="Max" value={fmt(data.ws10.max, ' m/s')} />
              <Row label="Std Dev" value={fmt(data.ws10.std, ' m/s')} />
            </Section>

            {data.profile_heights.length > 0 && (
              <Section title="Vertical Profile">
                <ProfileChart heights={data.profile_heights} means={data.profile_means} />
              </Section>
            )}

            {data.weibull && (
              <Section title="Weibull Parameters">
                <Row label="WS10 k" value={fmt(data.weibull.k_10m)} />
                <Row label="WS10 c" value={fmt(data.weibull.c_10m, ' m/s')} />
                <Row label="WS100 k" value={fmt(data.weibull.k_100m)} />
                <Row label="WS100 c" value={fmt(data.weibull.c_100m, ' m/s')} />
                <WeibullChart k={data.weibull.k_100m} c={data.weibull.c_100m} label="100m" />
                {data.weibull.k_10m && data.weibull.c_10m && (
                  <WeibullChart k={data.weibull.k_10m} c={data.weibull.c_10m} label="10m" />
                )}
              </Section>
            )}

            <div className="pixel-panel-actions">
              <button className="pin-button" onClick={() => onAddPin(data.lat, data.lon)} disabled={pinnedCount >= 3}>
                {pinnedCount >= 3 ? 'Max 3 Pins' : `📌 Pin This Location (${pinnedCount}/3)`}
              </button>
              <button className="dashboard-button" onClick={onOpenDashboard}>
                Open Global Time-Series Dashboard
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
