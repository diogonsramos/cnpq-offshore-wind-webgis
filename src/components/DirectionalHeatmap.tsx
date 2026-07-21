import { memo, useMemo } from 'react'
import { SECTOR_LABELS } from '../lib/dashboardChartConstants'
import { t } from '../i18n/t'

interface DirectionalHeatmapProps {
  data: number[] | null | undefined
  variable: 'ws' | 'wpd'
  height: number
}

// Same fixed value ranges used for the equivalent aggregate histograms
// (pixelQuery.ts RANGE_BY_VAR) — bin edges stay identical across locations
// so the grid is comparable even though bin *count* is derived from the
// data itself (the flat array carries no explicit bin-count metadata).
const RANGE_BY_VAR: Record<'ws' | 'wpd', [number, number]> = { ws: [0, 20], wpd: [0, 1500] }
const LOW_COLOR: [number, number, number] = [0, 114, 178] // Okabe-Ito blue
const HIGH_COLOR: [number, number, number] = [213, 94, 0] // Okabe-Ito vermillion

function cellColor(value: number, max: number): string {
  if (max <= 0 || !isFinite(value)) return 'rgba(0,0,0,0.03)'
  const ratio = Math.max(0, Math.min(1, value / max))
  const r = Math.round(LOW_COLOR[0] + (HIGH_COLOR[0] - LOW_COLOR[0]) * ratio)
  const g = Math.round(LOW_COLOR[1] + (HIGH_COLOR[1] - LOW_COLOR[1]) * ratio)
  const b = Math.round(LOW_COLOR[2] + (HIGH_COLOR[2] - LOW_COLOR[2]) * ratio)
  return `rgba(${r},${g},${b},${(0.12 + ratio * 0.78).toFixed(2)})`
}

function DirectionalHeatmapInner({ data, variable, height }: DirectionalHeatmapProps) {
  const grid = useMemo(() => {
    if (!data || data.length === 0) return null
    const nSectors = SECTOR_LABELS.length
    const nBins = Math.round(data.length / nSectors)
    if (nBins < 1 || nBins * nSectors !== data.length) return null
    const rows: number[][] = []
    for (let s = 0; s < nSectors; s++) {
      rows.push(data.slice(s * nBins, (s + 1) * nBins))
    }
    return { rows, nBins, values: data }
  }, [data])

  if (!grid) {
    return <div className="chart-empty">{t('dashboard.chart.heatmap_empty')}</div>
  }

  const unit = t(variable === 'ws' ? 'dashboard.chart.ws_unit' : 'dashboard.chart.wpd_unit')
  const binAxisKey = variable === 'ws' ? 'dashboard.chart.speed_bin_axis' : 'dashboard.chart.power_bin_axis'
  const [rangeMin, rangeMax] = RANGE_BY_VAR[variable]
  const binWidth = (rangeMax - rangeMin) / grid.nBins
  const binLabels = Array.from({ length: grid.nBins }, (_, i) =>
    `${(rangeMin + i * binWidth).toFixed(0)}–${(rangeMin + (i + 1) * binWidth).toFixed(0)}`,
  )
  const max = Math.max(...grid.values.filter(v => isFinite(v)))

  return (
    <div className="heatmap-container">
      <div className="heatmap-title">{t('dashboard.chart.heatmap_title', { height: `${height}m` })}</div>
      <div className="heatmap-scroll">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th className="heatmap-corner">{t('dashboard.chart.direction_axis')}</th>
              {binLabels.map((l, i) => (
                <th key={i} title={`${l} ${unit}`}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row, s) => (
              <tr key={s}>
                <th>{SECTOR_LABELS[s]}</th>
                {row.map((v, i) => (
                  <td
                    key={i}
                    style={{ background: cellColor(v, max) }}
                    title={`${SECTOR_LABELS[s]}, ${binLabels[i]} ${unit}: ${isFinite(v) ? v.toFixed(2) : '-'}`}
                  >
                    {isFinite(v) ? v.toFixed(1) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="heatmap-axis-label">{t(binAxisKey)}</div>
    </div>
  )
}

export default memo(DirectionalHeatmapInner)
