import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminRpc } from '../../lib/adminRpc'
import { useDocsQuery, useDocsMutation } from '../docs/useDocsQuery'
import { testsKeys } from './keys'

/** Liste paginée de la bibliothèque de scénarios. */
export const useTestScenarios = (filters = {}, options = {}) => {
  const q = useDocsQuery({
    queryKey: testsKeys.scenarios.list(filters),
    queryFn: () => adminRpc('docs_test_scenario_list', {
      p_search:      filters.search || null,
      p_status:      filters.status || null,
      p_module:      filters.module || null,
      p_profile:     filters.profile || null,
      p_priority:    filters.priority || null,
      p_type:        filters.type || null,
      p_feature_id:  filters.featureId || null,
      p_campaign_id: filters.campaignId || null,
      p_sort_by:     filters.sortBy || 'updated_at',
      p_sort_dir:    (filters.sortDir || 'desc').toUpperCase(),
      p_page:        filters.page || 1,
      p_page_size:   filters.pageSize || 20,
    }),
    ...options,
  })
  return {
    scenarios: q.data?.items || [],
    total: q.data?.total || 0,
    stats: q.data?.stats || { total: 0, byStatus: {}, byModule: {}, byPriority: {} },
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/** Détail : { scenario, steps[], feature, campaigns[], runStats } */
export const useTestScenario = (ref, options = {}) => {
  const q = useDocsQuery({
    queryKey: testsKeys.scenarios.detail(ref),
    queryFn: () => adminRpc('docs_test_scenario_get', { p_ref: ref }),
    enabled: !!ref,
    ...options,
  })
  return {
    scenario:  q.data?.scenario || null,
    steps:     q.data?.steps || [],
    feature:   q.data?.feature || null,
    campaigns: q.data?.campaigns || [],
    runStats:  q.data?.runStats || { total: 0, passed: 0, failed: 0, blocked: 0 },
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/**
 * Payload scénario (create/update) — clés camelCase :
 *  title, summary, module, featureId, profile, priority, scenarioType,
 *  preconditionsMd, testDataMd, estimatedMinutes, status, tags[],
 *  steps: [{ actionMd, expectedMd }]
 */
export const useTestScenarioMutations = () => {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: testsKeys.all() })

  const create = useDocsMutation({
    mutationFn: (payload) => adminRpc('docs_test_scenario_create', { p_payload: payload }),
    onSuccess: (data) => { invalidate(); toast.success(`Scénario ${data.scenario.code} créé`) },
  })
  const update = useDocsMutation({
    mutationFn: ({ id, payload }) =>
      adminRpc('docs_test_scenario_update', { p_scenario_id: id, p_payload: payload }),
    onSuccess: () => { invalidate(); toast.success('Scénario mis à jour') },
  })
  const duplicate = useDocsMutation({
    mutationFn: (id) => adminRpc('docs_test_scenario_duplicate', { p_scenario_id: id }),
    onSuccess: (data) => { invalidate(); toast.success(`Copie créée : ${data.scenario.code}`) },
  })
  /** items : tableau d'objets scénario (voir payload). dryRun=true → validation sans écriture. */
  const importItems = useDocsMutation({
    mutationFn: ({ items, dryRun = false }) =>
      adminRpc('docs_test_scenario_import', { p_items: items, p_dry_run: dryRun }),
    onSuccess: (data) => {
      if (!data.dryRun) {
        invalidate()
        toast.success(`${data.created} scénario(s) importé(s)${data.skipped ? `, ${data.skipped} ignoré(s)` : ''}`)
      }
    },
  })

  return { create, update, duplicate, importItems }
}
