import React, { forwardRef, useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import styles from './Input.module.css'

const Input = forwardRef(({
  type = 'text',
  label,
  error,
  success,
  hint,
  icon: Icon,
  prefix,
  suffix,
  required = false,
  disabled = false,
  fullWidth = true,
  size = 'md',
  className = '',
  id,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputId = id || `in-${Math.random().toString(36).slice(2, 9)}`
  const isPwd = type === 'password'
  const inputType = isPwd ? (showPassword ? 'text' : 'password') : type

  const wrapClass = [
    styles.wrap,
    styles[size],
    focused && styles.focused,
    error && styles.hasError,
    success && !error && styles.hasSuccess,
    disabled && styles.isDisabled,
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.req}>*</span>}
        </label>
      )}

      <div className={wrapClass}>
        {Icon && <span className={styles.icon}><Icon size={size === 'sm' ? 13 : 14} /></span>}
        {prefix && <span className={styles.affix}>{prefix}</span>}

        <input
          ref={ref}
          id={inputId}
          type={inputType}
          disabled={disabled}
          required={required}
          className={styles.input}
          onFocus={(e) => { setFocused(true); onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); onBlur?.(e) }}
          aria-invalid={!!error}
          {...props}
        />

        {suffix && <span className={styles.affix}>{suffix}</span>}

        {isPwd && (
          <button
            type="button"
            tabIndex={-1}
            className={styles.pwdToggle}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Masquer' : 'Afficher'}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}

        {error && <AlertCircle size={14} className={styles.statusErr} />}
        {success && !error && <CheckCircle size={14} className={styles.statusOk} />}
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {hint && !error && <div className={styles.hint}>{hint}</div>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input