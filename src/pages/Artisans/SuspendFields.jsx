import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import { Input } from '../../components/ui'

export const EMPTY_SUSPEND = { reasonCode: '', details: '', duration: 'default' }

const SEVERITY = { MINOR: 'Mineur', MAJOR: 'Majeur', CRITICAL: 'Critique' }

const defaultLabel = (r) =>
  r.is_permanent ? 'Définitive'
  : r.default_duration_days ? `Par défaut : ${r.default_duration_days} jours`
  : 'Par défaut : jusqu\'à levée manuelle'

/* → { payload } ou { error } */
export const toSuspendPayload = (form, reasons) => {
  const r = reasons.find((x) => x.code === form.reasonCode)
  if (!r) return { error: 'Choisis un motif' }
  const details = form.details.trim()
  if (r.requires_details && !details) return { error: 'Précisions obligatoires pour ce motif' }
  const payload = { reasonCode: r.code, details: details || null }
  if (!r.is_permanent) {
    if (form.duration === 'none') payload.indefinite = true
    else if (form.duration !== 'default') payload.durationDays = Number(form.duration)
  }
  return { payload }
}

/* ─────────────────────────────────────────────────────────────────────────────
   LOCAL SELECT (Fork interne)
   Rend le menu via createPortal pour échapper aux contraintes overflow de la modale.
   ───────────────────────────────────────────────────────────────────────────── */
const LocalSelect = ({ options, value, onChange, placeholder, searchable, label }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }

  useEffect(() => {
    if (open) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false)
        setSearch('')
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return options
    const q = search.toLowerCase()
    return options.filter(o => o.label?.toLowerCase().includes(q))
  }, [options, search, searchable])

  const selected = options.find(o => o.value === value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && <label style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)', color: 'var(--text-2)' }}>{label}</label>}
      <div
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 'var(--h-md)',
          padding: '0 12px',
          background: 'var(--bg)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          fontSize: 'var(--fs-base)',
          boxShadow: open ? 'var(--focus-ring)' : 'none',
          transition: 'all var(--transition)'
        }}
      >
        <span style={{ color: selected ? 'var(--text)' : 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: coords.top + 4,
            left: coords.left,
            width: Math.max(coords.width, searchable ? 260 : 0),
            zIndex: 9999,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 8px 24px rgba(10, 10, 10, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 300,
            overflow: 'hidden'
          }}
        >
          {searchable && (
            <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
              <input
                autoFocus
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: 28,
                  padding: '0 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--fs-sm)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
          <div style={{ overflowY: 'auto', padding: 4 }}>
            {filtered.length ? filtered.map(opt => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                  setSearch('')
                }}
                style={{
                  padding: '7px 10px',
                  fontSize: 'var(--fs-base)',
                  color: opt.value === value ? 'var(--accent)' : 'var(--text)',
                  background: opt.value === value ? 'var(--accent-subtle)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: opt.value === value ? 'var(--fw-semibold)' : 'var(--fw-medium)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = opt.value === value ? 'var(--accent-subtle)' : 'var(--bg-muted)'}
                onMouseLeave={(e) => e.currentTarget.style.background = opt.value === value ? 'var(--accent-subtle)' : 'transparent'}
              >
                {opt.label}
              </div>
            )) : (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--fs-sm)' }}>
                Aucun résultat
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const SuspendFields = ({ reasons, value, onChange }) => {
  const r = reasons.find((x) => x.code === value.reasonCode)
  const set = (k) => (v) => onChange({ ...value, [k]: v })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <LocalSelect
        label="Motif"
        placeholder="Choisir un motif de suspension…"
        searchable
        options={[
          { value: '', label: 'Choisir un motif…' },
          ...reasons.map((x) => ({
            value: x.code,
            label: `${x.label} · ${SEVERITY[x.severity]}`,
          })),
        ]}
        value={value.reasonCode}
        onChange={(v) => onChange({ ...value, reasonCode: v, duration: 'default' })}
      />

      {r?.description && (
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', lineHeight: 1.5 }}>
          {r.description}
        </span>
      )}

      {r && !r.is_permanent && (
        <LocalSelect
          label="Durée"
          options={[
            { value: 'default', label: defaultLabel(r) },
            { value: '7', label: '7 jours' },
            { value: '14', label: '14 jours' },
            { value: '30', label: '30 jours' },
            { value: '90', label: '90 jours' },
            { value: 'none', label: 'Jusqu\'à levée manuelle' },
          ]}
          value={value.duration}
          onChange={set('duration')}
        />
      )}

      {r && (
        <Input
          label={r.requires_details ? 'Précisions (obligatoire)' : 'Précisions (optionnel)'}
          value={value.details}
          onChange={(e) => set('details')(e.target.value)}
          placeholder="Faits constatés, référence du signalement…"
        />
      )}

      {r?.requires_training && (
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 'var(--fs-xs)', color: 'var(--amber, #dc6803)' }}>
          <AlertTriangle size={12} /> Une formation sera exigée avant la réactivation.
        </span>
      )}
      {r?.is_permanent && (
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 'var(--fs-xs)', color: 'var(--urgent, #b42318)' }}>
          <AlertTriangle size={12} /> Le compte sera banni. Seul un super admin pourra le réactiver.
        </span>
      )}
    </div>
  )
}

export default SuspendFields