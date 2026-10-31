import React from 'react'
import styles from './Badge.module.css'

const VARIANTS = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  error: 'danger',       // alias
  info: 'info',
}

const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  const v = VARIANTS[variant] || 'secondary'
  const classes = [styles.badge, styles[v], styles[size], className]
    .filter(Boolean).join(' ')

  return (
    <span className={classes} {...props}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {Icon && <Icon size={size === 'sm' ? 10 : 12} />}
      {children}
    </span>
  )
}

export default Badge