/**
 * Wrapper RPC du module docs.
 * - Injecte `p_admin_id` (résolu via getAdminId())
 * - Convertit toute erreur en DocsError
 * - Permet de fournir un adminId explicite (utile en tests / jobs)
 */

import { supabase } from './supabase'
import { getAdminId } from './admin'
import { DocsError } from './docsErrors'

/**
 * @param {string} name  Nom de la fonction admin.docs_*
 * @param {object} args  Args (sans p_admin_id)
 * @param {{ adminId?: string, skipAuth?: boolean }} [options]
 * @returns {Promise<any>}
 */
export const adminRpc = async (name, args = {}, options = {}) => {
  const { adminId: explicitAdminId, skipAuth = false } = options

  let adminId = explicitAdminId

  if (!adminId && !skipAuth) {
    try {
      adminId = await getAdminId()
    } catch (e) {
      throw DocsError.resolveFailed(e)
    }
    if (!adminId) throw DocsError.authMissing()
  }

  const payload = skipAuth ? args : { p_admin_id: adminId, ...args }

  let result
  try {
    result = await supabase.schema('admin').rpc(name, payload)
  } catch (e) {
    // Erreur réseau (fetch throw) — rare mais possible
    const wrapped = new DocsError(
      'Connexion au serveur impossible. Vérifiez votre réseau.',
      'NETWORK',
      e
    )
    throw wrapped
  }

  const { data, error } = result
  if (error) throw DocsError.fromSupabase(error, name)
  return data
}

/**
 * Variante explicite quand on connaît déjà l'adminId (ex: actions bulk).
 */
export const adminRpcFor = (adminId, name, args = {}) =>
  adminRpc(name, args, { adminId })