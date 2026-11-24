import React, { useState, useRef, useEffect, useMemo, useId } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useArtisan, useSuspensionReasons } from '../../hooks/useArtisans'
import { Button, Spinner, Modal, Tabs, Input, Select, ActionsMenu } from '../../components/ui'
import {
  ArrowLeft, Edit, Shield, Award, Star, Briefcase, CreditCard,
  FileText, AlertTriangle, CheckCircle, Mail, Phone,
  Calendar, ChevronRight, FileCheck, Download, Eye,
  MessageSquare, TrendingUp, TrendingDown, Users, PieChart, Wallet, AlertOctagon,
  Wrench, Globe, MapPin, RefreshCw, Copy, Clock, Check, X, Play,
  User, Activity, Minus, RotateCcw, Camera, Repeat,
} from 'lucide-react'
import { formatDate, formatCurrency } from '../../utils/formatters'
import toast from 'react-hot-toast'
import KycReviewDrawer from './KycReviewDrawer'
import ArtisanEditDrawer from './ArtisanEditDrawer'
import SuspendFields, { EMPTY_SUSPEND, toSuspendPayload } from './SuspendFields'
import { useArtisanEdit } from '../../hooks/useArtisanEdit'
import { DOC_TYPE_LABEL, ID_DOC_LABEL, REJECTION_LABEL } from './kycLabels'
import styles from './ArtisanDetail.module.css'

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const pct = (v) => (num(v) == null ? '—' : `${num(v)}%`)
const dec = (v, d = 1) => (num(v) == null ? '—' : num(v).toFixed(d))
const money = (v) => (num(v) == null ? '—' : formatCurrency(num(v)))
const day = (v) => (v ? formatDate(v) : '—')
const initial = (s) => (s ? String(s).trim().charAt(0).toUpperCase() : '?')
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`

const openUrl = (url) => { if (url) window.open(url, '_blank', 'noopener,noreferrer') }
const downloadUrl = (url, name) => {
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = name || ''
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const NATURAL_GAP = 21
const isBarStuck = (sentinel, bar) =>
  bar.getBoundingClientRect().top - sentinel.getBoundingClientRect().top > NATURAL_GAP + 2

const pickI18n = (v) => {
  if (!v) return null
  if (typeof v === 'string') return v
  if (typeof v === 'object') {
    return v.fr ?? v.FR ?? v.en ?? v.EN ?? Object.values(v).find((x) => typeof x === 'string') ?? null
  }
  return null
}

const getTrade = (a) => {
  const c = a.category
  if (!c) return { category: null, sub: null, title: null }
  const parent = c.parent?.name ?? null
  const rawTitle = a.gender === 'F' ? (c.profession_name_f ?? c.profession_name) : c.profession_name
  return {
    category: parent ?? c.name ?? null,
    sub: parent ? (c.name ?? null) : null,
    title: pickI18n(rawTitle),
  }
}

/* Conservé pour les suspensions automatiques encore renvoyées sous
   `suspension_type` (le flux admin utilise `reason_code` / `reason_label`). */
const SUSPENSION_LABEL = {
  CONSECUTIVE_DISPUTES: 'Litiges consécutifs',
  RATE_15_20: 'Taux de litige 15–20%',
  RATE_20_30: 'Taux de litige 20–30%',
  PERMANENT_BAN: 'Bannissement permanent',
}

/* ─────────────────────────────────────────────
   Pastilles de statut
───────────────────────────────────────────── */
const TONE_ICON = { success: Check, navy: Play, warning: Clock, danger: X, muted: Clock }
const S = (tone, label, icon) => ({ tone, label, icon })

const STATUS_META = {
  PAID:      S('success', 'Payé'),
  SUCCESS:   S('success', 'Réussi'),
  COMPLETED: S('success', 'Terminé'),
  VALIDATED: S('success', 'Validé'),
  APPROVED:  S('success', 'Approuvé'),
  ACCEPTED:  S('success', 'Accepté'),
  VERIFIED:  S('success', 'Vérifié'),
  ACTIVE:    S('success', 'Actif'),
  RELEASED:  S('success', 'Libéré'),
  RESOLVED:  S('success', 'Résolu'),
  CONFIRMED: S('success', 'Confirmé'),
  AVAILABLE: S('success', 'Disponible'),
  PENDING:            S('muted', 'En attente'),
  PENDING_VALIDATION: S('muted', 'Validation'),
  PENDING_PAYMENT:    S('muted', 'Paiement en attente'),
  SUBMITTED:          S('muted', 'Soumis'),
  UNDER_REVIEW:       S('muted', 'En revue'),
  HELD:               S('muted', 'Séquestré'),
  PARTIAL:            S('muted', 'Partiel'),
  SCHEDULED:          S('muted', 'Planifié'),
  BUSY:               S('warning', 'Occupé'),
  IN_PROGRESS: S('navy', 'En cours'),
  ON_WAY:      S('navy', 'En chemin'),
  REFUNDED:    S('navy', 'Remboursé', RotateCcw),
  REJECTED:             S('danger', 'Rejeté'),
  PERMANENTLY_REJECTED: S('danger', 'Rejeté définitivement'),
  FAILED:               S('danger', 'Échoué'),
  CANCELLED:            S('danger', 'Annulé'),
  EXPIRED:              S('danger', 'Expiré'),
  OVERDUE:              S('danger', 'En retard'),
  SUSPENDED:            S('danger', 'Suspendu', AlertTriangle),
  BANNED:               S('danger', 'Banni'),
  DELETED:              S('danger', 'Supprimé'),
  INCIDENT:             S('danger', 'Incident', AlertTriangle),
  DISMISSED: S('muted', 'Classé', Minus),
  OFFLINE:   S('muted', 'Hors ligne', Minus),
  DRAFT:     S('muted', 'Brouillon', Minus),
}

const KIND_OVERRIDES = {
  kyc_stage: {
    AWAITING_SUBMISSION:  S('muted',   'Soumission en attente', FileText),
    AWAITING_REVIEW:      S('warning', 'À traiter'),
    UNDER_REVIEW:         S('navy',    'En traitement'),
    VALIDATED:            S('success', 'Validé'),
    REJECTED:             S('danger',  'Rejeté'),
    PERMANENTLY_REJECTED: S('danger',  'Rejeté définitivement'),
  },
  mission: {
    PENDING:     S('muted', 'En attente'),
    ACCEPTED:    S('navy', 'Acceptée'),
    ON_WAY:      S('navy', 'En chemin'),
    IN_PROGRESS: S('navy', 'En cours'),
    COMPLETED:   S('success', 'Terminée'),
    CANCELLED:   S('danger', 'Annulée'),
  },
  payment: {
    APPROVED: S('navy', 'Approuvé'),
  },
}

const normalizeStatus = (s) => (s == null || s === '' ? null : String(s).trim().toUpperCase().replace(/[\s-]+/g, '_'))
const humanize = (key) => {
  const t = key.toLowerCase().replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const Pill = ({ tone = 'muted', icon, size = 'md', children }) => {
  const Icon = icon || TONE_ICON[tone] || Clock
  return (
    <span className={`${styles.status} ${styles[`pill_${tone}`] || ''} ${size === 'lg' ? styles.statusLg : ''}`}>
      <span
        className={`${styles.statusDisc} ${styles[`tone_${tone}`] || styles.tone_muted}`}
        aria-hidden="true"
      >
        <Icon
          size={size === 'lg' ? 11 : 10}
          strokeWidth={1.5}
          absoluteStrokeWidth
        />
      </span>
      {children}
    </span>
  )
}

const StatusPill = ({ status, kind, prefix, size }) => {
  const key = normalizeStatus(status)
  if (!key) return <span className={styles.muted}>—</span>
  const meta = KIND_OVERRIDES[kind]?.[key] ?? STATUS_META[key] ?? S('muted', humanize(key))
  return (
    <Pill tone={meta.tone} icon={meta.icon} size={size}>
      {prefix ? `${prefix} · ` : ''}{meta.label}
    </Pill>
  )
}

const KYC_DECIDED = ['VALIDATED', 'REJECTED', 'PERMANENTLY_REJECTED']
const isKycActionable = (a) => a.kyc_stage !== 'AWAITING_SUBMISSION'
const isKycDecided = (a) =>
  a.kyc_stage ? KYC_DECIDED.includes(a.kyc_stage) : normalizeStatus(a.kyc_status) === 'VALIDATED'
const KycStagePill = ({ artisan, size, prefix }) =>
  artisan.kyc_stage
    ? <StatusPill status={artisan.kyc_stage} kind="kyc_stage" prefix={prefix} size={size} />
    : <StatusPill status={artisan.kyc_status} prefix={prefix} size={size} />

const AVAILABILITY = {
  AVAILABLE: { tone: 'success', icon: Check, label: 'Disponible' },
  BUSY:      { tone: 'warning', icon: Clock, label: 'Occupé' },
  OFFLINE:   { tone: 'muted',   icon: Minus, label: 'Hors ligne' },
}
const AvailabilityPill = ({ value }) => {
  const a = AVAILABILITY[normalizeStatus(value)] || AVAILABILITY.OFFLINE
  return <Pill tone={a.tone} icon={a.icon}>{a.label}</Pill>
}

/* ─────────────────────────────────────────────
   Briques de mise en page
───────────────────────────────────────────── */
const Card = ({ icon: Icon, title, right, children, flush, className = '' }) => (
  <section className={`${styles.card} ${className}`}>
    <header className={styles.cardHeader}>
      <span className={styles.cardTitleWrap}>
        {Icon && <span className={styles.cardIcon}><Icon size={13} strokeWidth={2} /></span>}
        <h3 className={styles.cardTitle}>{title}</h3>
      </span>
      {right}
    </header>
    <div className={flush ? styles.cardFlush : styles.cardBody}>{children}</div>
  </section>
)

const CountChip = ({ children }) => <span className={styles.countChip}>{children}</span>

const Empty = ({ icon: Icon, children }) => (
  <div className={styles.empty}><Icon size={20} /><span>{children}</span></div>
)

const InfoRow = ({ label, value, mono, strong, full }) => (
  <div className={`${styles.infoRow} ${full ? styles.infoRowFull : ''}`}>
    <span className={styles.infoLabel}>{label}</span>
    <span
      className={
        mono ? styles.mono
        : full ? styles.infoValueLeft
        : strong ? styles.infoValueStrong
        : styles.infoValue
      }
    >
      {value == null || value === '' ? '—' : value}
    </span>
  </div>
)

const StatMini = ({ label, value, icon: Icon, highlight, alert, trend }) => (
  <div
    className={[
      styles.statMini,
      highlight ? styles.statMiniHighlight : '',
      alert ? styles.statMiniAlert : '',
      trend === 'up' ? styles.statMiniUp : '',
      trend === 'down' ? styles.statMiniDown : '',
    ].join(' ')}
  >
    <span className={styles.statMiniLabel}>{label}</span>
    <span className={styles.statMiniValue}>
      {Icon && <Icon size={12} />}
      {value}
    </span>
  </div>
)

const MetricRow = ({ label, value, bar }) => (
  <div className={styles.metricRow}>
    <div className={styles.metricTop}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
    </div>
    {num(bar) != null && (
      <div className={styles.metricTrack}>
        <div style={{ width: `${Math.min(100, Math.max(0, num(bar)))}%` }} />
      </div>
    )}
  </div>
)

const StarRow = ({ size }) => (
  <span className={styles.starsRow}>
    {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={size} fill="currentColor" strokeWidth={0} />)}
  </span>
)
const Stars = ({ value, size = 14 }) => {
  const v = Math.max(0, Math.min(5, num(value) ?? 0))
  return (
    <span className={styles.stars} role="img" aria-label={`${v.toFixed(1)} sur 5`}>
      <span className={styles.starsBase}><StarRow size={size} /></span>
      <span className={styles.starsFill} style={{ width: `${(v / 5) * 100}%` }}><StarRow size={size} /></span>
    </span>
  )
}

/* ─────────────────────────────────────────────
   Historique HPRE
───────────────────────────────────────────── */
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const shortDate = (d) => {
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '' : `${MONTHS[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`
}
const longDate = (d) => {
  const dt = new Date(d)
  return Number.isNaN(dt.getTime())
    ? ''
    : dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const normalizeHistory = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((h) => ({
      date: h.snapshot_date,
      score: num(h.hpre_score_at_date),
      rating: num(h.monthly_rating),
      missions: num(h.monthly_missions),
      onTime: num(h.monthly_on_time),
      rank: h.rank_at_date ?? null,
    }))
    .filter((h) => h.date && h.score != null && !Number.isNaN(new Date(h.date).getTime()))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

const CHART_PAD = { top: 14, right: 18, bottom: 28, left: 38 }

const HpreChart = ({ data, height = 240 }) => {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [hoverIdx, setHoverIdx] = useState(null)
  const gradId = `hpre-${useId().replace(/:/g, '')}`

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setWidth(Math.floor(el.clientWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = data.length
  const innerW = Math.max(0, width - CHART_PAD.left - CHART_PAD.right)
  const innerH = height - CHART_PAD.top - CHART_PAD.bottom

  const g = useMemo(() => {
    const scores = data.map((d) => d.score)
    const lo = Math.min(...scores)
    const hi = Math.max(...scores)
    let yMin = Math.max(0, Math.floor((lo - 5) / 10) * 10)
    let yMax = Math.min(100, Math.ceil((hi + 5) / 10) * 10)
    if (yMax - yMin < 20) {
      yMax = Math.min(100, yMin + 20)
      yMin = Math.max(0, yMax - 20)
    }
    const span = yMax - yMin
    const step = span <= 20 ? 5 : span <= 50 ? 10 : 20
    const ticks = []
    for (let v = yMin; v <= yMax; v += step) ticks.push(v)

    const x = (i) => CHART_PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
    const y = (v) => CHART_PAD.top + innerH - ((v - yMin) / span) * innerH
    const pts = data.map((d, i) => ({ x: x(i), y: y(d.score) }))
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const baseY = CHART_PAD.top + innerH
    const area = `${line} L${pts[n - 1].x.toFixed(1)},${baseY} L${pts[0].x.toFixed(1)},${baseY} Z`

    const maxLabels = Math.max(2, Math.floor(innerW / 72))
    const every = Math.max(1, Math.ceil(n / maxLabels))
    const labels = data
      .map((d, i) => ({ i, text: shortDate(d.date) }))
      .filter(({ i }) => i % every === 0)

    return { ticks, y, pts, line, area, labels, baseY }
  }, [data, innerW, innerH, n])

  const onMove = (e) => {
    if (!innerW) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left - CHART_PAD.left
    const idx = n === 1 ? 0 : Math.min(n - 1, Math.max(0, Math.round((px / innerW) * (n - 1))))
    setHoverIdx(idx)
  }

  const activeIdx = hoverIdx ?? n - 1
  const hovered = hoverIdx != null ? data[hoverIdx] : null
  const tipLeft = hoverIdx != null && width ? Math.min(Math.max(g.pts[hoverIdx].x, 88), width - 88) : 0

  return (
    <div ref={wrapRef} className={styles.chartWrap} style={{ height }}>
      {width > 0 && (
        <svg
          className={styles.chartSvg}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Évolution du score HPRE"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.16 }} />
              <stop offset="100%" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          {g.ticks.map((t) => (
            <g key={t}>
              <line className={styles.chartGrid} x1={CHART_PAD.left} x2={width - CHART_PAD.right} y1={g.y(t)} y2={g.y(t)} />
              <text className={styles.chartAxis} x={CHART_PAD.left - 8} y={g.y(t) + 4} textAnchor="end">{t}</text>
            </g>
          ))}

          {g.labels.map(({ i, text }) => (
            <text key={i} className={styles.chartAxis} x={g.pts[i].x} y={height - 8} textAnchor="middle">{text}</text>
          ))}

          {n > 1 && <path d={g.area} fill={`url(#${gradId})`} />}
          {n > 1 && <path className={styles.chartLine} d={g.line} />}

          {hoverIdx != null && (
            <line
              className={styles.chartCursor}
              x1={g.pts[hoverIdx].x} x2={g.pts[hoverIdx].x}
              y1={CHART_PAD.top} y2={g.baseY}
            />
          )}

          {g.pts.map((p, i) => (
            <circle
              key={i}
              className={i === activeIdx ? styles.chartDotActive : styles.chartDot}
              cx={p.x} cy={p.y} r={i === activeIdx ? 5 : n > 18 ? 0 : 3}
            />
          ))}
        </svg>
      )}

      {hovered && (
        <div className={styles.chartTip} style={{ left: tipLeft }}>
          <strong>{longDate(hovered.date)}</strong>
          <span>Score HPRE : <b>{dec(hovered.score)}</b></span>
          {hovered.rating != null && <span>Note : {dec(hovered.rating)}/5</span>}
          {hovered.missions != null && <span>Missions : {hovered.missions}</span>}
          {hovered.onTime != null && <span>Ponctualité : {pct(hovered.onTime)}</span>}
          {hovered.rank && <span>Rang : {hovered.rank}</span>}
        </div>
      )}
    </div>
  )
}

const HpreHistoryCard = ({ history, rank }) => {
  const n = history.length
  const last = n ? history[n - 1] : null
  const prev = n > 1 ? history[n - 2] : null
  const delta = last && prev ? last.score - prev.score : null
  const best = n ? Math.max(...history.map((h) => h.score)) : null

  return (
    <Card
      icon={TrendingUp}
      title="Historique du score HPRE"
      right={n > 0 ? <CountChip>{plural(n, 'relevé', 'relevés')}</CountChip> : null}
    >
      {n === 0 ? (
        <Empty icon={TrendingUp}>Aucun historique HPRE disponible</Empty>
      ) : (
        <div className={styles.histBody}>
          <div className={styles.histStats}>
            <StatMini label="Score actuel" value={dec(last.score)} icon={TrendingUp} highlight />
            <StatMini
              label="Variation"
              value={delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}
              icon={delta != null && delta < 0 ? TrendingDown : TrendingUp}
              trend={delta == null || delta === 0 ? undefined : delta > 0 ? 'up' : 'down'}
            />
            <StatMini label="Meilleur score" value={dec(best)} />
            <StatMini label="Rang HPRE" value={rank || last.rank || '—'} icon={Award} />
          </div>
          <HpreChart data={history} />
        </div>
      )}
    </Card>
  )
}

/* ─────────────────────────────────────────────
   Primes de performance
───────────────────────────────────────────── */
const RewardsCard = ({ rewards, accrued }) => {
  const paidRows = rewards.filter((r) => normalizeStatus(r.status) === 'PAID')
  const paidTotal = paidRows.reduce((s, r) => s + (num(r.amount) ?? 0), 0)

  return (
    <Card
      icon={Award}
      title="Primes de performance"
      flush
      right={rewards.length > 0 ? <CountChip>{rewards.length}</CountChip> : null}
    >
      <div className={styles.cardPad}>
        <div className={styles.statsRow3}>
          <StatMini label="Prime en cours" value={money(accrued)} highlight />
          <StatMini label="Total versé (12 mois)" value={money(paidTotal)} />
          <StatMini label="Primes versées" value={paidRows.length} />
        </div>
      </div>
      {rewards.length === 0 ? (
        <Empty icon={Award}>Aucune prime enregistrée</Empty>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Mois</th><th>Score HPRE</th><th>Montant</th><th>Statut</th><th>Versée le</th></tr>
            </thead>
            <tbody>
              {rewards.map((r) => (
                <tr key={r.id} className={styles.tableRow}>
                  <td className={styles.cellPrimary}>{shortDate(r.reward_month) || '—'}</td>
                  <td className={styles.cellSecondary}>{dec(r.hpre_snapshot)}</td>
                  <td className={styles.cellAmount}>{money(r.amount)}</td>
                  <td><StatusPill status={r.status} /></td>
                  <td className={styles.cellSecondary}>{day(r.paid_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

/* ─────────────────────────────────────────────
   Activité : présence, rétention, plages d'intervention
───────────────────────────────────────────── */
const fmtDuration = (sec) => {
  const s = num(sec)
  if (s == null) return '—'
  if (s <= 0) return '0 min'
  const m = Math.round(s / 60)
  if (m < 1) return '< 1 min'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`
}

const ago = (v) => {
  if (!v) return '—'
  const t = new Date(v).getTime()
  if (Number.isNaN(t)) return '—'
  const min = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (min < 2) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  if (d < 60) return `il y a ${d} j`
  return `il y a ${Math.round(d / 30)} mois`
}

const daysAgo = (n) => {
  const d = num(n)
  if (d == null) return '—'
  if (d === 0) return "Aujourd'hui"
  return `il y a ${d} j`
}

const dayLabel = (iso) => {
  const dt = new Date(`${String(iso).slice(0, 10)}T12:00:00`)
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

const PRESENCE_LIVE = {
  online:  { tone: 'success', icon: Check, label: 'En ligne' },
  away:    { tone: 'warning', icon: Clock, label: 'Absent' },
  offline: { tone: 'muted',   icon: Minus, label: 'Hors ligne' },
}

const PresenceCard = ({ presence }) => {
  const p = presence || {}
  const now = p.now || {}
  const cur = p.last_30d || {}
  const prev = p.prev_30d || {}
  const daily = Array.isArray(p.daily) ? p.daily : []
  const live = PRESENCE_LIVE[String(now.status || 'offline').toLowerCase()] || PRESENCE_LIVE.offline

  const curSec = num(cur.online_seconds) ?? 0
  const prevSec = num(prev.online_seconds) ?? 0
  const delta = prevSec > 0 ? Math.round(((curSec - prevSec) / prevSec) * 100) : null
  const maxSec = Math.max(1, ...daily.map((d) => num(d.seconds) ?? 0))
  const hasActivity = daily.some((d) => (num(d.seconds) ?? 0) > 0)
  const isOffline = live === PRESENCE_LIVE.offline

  return (
    <Card
      icon={Activity}
      title="Présence en ligne"
      right={<Pill tone={live.tone} icon={live.icon}>{live.label}</Pill>}
    >
      <div className={styles.histBody}>
        <div className={styles.statsGrid}>
          <StatMini
            label="Temps en ligne (30 j)"
            value={fmtDuration(curSec)}
            icon={Clock}
            highlight
            trend={delta == null || delta === 0 ? undefined : delta > 0 ? 'up' : 'down'}
          />
          <StatMini label="Jours actifs" value={`${num(cur.active_days) ?? 0} / 30`} icon={Calendar} />
          <StatMini label="Sessions" value={num(cur.sessions) ?? 0} />
          <StatMini label="Durée moyenne" value={fmtDuration(cur.avg_session_seconds)} />
        </div>

        <div className={styles.barsBlock}>
          <span className={styles.barsTitle}>Temps en ligne par jour · 30 derniers jours</span>
          {hasActivity ? (
            <>
              <div className={styles.dayBars}>
                {daily.map((d) => {
                  const sec = num(d.seconds) ?? 0
                  return (
                    <div
                      key={d.date}
                      className={styles.dayBar}
                      data-zero={sec === 0}
                      title={`${dayLabel(d.date)} · ${sec > 0 ? fmtDuration(sec) : 'hors ligne'}`}
                    >
                      <i style={{ height: sec > 0 ? `${Math.max(6, (sec / maxSec) * 100)}%` : undefined }} />
                    </div>
                  )
                })}
              </div>
              <div className={styles.barsCaption}>
                <span>{dayLabel(daily[0]?.date)}</span>
                <span>{dayLabel(daily[daily.length - 1]?.date)}</span>
              </div>
            </>
          ) : (
            <span className={styles.muted}>Aucune session en ligne sur les 30 derniers jours</span>
          )}
        </div>

        <div>
          <InfoRow
            label="Variation vs 30 j précédents"
            value={delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta} %`}
          />
          <InfoRow label="Dernière activité" value={ago(now.last_active_at)} />
          {isOffline && now.offline_since && (
            <InfoRow label="Hors ligne depuis" value={ago(now.offline_since)} />
          )}
          <InfoRow label="Disponibilité déclarée" value={<AvailabilityPill value={now.availability_status} />} />
        </div>
      </div>
    </Card>
  )
}

const RetentionCard = ({ retention }) => {
  const r = retention || {}
  const clients = r.clients || {}
  const months = Array.isArray(r.months) ? r.months : []
  const maxM = Math.max(1, ...months.map((m) => num(m.missions) ?? 0))
  const windowM = num(r.window_months) ?? 6
  const tenure = num(r.tenure_months)

  return (
    <Card icon={Repeat} title="Rétention & fidélité">
      <div className={styles.histBody}>
        <div className={styles.statsGrid}>
          <StatMini label="Clients récurrents" value={pct(clients.repeat_rate)} icon={Users} highlight />
          <StatMini label={`Mois actifs (${windowM} derniers)`} value={`${num(r.active_months) ?? 0} / ${windowM}`} />
          <StatMini label="Dernière mission" value={daysAgo(r.days_since_last_mission)} />
          <StatMini label="Ancienneté" value={tenure == null ? '—' : `${tenure} mois`} />
        </div>

        <div className={styles.barsBlock}>
          <span className={styles.barsTitle}>Missions terminées par mois</span>
          {months.length === 0 ? (
            <span className={styles.muted}>Aucune donnée</span>
          ) : (
            <div className={styles.monthBars}>
              {months.map((m) => {
                const n = num(m.missions) ?? 0
                return (
                  <div
                    key={m.month}
                    className={styles.monthCol}
                    data-zero={n === 0}
                    title={`${shortDate(m.month)} · ${plural(n, 'mission', 'missions')} · ${plural(num(m.clients) ?? 0, 'client', 'clients')}`}
                  >
                    <span className={styles.monthVal}>{n}</span>
                    <span className={styles.monthFill} style={{ height: n > 0 ? `${Math.max(8, (n / maxM) * 74)}px` : undefined }} />
                    <span className={styles.monthLbl}>{(shortDate(m.month) || '').split(' ')[0]}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <InfoRow
            label="Clients ayant refait appel"
            value={`${num(clients.repeat) ?? 0} sur ${num(clients.total) ?? 0}`}
          />
        </div>
        <span className={styles.noteLine}>
          Un client est récurrent s'il a au moins deux missions terminées avec cet artisan.
        </span>
      </div>
    </Card>
  )
}

const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAY_FULL = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const DAY_PARTS = [
  { id: 'morning',   label: 'Matin',      range: '6 h – 12 h',  from: 6,  to: 12 },
  { id: 'afternoon', label: 'Après-midi', range: '12 h – 18 h', from: 12, to: 18 },
  { id: 'evening',   label: 'Soirée',     range: '18 h – 24 h', from: 18, to: 24 },
  { id: 'night',     label: 'Nuit',       range: '0 h – 6 h',   from: 0,  to: 6 },
]
const WINDOW = 3

const TimeSlotsCard = ({ slots }) => {
  const s = slots || {}

  const m = useMemo(() => {
    const grid = Array.isArray(s.grid) ? s.grid : []
    const rows = Array.from({ length: 7 }, (_, d) =>
      Array.from({ length: 24 }, (_, h) => num(grid[d]?.[h]) ?? 0))
    const total = rows.flat().reduce((a, b) => a + b, 0)
    const byDay = rows.map((r) => r.reduce((a, b) => a + b, 0))
    const byHour = Array.from({ length: 24 }, (_, h) => rows.reduce((acc, r) => acc + r[h], 0))
    const max = Math.max(1, ...rows.flat())

    const topDay = byDay.indexOf(Math.max(...byDay))
    let bestStart = 0
    let bestSum = -1
    for (let h = 0; h <= 24 - WINDOW; h += 1) {
      const sum = byHour.slice(h, h + WINDOW).reduce((a, b) => a + b, 0)
      if (sum > bestSum) { bestSum = sum; bestStart = h }
    }
    const parts = DAY_PARTS.map((p) => {
      const n = byHour.slice(p.from, p.to).reduce((a, b) => a + b, 0)
      return { ...p, n, share: total ? Math.round((n / total) * 100) : 0 }
    })
    const topPart = parts.reduce((a, b) => (b.n > a.n ? b : a), parts[0])
    return { rows, total, byDay, max, topDay, bestStart, bestSum, parts, topPart }
  }, [s.grid])

  const total = num(s.total) ?? m.total
  const windowDays = num(s.window_days) ?? 180

  return (
    <Card
      icon={Clock}
      title="Plages d'intervention"
      right={total > 0 ? <CountChip>{plural(total, 'mission', 'missions')}</CountChip> : null}
    >
      {m.total === 0 ? (
        <Empty icon={Clock}>Aucune intervention datée sur les {Math.round(windowDays / 30)} derniers mois</Empty>
      ) : (
        <div className={styles.histBody}>
          <div className={styles.statsRow3}>
            <StatMini
              label="Jour le plus actif"
              value={`${cap(DAY_FULL[m.topDay])} · ${Math.round((m.byDay[m.topDay] / m.total) * 100)} %`}
              icon={Calendar}
              highlight
            />
            <StatMini
              label="Meilleure plage"
              value={`${m.bestStart} h – ${m.bestStart + WINDOW} h`}
              icon={Clock}
            />
            <StatMini label="Période dominante" value={`${m.topPart.label} · ${m.topPart.share} %`} />
          </div>

          <div className={styles.slotLayout}>
            <div>
              {m.parts.map((p) => (
                <MetricRow key={p.id} label={`${p.label} · ${p.range}`} value={`${p.share} %`} bar={p.share} />
              ))}
            </div>

            <div>
              <div className={styles.heatScroll}>
                <div className={styles.heat} role="img" aria-label="Interventions par jour de la semaine et par heure">
                  <span />
                  {Array.from({ length: 24 }, (_, h) => (
                    <span key={`h${h}`} className={styles.heatHour}>{h % 3 === 0 ? h : ''}</span>
                  ))}
                  {m.rows.map((row, d) => (
                    <React.Fragment key={DAY_SHORT[d]}>
                      <span className={styles.heatDay}>{DAY_SHORT[d]}</span>
                      {row.map((n, h) => (
                        <span
                          key={h}
                          className={styles.heatCell}
                          title={`${DAY_SHORT[d]} ${h} h : ${plural(n, 'mission', 'missions')}`}
                        >
                          {n > 0 && <i style={{ opacity: 0.18 + 0.82 * (n / m.max) }} />}
                        </span>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className={styles.heatFoot}>
                <span>
                  Heures locales{s.timezone ? ` (${s.timezone})` : ''} · {Math.round(windowDays / 30)} derniers mois
                </span>
                <span className={styles.heatLegend}>
                  Moins <span className={styles.heatLegendBar} /> Plus
                </span>
              </div>
            </div>
          </div>

          {m.total < 10 && (
            <span className={styles.noteLine}>
              Échantillon limité ({plural(m.total, 'mission', 'missions')}) : tendance à confirmer.
            </span>
          )}
        </div>
      )}
    </Card>
  )
}

/* ─────────────────────────────────────────────
   Onglets
───────────────────────────────────────────── */
const TABS = [
  { id: 'info',      label: 'Informations', icon: FileText },
  { id: 'missions',  label: 'Missions',     icon: Briefcase },
  { id: 'payments',  label: 'Paiements',    icon: CreditCard },
  { id: 'kyc',       label: 'KYC',          icon: Shield },
  { id: 'reviews',   label: 'Avis',         icon: Star },
  { id: 'analytics', label: 'Analytiques',  icon: TrendingUp },
]
const TAB_IDS = TABS.map((t) => t.id)

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
const ArtisanDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    artisan, isLoading, isFetching, isError, error, refetch,
    validateKYC, isValidating,
    suspendArtisan, isSuspending,
    reactivateArtisan, isReactivating,
  } = useArtisan(id)

  const tabParam = searchParams.get('tab')
  const activeTab = TAB_IDS.includes(tabParam) ? tabParam : 'info'

  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showReactivateModal, setShowReactivateModal] = useState(false)
  const [showKYCDrawer, setShowKYCDrawer] = useState(false)
  const [showEditDrawer, setShowEditDrawer] = useState(false)

  const [suspendForm, setSuspendForm] = useState(EMPTY_SUSPEND)
  const [trainingDone, setTrainingDone] = useState(false)
  const { data: reasons = [] } = useSuspensionReasons()

  const edit = useArtisanEdit(id, showEditDrawer)

  const pageRef = useRef(null)
  const tabsBarRef = useRef(null)
  const sentinelRef = useRef(null)
  const tabContentRef = useRef(null)
  const [stuck, setStuck] = useState(false)

  const history = useMemo(() => normalizeHistory(artisan?.hpre_history), [artisan?.hpre_history])

  const ready = !isLoading && !isError && !!artisan

  useEffect(() => {
    const page = pageRef.current
    const bar = tabsBarRef.current
    const sentinel = sentinelRef.current
    if (!ready || !page || !bar || !sentinel) return

    let raf = 0
    const syncStuck = () => setStuck(isBarStuck(sentinel, bar))
    const syncHeight = () => page.style.setProperty('--tabs-h', `${bar.offsetHeight}px`)
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; syncStuck() })
    }

    syncHeight()
    syncStuck()

    const ro = new ResizeObserver(() => { syncHeight(); schedule() })
    ro.observe(bar)
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
    }
  }, [ready])

  const handleTabChange = (tabId) => {
    if (tabId === activeTab || !TAB_IDS.includes(tabId)) return
    const next = new URLSearchParams(searchParams)
    if (tabId === 'info') next.delete('tab')
    else next.set('tab', tabId)
    setSearchParams(next, { replace: true })

    requestAnimationFrame(() => {
      const bar = tabsBarRef.current
      const sentinel = sentinelRef.current
      const content = tabContentRef.current
      if (!bar || !sentinel || !content) return
      if (isBarStuck(sentinel, bar)) content.scrollIntoView({ block: 'start' })
    })
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
        <span className={styles.loadingText}>Chargement du profil…</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={styles.errorPage}>
        <AlertTriangle size={32} className={styles.errorIcon} />
        <h2>Impossible de charger l'artisan</h2>
        <p>{error?.message || 'Une erreur est survenue.'}</p>
        <div className={styles.errorActions}>
          <Button variant="outline" onClick={() => navigate('/artisans')}>Retour à la liste</Button>
          <Button onClick={() => refetch()}>Réessayer</Button>
        </div>
      </div>
    )
  }

  if (!artisan) {
    return (
      <div className={styles.errorPage}>
        <AlertTriangle size={32} className={styles.errorIcon} />
        <h2>Artisan introuvable</h2>
        <p>Cet artisan n'existe pas ou a été supprimé.</p>
        <Button onClick={() => navigate('/artisans')}>Retour à la liste</Button>
      </div>
    )
  }

  const name = artisan.user?.full_name || 'Artisan'
  const accountStatus = normalizeStatus(artisan.user?.status)
  const isBanned = accountStatus === 'BANNED'
  const isSuspended = accountStatus === 'SUSPENDED' || isBanned
  const isDeleted = accountStatus === 'DELETED'
  const email = artisan.user?.email
  const phone = artisan.user?.phone_number
  const trade = getTrade(artisan)
  const hasTrade = !!(trade.category || trade.sub || trade.title)
  const susp = artisan.active_suspension
  const banReason = artisan.user?.ban_reason
  const kycActionable = isKycActionable(artisan)
  const trainingRequired = !!(susp?.requires_training && !susp?.training_completed_at)

  const copy = async (text, label) => {
    if (!text) {
      toast.error('Rien à copier')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success(label)
    } catch {
      toast.error('Copie impossible')
    }
  }

  const openKYC = () => setShowKYCDrawer(true)

  const submitKYC = (payload) => {
    if (String(artisan.kyc_submission?.status || '').toUpperCase() === 'DRAFT') {
      toast.error('Dossier non soumis : décision impossible')
      return
    }
    if ((artisan.kyc_documents || []).length === 0) {
      toast.error('Aucun document fourni : décision impossible')
      return
    }
    validateKYC(payload, { onSuccess: () => setShowKYCDrawer(false) })
  }

  const submitSuspend = () => {
    const res = toSuspendPayload(suspendForm, reasons)
    if (res.error) {
      toast.error(res.error)
      return
    }
    suspendArtisan(res.payload, {
      onSuccess: () => {
        setShowSuspendModal(false)
        setSuspendForm(EMPTY_SUSPEND)
      },
    })
  }

  const submitReactivate = () => {
    reactivateArtisan(
      { trainingDone },
      {
        onSuccess: () => {
          setShowReactivateModal(false)
          setTrainingDone(false)
        },
      }
    )
  }

  const submitEdit = async (payload, reason) => {
    try {
      const res = await edit.save(payload, reason)
      toast.success(res?.changed ? plural(res.changed, 'champ modifié', 'champs modifiés') : 'Aucun changement')
      setShowEditDrawer(false)
      refetch()
    } catch (e) {
      toast.error(e?.message || 'Échec de la modification')
    }
  }

  const menuItems = [
    { label: 'Copier IFU', icon: Copy, onClick: () => copy(artisan.ifu_number, 'IFU copié') },
    { label: 'Copier email', icon: Mail, onClick: () => copy(email, 'Email copié') },
    { label: 'Copier téléphone', icon: Phone, onClick: () => copy(phone, 'Téléphone copié') },
    ...(kycActionable
      ? [{ separator: true }, { label: isKycDecided(artisan) ? 'Modifier la décision KYC' : 'Traiter le KYC', icon: Shield, onClick: openKYC }]
      : []),
  ]

  const renderTab = () => {
    switch (activeTab) {
      case 'missions':  return <MissionsTab artisan={artisan} onViewAll={() => navigate('/missions')} />
      case 'payments':  return <PaymentsTab artisan={artisan} onOpenPayment={(pid) => navigate(`/payments?ref=${pid}`)} />
      case 'kyc':       return <KYCTab artisan={artisan} onVerify={openKYC} />
      case 'reviews':   return <ReviewsTab artisan={artisan} />
      case 'analytics': return <AnalyticsTab artisan={artisan} history={history} />
      default:          return <InfoTab artisan={artisan} trade={trade} onOpenKYC={openKYC} />
    }
  }

  return (
    <div className={styles.page} ref={pageRef}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.headerLeft}>
            <Button
              variant="ghost" size="md" icon={ArrowLeft}
              onClick={() => navigate('/artisans')}
              aria-label="Retour à la liste" title="Retour"
            />
            <nav className={styles.crumbs} aria-label="Fil d'Ariane">
              <button type="button" className={styles.crumbLink} onClick={() => navigate('/artisans')}>
                Artisans
              </button>
              <ChevronRight size={13} className={styles.crumbSep} />
              <span className={styles.crumbCurrent}>{name}</span>
            </nav>
          </div>

          <div className={styles.headerActions}>
            <Button
              variant="outline" size="md" icon={RefreshCw}
              onClick={() => refetch()} disabled={isFetching}
              aria-label="Rafraîchir" title="Rafraîchir"
            />
            {!isDeleted && (
              <Button variant="outline" size="md" icon={Edit} onClick={() => setShowEditDrawer(true)}>
                Modifier
              </Button>
            )}
            {!isDeleted && (
              isSuspended ? (
                <Button
                  variant="success" size="md" icon={CheckCircle}
                  onClick={() => setShowReactivateModal(true)}
                >
                  Réactiver
                </Button>
              ) : (
                <Button
                  variant="danger" size="md" icon={AlertTriangle}
                  onClick={() => setShowSuspendModal(true)}
                >
                  Suspendre
                </Button>
              )
            )}
            <ActionsMenu items={menuItems} />
          </div>
        </div>
      </header>

      <div className={styles.content}>
        {/* ── Bandeau d'état du compte ── */}
        {(isSuspended || isDeleted) && (
          <div className={`${styles.notice} ${isDeleted ? styles.noticeNeutral : ''}`} role="status">
            <span className={styles.noticeIcon}><AlertTriangle size={14} strokeWidth={2.5} /></span>
            <div>
              <strong>{isDeleted ? 'Compte supprimé' : isBanned ? 'Compte banni' : 'Compte suspendu'}</strong>
              <span>
                {isDeleted
                  ? " L'historique (missions, paiements, avis) est conservé. La gestion du compte se fait depuis les clients."
                  : " L'artisan est hors ligne et ne reçoit plus de missions."}
              </span>
              {!isDeleted && (susp || banReason) && (
                <span className={styles.noticeDetail}>
                  {susp && (
                    <>
                      {susp.source === 'ADMIN'
                        ? (susp.reason_label || susp.reason_code)
                        : `${SUSPENSION_LABEL[susp.suspension_type] || susp.suspension_type} · automatique`}
                      {' · '}
                      {susp.suspended_until ? `jusqu'au ${day(susp.suspended_until)}` : 'durée indéterminée'}
                      {susp.requires_training ? ' · formation requise' : ''}
                      {susp.source === 'ADMIN' && susp.reason_details ? ` · ${susp.reason_details}` : ''}
                    </>
                  )}
                  {!susp && banReason ? `Motif : ${banReason}` : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Profil ── */}
        <section className={styles.profile}>
          <div className={styles.hero}>
            <div className={styles.avatar}>
              {artisan.user?.avatar_url ? (
                <img src={artisan.user.avatar_url} alt={name} />
              ) : (
                <span className={styles.avatarFallback}>{initial(name)}</span>
              )}
            </div>

            <div className={styles.heroInfo}>
              <div className={styles.heroNameRow}>
                <h1 className={styles.name}>{name}</h1>
                {artisan.is_pro_member && (
                  <span className={styles.chipPro}><Award size={11} strokeWidth={2.5} /> PRO</span>
                )}
                {artisan.badge?.name && (
                  <span className={styles.chipSolid}><Award size={11} />{artisan.badge.name}</span>
                )}
              </div>

              <div className={styles.heroTrade}>
                {hasTrade ? (
                  <>
                    {trade.title && trade.title !== trade.category && trade.title !== trade.sub && (
                      <span className={styles.tradeTitle}>{trade.title}</span>
                    )}
                    {trade.category && (
                      <span className={styles.tradeChip}><Wrench size={11} />{trade.category}</span>
                    )}
                    {trade.sub && (
                      <>
                        <ChevronRight size={12} className={styles.tradeSep} />
                        <span className={styles.tradeChip}>{trade.sub}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className={styles.tradeEmpty}>Métier non renseigné</span>
                )}
                {num(artisan.experience_years) != null && (
                  <span className={styles.tradeExp}>
                    {plural(num(artisan.experience_years), "an d'expérience", "ans d'expérience")}
                  </span>
                )}
              </div>

              <div className={styles.heroMeta}>
                <span className={styles.chipMono}>IFU·{artisan.ifu_number || '—'}</span>
                <KycStagePill artisan={artisan} prefix="KYC" />
                <AvailabilityPill value={artisan.availability_status} />
                {isSuspended && <Pill tone="danger" icon={AlertTriangle}>{isBanned ? 'Banni' : 'Suspendu'}</Pill>}
                {isDeleted && <Pill tone="danger" icon={X}>Supprimé</Pill>}
              </div>

              <div className={styles.heroContact}>
                {email && (
                  <span className={styles.contactItem}>
                    <Mail size={12} /><a href={`mailto:${email}`}>{email}</a>
                  </span>
                )}
                {phone && (
                  <span className={styles.contactItem}>
                    <Phone size={12} /><a href={`tel:${phone}`}>{phone}</a>
                  </span>
                )}
                <span className={styles.contactItem}>
                  <Calendar size={12} />Inscrit le {day(artisan.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.statStrip}>
            <div className={styles.statCell}>
              <span className={styles.statCellIcon}><Star size={15} /></span>
              <div>
                <span className={styles.statCellValue}>{dec(artisan.average_rating)}</span>
                <span className={styles.statCellLabel}>Note moyenne</span>
              </div>
            </div>
            <div className={styles.statCell}>
              <span className={styles.statCellIcon}><Briefcase size={15} /></span>
              <div>
                <span className={styles.statCellValue}>{artisan.total_missions ?? 0}</span>
                <span className={styles.statCellLabel}>Missions</span>
              </div>
            </div>
            <div className={styles.statCell}>
              <span className={styles.statCellIcon}><TrendingUp size={15} /></span>
              <div>
                <span className={styles.statCellValue}>{dec(artisan.hpre_score)}</span>
                <span className={styles.statCellLabel}>Score HPRE</span>
              </div>
            </div>
            <div className={styles.statCell}>
              <span className={styles.statCellIcon}><Wallet size={15} /></span>
              <div>
                <span className={styles.statCellValue}>{money(artisan.revenue?.current_balance)}</span>
                <span className={styles.statCellLabel}>Solde</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Onglets ── */}
        <div ref={sentinelRef} className={styles.tabsSentinel} aria-hidden="true" />
        <div
          ref={tabsBarRef}
          className={`${styles.tabsBar} ${stuck ? styles.tabsBarStuck : ''}`}
        >
          <Tabs tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
        </div>

        <div ref={tabContentRef} className={styles.tabContent}>
          <div key={activeTab} className={styles.tabPanel} role="tabpanel">
            {renderTab()}
          </div>
        </div>
      </div>

      {/* ── Modale Suspendre ── */}
      <Modal isOpen={showSuspendModal} onClose={() => setShowSuspendModal(false)} title="Suspendre l'artisan">
        <div className={styles.modalStack}>
          <p className={styles.modalText}>
            Confirmer la suspension de <strong>{name}</strong> ? L'artisan passera hors ligne et ne recevra plus de missions.
          </p>
          <SuspendFields reasons={reasons} value={suspendForm} onChange={setSuspendForm} />
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setShowSuspendModal(false)}>Annuler</Button>
            <Button
              variant="danger"
              onClick={submitSuspend}
              isLoading={isSuspending}
              disabled={!suspendForm.reasonCode}
            >
              Confirmer la suspension
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modale Réactiver ── */}
      <Modal isOpen={showReactivateModal} onClose={() => setShowReactivateModal(false)} title="Réactiver l'artisan">
        <div className={styles.modalStack}>
          <p className={styles.modalText}>
            Confirmer la réactivation de <strong>{name}</strong> ? Le compte repassera ACTIVE et la suspension en cours sera levée. L'artisan restera <strong>hors ligne</strong> : c'est à lui de se remettre disponible.
          </p>
          {trainingRequired && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 'var(--fs-sm)' }}>
              <input
                type="checkbox"
                checked={trainingDone}
                onChange={(e) => setTrainingDone(e.target.checked)}
              />
              La formation exigée a été effectuée
            </label>
          )}
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setShowReactivateModal(false)}>Annuler</Button>
            <Button
              variant="success"
              onClick={submitReactivate}
              isLoading={isReactivating}
              disabled={trainingRequired && !trainingDone}
            >
              Confirmer la réactivation
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Drawer Décision KYC ── */}
      <KycReviewDrawer
        isOpen={showKYCDrawer}
        onClose={() => setShowKYCDrawer(false)}
        artisan={artisan}
        submitting={isValidating}
        onSubmit={submitKYC}
        renderStatus={(status) => <StatusPill status={status} />}
        statusBadge={<KycStagePill artisan={artisan} />}
      />

      {/* ── Drawer Édition ── */}
      <ArtisanEditDrawer
        isOpen={showEditDrawer}
        onClose={() => setShowEditDrawer(false)}
        artisan={artisan}
        options={edit.options}
        loadingOptions={edit.loadingOptions}
        saving={edit.saving}
        onSubmit={submitEdit}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────
   Onglet Informations
───────────────────────────────────────────── */
const InfoTab = ({ artisan, trade, onOpenKYC }) => {
  const rev = artisan.revenue || {}
  const years = num(artisan.experience_years)
  const sub = artisan.subscription
  return (
    <div className={styles.infoGrid}>
      <Card icon={User} title="Informations personnelles">
        <InfoRow label="Nom complet" value={artisan.user?.full_name} />
        <InfoRow label="IFU" value={artisan.ifu_number} mono />
        {trade.title && <InfoRow label="Métier" value={trade.title} />}
        <InfoRow label="Catégorie" value={trade.category} />
        {trade.sub && <InfoRow label="Sous-catégorie" value={trade.sub} />}
        {years != null && <InfoRow label="Expérience" value={plural(years, 'an', 'ans')} />}
        {artisan.language_spoken && (
          <InfoRow label="Langues" value={artisan.language_spoken.replace(',', ' · ')} />
        )}
        <InfoRow label="Bio" value={artisan.bio || 'Non renseignée'} full />
      </Card>

      <Card icon={TrendingUp} title="Performance & HPRE">
        <div className={styles.statsGrid}>
          <StatMini label="Note" value={num(artisan.average_rating) == null ? '—' : `${dec(artisan.average_rating)}/5`} icon={Star} />
          <StatMini label="Missions" value={artisan.total_missions ?? 0} icon={Briefcase} />
          <StatMini label="Complétion" value={pct(artisan.stats?.completion_rate)} />
          <StatMini label="Ponctualité" value={pct(artisan.stats?.on_time_rate)} />
          <StatMini label="Score HPRE" value={dec(artisan.hpre_score)} icon={TrendingUp} highlight />
          <StatMini label="Prime de performance" value={money(artisan.hpre_accrued_rewards)} />
        </div>
      </Card>

      <Card icon={Wallet} title="Revenus & commissions">
        <InfoRow label="Commissions Handyra" value={money(rev.total_commission)} />
        <InfoRow label="Volume total encaissé" value={money(rev.total_gross)} />
        <InfoRow label="En attente" value={money(rev.pending_amount)} />
        <InfoRow label="Solde disponible" value={money(rev.current_balance)} strong />
        {sub && (
          <InfoRow
            label="Abonnement"
            value={`${sub.plan_name}${sub.end_date ? ` · jusqu'au ${day(sub.end_date)}` : ''}`}
          />
        )}
      </Card>

      <Card icon={AlertOctagon} title="Litiges & alertes">
        <div className={styles.statsGrid}>
          <StatMini label="Litiges totaux" value={artisan.disputes?.total ?? 0} icon={AlertOctagon} />
          <StatMini label="Litiges en attente" value={artisan.disputes?.pending ?? 0} alert={(artisan.disputes?.pending ?? 0) > 0} />
          <StatMini label="Désintermédiation" value={artisan.desinterm?.total ?? 0} icon={AlertTriangle} />
          <StatMini label="Alertes en attente" value={artisan.desinterm?.pending ?? 0} alert={(artisan.desinterm?.pending ?? 0) > 0} />
        </div>
      </Card>

      <Card icon={MapPin} title="Localisation">
        <InfoRow label="Adresse" value={artisan.location?.address || 'Non renseignée'} />
        <InfoRow label="Ville" value={artisan.location?.city || 'Non renseignée'} />
        <div className={styles.subSection}>
          <span className={styles.subSectionLabel}>Zones d'intervention</span>
          {artisan.top_zones?.length > 0 ? (
            <div className={styles.chipList}>
              {artisan.top_zones.map((z, i) => (
                <span key={`${z.name}-${i}`} className={styles.chip}>
                  <Globe size={11} />{z.name}
                  <span className={styles.chipCount}>{z.count}</span>
                </span>
              ))}
            </div>
          ) : (
            <span className={styles.muted}>Aucune mission localisée</span>
          )}
        </div>
      </Card>

      <Card
        icon={Wrench}
        title="Spécialités & services"
        right={<CountChip>{artisan.services?.active ?? 0} actifs</CountChip>}
      >
        <div className={styles.subSection}>
          <span className={styles.subSectionLabel}>Spécialités</span>
          {artisan.specialties?.length > 0 ? (
            <div className={styles.chipList}>
              {artisan.specialties.map((s, i) => (
                <span key={`${s}-${i}`} className={styles.chip}><Wrench size={11} />{s}</span>
              ))}
            </div>
          ) : (
            <span className={styles.muted}>Aucune spécialité déclarée</span>
          )}
        </div>

        {artisan.services?.custom?.length > 0 && (
          <div className={styles.subSection}>
            <span className={styles.subSectionLabel}>Services personnalisés ({artisan.services.custom.length})</span>
            <div className={styles.serviceList}>
              {artisan.services.custom.map((s) => (
                <div key={s.id} className={styles.serviceItem}>
                  <div>
                    <span className={styles.serviceName}>{s.label}</span>
                    {s.description && <span className={styles.serviceDesc}>{s.description}</span>}
                  </div>
                  <span className={styles.servicePrice}>
                    {num(s.price_amount)
                      ? `${money(s.price_amount)}${s.price_unit ? ` / ${s.price_unit}` : ''}`
                      : s.price_type === 'QUOTE' ? 'Sur devis' : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {artisan.services?.catalog?.length > 0 && (
          <div className={styles.subSection}>
            <span className={styles.subSectionLabel}>Catalogue Handyra ({artisan.services.catalog.length})</span>
            <div className={styles.chipList}>
              {artisan.services.catalog.map((s) => (
                <span key={s.id} className={styles.chip}>{s.label}</span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card icon={Activity} title="Services les plus demandés">
        {artisan.top_services_requested?.length > 0 ? (
          <div className={styles.rankList}>
            {artisan.top_services_requested.map((s, i) => (
              <div key={`${s.label}-${i}`} className={styles.rankRow}>
                <span className={`${styles.rankPos} ${i === 0 ? styles.rankPosTop : ''}`}>{i + 1}</span>
                <span className={styles.rankLabel}>{s.label}</span>
                <span className={styles.rankCount}>{plural(s.count ?? 0, 'mission', 'missions')}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className={styles.muted}>Aucun service demandé</span>
        )}
      </Card>

      <Card icon={Shield} title="Statut KYC">
        <div className={styles.kycStatusRow}>
          <KycStagePill artisan={artisan} size="lg" />
          <div className={styles.kycActions}>
            {!isKycActionable(artisan) ? (
              <span className={styles.muted}>En attente de l'artisan</span>
            ) : isKycDecided(artisan) ? (
              <Button variant="outline" size="sm" onClick={onOpenKYC}>Modifier</Button>
            ) : (
              <Button variant="primary" size="sm" onClick={onOpenKYC}>Traiter</Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Onglet Missions
───────────────────────────────────────────── */
const MissionsTab = ({ artisan, onViewAll }) => {
  const missions = artisan.missions || []
  return (
    <Card
      icon={Briefcase}
      title="Missions récentes"
      flush
      right={
        <button type="button" className={styles.bandLink} onClick={onViewAll}>
          Voir tout <ChevronRight size={13} />
        </button>
      }
    >
      {missions.length === 0 ? (
        <Empty icon={Briefcase}>Aucune mission</Empty>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>ID</th><th>Mission</th><th>Client</th><th>Date</th><th>Montant</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {missions.map((m) => (
                <tr key={m.id_mission} className={styles.tableRow}>
                  <td>
                    <span className={styles.missionId}>#{String(m.id_mission || '').slice(0, 8)}</span>
                  </td>
                  <td className={styles.cellPrimary}>{m.title || '—'}</td>
                  <td className={styles.cellSecondary}>{m.client_name || '—'}</td>
                  <td className={styles.cellSecondary}>{day(m.start_date)}</td>
                  <td className={styles.cellAmount}>{money(m.amount)}</td>
                  <td><StatusPill status={m.status} kind="mission" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

/* ─────────────────────────────────────────────
   Onglet Paiements
───────────────────────────────────────────── */
const PAYMENT_TYPE_LABEL = {
  INITIAL_DEPOSIT: 'Acompte',
  MILESTONE: 'Jalon',
  FINAL_PAYMENT: 'Solde final',
}

const PaymentsTab = ({ artisan, onOpenPayment }) => {
  const payments = artisan.payments || []
  const rev = artisan.revenue || {}
  const count = artisan.payments_count ?? payments.length

  return (
    <div className={styles.stack}>
      <div className={styles.summary3}>
        <div className={`${styles.summaryCard} ${styles.summaryCardDark}`}>
          <span className={styles.summaryLabel}>Total encaissé</span>
          <span className={styles.summaryValue}>{money(rev.total_gross)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>En attente</span>
          <span className={styles.summaryValue}>{money(rev.pending_amount)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Demandes de paiement</span>
          <span className={styles.summaryValue}>{count}</span>
        </div>
      </div>

      <Card
        icon={CreditCard}
        title="Historique des paiements"
        flush
        right={<CountChip>{payments.length}{count > payments.length ? ` / ${count}` : ''}</CountChip>}
      >
        {payments.length === 0 ? (
          <Empty icon={CreditCard}>Aucun paiement</Empty>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Date</th><th>Mission</th><th>Type</th><th>Montant</th><th>Statut</th><th /></tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className={styles.tableRow}>
                    <td className={styles.cellSecondary}>{day(p.created_at)}</td>
                    <td className={styles.cellPrimary}>{p.mission_title || '—'}</td>
                    <td className={styles.cellSecondary}>{PAYMENT_TYPE_LABEL[p.type] || p.type || '—'}</td>
                    <td className={styles.cellAmount}>{money(p.amount)}</td>
                    <td><StatusPill status={p.status} kind="payment" /></td>
                    <td className={styles.cellRight}>
                      <Button
                        variant="ghost" size="sm" icon={Eye}
                        aria-label="Voir le paiement" title="Voir le paiement"
                        onClick={() => onOpenPayment(p.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Onglet KYC
───────────────────────────────────────────── */
const docIcon = (type) => {
  if (String(type).startsWith('IDENTITY')) return FileCheck
  if (type === 'SELFIE_WITH_ID') return Camera
  return FileText
}

const KYCTab = ({ artisan, onVerify }) => {
  const docs = artisan.kyc_documents || []
  const certs = artisan.certifications || []
  const sub = artisan.kyc_submission
  const actionable = isKycActionable(artisan)
  const decided = isKycDecided(artisan)

  return (
    <div className={styles.stack}>
      <Card icon={Shield} title="Décision KYC">
        <div className={styles.kycBanner}>
          <div className={styles.kycBannerLeft}>
            <span className={styles.statMiniLabel}>Statut actuel</span>
            <KycStagePill artisan={artisan} size="lg" />
          </div>
          {actionable ? (
            <Button variant="primary" size="md" icon={Shield} onClick={onVerify}>
              {decided ? 'Modifier la décision' : 'Traiter le dossier'}
            </Button>
          ) : (
            <span className={styles.muted}>
              L'artisan n'a pas encore soumis un dossier complet : rien à traiter pour le moment.
            </span>
          )}
        </div>
      </Card>

      {sub && (
        <Card icon={FileCheck} title="Dernier dossier" right={<CountChip>Tentative {sub.attempt_number}</CountChip>}>
          <InfoRow label="Statut du dossier" value={<StatusPill status={sub.status} kind="kyc" />} />
          <InfoRow label="Pièce d'identité" value={ID_DOC_LABEL[sub.identity_doc_type] || sub.identity_doc_type} />
          <InfoRow label="IFU vérifié" value={sub.ifu_verified ? 'Oui' : 'Non'} />
          <InfoRow label="Soumis le" value={day(sub.submitted_at)} />
          <InfoRow label="Examiné le" value={day(sub.reviewed_at)} />
          {sub.rejection_code && (
            <InfoRow label="Cause du rejet" value={REJECTION_LABEL[sub.rejection_code] || sub.rejection_code} />
          )}
          {sub.rejection_reason && <InfoRow label="Détail du rejet" value={sub.rejection_reason} full />}
          {sub.admin_internal_note && <InfoRow label="Note interne" value={sub.admin_internal_note} full />}
        </Card>
      )}

      <Card icon={FileText} title="Documents fournis" right={<CountChip>{docs.length}</CountChip>}>
        {docs.length === 0 ? (
          <Empty icon={FileText}>Aucun document</Empty>
        ) : (
          <div className={styles.docsGrid}>
            {docs.map((doc) => {
              const Icon = docIcon(doc.doc_type)
              const label = DOC_TYPE_LABEL[doc.doc_type] || doc.doc_type || 'Document'
              return (
                <div key={doc.id} className={styles.docCard}>
                  <div className={styles.docIcon}><Icon size={16} /></div>
                  <div className={styles.docInfo}>
                    <span className={styles.docName} title={doc.file_name || undefined}>
                      {doc.file_name || label}
                    </span>
                    <span className={styles.muted}>
                      {label} · {day(doc.uploaded_at)}
                      {num(doc.attempt_number) > 1 ? ` · Tentative ${doc.attempt_number}` : ''}
                    </span>
                    <span className={styles.docStatus}><StatusPill status={doc.review_status} /></span>
                    {doc.review_note && <span className={styles.docNote}>{doc.review_note}</span>}
                  </div>
                  <div className={styles.docActions}>
                    <Button
                      variant="ghost" size="sm" icon={Eye}
                      aria-label="Ouvrir" title="Ouvrir"
                      disabled={!doc.file_url}
                      onClick={() => openUrl(doc.file_url)}
                    />
                    <Button
                      variant="ghost" size="sm" icon={Download}
                      aria-label="Télécharger" title="Télécharger"
                      disabled={!doc.file_url}
                      onClick={() => downloadUrl(doc.file_url, doc.file_name)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card icon={Award} title="Certifications" right={<CountChip>{certs.length}</CountChip>}>
        {certs.length === 0 ? (
          <Empty icon={Award}>Aucune certification</Empty>
        ) : (
          <div className={styles.docsGrid}>
            {certs.map((c) => (
              <div key={c.id} className={styles.docCard}>
                <div className={styles.docIcon}><Award size={16} /></div>
                <div className={styles.docInfo}>
                  <span className={styles.docName} title={c.title}>{c.title}</span>
                  <span className={styles.muted}>
                    {c.issuing_org} · {day(c.issue_date)}
                    {c.expiry_date ? ` → ${day(c.expiry_date)}` : ''}
                  </span>
                  <span className={styles.docStatus}><StatusPill status={c.verification_status} /></span>
                </div>
                <div className={styles.docActions}>
                  <Button
                    variant="ghost" size="sm" icon={Eye}
                    aria-label="Voir la preuve" title="Voir la preuve"
                    disabled={!c.proof_url}
                    onClick={() => openUrl(c.proof_url)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Onglet Avis
───────────────────────────────────────────── */
const ReviewsTab = ({ artisan }) => {
  const reviews = artisan.reviews || []
  const raw = artisan.rating_breakdown || {}
  const counts = [1, 2, 3, 4, 5].reduce((o, r) => ({ ...o, [r]: num(raw[r]) ?? 0 }), {})
  const sum = Object.values(counts).reduce((a, b) => a + b, 0)
  const total = num(artisan.total_reviews) ?? sum

  return (
    <div className={styles.stack}>
      <Card icon={Star} title="Synthèse des avis">
        <div className={styles.reviewsSummary}>
          <div className={styles.ratingBig}>
            <span className={styles.ratingValueBig}>{dec(artisan.average_rating)}</span>
            <Stars value={artisan.average_rating} size={16} />
            <span className={styles.muted}>{plural(total, 'avis', 'avis')}</span>
          </div>
          <div className={styles.ratingBreakdown}>
            {[5, 4, 3, 2, 1].map((r) => {
              const count = counts[r]
              const width = sum ? (count / sum) * 100 : 0
              return (
                <div key={r} className={styles.ratingBar}>
                  <span className={styles.ratingBarLabel}>{r}★</span>
                  <div className={styles.ratingBarTrack}>
                    <div style={{ width: count > 0 ? `${Math.max(3, width)}%` : 0 }} />
                  </div>
                  <span className={styles.ratingBarCount}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <Card icon={MessageSquare} title="Avis clients" right={<CountChip>{reviews.length}{total > reviews.length ? ` / ${total}` : ''}</CountChip>}>
        {reviews.length === 0 ? (
          <Empty icon={MessageSquare}>Aucun avis</Empty>
        ) : (
          <div className={styles.list}>
            {reviews.map((r) => (
              <article key={r.id_review} className={styles.listItem}>
                <div className={styles.listItemHeader}>
                  <div className={styles.reviewer}>
                    <div className={styles.reviewerAvatar}>
                      {r.reviewer_avatar ? (
                        <img src={r.reviewer_avatar} alt={r.reviewer_name || ''} />
                      ) : (
                        <span>{initial(r.reviewer_name)}</span>
                      )}
                    </div>
                    <div>
                      <span className={styles.reviewerName}>{r.reviewer_name || 'Anonyme'}</span>
                      <span className={styles.muted}>{day(r.created_at)}</span>
                    </div>
                  </div>
                  <Stars value={r.rating} size={12} />
                </div>
                {r.comment && <p className={styles.reviewComment}>{r.comment}</p>}
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Onglet Analytiques
───────────────────────────────────────────── */
const AnalyticsTab = ({ artisan, history }) => {
  const s = artisan.stats || {}
  return (
    <div className={styles.stack}>
      <HpreHistoryCard history={history} rank={s.hpre_rank} />
      <RewardsCard rewards={artisan.rewards || []} accrued={artisan.hpre_accrued_rewards} />

      <div className={styles.analyticsGrid}>
        <Card icon={PieChart} title="Activité">
          <MetricRow label="Missions ce mois" value={s.monthly_missions ?? '—'} />
          <MetricRow label="Volume total encaissé" value={money(artisan.revenue?.total_gross)} />
          <MetricRow label="Dernière mission" value={day(s.last_mission_at)} />
        </Card>

        <Card icon={Users} title="Engagement">
          <MetricRow label="Taux de réponse" value={pct(s.response_rate)} bar={s.response_rate} />
          <MetricRow label="Taux d'acceptation" value={pct(s.acceptance_rate)} bar={s.acceptance_rate} />
          <MetricRow label="Temps de réponse" value={num(s.response_time_avg) == null ? '—' : `${s.response_time_avg} min`} />
          <MetricRow label="Litiges" value={artisan.disputes?.total ?? 0} />
        </Card>

        <Card icon={Star} title="Qualité">
          <MetricRow label="Taux de complétion" value={pct(s.completion_rate)} bar={s.completion_rate} />
          <MetricRow label="Ponctualité" value={pct(s.on_time_rate)} bar={s.on_time_rate} />
          <MetricRow label="Avis" value={artisan.total_reviews ?? '—'} />
        </Card>
      </div>

      {(artisan.presence || artisan.retention) && (
        <div className={styles.pairGrid}>
          <PresenceCard presence={artisan.presence} />
          <RetentionCard retention={artisan.retention} />
        </div>
      )}

      {artisan.time_slots && <TimeSlotsCard slots={artisan.time_slots} />}
    </div>
  )
}

/* key={id} : changer d'artisan réinitialise modales, formulaires et scroll interne */
const ArtisanDetailPage = () => {
  const { id } = useParams()
  return <ArtisanDetail key={id} />
}

export default ArtisanDetailPage