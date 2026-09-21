import { memo, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Filler,
  type TooltipItem,
} from 'chart.js'
import { useLocale } from '../i18n/provider'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

interface WeibullChartProps {
  k: number | null
  c: number | null
  label?: string
}

const X_MAX = 30
const X_STEP = X_MAX / 60

function weibullPdf(x: number, k: number, c: number): number {
  if (k <= 0 || c <= 0 || x < 0) return 0
  return (k / c) * Math.pow(x / c, k - 1) * Math.exp(-Math.pow(x / c, k))
}

function WeibullChartInner({ k, c, label = '100m' }: WeibullChartProps) {
  const { t } = useLocale()
  const points = useMemo(() => {
    if (k == null || c == null || !isFinite(k) || !isFinite(c)) return []
    const pts: { x: number; y: number }[] = []
    for (let x = 0; x <= X_MAX; x += X_STEP) {
      pts.push({ x, y: weibullPdf(x, k, c) })
    }
    return pts
  }, [k, c])

  if (points.length === 0) {
    return <div className="chart-empty">{t('dashboard.chart.weibull_empty')}</div>
  }

  const data = {
    labels: points.map(p => p.x.toFixed(1)),
    datasets: [{
      label: `Weibull ${label} (k=${k?.toFixed(2)}, c=${c?.toFixed(2)})`,
      data: points.map(p => p.y),
      borderColor: '#e67e22',
      backgroundColor: 'rgba(230,126,34,0.12)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 3,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: t('dashboard.chart.weibull_title', { height: label }), font: { size: 14 }, color: '#555', padding: { bottom: 8 } },
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => `${items[0].label} ${t('dashboard.chart.ws_unit')}`,
          label: (item: TooltipItem<'line'>) => `f(v) = ${Number(item.raw).toFixed(4)}`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: t('dashboard.chart.wind_speed_axis'), font: { size: 13 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { maxTicksLimit: 8, font: { size: 12 } },
      },
      y: {
        title: { display: true, text: t('dashboard.chart.pdf_axis'), font: { size: 13 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { font: { size: 12 } },
        min: 0,
        max: 0.3,
      },
    },
  }

  return (
    <div className="chart-container">
      <Line data={data} options={options} height={220} />
    </div>
  )
}

export default memo(WeibullChartInner)
