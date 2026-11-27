import { useAuthStore } from '../../store/authStore'

/**
 * Droits du module Tests pour l'utilisateur courant.
 *  - canWrite : peut créer / modifier / trier (permission `manage_tests`)
 * Les écritures sont de toute façon refusées côté serveur ; ceci sert à masquer les actions.
 */
export const useTestsAccess = () => {
  const permissions = useAuthStore((s) => s.permissions) || []
  return { canWrite: permissions.includes('manage_tests') }
}
