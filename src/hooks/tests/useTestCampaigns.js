import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminRpc } from '../../lib/adminRpc'
import { useDocsQuery, useDocsMutation } from '../docs/useDocsQuery'
import { docsKeys } from '../docs/keys'
import { testsKeys } from './keys'
import { CAMPAIGN_STATUS } from './constants'

/** Liste paginée des campagnes (avec compteurs de progression). */
export const useTestCampaigns = (filters = {}, options = {}) => {
  const q = useDocsQuery({
    queryKey: testsKeys.campaigns.list(filters),
    queryFn: () => adminRpc('docs_test_campaign_list', {
      p_search:     filters.search || null,
      p_status:     filters.status || null,
      p_release_id: filters.releaseId || null,
      p_page:       filters.page || 1,
      p_page_size:  filters.pageSize || 20,
    }),
    ...options,
  })
  return {
    campaigns: q.data?.items || [],
    total: q.data?.total || 0,
    stats: q.data?.stats || { total: 0, byStatus: {} },
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/** Détail : { campaign, release, counts, scenarios[] } */
export const useTestCampaign = (ref, options = {}) => {
  const q = useDocsQuery({
    queryKey: testsKeys.campaigns.detail(ref),
    queryFn: () => adminRpc('docs_test_campaign_get', { p_ref: ref }),
    enabled: !!ref,
    ...options,
  })
  return {
    campaign:  q.data?.campaign || null,
    release:   q.data?.release || null,
    counts:    q.data?.counts || null,
    scenarios: q.data?.scenarios || [],
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/**
 * Vue d'ensemble : { campaign, release, counts, readiness, byModule[], byPlatform[],
 *                    timeline[], attention{}, topTesters[] }
 * `readiness` = { verdict:'GO'|'NO_GO', ok, checks[], warnings[], metrics{}, criteria{} }
 */
export const useTestCampaignOverview = (campaignId, options = {}) => {
  const q = useDocsQuery({
    queryKey: testsKeys.campaigns.overview(campaignId),
    queryFn: () => adminRpc('docs_test_campaign_overview', { p_campaign_id: campaignId }),
    enabled: !!campaignId,
    staleTime: 15_000,
    ...options,
  })
  return {
    overview:   q.data || null,
    readiness:  q.data?.readiness || null,
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/**
 * Payload campagne (create/update) — camelCase :
 *  name, descriptionMd, instructionsMd, releaseId, startsAt, endsAt (ISO), platforms[],
 *  appBuild, autoAssign, exitCriteria{minCoverage,minPassRate,requireP0Passed,maxOpenBlocker,maxOpenCritical},
 *  scenarios:[{scenarioId,isRequired}] (création uniquement)
 */
export const useTestCampaignMutations = () => {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: testsKeys.all() })

  const create = useDocsMutation({
    mutationFn: (payload) => adminRpc('docs_test_campaign_create', { p_payload: payload }),
    onSuccess: (data) => { invalidate(); toast.success(`Campagne ${data.campaign.code} créée`) },
  })
  const update = useDocsMutation({
    mutationFn: ({ id, payload }) =>
      adminRpc('docs_test_campaign_update', { p_campaign_id: id, p_payload: payload }),
    onSuccess: () => { invalidate(); toast.success('Campagne mise à jour') },
  })
  /** items : [{ scenarioId, isRequired }] dans l'ordre d'exécution. Remplace l'ensemble. */
  const setScenarios = useDocsMutation({
    mutationFn: ({ id, items }) =>
      adminRpc('docs_test_campaign_set_scenarios', { p_campaign_id: id, p_items: items }),
    onSuccess: (data) => {
      invalidate()
      toast.success(data?.runsCreated
        ? `Scénarios enregistrés · ${data.runsCreated} exécution(s) distribuée(s)`
        : 'Scénarios enregistrés')
    },
  })
  const generateRuns = useDocsMutation({
    mutationFn: (id) => adminRpc('docs_test_campaign_generate_runs', { p_campaign_id: id }),
    onSuccess: (data) => {
      invalidate()
      toast.success(data.created ? `${data.created} exécution(s) distribuée(s)` : 'Rien de nouveau à distribuer')
    },
  })
  const transition = useDocsMutation({
    mutationFn: ({ id, newStatus, reason }) =>
      adminRpc('docs_test_campaign_transition', {
        p_campaign_id: id, p_new_status: newStatus, p_reason: reason || null,
      }),
    onSuccess: (data, vars) => {
      invalidate()
      qc.invalidateQueries({ queryKey: docsKeys.dashboard() })
      toast.success(`Campagne → ${CAMPAIGN_STATUS[vars.newStatus]?.label || vars.newStatus}`)
    },
  })
  const duplicate = useDocsMutation({
    mutationFn: (id) => adminRpc('docs_test_campaign_duplicate', { p_campaign_id: id }),
    onSuccess: (data) => { invalidate(); toast.success(`Campagne dupliquée : ${data.campaign.code}`) },
  })

  return { create, update, setScenarios, generateRuns, transition, duplicate }
}
