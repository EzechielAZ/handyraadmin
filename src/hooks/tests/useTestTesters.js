import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminRpc } from '../../lib/adminRpc'
import { useDocsQuery, useDocsMutation } from '../docs/useDocsQuery'
import { testsKeys } from './keys'

/** Testeurs d'une campagne (avec progression : runsTotal/runsDone/runsPassed/runsFailed/findings). */
export const useTestTesters = (campaignId, filters = {}, options = {}) => {
  const q = useDocsQuery({
    queryKey: testsKeys.testers.list(campaignId, filters),
    queryFn: () => adminRpc('docs_test_tester_list', {
      p_campaign_id: campaignId,
      p_search:      filters.search || null,
      p_status:      filters.status || null,
      p_page:        filters.page || 1,
      p_page_size:   filters.pageSize || 50,
    }),
    enabled: !!campaignId,
    ...options,
  })
  return {
    testers: q.data?.items || [],
    total: q.data?.total || 0,
    stats: q.data?.stats || { total: 0, byStatus: {}, byPlatform: {} },
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

export const useTestTesterMutations = () => {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: testsKeys.all() })

  /**
   * items : [{ email, fullName, phone, profile:'CLIENT'|'ARTISAN'|'BOTH', platform:'ANDROID'|'IOS',
   *            deviceModel, osVersion, notes }]
   * Résultat : { created:[{id_tester,email,invite_token,...}], skipped:[], errors:[], runsCreated }
   */
  const invite = useDocsMutation({
    mutationFn: ({ campaignId, items }) =>
      adminRpc('docs_test_tester_invite', { p_campaign_id: campaignId, p_items: items }),
    onSuccess: (data) => {
      invalidate()
      if (data.created.length) toast.success(`${data.created.length} testeur(s) invité(s)`)
    },
  })
  /** payload : fullName, phone, profile, platform, deviceModel, osVersion, notes, status */
  const update = useDocsMutation({
    mutationFn: ({ id, payload }) =>
      adminRpc('docs_test_tester_update', { p_tester_id: id, p_payload: payload }),
    onSuccess: () => { invalidate(); toast.success('Testeur mis à jour') },
  })
  const regenerateToken = useDocsMutation({
    mutationFn: (id) => adminRpc('docs_test_tester_regenerate_token', { p_tester_id: id }),
    onSuccess: () => { invalidate(); toast.success('Nouveau lien généré — l\'ancien ne fonctionne plus') },
  })
  /** Récupère le jeton pour copier le lien (appel à la demande, non mis en cache). */
  const getInvite = (id) => adminRpc('docs_test_tester_get_invite', { p_tester_id: id })

  return { invite, update, regenerateToken, getInvite }
}
