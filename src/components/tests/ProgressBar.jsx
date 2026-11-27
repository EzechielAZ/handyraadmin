/**
 * Barre de progression segmentée du module Tests.
 *  - segments : [{ value, color: 'green'|'red'|'orange'|'blue'|'gray'|'yellow', label? }]
 *  - total    : dénominateur (par défaut somme des segments)
 *  Rendu accessible (role="img" + aria-label récapitulatif).
 */
import styles from './ProgressBar.module.css'

export const ProgressBar = ({ segments = [], total, height = 6, label, className = '' }) => {
  const sum = segments.reduce((s, x) => s + (x.value || 0), 0)
  const denom = total ?? sum
  const aria = label || segments
    .filter((s) => s.value > 0)
    .map((s) => `${s.value} ${s.label || ''}`.trim()).join(', ') || 'Aucune donnée'
  return (
    <div
      className={`${styles.track} ${className}`}
      style={{ height }}
      role="img"
      aria-label={aria}
    >
      {denom > 0 && segments.map((s, i) => s.value > 0 && (
        <span
          key={i}
          className={`${styles.seg} ${styles[s.color] || styles.gray}`}
          style={{ width: `${(s.value / denom) * 100}%` }}
          title={s.label ? `${s.label} : ${s.value}` : undefined}
        />
      ))}
    </div>
  )
}

export default ProgressBar
