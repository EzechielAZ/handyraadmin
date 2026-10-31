import React from 'react'
import { Loader2 } from 'lucide-react'
import styles from './Button.module.css'

const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false,           // alias
  disabled = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  type = 'button',
  className = '',
  ...props
}, ref) => {
  const loading_ = isLoading || loading
  const classes = [
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    !children && Icon && styles.iconOnly,
    className,
  ].filter(Boolean).join(' ')

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading_}
      {...props}
    >
      {loading_ && <Loader2 className={styles.spinner} size={iconSize} />}
      {!loading_ && Icon && iconPosition === 'left' && <Icon size={iconSize} />}
      {children && <span className={styles.content}>{children}</span>}
      {!loading_ && Icon && iconPosition === 'right' && <Icon size={iconSize} />}
    </button>
  )
})

Button.displayName = 'Button'
export default Button