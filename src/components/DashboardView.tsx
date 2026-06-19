import { useState, useMemo, memo } from 'react'
import { Line, Bar, PolarArea } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  RadialLinearScale, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import {
  DATASETS, VARIABLES, SEASONS, HEIGHTS,
  datasetLabel, varLabel,
  type Dataset, type Variable, type Season, type Height,
} from '../lib/cogCatalog'
import { type DashboardLocationData, isLoaded, queryPixelStat, queryPixelProfile } from '../lib/pixelQuery'
import MiniMap from './MiniMap'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  RadialLinearScale, ArcElement,
  Title, Tooltip, Legend, Filler,
)

interface DashboardViewProps {
  dataset: Dataset
  pinnedLocations: DashboardLocationData[]
  onAddLocation: (lat: number, lon: number) => void
  onRemoveLocation: (idx: number) => void
}

const SEASON_ORDER = ['ANNUAL', 'DJF', 'MAM', 'JJA', 'SON']
const SEASON_INPUT: Season[] = ['annual', 'djf', 'mam', 'jja', 'son']
const COLORS = ['#4a90d9', '#e67e22', '#2ecc71']
const SECTOR_LABELS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']

function DashboardViewInner({
  dataset,
  pinnedLocations,
  onAddLocation,
  onRemoveLocation,
}: DashboardViewProps) {
  const [dashboardVar, setDashboardVar] = useState<Variable>('ws')
  const [dashboardSeason, setDashboardSeason] = useState<Season>('annual')
  const [dashboardHeight, setDashboardHeight] = useState<Height>(100)
  const [latInput, setLatInput] = useState('')
  const [lonInput, setLonInput] = useState('')
  const [locError, setLocError] = useState('')

  const handleManualAdd = () => {
    const lat = parseFloat(latInput)
    const lon = parseFloat(lonInput)
    if (isNaN(lat) || isNaN(lon)) {
      setLocError('Enter valid numeric lat/lon.')
      return
    }
    if (!isLoaded()) {
      setLocError('Parquet data not loaded yet. Click the map first.')
      return
    }
    if (pinnedLocations.length >= 3) {
      setLocError('Maximum 3 locations allowed.')
      return
    }
    onAddLocation(lat, lon)
    setLatInput('')
    setLonInput('')
    setLocError('')
  }

  // ── Reactive season chart data ──
  const seasonChartData = useMemo(() => ({
    labels: SEASON_ORDER,
    datasets: pinnedLocations.map((loc, i) => ({
      label: `Loc ${i + 1} (${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)})`,
      data: SEASON_ORDER.map(s => {
        const v = queryPixelStat(loc.pixel_id, dashboardVar, dashboardHeight, s, 'mean')
        return v ?? null
      }),
      backgroundColor: COLORS[i] + '88',
      borderColor: COLORS[i],
      borderWidth: 1,
    })),
  }), [pinnedLocations, dashboardVar, dashboardHeight])

  const seasonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: `Média Sazonal — ${varLabel(dashboardVar).label} ${dashboardHeight}m`, font: { size: 12 }, color: '#555', padding: { bottom: 8 } },
      legend: { position: 'top' as const, labels: { boxWidth: 12, padding: 8, font: { size: 10 } } },
      tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw?.toFixed(2) ?? '-'} ${varLabel(dashboardVar).unit}` } },
    },
    scales: {
      x: { grid: { display: false } },
      y: { title: { display: true, text: varLabel(dashboardVar).unit, font: { size: 10 } }, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
    },
  }

  // ── Reactive Weibull chart ──
  const weibullKey = dashboardHeight <= 10 ? 'weibull_10m' : 'weibull_100m'
  const weibullMaxX = useMemo(() => Math.max(25, ...pinnedLocations.map(l => {
    const w = weibullKey === 'weibull_100m' ? l.weibull_100m : l.weibull_10m
    return (w?.c ?? 10) * 3
  })), [pinnedLocations, weibullKey])

  const weibullChartData = useMemo(() => {
    const step = weibullMaxX / 60
    const labels: string[] = []
    const points: number[][] = pinnedLocations.map(() => [])
    for (let x = 0; x <= weibullMaxX; x += step) {
      labels.push(x.toFixed(1))
      pinnedLocations.forEach((loc, i) => {
        const w = weibullKey === 'weibull_100m' ? loc.weibull_100m : loc.weibull_10m
        const k = w?.k ?? 0
        const c = w?.c ?? 0
        const y = (k > 0 && c > 0) ? (k / c) * Math.pow(x / c, k - 1) * Math.exp(-Math.pow(x / c, k)) : 0
        points[i].push(y)
      })
    }
    return {
      labels,
      datasets: pinnedLocations.map((loc, i) => {
        const w = weibullKey === 'weibull_100m' ? loc.weibull_100m : loc.weibull_10m
        return {
          label: `Loc ${i + 1} (k=${w?.k.toFixed(2) ?? '-'}, c=${w?.c.toFixed(2) ?? '-'})`,
          data: points[i],
          borderColor: COLORS[i],
          backgroundColor: COLORS[i] + '22',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        }
      }),
    }
  }, [pinnedLocations, weibullMaxX, weibullKey])

  const weibullChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: `Comparação Weibull — ${dashboardHeight}m`, font: { size: 12 }, color: '#555', padding: { bottom: 8 } },
      legend: { position: 'top' as const, labels: { boxWidth: 12, padding: 8, font: { size: 10 } } },
      tooltip: { callbacks: { title: (items: any) => `${items[0].label} m/s`, label: (ctx: any) => `${ctx.dataset.label}: f(v)=${ctx.raw.toFixed(4)}` } },
    },
    scales: {
      x: { title: { display: true, text: 'Velocidade (m/s)', font: { size: 10 } }, ticks: { maxTicksLimit: 8 }, grid: { color: 'rgba(0,0,0,0.06)' } },
      y: { title: { display: true, text: 'f(v)', font: { size: 10 } }, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
    },
  }

  // ── Wind rose polar (always 100m, variable-independent) ──
  const windRoseDatasets = pinnedLocations.map((loc, i) => {
    const wr = loc.wind_rose
    if (!wr) return null
    return {
      label: `Loc ${i + 1}`,
      data: SECTOR_LABELS.map(s => wr[s]?.freq ?? 0),
      backgroundColor: COLORS[i] + '66',
      borderColor: COLORS[i],
      borderWidth: 1,
    }
  }).filter(Boolean)

  const windRoseData = {
    labels: SECTOR_LABELS,
    datasets: windRoseDatasets as any[],
  }

  const windRoseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: 'Rosa dos Ventos — 100m', font: { size: 12 }, color: '#555', padding: { bottom: 8 } },
      legend: { position: 'top' as const, labels: { boxWidth: 12, padding: 8, font: { size: 10 } } },
      tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${(ctx.raw * 100).toFixed(1)}%` } },
    },
    scales: {
      r: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { display: false } },
    },
  }

  // ── Reactive Profile comparison ──
  const profileChartData = useMemo(() => {
    if (pinnedLocations.length === 0) return { labels: [], datasets: [] }
    // Use first location's profile heights as labels (same across locations)
    const firstProfile = queryPixelProfile(pinnedLocations[0].pixel_id, dashboardVar)
    const labels = firstProfile ? firstProfile.heights.map(h => `${h}m`) : []
    return {
      labels,
      datasets: pinnedLocations.map((loc, i) => {
        const profile = queryPixelProfile(loc.pixel_id, dashboardVar)
        return {
          label: `Loc ${i + 1} (${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)})`,
          data: profile ? profile.means : [],
          borderColor: COLORS[i],
          backgroundColor: COLORS[i] + '22',
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: COLORS[i],
        }
      }),
    }
  }, [pinnedLocations, dashboardVar])

  const profileChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: `Perfil Vertical — ${varLabel(dashboardVar).label}`, font: { size: 12 }, color: '#555', padding: { bottom: 8 } },
      legend: { position: 'top' as const, labels: { boxWidth: 12, padding: 8, font: { size: 10 } } },
    },
    scales: {
      x: { title: { display: true, text: varLabel(dashboardVar).unit, font: { size: 10 } }, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
      y: { title: { display: true, text: 'Altura', font: { size: 10 } }, grid: { display: false } },
    },
  }

  return (
    <div className="dashboard-view">
      <div className="dv-body">
        {/* ── Global Filter Bar ── */}
        <div className="dv-filter-bar">
          <div className="dv-filter-group">
            <label className="dv-label">Experiment</label>
            <select value={dataset} disabled className="dv-select">
              {DATASETS.map(d => (
                <option key={d} value={d}>{datasetLabel(d)}</option>
              ))}
            </select>
          </div>
          <div className="dv-filter-group">
            <label className="dv-label">Variable</label>
            <select value={dashboardVar} onChange={e => setDashboardVar(e.target.value as Variable)} className="dv-select">
              {VARIABLES.map(v => (
                <option key={v} value={v}>{varLabel(v).label}</option>
              ))}
            </select>
          </div>
          <div className="dv-filter-group">
            <label className="dv-label">Season</label>
            <select value={dashboardSeason} onChange={e => setDashboardSeason(e.target.value as Season)} className="dv-select">
              {SEASONS.map(s => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="dv-filter-group">
            <label className="dv-label">Height</label>
            <select value={dashboardHeight} onChange={e => setDashboardHeight(Number(e.target.value) as Height)} className="dv-select">
              {HEIGHTS.map(h => (
                <option key={h} value={h}>{h}m</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Location Input Bar ── */}
        <div className="dv-location-bar">
          <input
            className="dv-input"
            type="number"
            step="any"
            placeholder="Latitude"
            value={latInput}
            onChange={e => setLatInput(e.target.value)}
          />
          <input
            className="dv-input"
            type="number"
            step="any"
            placeholder="Longitude"
            value={lonInput}
            onChange={e => setLonInput(e.target.value)}
          />
          <button className="dv-add-btn" onClick={handleManualAdd}>+ Add Location</button>
          <span className="dv-hint">or click the mini-map below</span>
        </div>
        {locError && <p className="dv-error">{locError}</p>}

        {/* ── Pinned Location Chips + Remove All ── */}
        {pinnedLocations.length > 0 && (
          <div className="dv-chips">
            {pinnedLocations.map((loc, i) => (
              <div key={i} className="dv-chip" style={{ borderLeftColor: COLORS[i] }}>
                <span>Loc {i + 1}: {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}</span>
                {loc.state && <span className="chip-state">{loc.state}</span>}
                <button className="chip-remove" onClick={() => onRemoveLocation(i)}>&times;</button>
              </div>
            ))}
            <button className="dv-remove-all" onClick={() => { for (let i = pinnedLocations.length - 1; i >= 0; i--) onRemoveLocation(i) }}>
              Remove All
            </button>
          </div>
        )}

        {/* ── MiniMap + Charts ── */}
        <div className="dv-main">
          <div className="dv-chart-grid">
            <div className="chart-card"><Bar data={seasonChartData} options={seasonChartOptions as any} height={220} /></div>
            <div className="chart-card"><Line data={weibullChartData} options={weibullChartOptions as any} height={220} /></div>
            <div className="chart-card">
              {windRoseDatasets.length > 0
                ? <PolarArea data={windRoseData} options={windRoseOptions as any} height={220} />
                : <div className="chart-empty">Wind rose data not available for current variable</div>
              }
            </div>
            <div className="chart-card"><Line data={profileChartData} options={profileChartOptions as any} height={220} /></div>
          </div>
          <div className="dv-sidebar">
            <MiniMap pinnedLocations={pinnedLocations} onPinClick={onAddLocation} />
            {pinnedLocations.length === 0 && <p className="dv-empty">Add up to 3 locations to compare wind statistics.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(DashboardViewInner)
