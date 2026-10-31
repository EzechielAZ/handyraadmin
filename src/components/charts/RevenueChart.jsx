import { useRef, useEffect } from 'react'
import { Chart } from 'chart.js/auto'
import styles from './charts.module.css'

const COLOR_CA = '#1e3a5f'
const COLOR_COMM = '#94a3b8'

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
  boxPadding: 4,
}

const RevenueChart = ({ data = {} }) => {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  const {
    labels = [],
    revenue = [],
    commissions = [],
  } = data

  const hasData = labels.length > 0 && revenue.length > 0

  useEffect(() => {
    if (!hasData) {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
      return
    }
    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'CA total',
            data: revenue,
            backgroundColor: COLOR_CA,
            borderRadius: 2,
            borderSkipped: false,
            order: 2,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          },
          {
            label: 'Commissions',
            data: commissions,
            backgroundColor: COLOR_COMM,
            borderRadius: 2,
            borderSkipped: false,
            order: 1,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label} : ${ctx.parsed.y}M XOF`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: '#a3a3a3',
              font: { family: 'Inter', size: 11 },
              padding: 6,
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)', drawTicks: false },
            border: { display: false },
            ticks: {
              color: '#a3a3a3',
              font: { family: 'Inter', size: 11 },
              padding: 6,
              callback: (v) => `${v}M`,
            },
          },
        },
      },
    })

    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [labels, revenue, commissions, hasData])

  if (!hasData) {
    return <div className={styles.emptyState}>Aucune donnée disponible</div>
  }

  return (
    <>
      <div className={styles.chartWrapLg}>
        <canvas ref={canvasRef} />
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: COLOR_CA }} />
          CA total
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: COLOR_COMM }} />
          Commissions
        </span>
      </div>
    </>
  )
}

export default RevenueChart