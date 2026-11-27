import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminRpc } from '../../lib/adminRpc'
import { useDocsQuery, useDocsMutation } from '../docs/useDocsQuery'
import { testsKeys } from './keys'

/** Exécutions d'une campagne (filtrables par testeur / scénario / statut). */
export const useTestRuns = (campaignId, filters = {}, options = {}) => {
  const q = useDocsQuery({
    queryKey: testsKeys.runs.list(campaignId, filters),
    queryFn: () => adminRpc('docs_test_run_list', {
      p_campaign_id: campaignId,
      p_tester_id:   filters.testerId || null,
      p_scenario_id: filters.scenarioId || null,
      p_status:      filters.status || null,
      p_page:        filters.page || 1,
      p_page_size:   filters.pageSize || 50,
    }),
    enabled: !!campaignId,
    ...options,
  })
  return {
    runs: q.data?.items || [],
    total: q.data?.total || 0,
    stats: q.data?.stats || { total: 0, byStatus: {} },
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/** Matrice scénarios × testeurs : { scenarios[], testers[], cells:[{scenarioId,testerId,runId,status,attempt}] } */
export const useTestRunMatrix = (campaignId, options = {}) => {
  const q = useDocsQuery({
    queryKey: testsKeys.runs.matrix(campaignId),
    queryFn: () => adminRpc('docs_test_run_matrix', { p_campaign_id: campaignId }),
    enabled: !!campaignId,
    ...options,
  })
  return {
    scenarios: q.data?.scenarios || [],
    testers:   q.data?.testers || [],
    cells:     q.data?.cells || [],
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/** Détail : { run, scenario, tester, campaign, steps[], findings[], attempts[] } */
export const useTestRun = (runId, options = {}) => {
  const q = useDocsQuery({
    queryKey: testsKeys.runs.detail(runId),
    queryFn: () => adminRpc('docs_test_run_get', { p_run_id: runId }),
    enabled: !!runId,
    ...options,
  })
  return {
    run:       q.data?.run || null,
    scenario:  q.data?.scenario || null,
    tester:    q.data?.tester || null,
    campaign:  q.data?.campaign || null,
    steps:     q.data?.steps || [],
    findings:  q.data?.findings || [],
    attempts:  q.data?.attempts || [],
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

export const useTestRunMutations = () => {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: testsKeys.all() })

  /**
   * Saisie d'un résultat par l'admin.
   * status : ASSIGNED|IN_PROGRESS|PASSED|FAILED|BLOCKED|SKIPPED
   * steps  : [{ position, status:'PENDING'|'PASSED'|'FAILED'|'BLOCKED'|'SKIPPED', comment }]
   * Note : PASSED est refusé par le serveur si une étape est PENDING/FAILED/BLOCKED.
   */
  const record = useDocsMutation({
    mutationFn: ({ id, status, note, steps }) =>
      adminRpc('docs_test_run_record', {
        p_run_id: id, p_status: status, p_note: note ?? null, p_steps: steps ?? null,
      }),
    onSuccess: () => { invalidate(); toast.success('Résultat enregistré') },
  })
  const requestRetest = useDocsMutation({
    mutationFn: ({ id, note }) =>
      adminRpc('docs_test_run_request_retest', { p_run_id: id, p_note: note || null }),
    onSuccess: () => { invalidate(); toast.success('Re-test demandé') },
  })

  return { record, requestRetest }
}
