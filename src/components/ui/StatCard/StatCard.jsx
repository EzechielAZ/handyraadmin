import React from 'react'
import styles from './StatCard.module.css'

const fmtNumber = (v, decimals) => {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: decimals ?? 0,
    minimumFractionDigits: decimals ?? 0,
  }).format(v)
}

const fmtCurrency = (v) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(v ?? 0)

const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  color = 'primary',
  format,          // 'currency' | 'number'
  decimals,
  suffix,
  prefix,
  loading = false,
  onClick,
  className = '',
}) => {
  const displayValue = format === 'currency'
    ? fmtCurrency(value)
    : fmtNumber(value, decimals)

  const isPositive = typeof change === 'number' && change > 0
  const isNegative = typeof change === 'number' && change < 0

  return (
    <div
      className={[
        styles.card,
        onClick && styles.clickable,
        className,
      ].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {Icon && (
          <span className={`${styles.icon} ${styles[`icon_${color}`]}`}>
            <Icon size={15} strokeWidth={1.8} />
          </span>
        )}
      </div>

      <div className={styles.body}>
        <span className={styles.value}>
          {loading ? <span className={styles.shimmer} /> : (
            <>
              {prefix && <span className={styles.affix}>{prefix}</span>}
              {displayValue}
              {suffix && <span className={styles.affix}>{suffix}</span>}
            </>
          )}
        </span>
      </div>

      {(change !== undefined || changeLabel) && (
        <div className={styles.footer}>
          {typeof change === 'number' && (
            <span className={[
              styles.delta,
              isPositive && styles.deltaPos,
              isNegative && styles.deltaNeg,
            ].filter(Boolean).join(' ')}>
              {isPositive ? '↑' : isNegative ? '↓' : '•'} {Math.abs(change)}
              {typeof change === 'number' && '%'}
            </span>
          )}
          {changeLabel && <span className={styles.deltaLabel}>{changeLabel}</span>}
        </div>
      )}
    </div>
  )
}

export default StatCard