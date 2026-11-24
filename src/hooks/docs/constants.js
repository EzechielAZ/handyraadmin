/**
 * Constantes visuelles du module docs.
 * Chaque entrée : { label, color, icon }
 *  - label  : texte FR
 *  - color  : token CSS ('gray'|'blue'|'green'|'yellow'|'orange'|'red'|'purple'|'navy')
 *  - icon   : nom lucide (résolu par le composant StatusBadge)
 */

// ── Helpers ──
export const getConfig = (map, key, fallback = null) => {
  if (!map) return fallback || { label: key || '—', color: 'gray', icon: null }
  if (key && map[key]) return map[key]
  return fallback || { label: key || '—', color: 'gray', icon: null }
}

export const toSelectOptions = (map, { withAll = false, allLabel = 'Tous' } = {}) => {
  const opts = Object.entries(map).map(([value, cfg]) => ({ value, label: cfg.label }))
  return withAll ? [{ value: 'all', label: allLabel }, ...opts] : opts
}

// ── Features ──
export const FEATURE_STATUS = {
  PLANNED:    { label: 'Planifiée',      color: 'gray',   icon: 'Circle' },
  IN_DESIGN:  { label: 'Design',         color: 'purple', icon: 'PenTool' },
  IN_DEV:     { label: 'Développement',  color: 'blue',   icon: 'Code2' },
  IN_REVIEW:  { label: 'Revue',          color: 'orange', icon: 'Eye' },
  IN_TEST:    { label: 'Tests',          color: 'yellow', icon: 'FlaskConical' },
  LIVE:       { label: 'En production',  color: 'green',  icon: 'Zap' },
  DEPRECATED: { label: 'Obsolète',       color: 'gray',   icon: 'Archive' },
  ARCHIVED:   { label: 'Archivée',       color: 'gray',   icon: 'Archive' },
}

export const FEATURE_PRIORITY = {
  P0:          { label: 'P0 — Critique',   color: 'red',    icon: 'Flame' },
  P1:          { label: 'P1 — Haute',      color: 'orange', icon: 'ArrowUp' },
  P2:          { label: 'P2 — Moyenne',    color: 'blue',   icon: 'Minus' },
  P3:          { label: 'P3 — Basse',      color: 'gray',   icon: 'ArrowDown' },
  NICE_TO_HAVE:{ label: 'Nice to have',    color: 'gray',   icon: 'Sparkles' },
}

export const FEATURE_COMPLEXITY = {
  XS: { label: 'XS', color: 'green' },
  S:  { label: 'S',  color: 'green' },
  M:  { label: 'M',  color: 'blue' },
  L:  { label: 'L',  color: 'orange' },
  XL: { label: 'XL', color: 'red' },
}

// ── Issues ──
export const ISSUE_TYPE = {
  BUG:         { label: 'Bug',          color: 'red',    icon: 'Bug' },
  IMPROVEMENT: { label: 'Amélioration', color: 'blue',   icon: 'Sparkles' },
  TASK:        { label: 'Tâche',        color: 'gray',   icon: 'CheckSquare' },
  INCIDENT:    { label: 'Incident',     color: 'red',    icon: 'AlertOctagon' },
  SECURITY:    { label: 'Sécurité',     color: 'purple', icon: 'ShieldAlert' },
  PERFORMANCE: { label: 'Performance',  color: 'orange', icon: 'Gauge' },
  QUESTION:    { label: 'Question',     color: 'blue',   icon: 'MessageCircle' },
  DOC:         { label: 'Documentation',color: 'gray',   icon: 'FileText' },
}

export const ISSUE_STATUS = {
  OPEN:        { label: 'Ouverte',            color: 'blue',   icon: 'CircleDot' },
  TRIAGED:     { label: 'Triagée',            color: 'blue',   icon: 'Filter' },
  IN_PROGRESS: { label: 'En cours',           color: 'orange', icon: 'Play' },
  IN_REVIEW:   { label: 'En revue',           color: 'yellow', icon: 'Eye' },
  FIXED:       { label: 'Corrigée',           color: 'green',  icon: 'Check' },
  VERIFIED:    { label: 'Vérifiée',           color: 'green',  icon: 'CheckCheck' },
  CLOSED:      { label: 'Fermée',             color: 'gray',   icon: 'Archive' },
  WONT_FIX:    { label: 'Ne sera pas corrigée', color: 'gray', icon: 'XCircle' },
  DUPLICATE:   { label: 'Doublon',            color: 'gray',   icon: 'Copy' },
  REOPENED:    { label: 'Réouverte',          color: 'red',    icon: 'RotateCcw' },
  DEFERRED:    { label: 'Reportée',           color: 'gray',   icon: 'Clock' },
}

export const ISSUE_SEVERITY = {
  BLOCKER:  { label: 'Bloquant', color: 'red',    icon: 'AlertOctagon' },
  CRITICAL: { label: 'Critique', color: 'red',    icon: 'AlertTriangle' },
  MAJOR:    { label: 'Majeur',   color: 'orange', icon: 'AlertCircle' },
  MINOR:    { label: 'Mineur',   color: 'yellow', icon: 'Info' },
  TRIVIAL:  { label: 'Trivial',  color: 'gray',   icon: 'Circle' },
}

export const ISSUE_PRIORITY = {
  P0: { label: 'P0 — Critique',   color: 'red',    icon: 'Flame' },
  P1: { label: 'P1 — Haute',      color: 'orange', icon: 'ArrowUp' },
  P2: { label: 'P2 — Moyenne',    color: 'blue',   icon: 'Minus' },
  P3: { label: 'P3 — Basse',      color: 'gray',   icon: 'ArrowDown' },
  P4: { label: 'P4 — Très basse', color: 'gray',   icon: 'ArrowDown' },
}

// ── Releases ──
export const RELEASE_TYPE = {
  MAJOR:  { label: 'Majeure',   color: 'red',    icon: 'ArrowUpCircle' },
  MINOR:  { label: 'Mineure',   color: 'blue',   icon: 'Circle' },
  PATCH:  { label: 'Corrective',color: 'gray',   icon: 'Wrench' },
  HOTFIX: { label: 'Hotfix',    color: 'orange', icon: 'Zap' },
}

export const RELEASE_STATUS = {
  PLANNING:       { label: 'Planification', color: 'gray',   icon: 'Calendar' },
  IN_DEVELOPMENT: { label: 'Développement', color: 'blue',   icon: 'Code2' },
  IN_REVIEW:      { label: 'Revue',         color: 'orange', icon: 'Eye' },
  IN_TEST:        { label: 'Tests',         color: 'yellow', icon: 'FlaskConical' },
  READY:          { label: 'Prête',         color: 'green',  icon: 'CheckCircle2' },
  RELEASED:       { label: 'Publiée',       color: 'green',  icon: 'Rocket' },
  ROLLED_BACK:    { label: 'Rollback',      color: 'red',    icon: 'RotateCcw' },
  CANCELLED:      { label: 'Annulée',       color: 'gray',   icon: 'XCircle' },
}

export const RELEASE_INCLUSION_TYPE = {
  NEW:         { label: 'Nouvelle',        color: 'green',  icon: 'Plus' },
  UPDATED:     { label: 'Mise à jour',     color: 'blue',   icon: 'RefreshCw' },
  FIXED:       { label: 'Corrigée',        color: 'green',  icon: 'Check' },
  REMOVED:     { label: 'Retirée',         color: 'red',    icon: 'Trash2' },
  DEPRECATED:  { label: 'Dépréciée',       color: 'gray',   icon: 'Archive' },
  PERFORMANCE: { label: 'Performance',     color: 'orange', icon: 'Gauge' },
  SECURITY:    { label: 'Sécurité',        color: 'purple', icon: 'ShieldAlert' },
  REFACTOR:    { label: 'Refonte',         color: 'blue',   icon: 'Layers' },
}

export const RELEASE_FEATURE_STATUS = {
  PLANNED:     { label: 'Planifié',   color: 'gray',   icon: 'Circle' },
  IN_PROGRESS: { label: 'En cours',   color: 'orange', icon: 'Play' },
  IN_REVIEW:   { label: 'En revue',   color: 'yellow', icon: 'Eye' },
  IN_TEST:     { label: 'En test',    color: 'yellow', icon: 'FlaskConical' },
  DONE:        { label: 'Terminé',    color: 'green',  icon: 'Check' },
  DEFERRED:    { label: 'Reporté',    color: 'gray',   icon: 'Clock' },
  REMOVED:     { label: 'Retiré',     color: 'gray',   icon: 'X' },
  CANCELLED:   { label: 'Annulé',     color: 'gray',   icon: 'XCircle' },
  BLOCKED:     { label: 'Bloqué',     color: 'red',    icon: 'AlertOctagon' },
}

export const SIGNOFF_ROLE = {
  PM:        { label: 'Product Manager', color: 'blue' },
  PO:        { label: 'Product Owner',   color: 'blue' },
  QA:        { label: 'QA',              color: 'purple' },
  TECH_LEAD: { label: 'Tech Lead',       color: 'navy' },
  SECURITY:  { label: 'Sécurité',        color: 'purple' },
  LEGAL:     { label: 'Juridique',       color: 'gray' },
  DESIGN:    { label: 'Design',          color: 'orange' },
  SUPPORT:   { label: 'Support',         color: 'blue' },
  FINANCE:   { label: 'Finance',         color: 'green' },
  CEO:       { label: 'CEO',             color: 'red' },
}

export const SIGNOFF_STATUS = {
  PENDING:  { label: 'En attente', color: 'yellow', icon: 'Clock' },
  APPROVED: { label: 'Approuvé',   color: 'green',  icon: 'Check' },
  REJECTED: { label: 'Rejeté',     color: 'red',    icon: 'X' },
  WAIVED:   { label: 'Dispensé',   color: 'gray',   icon: 'Minus' },
}

export const CHECKLIST_CATEGORY = {
  DEFINITION_OF_DONE: { label: 'Definition of Done', color: 'blue'   },
  QA:                 { label: 'QA',                 color: 'purple' },
  SECURITY:           { label: 'Sécurité',           color: 'purple' },
  PERFORMANCE:        { label: 'Performance',        color: 'orange' },
  LEGAL:              { label: 'Légal',              color: 'gray'   },
  ACCESSIBILITY:      { label: 'Accessibilité',      color: 'blue'   },
  STORE_REVIEW:       { label: 'Store Review',       color: 'orange' },
  LAUNCH_READINESS:   { label: 'Prêt au lancement',  color: 'green'  },
  POST_RELEASE:       { label: 'Post-release',       color: 'gray'   },
}

// ── Pages (documentation) ──
export const PAGE_CATEGORY = {
  PRODUCT_BRIEF:     { label: 'Brief produit',           color: 'blue'   },
  PRD:               { label: 'PRD',                     color: 'blue'   },
  TECH_SPEC:         { label: 'Spécification technique', color: 'purple' },
  DESIGN_SPEC:       { label: 'Spécification design',    color: 'orange' },
  USER_GUIDE:        { label: 'Guide utilisateur',       color: 'green'  },
  TUTORIAL:          { label: 'Tutoriel',                color: 'green'  },
  FAQ:               { label: 'FAQ',                     color: 'gray'   },
  TROUBLESHOOTING:   { label: 'Dépannage',               color: 'orange' },
  API_DOC:           { label: 'Documentation API',       color: 'purple' },
  PROCESS:           { label: 'Processus',               color: 'gray'   },
  ONBOARDING:        { label: 'Onboarding',              color: 'blue'   },
  LEGAL:             { label: 'Légal',                   color: 'gray'   },
  RELEASE_NOTES:     { label: 'Notes de release',        color: 'green'  },
  CHANGELOG_SUMMARY: { label: 'Résumé changelog',        color: 'gray'   },
  GLOSSARY:          { label: 'Glossaire',               color: 'gray'   },
  OTHER:             { label: 'Autre',                   color: 'gray'   },
}

export const PAGE_STATUS = {
  DRAFT:     { label: 'Brouillon', color: 'gray',   icon: 'PenLine' },
  IN_REVIEW: { label: 'En revue',  color: 'yellow', icon: 'Eye' },
  PUBLISHED: { label: 'Publiée',   color: 'green',  icon: 'CheckCircle2' },
  ARCHIVED:  { label: 'Archivée',  color: 'gray',   icon: 'Archive' },
  OUTDATED:  { label: 'Obsolète',  color: 'orange', icon: 'AlertCircle' },
}

export const PAGE_VISIBILITY = {
  PUBLIC:     { label: 'Public',    color: 'green',  icon: 'Globe' },
  INTERNAL:   { label: 'Interne',   color: 'blue',   icon: 'Lock' },
  RESTRICTED: { label: 'Restreint', color: 'orange', icon: 'Shield' },
}

// ── ADRs ──
export const ADR_STATUS = {
  PROPOSED:   { label: 'Proposé',   color: 'blue',   icon: 'MessageSquare' },
  ACCEPTED:   { label: 'Accepté',   color: 'green',  icon: 'Check' },
  REJECTED:   { label: 'Rejeté',    color: 'red',    icon: 'X' },
  DEPRECATED: { label: 'Déprécié',  color: 'gray',   icon: 'Archive' },
  SUPERSEDED: { label: 'Remplacé',  color: 'gray',   icon: 'ArrowRight' },
}

// ── Runbooks ──
export const RUNBOOK_CATEGORY = {
  INCIDENT_RESPONSE: { label: 'Réponse incident',  color: 'red',    icon: 'AlertTriangle' },
  DEPLOYMENT:        { label: 'Déploiement',       color: 'blue',   icon: 'Rocket' },
  BACKUP_RESTORE:    { label: 'Backup & Restore',  color: 'purple', icon: 'Database' },
  DATA_MIGRATION:    { label: 'Migration données', color: 'orange', icon: 'ArrowRightLeft' },
  SECURITY:          { label: 'Sécurité',          color: 'purple', icon: 'Shield' },
  MONITORING:        { label: 'Monitoring',        color: 'blue',   icon: 'Activity' },
  ONCALL:            { label: 'Astreinte',         color: 'navy',   icon: 'Phone' },
  OTHER:             { label: 'Autre',             color: 'gray',   icon: 'FileText' },
}

// ── Activité ──
export const ACTIVITY_ENTITY = {
  FEATURE:              { label: 'Feature',        icon: 'Boxes' },
  PAGE:                 { label: 'Page',           icon: 'FileText' },
  ISSUE:                { label: 'Issue',          icon: 'Bug' },
  RELEASE:              { label: 'Release',        icon: 'Rocket' },
  RELEASE_FEATURE:      { label: 'Feature release',icon: 'Link' },
  RELEASE_OBJECTIVE:    { label: 'Objectif',       icon: 'Target' },
  CHECKLIST_ITEM:       { label: 'Checklist',      icon: 'ListChecks' },
  SIGNOFF:              { label: 'Sign-off',       icon: 'PenTool' },
  ADR:                  { label: 'ADR',            icon: 'FileSignature' },
  RUNBOOK:              { label: 'Runbook',        icon: 'BookOpen' },
  GLOSSARY:             { label: 'Glossaire',      icon: 'Book' },
  TAG:                  { label: 'Tag',            icon: 'Tag' },
  COMMENT:              { label: 'Commentaire',    icon: 'MessageSquare' },
  CHANGELOG_ENTRY:      { label: 'Changelog',      icon: 'List' },
}

export const ACTIVITY_ACTION = {
  CREATED:             { label: 'a créé',                color: 'green'  },
  UPDATED:             { label: 'a modifié',             color: 'blue'   },
  DELETED:             { label: 'a supprimé',            color: 'red'    },
  RESTORED:            { label: 'a restauré',            color: 'green'  },
  PUBLISHED:           { label: 'a publié',              color: 'green'  },
  ARCHIVED:            { label: 'a archivé',             color: 'gray'   },
  CHECKED:             { label: 'a coché',               color: 'green'  },
  UNCHECKED:           { label: 'a décoché',             color: 'orange' },
  APPROVED:            { label: 'a approuvé',            color: 'green'  },
  REJECTED:            { label: 'a rejeté',              color: 'red'    },
  STATUS_CHANGED:      { label: 'a changé le statut',    color: 'blue'   },
  ASSIGNED:            { label: 'a assigné',             color: 'blue'   },
  ACHIEVED:            { label: 'a atteint',             color: 'green'  },
  VALIDATED:           { label: 'a validé',              color: 'green'  },
  RELEASED:            { label: 'a publié',              color: 'green'  },
  ROLLED_BACK:         { label: 'a rollbacké',           color: 'red'    },
  DEPENDENCY_ADDED:    { label: 'a ajouté une dépendance', color: 'blue' },
  DEPENDENCY_REMOVED:  { label: 'a retiré une dépendance', color: 'orange' },
  RELATED:             { label: 'a lié',                 color: 'blue'   },
  SUPERSEDED:          { label: 'a remplacé',            color: 'gray'   },
  UPSERTED:            { label: 'a mis à jour',          color: 'blue'   },
  ATTACHED:            { label: 'a attaché',             color: 'blue'   },
  DETACHED:            { label: 'a détaché',             color: 'orange' },
  COMMENT_ADDED:       { label: 'a commenté',            color: 'blue'   },
  VERSION_RESTORED:    { label: 'a restauré une version', color: 'orange' },
  REMOVED:             { label: 'a retiré',              color: 'orange' },
  CHECKLIST_TEMPLATE_APPLIED: { label: 'a appliqué un template', color: 'blue' },
}

// ── Modules (suggestions, la liste réelle est dynamique côté BDD) ──
export const MODULE_SUGGESTIONS = [
  'MISSIONS', 'PAYMENTS', 'CHAT', 'HPO', 'KYC', 'ADMIN',
  'AUTH', 'NOTIFICATIONS', 'PROJECTS', 'ARTISANS', 'USERS',
  'SEARCH', 'WALLET', 'INVOICES', 'QUOTES', 'SUBSCRIPTIONS', 'REPORTS',
]

// ── Icônes de modules (fallback) ──
export const MODULE_ICON = {
  MISSIONS:      'Briefcase',
  PAYMENTS:      'CreditCard',
  CHAT:          'MessageSquare',
  HPO:           'Building2',
  KYC:           'UserCheck',
  ADMIN:         'Shield',
  AUTH:          'KeyRound',
  NOTIFICATIONS: 'Bell',
  PROJECTS:      'FolderKanban',
  ARTISANS:      'Wrench',
  USERS:         'Users',
  SEARCH:        'Search',
  WALLET:        'Wallet',
  INVOICES:      'Receipt',
  QUOTES:        'FileText',
  SUBSCRIPTIONS: 'Repeat',
  REPORTS:       'Flag',
}

export const getModuleIcon = (module) => MODULE_ICON[module] || 'Package'