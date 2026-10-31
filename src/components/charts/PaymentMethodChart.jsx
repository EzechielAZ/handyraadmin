import { useRef, useEffect } from 'react'
import { Chart } from 'chart.js/auto'
import styles from './charts.module.css'

/* Palette navy monochrome — 5 nuances du plus sombre au plus clair */
const NAVY_SCALE = ['#1e3a5f', '#3a5a80', '#5b7ba3', '#94a3b8', '#cbd5e1']

const TOOLTIP_BASE = {
  backgroundColor: '#0a0a0a',
  titleColor: '#fafafa',
  bodyColor: '#a3a3a3',
  borderColor: '#262626',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 4,
  titleFont: { family: 'Inter', size: 12, weight: '600' },
  bodyFont:   { family: 'Inter', size: 12 },
  displayColors: false,
}

const PaymentMethodChart = ({ data = {} }) => {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  const {
    labels = ['MOMO', 'FLOOZ', 'WALLET', 'CARD', 'CASH'],
    values = [4210, 2870, 1540, 890, 320],
  } = data

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map((_, i) => NAVY_SCALE[i % NAVY_SCALE.length]),
          borderRadius: 2,
          borderSkipped: false,
          barThickness: 24,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',          // ← barres horizontales, plus lisible pour des catégories
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.x} transactions`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)', drawTicks: false },
            border: { display: false },
            ticks: {
              color: '#a3a3a3',
              font: { family: 'Inter', size: 11 },
              padding: 6,
            },
          },
          y: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: '#525252',
              font: { family: 'Inter', size: 12, weight: '500' },
              padding: 8,
            },
          },
        },
      },
    })

    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [labels, values])

  return (
    <div className={styles.chartWrap}>
      <canvas ref={canvasRef} />
    </div>
  )
}

export default PaymentMethodChart