/* Constantes, libellés et helpers partagés de la page Paiements */

export const num = (v) => Number(v) || 0

export const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'SUCCESS', label: 'Réussi' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'FAILED', label: 'Échoué' },
  { value: 'REFUNDED', label: 'Remboursé' },
  { value: 'BLOCKED', label: 'Bloqué' },
]

export const METHOD_OPTIONS = [
  { value: 'all', label: 'Toutes méthodes' },
  { value: 'WALLET', label: 'Portefeuille' },
  { value: 'MOMO', label: 'Mobile Money' },
  { value: 'FLOOZ', label: 'Flooz' },
  { value: 'CARD', label: 'Carte' },
  { value: 'CASH', label: 'Espèces' },
]

export const FLOW_OPTIONS = [
  { value: 'all', label: 'Tous les flux' },
  { value: 'MISSION_PAYMENT', label: 'Paiements de missions' },
  { value: 'SUBSCRIPTION', label: 'Abonnements' },
  { value: 'WALLET_DEPOSIT', label: 'Recharges' },
  { value: 'PAYOUT', label: 'Décaissements' },
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

export const TABS = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'analytics', label: 'Analyses' },
  { id: 'transactions', label: 'Transactions' },
]

export const FLOW_LABEL = {
  MISSION_PAYMENT: 'Mission',
  SUBSCRIPTION: 'Abonnement',
  WALLET_DEPOSIT: 'Recharge',
  PAYOUT: 'Décaissement',
}
export const FLOW_COLOR = {
  MISSION_PAYMENT: 'var(--accent)',
  SUBSCRIPTION: 'var(--info)',
  WALLET_DEPOSIT: 'var(--success)',
  PAYOUT: 'var(--warning)',
}
export const METHOD_LABEL = { WALLET: 'Portefeuille', MOMO: 'Mobile Money', FLOOZ: 'Flooz', CARD: 'Carte', CASH: 'Espèces' }
export const SUBTYPE_LABEL = {
  INITIAL_DEPOSIT: 'Acompte', MILESTONE: 'Jalon', FINAL_PAYMENT: 'Solde',
  MONTHLY: 'Mensuel', QUARTERLY: 'Trimestriel', YEARLY: 'Annuel',
  MISSION_ARTISAN: 'Versement artisan', HPRE_REWARD: 'Prime HPRE',
  CLIENT_REFUND: 'Remboursement client', MANUAL_WITHDRAWAL: 'Retrait manuel', AUTRE: 'Autre',
}
export const ESCROW = {
  RELEASED: { color: 'success', label: 'Libéré' },
  HELD: { color: 'warning', label: 'Retenu' },
  REFUNDED: { color: 'secondary', label: 'Remboursé' },
}
export const STATUS_BADGE = {
  SUCCESS: { color: 'success', label: 'Réussi' },
  PENDING: { color: 'warning', label: 'En attente' },
  FAILED: { color: 'danger', label: 'Échoué' },
  REFUNDED: { color: 'secondary', label: 'Remboursé' },
  BLOCKED: { color: 'danger', label: 'Bloqué' },
  CANCELLED: { color: 'secondary', label: 'Annulé' },
}
export const BLOCK_REASON = {
  DAILY_LIMIT_REACHED: 'Plafond journalier atteint',
  AMOUNT_EXCEEDED: 'Montant dépassé',
  WALLET_BLOCKED: 'Portefeuille bloqué',
  ECHEC_PASSERELLE: 'Échec passerelle',
  RETRAIT_REMBOURSE: 'Retrait échoué, remboursé',
}
export const ALERTS = {
  PAYOUT_FAILED_RETRIES: 'Décaissements en échec après 3 tentatives',
  PAYOUT_REFUNDED_7D: 'Retraits échoués et remboursés (7 derniers jours)',
  PAYOUT_BLOCKED: 'Décaissements bloqués',
  PAYOUT_STUCK_24H: 'Décaissements en attente depuis plus de 24 h',
  ESCROW_OLDER_14D: 'Fonds en séquestre depuis plus de 14 jours',
  PAYMENT_PENDING_24H: 'Encaissements en attente depuis plus de 24 h',
  INVOICES_OVERDUE: 'Factures en retard de paiement',
  SUBSCRIPTION_PENDING_24H: 'Abonnements en attente de paiement > 24 h',
}

export const ALERTS_SHORT = {
  PAYOUT_FAILED_RETRIES: 'Échecs après 3 essais',
  PAYOUT_REFUNDED_7D: 'Retraits remboursés (7 j)',
  PAYOUT_BLOCKED: 'Décaissements bloqués',
  PAYOUT_STUCK_24H: 'Décaissements > 24 h',
  ESCROW_OLDER_14D: 'Séquestre > 14 j',
  PAYMENT_PENDING_24H: 'Encaissements > 24 h',
  INVOICES_OVERDUE: 'Factures en retard',
  SUBSCRIPTION_PENDING_24H: 'Abonnements impayés > 24 h',
}

export const methodLabel = (m) => METHOD_LABEL[m] || m || '—'
export const subLabel = (s) => SUBTYPE_LABEL[s] || s || null
export const statusBadge = (s) => STATUS_BADGE[s] || { color: 'secondary', label: s || '—' }

/* Sections « instantané » : indépendantes de la période → pas de refetch quand elle change */
export const INSTANT_SECTIONS = new Set(['alerts', 'escrow', 'payout_pipeline', 'wallets', 'subscriptions'])

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