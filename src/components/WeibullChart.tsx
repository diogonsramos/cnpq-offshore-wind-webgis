import { memo, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

interface WeibullChartProps {
  k: number | null
  c: number | null
  label?: string
}

function weibullPdf(x: number, k: number, c: number): number {
  if (k <= 0 || c <= 0 || x < 0) return 0
  return (k / c) * Math.pow(x / c, k - 1) * Math.exp(-Math.pow(x / c, k))
}

function WeibullChartInner({ k, c, label = '100m' }: WeibullChartProps) {
  const points = useMemo(() => {
    if (k == null || c == null || !isFinite(k) || !isFinite(c)) return []
    const maxX = c * 3
    const step = maxX / 60
    const pts: { x: number; y: number }[] = []
    for (let x = 0; x <= maxX; x += step) {
      pts.push({ x, y: weibullPdf(x, k, c) })
    }
    return pts
  }, [k, c])

  if (points.length === 0) return null

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
      borderWidth: 2,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: `Distribuição Weibull — ${label}`, font: { size: 11 }, color: '#555', padding: { bottom: 8 } },
      tooltip: {
        callbacks: {
          title: (items: any) => `${items[0].label} m/s`,
          label: (item: any) => `f(v) = ${item.raw.toFixed(4)}`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Velocidade (m/s)', font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { maxTicksLimit: 8 },
      },
      y: {
        title: { display: true, text: 'Densidade f(v)', font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
        beginAtZero: true,
      },
    },
  }

  return (
    <div className="chart-container">
      <Line data={data} options={options} height={120} />
    </div>
  )
}

export default memo(WeibullChartInner)
