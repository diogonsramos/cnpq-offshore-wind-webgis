import { useState, useMemo, memo } from 'react'
import {
  DATASETS, VARIABLES, HEIGHTS,
  datasetLabel, varLabel, modelLabel,
  type Model, type Dataset, type Variable, type Height,
} from '../lib/cogCatalog'
import { type DashboardLocationData, queryPixelStat, isLoaded } from '../lib/pixelQuery'
import MiniMap from './MiniMap'
import Plot from 'react-plotly.js'

const SEASON_ORDER = ['ANNUAL', 'DJF', 'MAM', 'JJA', 'SON']
const COLORS = ['#0072B2', '#D55E00', '#009E73']
const SECTOR_LABELS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
const HEIGHT_TICKVALS = [10, 50, 100, 150, 200]
const HEIGHT_TICKTEXT = ['10m', '50m', '100m', '150m', '200m']

const SEASON_LABELS: Record<string, string> = {
  ANNUAL: 'Anual', DJF: 'DJF (Verão)',
  MAM: 'MAM (Outono)', JJA: 'JJA (Inverno)', SON: 'SON (Primavera)',
}

interface DashboardViewProps {
  model: Model
  dataset: Dataset
  pinnedLocations: DashboardLocationData[]
  onAddLocation: (lat: number, lon: number) => void
  onRemoveLocation: (idx: number) => void
}

function DashboardViewInner({
  model,
  dataset,
  pinnedLocations,
  onAddLocation,
  onRemoveLocation,
}: DashboardViewProps) {
  const [dashboardVar, setDashboardVar] = useState<Variable>('ws')
  const [dashboardHeight, setDashboardHeight] = useState<Height>(100)
  const [latInput, setLatInput] = useState('')
  const [lonInput, setLonInput] = useState('')
  const [locError, setLocError] = useState('')

  const modelLabelStr = modelLabel(model)
  const datasetLabelStr = datasetLabel(dataset)

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

  const locLabel = (loc: DashboardLocationData, i: number): string =>
    `${modelLabelStr} — ${datasetLabelStr} (Loc ${i + 1})`

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

  const emptyMsg = pinnedLocations.length === 0
    ? 'Click the map or enter coordinates to add locations.'
    : null

  const profileYAxis = {
    title: { text: 'Altura do Perfil (m)', standoff: 10 },
    tickmode: 'array' as const,
    tickvals: HEIGHT_TICKVALS,
    ticktext: HEIGHT_TICKTEXT,
    range: [0, 210],
  }

  return (
    <div className="dashboard-view">
      <div className="dv-body">
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
            <label className="dv-label">Height</label>
            <select value={dashboardHeight} onChange={e => setDashboardHeight(Number(e.target.value) as Height)} className="dv-select">
              {HEIGHTS.map(h => (
                <option key={h} value={h}>{h}m</option>
              ))}
            </select>
          </div>
        </div>

        <div className="dv-location-bar">
          <input className="dv-input" type="number" step="any" placeholder="Latitude" value={latInput} onChange={e => setLatInput(e.target.value)} />
          <input className="dv-input" type="number" step="any" placeholder="Longitude" value={lonInput} onChange={e => setLonInput(e.target.value)} />
          <button className="dv-add-btn" onClick={handleManualAdd}>+ Add Location</button>
          <span className="dv-hint">or click the mini-map below</span>
          {locError && <span className="dv-error">{locError}</span>}
        </div>

        <div className="dv-chips">
          {pinnedLocations.map((loc, i) => (
            <span key={i} className="chip-state" style={{ borderColor: COLORS[i] }}>
              {modelLabelStr} ({loc.lat.toFixed(2)}, {loc.lon.toFixed(2)})
              <button className="chip-remove" onClick={() => onRemoveLocation(i)}>&times;</button>
            </span>
          ))}
          {pinnedLocations.length > 0 && (
            <button className="dv-remove-all" onClick={() => pinnedLocations.forEach((_, i) => onRemoveLocation(i))}>
              Remove All
            </button>
          )}
        </div>

        {emptyMsg ? (
          <div className="dv-empty">{emptyMsg}</div>
        ) : (
          <div className="dv-main">
            <div className="dv-chart-grid">
              <div className="chart-card">
                <Plot
                  data={seasonChartData.datasets.map((ds, i) => ({
                    x: SEASON_ORDER.map(s => SEASON_LABELS[s]),
                    y: ds.data,
                    type: 'bar',
                    name: ds.label,
                    marker: { color: COLORS[i % COLORS.length] },
                  }))}
                  layout={{
                    title: `Média Sazonal — ${varLabel(dashboardVar).label} ${dashboardHeight}m`,
                    xaxis: { title: { text: 'Sazonalidade', standoff: 10 } },
                    yaxis: {
                      title: { text: `Velocidade do Vento (${varUnit})`, standoff: 10 },
                      range: dashboardVar === 'ws' ? [0, 25] : [0, 1500],
                      zeroline: false,
                    },
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
                    }
                  })}
                  layout={{
                    title: `Distribuição Weibull — ${dashboardHeight}m`,
                    xaxis: {
                      title: { text: 'Velocidade do Vento (m/s)', standoff: 10 },
                      range: [0, 30],
                      zeroline: false,
                    },
                    yaxis: {
                      title: { text: 'Densidade de Probabilidade f(v)', standoff: 10 },
                      range: [0, 0.3],
                      zeroline: false,
                    },
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
                  data={pinnedLocations.map((loc, i) => {
                    const wr = loc.wind_rose?.[dashboardHeight]
                    if (!wr) return { r: [], theta: [], type: 'scatterpolar', name: locLabel(loc, i) }
                    return {
                      r: SECTOR_LABELS.map(s => wr[s]?.freq ?? 0),
                      theta: SECTOR_LABELS,
                      type: 'scatterpolar' as const,
                      fill: 'toself',
                      name: locLabel(loc, i),
                      marker: { color: COLORS[i] },
                    }
                  })}
                  layout={{
                    title: `Rosa dos Ventos — ${dashboardHeight}m`,
                    height: 260,
                    margin: { t: 40, b: 30, l: 50, r: 50 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { size: 11 },
                    showlegend: true,
                    legend: { x: 1, xanchor: 'right', y: 1 },
                    polar: {
                      angularaxis: {
                        direction: 'clockwise',
                        rotation: 90,
                      },
                      radialaxis: { visible: true, title: { text: 'Frequência (%)' }, ticksuffix: '%' },
                    },
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%' }}
                  useResizeHandler
                />
              </div>

              <div className="chart-card">
                <Plot
                  data={wsProfileData.datasets.map((ds, i) => ({
                    x: ds.data,
                    y: wsProfileData.heights,
                    type: 'scatter' as const,
                    mode: 'lines+markers' as const,
                    name: ds.label,
                    line: { color: COLORS[i], width: 2 },
                    marker: { color: COLORS[i], size: 6 },
                  }))}
                  layout={{
                    title: 'Perfil Vertical — Velocidade do Vento',
                    xaxis: {
                      title: { text: 'Velocidade do Vento (m/s)', standoff: 10 },
                      range: [0, 25],
                      zeroline: false,
                    },
                    yaxis: profileYAxis,
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
                  data={wpdProfileData.datasets.map((ds, i) => ({
                    x: ds.data,
                    y: wpdProfileData.heights,
                    type: 'scatter' as const,
                    mode: 'lines+markers' as const,
                    name: ds.label,
                    line: { color: COLORS[i], width: 2 },
                    marker: { color: COLORS[i], size: 6 },
                  }))}
                  layout={{
                    title: 'Perfil Vertical — Densidade de Potência',
                    xaxis: {
                      title: { text: 'Densidade de Potência (W/m²)', standoff: 10 },
                      range: [0, 1500],
                      zeroline: false,
                    },
                    yaxis: profileYAxis,
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
            </div>
          </div>
        )}
      </div>

      <div className="dv-sidebar">
        <div className="minimap">
          <MiniMap pinnedLocations={pinnedLocations} onPinClick={onAddLocation} />
        </div>
      </div>
    </div>
  )
}

export default memo(DashboardViewInner)
