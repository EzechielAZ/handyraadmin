/* Constantes, libellés et helpers partagés de la page Missions */

export const num = (v) => Number(v) || 0

export const TABS = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'analytics', label: 'Analyses' },
  { id: 'missions', label: 'Missions' },
]

/* Les valeurs DOIVENT correspondre aux clés gérées par filterStore.setDateRange */
export const PERIOD_OPTIONS = [
  { value: 'all', label: 'Toute la période' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'yesterday', label: 'Hier' },
  { value: '7days', label: '7 derniers jours' },
  { value: '30days', label: '30 derniers jours' },
  { value: '90days', label: '90 derniers jours' },
  { value: 'thisMonth', label: 'Ce mois' },
  { value: 'lastMonth', label: 'Mois dernier' },
]

export const TYPE_OPTIONS = [
  { value: 'all', label: 'Tous types' },
  { value: 'IMMEDIATE', label: 'Immédiate' },
  { value: 'SCHEDULED', label: 'Planifiée' },
]

/* ───────── Statuts ───────── */
export const STATUS = {
  PENDING:            { color: 'warning',   label: 'En attente' },
  ACCEPTED:           { color: 'info',      label: 'Acceptée' },
  ON_WAY:             { color: 'info',      label: 'En chemin' },
  IN_PROGRESS:        { color: 'primary',   label: 'En cours' },
  PENDING_VALIDATION: { color: 'warning',   label: 'À valider' },
  COMPLETED:          { color: 'success',   label: 'Terminée' },
  CANCELLED:          { color: 'secondary', label: 'Annulée' },
  INCIDENT:           { color: 'danger',    label: 'Incident' },
}
export const STATUS_ORDER = ['PENDING', 'ACCEPTED', 'ON_WAY', 'IN_PROGRESS', 'PENDING_VALIDATION', 'COMPLETED', 'CANCELLED', 'INCIDENT']
export const STATUS_COLOR_VAR = {
  PENDING: 'var(--warning)', ACCEPTED: 'var(--info)', ON_WAY: 'var(--info)', IN_PROGRESS: 'var(--accent)',
  PENDING_VALIDATION: 'var(--warning)', COMPLETED: 'var(--success)', CANCELLED: 'var(--text-3)', INCIDENT: 'var(--danger)',
}
export const statusBadge = (s) => STATUS[s] || { color: 'secondary', label: s || '—' }
export const isTerminal = (s) => s === 'COMPLETED' || s === 'CANCELLED'

/* ───────── Points d'attention (calculés côté base : missions_enriched.attention_reason) ───────── */
export const ATTENTION = {
  INCIDENT: 'Incidents signalés',
  ESCROW_ON_CANCELLED: 'Mission annulée avec fonds toujours retenus',
  VALIDATION_OVERDUE: 'Validation client dépassée',
  REPORT_OPEN: 'Signalement ouvert',
  STUCK: 'Mission bloquée (surveillance automatique)',
  DISPUTE: 'Litige qualité en cours',
  REFUND_PENDING: 'Remboursement en attente',
  PENDING_LONG: 'Sans artisan depuis plus d’1 h',
  IN_PROGRESS_LONG: 'En cours depuis plus de 24 h',
  ESCROW_ON_COMPLETED: 'Terminée mais séquestre non libéré',
}
export const ATTENTION_SHORT = {
  INCIDENT: 'Incidents',
  ESCROW_ON_CANCELLED: 'Annulées, fonds retenus',
  VALIDATION_OVERDUE: 'Validation dépassée',
  REPORT_OPEN: 'Signalements ouverts',
  STUCK: 'Bloquées',
  DISPUTE: 'Litiges qualité',
  REFUND_PENDING: 'Remboursements en attente',
  PENDING_LONG: 'Sans artisan > 1 h',
  IN_PROGRESS_LONG: 'En cours > 24 h',
  ESCROW_ON_COMPLETED: 'Séquestre non libéré',
}
export const ATTENTION_OPTIONS = [
  { value: 'all', label: 'Toutes les missions' },
  { value: 'ANY', label: 'À traiter (toutes causes)' },
  ...Object.entries(ATTENTION_SHORT).map(([value, label]) => ({ value, label })),
]

/* ───────── Libellés ───────── */
export const CANCEL_ACTOR = { CLIENT: 'Client', ARTISAN: 'Artisan', SYSTEM: 'Système / admin', INCONNU: 'Inconnu' }
export const CANCEL_ACTOR_COLOR = { CLIENT: 'var(--info)', ARTISAN: 'var(--warning)', SYSTEM: 'var(--text-3)', INCONNU: 'var(--border-strong)' }
export const CANCEL_STAGE = {
  BEFORE_ACCEPT: 'Avant toute acceptation',
  AFTER_ACCEPT: 'Après acceptation',
  AFTER_START: 'Après le début de l’intervention',
}
export const TYPE_LABEL = { IMMEDIATE: 'Immédiate', SCHEDULED: 'Planifiée' }
export const PRICING_LABEL = { FIXED_PREPAID: 'Prix fixe prépayé', DIAGNOSIS_FIRST: 'Diagnostic d’abord', INCONNU: 'Non précisé' }
export const ORIGIN_LABEL = { STANDARD: 'Application', NEW_VIA_QR: 'QR · nouveau client', EXISTING_VIA_QR: 'QR · client existant', INCONNU: 'Non précisé' }
export const MODE_LABEL = { STANDARD: 'Standard', EXPRESS: 'Express (QR)', INCONNU: 'Non précisé' }
export const RESPONSE_LABEL = {
  PENDING: 'En attente', ACCEPTED: 'Acceptée', REJECTED: 'Refusée', EXPIRED: 'Délai dépassé',
  NO_SHOW: 'Absent', TOO_FAR: 'Hors zone',
}
export const RESPONSE_COLOR = { ACCEPTED: 'success', REJECTED: 'danger', TOO_FAR: 'danger', EXPIRED: 'warning', NO_SHOW: 'warning', PENDING: 'secondary' }
export const ESCROW = {
  HELD: { color: 'warning', label: 'Séquestre retenu' },
  RELEASED: { color: 'success', label: 'Séquestre libéré' },
  REFUNDED: { color: 'secondary', label: 'Remboursé' },
}
export const METHOD_LABEL = { WALLET: 'Portefeuille', MOMO: 'Mobile Money', FLOOZ: 'Flooz', CARD: 'Carte', CASH: 'Espèces' }
export const REQUEST_TYPE = { INITIAL_DEPOSIT: 'Acompte', MILESTONE: 'Jalon', FINAL_PAYMENT: 'Solde' }
export const PAY_STATUS = {
  SUCCESS: { color: 'success', label: 'Réussi' }, PENDING: { color: 'warning', label: 'En attente' },
  FAILED: { color: 'danger', label: 'Échoué' }, REFUNDED: { color: 'secondary', label: 'Remboursé' },
  PAID: { color: 'success', label: 'Payée' }, APPROVED: { color: 'info', label: 'Approuvée' }, REJECTED: { color: 'danger', label: 'Refusée' },
}
export const REPORT_REASON = { FRAUD: 'Fraude', LATE: 'Retard', UNPROFESSIONAL: 'Comportement', SECURITY: 'Sécurité', OTHER: 'Autre' }
export const REPORT_STATUS = { OPEN: 'Ouvert', UNDER_INVESTIGATION: 'En instruction', RESOLVED: 'Résolu', DISMISSED: 'Classé' }
export const PHOTO_TYPE = { START: 'Avant', END: 'Après', MILESTONE: 'Jalon', INCIDENT: 'Incident', MATERIAL: 'Matériel', GENERAL: 'Général' }
export const CALL_STATUS = { PENDING: 'Sonnerie', MISSED: 'Manqué', COMPLETED: 'Terminé', REJECTED: 'Refusé', BUSY: 'Occupé', ACCEPTED: 'Accepté' }
export const AUDIT_ACTION = {
  MISSION_CANCELLED: 'Annulation par l’administration',
  MISSION_COMPLETED_MANUAL: 'Clôture manuelle',
  MISSION_NOTE: 'Note interne',
}
export const TIMELINE_TONE = {
  neutral: 'var(--border-strong)', success: 'var(--success)', danger: 'var(--danger)',
  warning: 'var(--warning)', info: 'var(--info)',
}

/* Sections « instantané » : indépendantes de la période → pas de refetch quand elle change */
export const INSTANT_SECTIONS = new Set(['alerts', 'attention', 'pipeline', 'reasons'])

/* ───────── Helpers ───────── */
export const shortId = (id) => (id ? String(id).slice(0, 8) : '—')

export const missionLabel = (m) => m?.title || m?.description || 'Mission sans titre'

export const fmtMinutes = (m) => {
  if (m == null || Number.isNaN(Number(m))) return '—'
  const v = Math.round(Number(m))
  if (v < 1) return '< 1 min'
  if (v < 60) return `${v} min`
  const h = Math.floor(v / 60)
  const r = v % 60
  if (h < 24) return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`
  const d = Math.floor(h / 24)
  return `${d} j ${h % 24} h`
}

export const fmtSeconds = (s) => {
  if (s == null) return '—'
  const v = Math.round(Number(s))
  if (v < 60) return `${v} s`
  return fmtMinutes(v / 60)
}

export const compactMoney = (n) => {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1).replace('.0', '')} M`
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)} k`
  return String(v)
}

export const relativeTime = (ts) => {
  if (!ts) return ''
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 45) return "à l'instant"
  const m = Math.round(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.round(m / 60)
  return `il y a ${h} h`
}

export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)