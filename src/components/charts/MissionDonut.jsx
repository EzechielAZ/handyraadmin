import { useRef, useEffect } from 'react'
import { Chart } from 'chart.js/auto'
import styles from './charts.module.css'

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

const MissionDonut = ({ data = {} }) => {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  const { items = [] } = data
  const hasData = items.length > 0

  useEffect(() => {
    if (!hasData) {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
      return
    }
    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: items.map(i => i.label),
        datasets: [{
          data: items.map(i => i.value),
          backgroundColor: items.map(i => i.color),
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: (ctx) => ` ${ctx.label} : ${ctx.parsed}%`,
            },
          },
        },
      },
    })

    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [items, hasData])

  if (!hasData) {
    return <div className={styles.emptyState}>Aucune donnée disponible</div>
  }

  return (
    <>
      <div className={styles.donutWrap}>
        <canvas ref={canvasRef} />
      </div>
      <div className={styles.legend}>
        {items.map(item => (
          <div key={item.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: item.color }} />
            {item.label}
            <span className={styles.legendValue}>{item.value}%</span>
          </div>
        ))}
      </div>
    </>
  )
}

export default MissionDonut