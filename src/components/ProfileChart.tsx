import { memo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

interface ProfileChartProps {
  heights: number[]
  means: number[]
}

function ProfileChartInner({ heights, means }: ProfileChartProps) {
  if (!heights || heights.length === 0) return null

  const data = {
    labels: heights.map(h => `${h}m`),
    datasets: [{
      label: 'Vel. Vento (m/s)',
      data: means,
      borderColor: '#4a90d9',
      backgroundColor: 'rgba(74,144,217,0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointBackgroundColor: '#4a90d9',
    }],
  }

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: 'Perfil Vertical do Vento', font: { size: 11 }, color: '#555', padding: { bottom: 8 } },
      tooltip: {
        callbacks: {
          title: (items: any) => `${items[0].raw.toFixed(2)} m/s`,
          label: (item: any) => `${heights[item.dataIndex]}m`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Velocidade (m/s)', font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      y: {
        title: { display: true, text: 'Altura (m)', font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: {
          callback(value: any) {
            const idx = Number(value)
            return heights[idx] !== undefined ? `${heights[idx]}m` : ''
          },
        },
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
