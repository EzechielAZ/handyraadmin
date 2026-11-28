import React, { useState, useId } from 'react'
import { formatCurrency } from '../../utils/formatters'
import styles from './PaymentCharts.module.css'

/* Palette : uniquement des tokens du design system */
export const COLORS = [
  'var(--accent)', 'var(--info)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--text-3)',
]

const compact = (n) => {
  const v = Number(n) || 0
  const a = Math.abs(v)
  if (a >= 1e9) return `${(v / 1e9).toFixed(1).replace('.0', '')} Md`
  if (a >= 1e6) return `${(v / 1e6).toFixed(1).replace('.0', '')} M`
  if (a >= 1e3) return `${(v / 1e3).toFixed(1).replace('.0', '')} k`
  return String(Math.round(v))
}

const fmtBucket = (b, bucket) => {
  if (!b) return ''
  const [y, m, d] = b.split('-')
  if (bucket === 'month') return `${m}/${y.slice(2)}`
  return `${d}/${m}`
}

/* ───────────── Courbe / aires multi-séries ───────────── */
export const TrendChart = ({ data = [], series = [], bucket = 'day', height = 220 }) => {
  const uid = useId().replace(/:/g, '')
  const [hover, setHover] = useState(null)
  const W = 640
  const H = height
  const pad = { t: 12, r: 12, b: 24, l: 44 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b

  if (!data.length) return <div className={styles.empty}>Aucune donnée sur la période</div>

  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)))
  const x = (i) => pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const y = (v) => pad.t + ih - ((Number(v) || 0) / max) * ih
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * t)
  const labelEvery = Math.max(1, Math.ceil(data.length / 8))

  const path = (key) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')
  const area = (key) => `${path(key)} L${x(data.length - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.round(((px - pad.l) / iw) * (data.length - 1))
    setHover(Math.min(data.length - 1, Math.max(0, i)))
  }

  const h = hover != null ? data[hover] : null

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`${uid}-g${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className={styles.grid} />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" className={styles.axis}>{compact(t)}</text>
          </g>
        ))}
        {data.map((d, i) => i % labelEvery === 0 && (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className={styles.axis}>{fmtBucket(d.bucket, bucket)}</text>
        ))}
        {series.map((s, i) => (
          <g key={s.key}>
            {s.area && <path d={area(s.key)} fill={`url(#${uid}-g${i})`} />}
            <path d={path(s.key)} fill="none" stroke={s.color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}
        {h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} className={styles.cursor} />
            {series.map((s) => <circle key={s.key} cx={x(hover)} cy={y(h[s.key])} r="3.5" fill={s.color} className={styles.dot} />)}
          </g>
        )}
      </svg>
      {h && (
        <div className={styles.tooltip} style={{ left: `${(x(hover) / W) * 100}%` }}>
          <strong>{fmtBucket(h.bucket, bucket)}</strong>
          {series.map((s) => (
            <span key={s.key}><i style={{ background: s.color }} />{s.label} <b>{formatCurrency(h[s.key] || 0)}</b></span>
          ))}
        </div>
      )}
      <div className={styles.legend}>
        {series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}
      </div>
    </div>
  )
}

/* ───────────── Barres verticales (nombre de transactions réussies / échouées) ───────────── */
export const StackedBars = ({ data = [], series = [], bucket = 'day', height = 160 }) => {
  const W = 640
  const H = height
  const pad = { t: 8, r: 12, b: 22, l: 36 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  if (!data.length) return <div className={styles.empty}>Aucune donnée sur la période</div>
  const max = Math.max(1, ...data.map((d) => series.reduce((s, k) => s + (Number(d[k.key]) || 0), 0)))
  const bw = Math.max(2, (iw / data.length) * 0.7)
  const labelEvery = Math.max(1, Math.ceil(data.length / 8))

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg}>
        {[0, 0.5, 1].map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih - ih * t} y2={pad.t + ih - ih * t} className={styles.grid} />
            <text x={pad.l - 6} y={pad.t + ih - ih * t + 3} textAnchor="end" className={styles.axis}>{Math.round(max * t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + ((i + 0.5) / data.length) * iw
          let acc = 0
          return (
            <g key={i}>
              <title>{`${fmtBucket(d.bucket, bucket)} — ${series.map((s) => `${s.label}: ${d[s.key] || 0}`).join(' · ')}`}</title>
              {series.map((s) => {
                const v = Number(d[s.key]) || 0
                const bh = (v / max) * ih
                const yy = pad.t + ih - acc - bh
                acc += bh
                return v > 0 ? <rect key={s.key} x={cx - bw / 2} y={yy} width={bw} height={bh} fill={s.color} rx="1.5" /> : null
              })}
              {i % labelEvery === 0 && <text x={cx} y={H - 6} textAnchor="middle" className={styles.axis}>{fmtBucket(d.bucket, bucket)}</text>}
            </g>
          )
        })}
      </svg>
      <div className={styles.legend}>
        {series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}
      </div>
    </div>
  )
}

/* ───────────── Donut ───────────── */
export const Donut = ({ items = [], size = 150, centerLabel, centerValue }) => {
  const total = items.reduce((s, i) => s + (Number(i.value) || 0), 0)
  if (!total) return <div className={styles.empty}>Aucune donnée</div>
  const r = 52
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 140 140" width={size} height={size} className={styles.donut}>
        <circle cx="70" cy="70" r={r} fill="none" className={styles.donutTrack} strokeWidth="16" />
        {items.map((it, i) => {
          const len = ((Number(it.value) || 0) / total) * c
          const el = (
            <circle
              key={i} cx="70" cy="70" r={r} fill="none" stroke={it.color || COLORS[i % COLORS.length]}
              strokeWidth="16" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            ><title>{`${it.label} : ${formatCurrency(it.value)}`}</title></circle>
          )
          offset += len
          return el
        })}
        {centerValue != null && (
          <>
            <text x="70" y="68" textAnchor="middle" className={styles.donutValue}>{centerValue}</text>
            <text x="70" y="84" textAnchor="middle" className={styles.donutLabel}>{centerLabel}</text>
          </>
        )}
      </svg>
      <ul className={styles.donutLegend}>
        {items.map((it, i) => (
          <li key={i}>
            <i style={{ background: it.color || COLORS[i % COLORS.length] }} />
            <span className={styles.dlName}>{it.label}</span>
            <span className={styles.dlVal}>{Math.round((Number(it.value) / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ───────────── Barres horizontales ───────────── */
export const HBars = ({ items = [], valueFormat = formatCurrency, color = 'var(--accent)', empty = 'Aucune donnée' }) => {
  const max = Math.max(0, ...items.map((i) => Number(i.value) || 0))
  if (!items.length || max === 0) return <div className={styles.empty}>{empty}</div>
  return (
    <ul className={styles.hbars}>
      {items.map((it, i) => (
        <li key={i}>
          <div className={styles.hbHead}>
            <span className={styles.hbName} title={it.label}>{it.label}</span>
            <span className={styles.hbVal}>{valueFormat(it.value)}</span>
          </div>
          <div className={styles.hbTrack}>
            <div className={styles.hbFill} style={{ width: `${((Number(it.value) || 0) / max) * 100}%`, background: it.color || color }} />
          </div>
          {it.meta && <span className={styles.hbMeta}>{it.meta}</span>}
        </li>
      ))}
    </ul>
  )
}

/* ───────────── Heatmap jour × heure ───────────── */
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
export const Heatmap = ({ cells = [] }) => {
  if (!cells.length) return <div className={styles.empty}>Aucune donnée</div>
  const map = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c]))
  const max = Math.max(1, ...cells.map((c) => Number(c.count) || 0))
  return (
    <div className={styles.heat}>
      <div className={styles.heatHours}>
        <span />
        {Array.from({ length: 24 }, (_, h) => <span key={h}>{h % 3 === 0 ? h : ''}</span>)}
      </div>
      {DAYS.map((d, di) => (
        <div key={d} className={styles.heatRow}>
          <span className={styles.heatDay}>{d}</span>
          {Array.from({ length: 24 }, (_, h) => {
            const c = map.get(`${di + 1}-${h}`)
            const v = c ? Number(c.count) : 0
            return (
              <span
                key={h}
                className={styles.heatCell}
                style={{ opacity: v ? 0.15 + 0.85 * (v / max) : 1, background: v ? 'var(--accent)' : 'var(--border)' }}
                title={`${d} ${h}h — ${v} paiement${v > 1 ? 's' : ''}${c ? ` · ${formatCurrency(c.amount)}` : ''}`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* ───────────── Variation vs période précédente ───────────── */
export const Delta = ({ current, previous, invert = false }) => {
  if (previous == null) return null
  const c = Number(current) || 0
  const p = Number(previous) || 0
  if (p === 0 && c === 0) return <span className={styles.deltaFlat}>—</span>
  if (p === 0) return <span className={styles.deltaUp}>nouveau</span>
  const pct = ((c - p) / Math.abs(p)) * 100
  const good = invert ? pct < 0 : pct > 0
  const cls = Math.abs(pct) < 0.5 ? styles.deltaFlat : good ? styles.deltaUp : styles.deltaDown
  return <span className={cls}>{pct > 0 ? '▲' : pct < 0 ? '▼' : ''} {Math.abs(pct).toFixed(1)} %</span>
}