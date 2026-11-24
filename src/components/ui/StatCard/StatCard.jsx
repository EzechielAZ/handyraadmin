import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
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

const fmtChange = (v, changeFormat) => {
  const abs = Math.abs(v)
  if (changeFormat === 'currency') return fmtCurrency(abs)
  if (changeFormat === 'percent') return `${fmtNumber(abs, 1)} %`
  return fmtNumber(abs, 0)
}

const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  changeFormat = 'number', // 'number' | 'currency' | 'percent'
  color = 'primary',
  format,                  // 'currency' | 'number'
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

  const hasChange = typeof change === 'number'
  const isPositive = hasChange && change > 0
  const isNegative = hasChange && change < 0
  const DeltaIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus

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
          <span className={`${styles.icon} ${styles[`icon_${color}`] || ''}`}>
            <Icon size={15} strokeWidth={1.75} />
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

      {(hasChange || changeLabel) && (
        <div className={styles.footer}>
          {hasChange && (
            <span
              className={[
                styles.delta,
                isPositive && styles.deltaPos,
                isNegative && styles.deltaNeg,
              ].filter(Boolean).join(' ')}
            >
              <DeltaIcon size={13} strokeWidth={2} />
              {fmtChange(change, changeFormat)}
            </span>
          )}
          {changeLabel && <span className={styles.deltaLabel}>{changeLabel}</span>}
        </div>
      )}
    </div>
  )
}

export default StatCard