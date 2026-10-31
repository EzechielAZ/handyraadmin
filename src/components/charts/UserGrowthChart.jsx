import { useRef, useEffect } from 'react'
import { Chart } from 'chart.js/auto'
import styles from './charts.module.css'

const COLOR_CLIENTS  = '#1e3a5f'
const COLOR_ARTISANS = '#94a3b8'

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

const UserGrowthChart = ({ data = {} }) => {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  const {
    labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
    clients = [320, 410, 390, 520, 610, 740, 690, 810, 920, 1040, 1180, 1320],
    artisans = [120, 145, 138, 180, 210, 260, 245, 290, 340, 380, 430, 490],
  } = data

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Clients',
            data: clients,
            borderColor: COLOR_CLIENTS,
            backgroundColor: 'rgba(30, 58, 95, 0.06)',
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 3,
            pointHoverBackgroundColor: COLOR_CLIENTS,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
          },
          {
            label: 'Artisans',
            data: artisans,
            borderColor: COLOR_ARTISANS,
            backgroundColor: 'rgba(148, 163, 184, 0.06)',
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 3,
            pointHoverBackgroundColor: COLOR_ARTISANS,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
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
              label: (ctx) => ` ${ctx.dataset.label} : ${ctx.parsed.y}`,
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
            },
          },
        },
      },
    })

    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [labels, clients, artisans])

  return (
    <>
      <div className={styles.chartWrap}>
        <canvas ref={canvasRef} />
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: COLOR_CLIENTS }} />
          Clients
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: COLOR_ARTISANS }} />
          Artisans
        </span>
      </div>
    </>
  )
}

export default UserGrowthChart