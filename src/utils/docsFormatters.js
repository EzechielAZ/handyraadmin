/**
 * Formatters spécifiques au module docs.
 * Fichier isolé pour ne pas toucher aux formatters existants.
 */

/**
 * Parse une date BDD.
 * - `timestamptz`  → déjà TZ, JS gère.
 * - `timestamp without time zone` (ex: colonnes `public.*`) → on force UTC.
 * - `date` (YYYY-MM-DD) → on garde tel quel (locale midnight).
 * - null / '' / invalid → null.
 */
export const parseDbDate = (v) => {
  if (!v) return null
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  const s = String(v).replace(' ', 'T')
  const hasTz = /T.*([zZ]|[+-]\d{2}(:?\d{2})?)$/.test(s)
  const d = new Date(hasTz ? s : `${s}Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Date + heure locale FR : "15 janv. 2026 à 14:32" */
export const formatDateTime = (v) => {
  const d = parseDbDate(v)
  if (!d) return '—'
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Date seule FR : "15 janv. 2026" */
export const formatDateShort = (v) => {
  const d = parseDbDate(v)
  if (!d) return '—'
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/** Date + heure compactes : "15/01 14:32" */
export const formatDateCompact = (v) => {
  const d = parseDbDate(v)
  if (!d) return '—'
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Relatif : "il y a 2 min" · "dans 3 h" */
export const formatRelative = (v) => {
  const d = parseDbDate(v)
  if (!d) return '—'
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })
  const abs = Math.abs(diffSec)
  if (abs < 60)       return rtf.format(diffSec, 'second')
  if (abs < 3600)     return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86_400)   return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 2_592_000) return rtf.format(Math.round(diffSec / 86_400), 'day')
  if (abs < 31_536_000) return rtf.format(Math.round(diffSec / 2_592_000), 'month')
  return rtf.format(Math.round(diffSec / 31_536_000), 'year')
}

/** Date cible dans N jours : "dans 5 j" | "en retard de 2 j" */
export const formatTargetDate = (v) => {
  const d = parseDbDate(v)
  if (!d) return '—'
  const diffDays = Math.round((d.getTime() - Date.now()) / 86_400_000)
  if (diffDays === 0) return 'aujourd\'hui'
  if (diffDays === 1) return 'demain'
  if (diffDays === -1) return 'hier'
  if (diffDays > 0)   return `dans ${diffDays} j`
  return `en retard de ${-diffDays} j`
}

/** Nombre formaté FR + séparateur milliers */
export const formatNumber = (n) => {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('fr-FR').format(n)
}

/** Pourcentage : 0.42 → "42%" · null → "—" */
export const formatPercent = (n, { withSign = false } = {}) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  const v = Number(n)
  const sign = withSign && v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1).replace(/\.0$/, '')}%`
}

/** "1.5.0-beta.1" → "1.5.0" */
export const formatSemver = (v) => (v ? String(v).split('-')[0] : '—')

/** "3f2a9b1c-..." → "#3f2a9b1c" */
export const truncateUuid = (v, len = 8) =>
  v ? `#${String(v).slice(0, len)}` : '—'

/** Taille lisible : 1536 → "1,5 Ko" */
export const humanizeBytes = (kb) => {
  if (kb === null || kb === undefined) return '—'
  const n = Number(kb)
  if (n < 1024) return `${formatNumber(n)} Ko`
  return `${(n / 1024).toFixed(1).replace('.', ',')} Mo`
}

/** Tronque proprement avec ellipse */
export const truncate = (v, max = 120) => {
  if (!v) return ''
  const s = String(v)
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

/** Initiales : "Awa Dossou" → "AD" */
export const getInitials = (name) => {
  if (!name) return '—'
  return String(name)
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}