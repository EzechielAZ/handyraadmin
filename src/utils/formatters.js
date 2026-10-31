import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Format monétaire
export const formatCurrency = (amount, currency = 'XOF') => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format spécifique XOF
export const formatXOF = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (n) => {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('fr-FR').format(n);
};

export const formatPercent = (n, decimals = 1) => {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toFixed(decimals)}%`;
};

export const formatDate = (date) => {
  if (!date) return '—';
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'dd MMM yyyy', { locale: fr });
  } catch {
    return '—';
  }
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'dd MMM yyyy · HH:mm', { locale: fr });
  } catch {
    return '—';
  }
};

export const formatRelative = (date) => {
  if (!date) return '—';
  try {
    return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, {
      addSuffix: true,
      locale: fr,
    });
  } catch {
    return '—';
  }
};

export const formatRating = (rating) => {
  if (rating === null || rating === undefined) return '—';
  return `★ ${Number(rating).toFixed(1)}`;
};

export const formatMillions = (amount) => {
  if (!amount) return '0';
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return String(amount);
};

export const initials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
};

// Format smart date
export const formatSmartDate = (date) => {
  if (!date) return '—'
  
  const now = new Date()
  const inputDate = new Date(date)
  const diffInHours = (now - inputDate) / (1000 * 60 * 60)
  const diffInDays = diffInHours / 24

  // Aujourd'hui
  if (diffInHours < 24 && inputDate.getDate() === now.getDate()) {
    return format(inputDate, "'Aujourd'hui à' HH'h'mm", { locale: fr })
  }
  
  // Hier
  if (diffInHours < 48 && inputDate.getDate() === now.getDate() - 1) {
    return format(inputDate, "'Hier à' HH'h'mm", { locale: fr })
  }
  
  // Cette semaine
  if (diffInDays < 7) {
    return format(inputDate, "EEEE à HH'h'mm", { locale: fr })
  }
  
  // Cette année
  if (inputDate.getFullYear() === new Date().getFullYear()) {
    return format(inputDate, "dd MMMM", { locale: fr })
  }
  
  // Années précédentes
  return format(inputDate, "dd MMM yyyy", { locale: fr })
}

// ========== FONCTION MANQUANTE : formatStatus ==========
export const formatStatus = (status) => {
  const statusMap = {
    // Mission statuses
    PENDING: { label: 'En attente', color: 'warning' },
    ACCEPTED: { label: 'Acceptée', color: 'info' },
    ON_WAY: { label: 'En route', color: 'info' },
    IN_PROGRESS: { label: 'En cours', color: 'primary' },
    COMPLETED: { label: 'Terminée', color: 'success' },
    CANCELLED: { label: 'Annulée', color: 'error' },
    
    // Payment statuses
    SUCCESS: { label: 'Réussi', color: 'success' },
    FAILED: { label: 'Échoué', color: 'error' },
    REFUNDED: { label: 'Remboursé', color: 'warning' },
    
    // KYC statuses
    PENDING_KYC: { label: 'En attente', color: 'warning' },
    VALIDATED: { label: 'Validé', color: 'success' },
    REJECTED: { label: 'Rejeté', color: 'error' },
    
    // User statuses
    ACTIVE: { label: 'Actif', color: 'success' },
    SUSPENDED: { label: 'Suspendu', color: 'warning' },
    BANNED: { label: 'Banni', color: 'error' },
    
    // Artisan availability
    AVAILABLE: { label: 'Disponible', color: 'success' },
    BUSY: { label: 'Occupé', color: 'warning' },
    OFFLINE: { label: 'Hors ligne', color: 'secondary' },
    
    // Report statuses
    OPEN: { label: 'Ouvert', color: 'warning' },
    UNDER_INVESTIGATION: { label: 'En cours', color: 'info' },
    RESOLVED: { label: 'Résolu', color: 'success' },
    DISMISSED: { label: 'Rejeté', color: 'secondary' },
    
    // HPO Contract statuses
    DRAFT: { label: 'Brouillon', color: 'secondary' },
    ACTIVE_CONTRACT: { label: 'Actif', color: 'success' },
    COMPLETED_CONTRACT: { label: 'Terminé', color: 'info' },
    
    // Default
    DEFAULT: { label: status || 'Inconnu', color: 'secondary' }
  }
  
  return statusMap[status] || statusMap.DEFAULT
}
// ========== FIN DE LA FONCTION AJOUTÉE ==========