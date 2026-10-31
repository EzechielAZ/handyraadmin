import React, { forwardRef, useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, X } from 'lucide-react'
import styles from './Select.module.css'

const Select = forwardRef(({
  options = [],
  value,
  onChange,
  label,
  placeholder = 'Sélectionner...',
  error,
  hint,
  required = false,
  disabled = false,
  fullWidth = true,
  size = 'md',
  clearable = false,
  searchable = false,
  className = '',
  id,
}, ref) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [hi, setHi] = useState(-1)
  const wrapRef = useRef(null)
  const searchRef = useRef(null)
  const optionRefs = useRef([])
  const selectId = id || `sel-${Math.random().toString(36).slice(2, 9)}`

  /* Filtre search (ignore les parents garde leur contexte) */
  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return options
    const q = search.toLowerCase()
    const matches = options.filter(o => o.label?.toLowerCase().includes(q))
    const ids = new Set(matches.map(m => m.value))
    return options.filter(o => ids.has(o.value))
  }, [options, search, searchable])

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setSearch('')
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (open && searchable && searchRef.current) searchRef.current.focus()
  }, [open, searchable])

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setHi(p => Math.min(p + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHi(p => Math.max(p - 1, 0)) }
      if (e.key === 'Enter')     { e.preventDefault(); if (hi >= 0) pick(filtered[hi]) }
      if (e.key === 'Escape')    { setOpen(false); setSearch('') }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, filtered, hi])

  useEffect(() => {
    if (hi >= 0 && optionRefs.current[hi]) {
      optionRefs.current[hi].scrollIntoView({ block: 'nearest' })
    }
  }, [hi])

  const pick = (opt) => {
    onChange?.(opt.value)
    setOpen(false); setSearch('')
    setHi(-1)
  }

  const clear = (e) => {
    e.stopPropagation()
    onChange?.(null)
  }

  const wrapCls = [
    styles.wrap,
    styles[size],
    open && styles.open,
    error && styles.hasError,
    disabled && styles.isDisabled,
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''}`}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}{required && <span className={styles.req}>*</span>}
        </label>
      )}

      <div className={styles.rel} ref={wrapRef}>
        <div
          id={selectId}
          ref={ref}
          className={wrapCls}
          onClick={() => !disabled && setOpen(o => !o)}
          role="combobox"
          aria-expanded={open}
          tabIndex={0}
        >
          <span className={selected ? styles.value : styles.placeholder}>
            {selected?.label || placeholder}
          </span>
          <div className={styles.actions}>
            {clearable && selected && value !== 'all' && (
              <button type="button" tabIndex={-1} className={styles.clear} onClick={clear}>
                <X size={12} />
              </button>
            )}
            <ChevronDown size={14} className={styles.chevron} />
          </div>
        </div>

        {open && (
          <div className={styles.dropdown}>
            {searchable && (
              <div className={styles.searchWrap}>
                <input
                  ref={searchRef}
                  className={styles.searchInput}
                  placeholder="Rechercher…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setHi(0) }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className={styles.options} role="listbox">
              {filtered.length ? filtered.map((opt, i) => {
                const depth = opt.depth || 0
                const isSelected = opt.value === value
                const isHi = i === hi
                return (
                  <div
                    key={opt.value}
                    ref={el => optionRefs.current[i] = el}
                    className={[
                      styles.option,
                      depth > 0 && styles.optionChild,
                      isSelected && styles.selected,
                      isHi && styles.highlighted,
                    ].filter(Boolean).join(' ')}
                    style={{ paddingLeft: depth > 0 ? 28 : 10 }}
                    onMouseEnter={() => setHi(i)}
                    onClick={() => pick(opt)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {depth > 0 && <span className={styles.treeBranch} aria-hidden="true" />}
                    <span className={styles.optionLabel}>{opt.label}</span>
                  </div>
                )
              }) : (
                <div className={styles.empty}>Aucun résultat</div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {hint && !error && <div className={styles.hint}>{hint}</div>}
    </div>
  )
})

Select.displayName = 'Select'
export default Select