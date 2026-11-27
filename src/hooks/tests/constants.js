/**
 * Constantes visuelles du module Tests de validation.
 * Même format que hooks/docs/constants.js : { label, color, icon }
 *  - color ∈ 'gray'|'blue'|'green'|'yellow'|'orange'|'red'|'purple'|'navy'
 *  - icon  : nom présent dans components/docs/Icon.jsx (sinon Circle)
 */
export { getConfig, toSelectOptions } from '../docs/constants'

// ── Scénarios ──
export const SCENARIO_STATUS = {
  DRAFT:    { label: 'Brouillon', color: 'gray',  icon: 'PenLine' },
  READY:    { label: 'Prêt',      color: 'green', icon: 'CheckCircle2' },
  ARCHIVED: { label: 'Archivé',   color: 'gray',  icon: 'Archive' },
}

export const SCENARIO_PROFILE = {
  ANY:     { label: 'Tous profils', color: 'gray',   icon: 'Users' },
  CLIENT:  { label: 'Client',       color: 'blue',   icon: 'UserCheck' },
  ARTISAN: { label: 'Artisan',      color: 'orange', icon: 'Wrench' },
  ADMIN:   { label: 'Admin (interne)', color: 'purple', icon: 'Shield' },
}

export const SCENARIO_PRIORITY = {
  P0: { label: 'P0 — Critique', color: 'red',    icon: 'Flame' },
  P1: { label: 'P1 — Haute',    color: 'orange', icon: 'ArrowUp' },
  P2: { label: 'P2 — Moyenne',  color: 'blue',   icon: 'Minus' },
  P3: { label: 'P3 — Basse',    color: 'gray',   icon: 'ArrowDown' },
}

export const SCENARIO_TYPE = {
  FUNCTIONAL:  { label: 'Fonctionnel',  color: 'blue',   icon: 'CheckSquare' },
  SMOKE:       { label: 'Smoke',        color: 'green',  icon: 'Zap' },
  REGRESSION:  { label: 'Régression',   color: 'orange', icon: 'RotateCcw' },
  EXPLORATORY: { label: 'Exploratoire', color: 'purple', icon: 'Search' },
  USABILITY:   { label: 'Ergonomie',    color: 'blue',   icon: 'Eye' },
  PERFORMANCE: { label: 'Performance',  color: 'yellow', icon: 'Gauge' },
  SECURITY:    { label: 'Sécurité',     color: 'red',    icon: 'ShieldAlert' },
}

// ── Campagnes ──
export const CAMPAIGN_STATUS = {
  DRAFT:     { label: 'Brouillon', color: 'gray',   icon: 'PenLine' },
  ACTIVE:    { label: 'En cours',  color: 'green',  icon: 'Play' },
  PAUSED:    { label: 'En pause',  color: 'yellow', icon: 'Clock' },
  COMPLETED: { label: 'Terminée',  color: 'navy',   icon: 'CheckCheck' },
  CANCELLED: { label: 'Annulée',   color: 'gray',   icon: 'XCircle' },
}

/** Miroir de admin.docs_test_campaign_transition */
export const CAMPAIGN_TRANSITIONS = {
  DRAFT:     ['ACTIVE', 'CANCELLED'],
  ACTIVE:    ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED:    ['ACTIVE', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['ACTIVE'],
  CANCELLED: ['DRAFT'],
}
export const canTransitionCampaign = (from, to) =>
  (CAMPAIGN_TRANSITIONS[from] || []).includes(to)

/** Libellé d'action (bouton) pour chaque statut cible */
export const CAMPAIGN_ACTION_LABEL = {
  ACTIVE:    'Lancer',
  PAUSED:    'Mettre en pause',
  COMPLETED: 'Clôturer',
  CANCELLED: 'Annuler',
  DRAFT:     'Remettre en brouillon',
}

export const isCampaignClosed = (status) => status === 'COMPLETED' || status === 'CANCELLED'

export const PLATFORM = {
  ANDROID: { label: 'Android', color: 'green', icon: 'Phone' },
  IOS:     { label: 'iOS',     color: 'blue',  icon: 'Phone' },
}

// ── Testeurs ──
export const TESTER_STATUS = {
  INVITED:  { label: 'Invité',  color: 'yellow', icon: 'Clock' },
  ACTIVE:   { label: 'Actif',   color: 'green',  icon: 'UserCheck' },
  DECLINED: { label: 'Refusé',  color: 'gray',   icon: 'XCircle' },
  REMOVED:  { label: 'Retiré',  color: 'gray',   icon: 'Archive' },
}

export const TESTER_PROFILE = {
  CLIENT:  { label: 'Client',          color: 'blue',   icon: 'UserCheck' },
  ARTISAN: { label: 'Artisan',         color: 'orange', icon: 'Wrench' },
  BOTH:    { label: 'Client + Artisan', color: 'purple', icon: 'Users' },
}

// ── Exécutions ──
export const RUN_STATUS = {
  ASSIGNED:    { label: 'À faire',    color: 'gray',   icon: 'Circle' },
  IN_PROGRESS: { label: 'En cours',   color: 'blue',   icon: 'Play' },
  PASSED:      { label: 'Réussi',     color: 'green',  icon: 'Check' },
  FAILED:      { label: 'Échec',      color: 'red',    icon: 'XCircle' },
  BLOCKED:     { label: 'Bloqué',     color: 'orange', icon: 'AlertTriangle' },
  SKIPPED:     { label: 'Ignoré',     color: 'gray',   icon: 'ArrowRight' },
}

export const RUN_STEP_STATUS = {
  PENDING: { label: 'En attente', color: 'gray',   icon: 'Circle' },
  PASSED:  { label: 'Conforme',   color: 'green',  icon: 'Check' },
  FAILED:  { label: 'Non conforme', color: 'red',  icon: 'XCircle' },
  BLOCKED: { label: 'Bloqué',     color: 'orange', icon: 'AlertTriangle' },
  SKIPPED: { label: 'Ignoré',     color: 'gray',   icon: 'ArrowRight' },
}

/** Statuts qui comptent comme « exécuté » pour la couverture */
export const RUN_EXECUTED = ['PASSED', 'FAILED', 'BLOCKED']
export const RUN_DONE = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED']

// ── Retours ──
export const FINDING_TYPE = {
  BUG:        { label: 'Bug',        color: 'red',    icon: 'Bug' },
  UX:         { label: 'Ergonomie',  color: 'purple', icon: 'Eye' },
  SUGGESTION: { label: 'Suggestion', color: 'blue',   icon: 'Sparkles' },
  QUESTION:   { label: 'Question',   color: 'gray',   icon: 'MessageCircle' },
}

export const FINDING_SEVERITY = {
  BLOCKER:  { label: 'Bloquant',  color: 'red',    icon: 'AlertOctagon' },
  CRITICAL: { label: 'Critique',  color: 'red',    icon: 'Flame' },
  MAJOR:    { label: 'Majeur',    color: 'orange', icon: 'AlertTriangle' },
  MINOR:    { label: 'Mineur',    color: 'yellow', icon: 'Info' },
  TRIVIAL:  { label: 'Trivial',   color: 'gray',   icon: 'Minus' },
}

export const FINDING_STATUS = {
  NEW:       { label: 'À trier',          color: 'blue',   icon: 'CircleDot' },
  NEED_INFO: { label: 'Infos demandées',  color: 'yellow', icon: 'MessageCircle' },
  CONFIRMED: { label: 'Confirmé',         color: 'green',  icon: 'CheckCircle2' },
  REJECTED:  { label: 'Rejeté',           color: 'gray',   icon: 'XCircle' },
}

/** Décisions de triage → libellé + statut résultant */
export const TRIAGE_DECISION = {
  CONFIRM:   { label: 'Confirmer',            color: 'green',  icon: 'CheckCircle2' },
  NEED_INFO: { label: 'Demander des précisions', color: 'yellow', icon: 'MessageCircle' },
  REJECT:    { label: 'Rejeter',              color: 'gray',   icon: 'XCircle' },
  REOPEN:    { label: 'Remettre à trier',     color: 'blue',   icon: 'RotateCcw' },
}

// ── Go / No-go ──
export const VERDICT = {
  GO:    { label: 'GO',    color: 'green', icon: 'CheckCircle2' },
  NO_GO: { label: 'NO-GO', color: 'red',   icon: 'XCircle' },
}

/** Critères de sortie par défaut (miroir de admin._tests_default_criteria) */
export const DEFAULT_EXIT_CRITERIA = {
  minCoverage: 100,
  minPassRate: 95,
  requireP0Passed: true,
  maxOpenBlocker: 0,
  maxOpenCritical: 0,
}

/** Lien d'invitation testeur (portail à venir : /join/:token) */
export const buildInviteLink = (token) =>
  `${window.location.origin.replace(/\/$/, '')}/join/${token}`
