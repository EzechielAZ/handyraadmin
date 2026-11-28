import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { getAdminId } from '../../lib/admin'

const SKIP = {
  tester_inactive: 'Testeur inactif',
  campaign_cancelled: 'Campagne annulée',
  throttled: 'E-mail déjà envoyé à l\'instant',
  nothing_to_say: 'Rien à notifier',
  no_finding: 'Retour introuvable',
}

/**
 * Envoie un e-mail au testeur via l'Edge Function `send-tester-email`.
 * kind : 'INVITE' (ref = id_tester) | 'REPLY' (ref = id du retour) ; source : 'comment' | 'triage'.
 * Ne lève jamais : retourne { sent } | { skipped } | { error }.
 */
export const notifyTester = async ({ kind, ref, source = 'comment', silent = false }) => {
  try {
    const adminId = await getAdminId()
    const { data, error } = await supabase.functions.invoke('send-tester-email', { body: { kind, ref, source, adminId } })
    if (error) throw error
    if (data?.skipped) { if (!silent) toast(SKIP[data.skipped] || 'E-mail non envoyé'); return { skipped: data.skipped } }
    if (data?.error) throw new Error(data.error)
    if (!silent) toast.success(kind === 'INVITE' ? 'Invitation envoyée par e-mail' : 'Le testeur a été notifié par e-mail')
    return { sent: true }
  } catch (e) {
    if (!silent) toast.error('E-mail non envoyé — ' + (e?.message || 'erreur'))
    return { error: e }
  }
}
