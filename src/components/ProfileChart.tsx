import { memo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Filler,
  type TooltipItem,
} from 'chart.js'
import { t } from '../i18n/t'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

interface ProfileChartProps {
  heights: number[]
  means: number[]
  variant?: 'ws' | 'wpd'
}

const VARIANT_CONFIG = {
  ws: {
    color: '#4a90d9',
    background: 'rgba(74,144,217,0.1)',
    xMax: 20,
    titleKey: 'dashboard.chart.ws_profile_title',
    axisKey: 'dashboard.chart.wind_speed_axis',
    unitKey: 'dashboard.chart.ws_unit',
  },
  wpd: {
    color: '#D55E00',
    background: 'rgba(213,94,0,0.12)',
    xMax: 1500,
    titleKey: 'dashboard.chart.wpd_profile_title',
    axisKey: 'dashboard.chart.wpd_axis',
    unitKey: 'dashboard.chart.wpd_unit',
  },
} as const

function ProfileChartInner({ heights, means, variant = 'ws' }: ProfileChartProps) {
  const cfg = VARIANT_CONFIG[variant]
  const hasData = heights.length > 0 && means.some(v => v != null && isFinite(v))

  if (!hasData) {
    return <div className="chart-empty">{t('dashboard.chart.profile_empty')}</div>
  }

  const data = {
    labels: heights.map(h => `${h}m`),
    datasets: [{
      label: t(cfg.axisKey),
      data: means,
      borderColor: cfg.color,
      backgroundColor: cfg.background,
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointBackgroundColor: cfg.color,
    }],
  }

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: t(cfg.titleKey), font: { size: 11 }, color: '#555', padding: { bottom: 8 } },
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => `${Number(items[0].raw).toFixed(2)} ${t(cfg.unitKey)}`,
          label: (item: TooltipItem<'line'>) => `${heights[item.dataIndex]}m`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: t(cfg.axisKey), font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
        min: 0,
        max: cfg.xMax,
      },
      y: {
        reverse: true,
        title: { display: true, text: t('dashboard.chart.height_axis'), font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
    },
  }

  return (
    <div className="chart-container">
      <Line data={data} options={options} height={140} />
    </div>
  )
}

export default memo(ProfileChartInner)
