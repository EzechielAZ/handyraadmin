// Statuts des missions
export const MISSION_STATUSES = {
  PENDING: {
    value: 'PENDING',
    label: 'En attente',
    color: 'warning',
    icon: 'Clock',
    description: 'Mission en attente d\'acceptation',
    order: 1,
  },
  ACCEPTED: {
    value: 'ACCEPTED',
    label: 'Acceptée',
    color: 'info',
    icon: 'CheckCircle',
    description: 'Mission acceptée par l\'artisan',
    order: 2,
  },
  ON_WAY: {
    value: 'ON_WAY',
    label: 'En route',
    color: 'info',
    icon: 'MapPin',
    description: 'Artisan en route vers le client',
    order: 3,
  },
  IN_PROGRESS: {
    value: 'IN_PROGRESS',
    label: 'En cours',
    color: 'primary',
    icon: 'Play',
    description: 'Mission en cours d\'exécution',
    order: 4,
  },
  COMPLETED: {
    value: 'COMPLETED',
    label: 'Terminée',
    color: 'success',
    icon: 'CheckCircle2',
    description: 'Mission terminée avec succès',
    order: 5,
  },
  CANCELLED: {
    value: 'CANCELLED',
    label: 'Annulée',
    color: 'error',
    icon: 'XCircle',
    description: 'Mission annulée',
    order: 6,
  },
  INCIDENT: {
    value: 'INCIDENT',
    label: 'Incident',
    color: 'danger',
    icon: 'AlertTriangle',
    description: 'Incident signalé sur la mission',
    order: 7,
  },
}

// Statuts des utilisateurs
export const USER_STATUSES = {
  ACTIVE: {
    value: 'ACTIVE',
    label: 'Actif',
    color: 'success',
    icon: 'UserCheck',
    description: 'Utilisateur actif',
  },
  SUSPENDED: {
    value: 'SUSPENDED',
    label: 'Suspendu',
    color: 'warning',
    icon: 'UserX',
    description: 'Utilisateur suspendu temporairement',
  },
  BANNED: {
    value: 'BANNED',
    label: 'Banni',
    color: 'error',
    icon: 'Ban',
    description: 'Utilisateur banni définitivement',
  },
  PENDING: {
    value: 'PENDING',
    label: 'En attente',
    color: 'warning',
    icon: 'UserPlus',
    description: 'En attente de validation',
  },
}

// Statuts KYC
export const KYC_STATUSES = {
  PENDING: {
    value: 'PENDING',
    label: 'En attente',
    color: 'warning',
    icon: 'Clock',
    description: 'Documents en attente de vérification',
  },
  VALIDATED: {
    value: 'VALIDATED',
    label: 'Validé',
    color: 'success',
    icon: 'CheckCircle',
    description: 'KYC validé',
  },
  REJECTED: {
    value: 'REJECTED',
    label: 'Rejeté',
    color: 'error',
    icon: 'XCircle',
    description: 'Documents rejetés',
  },
}

// Disponibilité des artisans
export const ARTISAN_AVAILABILITY = {
  AVAILABLE: {
    value: 'AVAILABLE',
    label: 'Disponible',
    color: 'success',
    icon: 'CheckCircle',
    description: 'Artisan disponible pour des missions',
  },
  BUSY: {
    value: 'BUSY',
    label: 'Occupé',
    color: 'warning',
    icon: 'Briefcase',
    description: 'Artisan actuellement en mission',
  },
  OFFLINE: {
    value: 'OFFLINE',
    label: 'Hors ligne',
    color: 'secondary',
    icon: 'WifiOff',
    description: 'Artisan hors ligne',
  },
}

// Statuts des paiements
export const PAYMENT_STATUSES = {
  PENDING: {
    value: 'PENDING',
    label: 'En attente',
    color: 'warning',
    icon: 'Clock',
    description: 'Paiement en attente',
  },
  SUCCESS: {
    value: 'SUCCESS',
    label: 'Réussi',
    color: 'success',
    icon: 'CheckCircle',
    description: 'Paiement effectué avec succès',
  },
  FAILED: {
    value: 'FAILED',
    label: 'Échoué',
    color: 'error',
    icon: 'XCircle',
    description: 'Échec du paiement',
  },
  REFUNDED: {
    value: 'REFUNDED',
    label: 'Remboursé',
    color: 'info',
    icon: 'RefreshCw',
    description: 'Paiement remboursé',
  },
  PARTIAL: {
    value: 'PARTIAL',
    label: 'Partiel',
    color: 'warning',
    icon: 'MinusCircle',
    description: 'Paiement partiel',
  },
  OVERDUE: {
    value: 'OVERDUE',
    label: 'En retard',
    color: 'danger',
    icon: 'AlertTriangle',
    description: 'Paiement en retard',
  },
}

// Méthodes de paiement
export const PAYMENT_METHODS = {
  WALLET: {
    value: 'WALLET',
    label: 'Portefeuille',
    icon: 'Wallet',
    color: 'primary',
  },
  MOMO: {
    value: 'MOMO',
    label: 'Mobile Money',
    icon: 'Smartphone',
    color: 'success',
  },
  CARD: {
    value: 'CARD',
    label: 'Carte bancaire',
    icon: 'CreditCard',
    color: 'info',
  },
  CASH: {
    value: 'CASH',
    label: 'Espèces',
    icon: 'DollarSign',
    color: 'warning',
  },
}

// Statuts des contrats HPO
export const HPO_CONTRACT_STATUSES = {
  DRAFT: {
    value: 'DRAFT',
    label: 'Brouillon',
    color: 'secondary',
    icon: 'FileText',
  },
  ACTIVE: {
    value: 'ACTIVE',
    label: 'Actif',
    color: 'success',
    icon: 'CheckCircle',
  },
  SUSPENDED: {
    value: 'SUSPENDED',
    label: 'Suspendu',
    color: 'warning',
    icon: 'PauseCircle',
  },
  COMPLETED: {
    value: 'COMPLETED',
    label: 'Terminé',
    color: 'info',
    icon: 'CheckSquare',
  },
  CANCELLED: {
    value: 'CANCELLED',
    label: 'Annulé',
    color: 'error',
    icon: 'XCircle',
  },
}

// Types d'incidents
export const INCIDENT_TYPES = {
  MATERIAL_THEFT: {
    value: 'MATERIAL_THEFT',
    label: 'Vol de matériel',
    color: 'danger',
    icon: 'Shield',
  },
  WORKER_ABSENCE: {
    value: 'WORKER_ABSENCE',
    label: 'Absence d\'ouvrier',
    color: 'warning',
    icon: 'UserX',
  },
  QUALITY_ISSUE: {
    value: 'QUALITY_ISSUE',
    label: 'Problème de qualité',
    color: 'warning',
    icon: 'AlertTriangle',
  },
  SAFETY_ISSUE: {
    value: 'SAFETY_ISSUE',
    label: 'Problème de sécurité',
    color: 'danger',
    icon: 'ShieldAlert',
  },
  DELIVERY_ISSUE: {
    value: 'DELIVERY_ISSUE',
    label: 'Problème de livraison',
    color: 'warning',
    icon: 'Truck',
  },
  OTHER: {
    value: 'OTHER',
    label: 'Autre',
    color: 'secondary',
    icon: 'HelpCircle',
  },
}

// Types de missions
export const MISSION_TYPES = {
  IMMEDIATE: {
    value: 'IMMEDIATE',
    label: 'Immédiate',
    color: 'success',
    icon: 'Zap',
  },
  SCHEDULED: {
    value: 'SCHEDULED',
    label: 'Planifiée',
    color: 'info',
    icon: 'Calendar',
  },
}

// Mondes de mission
export const MISSION_WORLDS = {
  SERVICE: {
    value: 'SERVICE',
    label: 'Service',
    icon: 'Briefcase',
  },
  CONSTRUCTION: {
    value: 'CONSTRUCTION',
    label: 'Construction',
    icon: 'HardHat',
  },
}

// Présence journalière
export const PRESENCE_STATUSES = {
  PRESENT: {
    value: 'PRESENT',
    label: 'Présent',
    color: 'success',
    icon: 'CheckCircle',
  },
  ABSENT: {
    value: 'ABSENT',
    label: 'Absent',
    color: 'error',
    icon: 'XCircle',
  },
  REPLACED: {
    value: 'REPLACED',
    label: 'Remplacé',
    color: 'info',
    icon: 'RefreshCw',
  },
  DAY_OFF: {
    value: 'DAY_OFF',
    label: 'Jour de congé',
    color: 'warning',
    icon: 'Calendar',
  },
}

// Abonnements
export const SUBSCRIPTION_PLANS = {
  STARTER: {
    value: 'STARTER',
    label: 'Starter',
    price: 0,
    features: ['Missions limitées', 'Support standard'],
  },
  PRO: {
    value: 'PRO',
    label: 'Pro',
    price: 5000,
    features: ['Missions illimitées', 'Support prioritaire', 'Statistiques avancées'],
  },
  EXPERT: {
    value: 'EXPERT',
    label: 'Expert',
    price: 10000,
    features: ['Tout du Pro', 'HPO inclus', 'Garantie étendue'],
  },
  MASTER: {
    value: 'MASTER',
    label: 'Master',
    price: 20000,
    features: ['Tout de l\'Expert', 'Formation incluse', 'Badge certifié'],
  },
}

// Périodes
export const PERIODS = {
  TODAY: {
    value: 'today',
    label: 'Aujourd\'hui',
  },
  YESTERDAY: {
    value: 'yesterday',
    label: 'Hier',
  },
  WEEK: {
    value: 'week',
    label: 'Cette semaine',
  },
  LAST_WEEK: {
    value: 'last_week',
    label: 'Semaine dernière',
  },
  MONTH: {
    value: 'month',
    label: 'Ce mois',
  },
  LAST_MONTH: {
    value: 'last_month',
    label: 'Mois dernier',
  },
  QUARTER: {
    value: 'quarter',
    label: 'Ce trimestre',
  },
  YEAR: {
    value: 'year',
    label: 'Cette année',
  },
  CUSTOM: {
    value: 'custom',
    label: 'Personnalisé',
  },
}

// Fonctions utilitaires
export const getStatusByValue = (statuses, value) => {
  return Object.values(statuses).find(s => s.value === value) || null
}

export const getStatusLabel = (statuses, value) => {
  const status = getStatusByValue(statuses, value)
  return status?.label || value
}

export const getStatusColor = (statuses, value) => {
  const status = getStatusByValue(statuses, value)
  return status?.color || 'secondary'
}

export const getStatusIcon = (statuses, value) => {
  const status = getStatusByValue(statuses, value)
  return status?.icon || 'HelpCircle'
}

export const getStatusOptions = (statuses) => {
  return Object.values(statuses).map(status => ({
    value: status.value,
    label: status.label,
    color: status.color,
  }))
}

// Export grouped statuses
export default {
  MISSION_STATUSES,
  USER_STATUSES,
  KYC_STATUSES,
  ARTISAN_AVAILABILITY,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  HPO_CONTRACT_STATUSES,
  INCIDENT_TYPES,
  MISSION_TYPES,
  MISSION_WORLDS,
  PRESENCE_STATUSES,
  SUBSCRIPTION_PLANS,
  PERIODS,
  getStatusByValue,
  getStatusLabel,
  getStatusColor,
  getStatusIcon,
  getStatusOptions,
}