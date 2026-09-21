import { memo, useMemo } from 'react'
import { PolarArea } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  RadialLinearScale, ArcElement, Tooltip, Legend,
  type TooltipItem
} from 'chart.js'
import { SECTOR_LABELS } from '../lib/dashboardChartConstants'
import { useLocale } from '../i18n/provider'

ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend)

interface WindRoseChartProps {
  data: Record<string, { freq: number; mean_ws: number }> | null | undefined
  height: number
}

const LOW_COLOR = [0, 114, 178]
const HIGH_COLOR = [213, 94, 0]

function windSpeedColor(ws: number, maxWs: number = 15): string {
  if (maxWs <= 0 || !isFinite(ws)) return 'rgba(0,0,0,0.1)'
  const ratio = Math.max(0, Math.min(1, ws / maxWs))
  const r = Math.round(LOW_COLOR[0] + (HIGH_COLOR[0] - LOW_COLOR[0]) * ratio)
  const g = Math.round(LOW_COLOR[1] + (HIGH_COLOR[1] - LOW_COLOR[1]) * ratio)
  const b = Math.round(LOW_COLOR[2] + (HIGH_COLOR[2] - LOW_COLOR[2]) * ratio)
  return `rgba(${r},${g},${b},0.8)`
}

function WindRoseChartInner({ data, height }: WindRoseChartProps) {
  const { t } = useLocale()
  
  const chartData = useMemo(() => {
    if (!data) return null
    const freqs = SECTOR_LABELS.map(s => data[s]?.freq ?? 0)
    const speeds = SECTOR_LABELS.map(s => data[s]?.mean_ws ?? 0)
    
    const maxSpeed = Math.max(10, ...speeds.filter(isFinite))
    const bgColors = speeds.map(s => windSpeedColor(s, maxSpeed))
    
    return {
      labels: SECTOR_LABELS,
      datasets: [{
        label: `Rosa dos Ventos ${height}m`,
        data: freqs,
        backgroundColor: bgColors,
        borderColor: 'rgba(255,255,255,0.8)',
        borderWidth: 1,
      }],
      customSpeeds: speeds,
    }
  }, [data, height])

  if (!chartData) {
    return <div className="chart-empty">{t('dashboard.chart.heatmap_empty')}</div>
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (item: TooltipItem<'polarArea'>) => {
            const freq = item.raw as number
            const speed = chartData.customSpeeds[item.dataIndex]
            return ` Freq: ${freq.toFixed(1)}% | Vel. Média: ${speed.toFixed(2)} m/s`
          }
        }
      }
    },
    scales: {
      r: {
        ticks: { display: false },
        grid: { color: 'rgba(0,0,0,0.1)' },
        angleLines: { color: 'rgba(0,0,0,0.1)' },
        pointLabels: { 
          display: true, 
          font: { size: 10, weight: 'bold' as const },
          color: '#666'
        }
      }
    }
  }

  return (
    <div className="chart-container" style={{ height: 260, position: 'relative' }}>
      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 8 }}>
        {t('dashboard.chart.windrose_title', { height: `${height}m` })}
      </div>
      <div style={{ height: 230 }}>
        <PolarArea data={chartData} options={options} />
      </div>
    </div>
  )
}

export default memo(WindRoseChartInner)
