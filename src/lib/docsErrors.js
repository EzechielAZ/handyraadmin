/**
 * Erreurs du module docs.
 * - Classe unique `DocsError` pour tous les cas.
 * - `getDocsErrorMessage()` : message FR prêt à afficher (toasts).
 * - `isNonRetryableError()` : pilotage du retry TanStack.
 */

export class DocsError extends Error {
  /**
   * @param {string} message     Message FR affichable
   * @param {string} code        Code Postgres / PostgREST / custom
   * @param {Error|null} cause   Erreur d'origine
   * @param {any} details        Détail (jsonb, string…)
   */
  constructor(message, code = 'UNKNOWN', cause = null, details = null) {
    super(message)
    this.name = 'DocsError'
    this.code = code
    this.cause = cause
    this.details = details
  }

  // Helpers sémantiques pour le front
  get isAuth()        { return this.code === '28000' || this.code === 'AUTH_MISSING' || this.code === 'AUTH_RESOLVE_FAILED' }
  get isPermission()  { return this.code === '42501' }
  get isNotFound()    { return this.code === 'P0002' || this.code === 'PGRST116' }
  get isDuplicate()   { return this.code === '23505' }
  get isValidation()  { return this.code === '22000' || this.code === '22023' }
  get isReadiness()   { return this.code === '23514' }
  get isNetwork()     { return this.code === 'NETWORK' || this.code === 'FETCH_ERROR' }

  static fromSupabase(error, rpcName) {
    if (!error) {
      return new DocsError('Une erreur inconnue est survenue', 'UNKNOWN', null, { rpcName })
    }
    const code = error.code || 'UNKNOWN'
    const message = resolveMessage(code, error, rpcName)
    const details = error.details || error.hint || null
    return new DocsError(message, code, error, details)
  }

  static authMissing() {
    return new DocsError('Session administrateur introuvable', 'AUTH_MISSING')
  }

  static resolveFailed(cause) {
    return new DocsError(
      'Impossible de vérifier votre session administrateur',
      'AUTH_RESOLVE_FAILED',
      cause
    )
  }
}

/**
 * Extrait le message approprié selon le code d'erreur.
 * Le SQL lève déjà des messages FR → on les laisse passer.
 */
function resolveMessage(code, error, rpcName) {
  const raw = (error?.message || '').trim()

  // Cas particulier readiness : le SQL met le JSON complet en DETAIL,
  // mais le `%` de la RAISE finit dans `message`. On extrait le 1er blocker.
  if (code === '23514' && error?.details) {
    try {
      const parsed = JSON.parse(error.details)
      if (Array.isArray(parsed?.blockers) && parsed.blockers.length > 0) {
        return parsed.blockers[0].message || 'Release non prête'
      }
    } catch {
      /* pas du JSON, on tombe sur le cas par défaut */
    }
  }

  switch (code) {
    case '28000':
      return raw || 'Session expirée. Reconnectez-vous.'
    case '42501':
      return raw || 'Vous n\'avez pas les droits requis pour cette action.'
    case 'P0002':
      return raw || 'Élément introuvable.'
    case 'PGRST116':
      return 'Élément introuvable.'
    case '23505':
      return raw || 'Cet élément existe déjà.'
    case '22000':
      return raw || 'Données invalides.'
    case '22023':
      return raw || 'Cette transition n\'est pas autorisée.'
    case '23514':
      return raw || 'Contrainte non respectée.'
    case 'P0001':
      return raw || 'Action refusée.'
    case 'PGRST301':
      return 'Session expirée. Reconnectez-vous.'
    case 'FETCH_ERROR':
    case 'NETWORK':
      return 'Connexion au serveur impossible. Vérifiez votre réseau.'
    case 'UNKNOWN':
      return raw || 'Une erreur est survenue.'
    default:
      return raw || `Une erreur est survenue${rpcName ? ` (${rpcName})` : ''}.`
  }
}

/**
 * Message prêt à afficher (toast, alerte, encart).
 * Accepte DocsError, Error, string, null.
 */
export function getDocsErrorMessage(error) {
  if (!error) return 'Une erreur est survenue'
  if (error instanceof DocsError) return error.message
  if (typeof error === 'string') return error
  if (error.message) return error.message
  return 'Une erreur est survenue'
}

/**
 * Erreurs pour lesquelles TanStack ne doit PAS retry :
 * auth, permissions, not-found, duplicate, validation.
 * Retry uniquement le réseau / les 5xx transitoires.
 */
export function isNonRetryableError(error) {
  if (!error) return false
  const code = error.code || ''
  return [
    '28000', 'AUTH_MISSING', 'AUTH_RESOLVE_FAILED',   // auth
    '42501',                                          // permission
    'P0002', 'PGRST116',                              // not found
    '23505',                                          // duplicate
    '22000', '22023',                                 // validation
  ].includes(code)
}