import { supabase } from './supabase'

/* Cache de l'id_user (public.users) lié à auth.uid() */
let cachedAdminId = null

/**
 * Retourne l'id_user (public.users) de l'admin connecté.
 * - Utilise auth.uid() pour identifier l'utilisateur
 * - Résout id_user via auth_id (mapping 1-1)
 * - Cache le résultat pour éviter N appels par page
 */
export const getAdminId = async () => {
  if (cachedAdminId) return cachedAdminId

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Non authentifié')

  const { data, error } = await supabase
    .from('users')
    .select('id_user')
    .eq('auth_id', user.id)
    .single()

  if (error || !data) throw new Error('Utilisateur admin introuvable')

  cachedAdminId = data.id_user
  return cachedAdminId
}

/** À appeler au logout pour purger le cache */
export const clearAdminCache = () => {
  cachedAdminId = null
}