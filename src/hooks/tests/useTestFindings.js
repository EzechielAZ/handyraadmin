import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminRpc } from '../../lib/adminRpc'
import { useDocsQuery, useDocsMutation } from '../docs/useDocsQuery'
import { docsKeys } from '../docs/keys'
import { testsKeys } from './keys'

/** Boîte de réception des retours. campaignId optionnel (null = toutes campagnes). */
export const useTestFindings = (filters = {}, options = {}) => {
  const q = useDocsQuery({
    queryKey: testsKeys.findings.list(filters),
    queryFn: () => adminRpc('docs_test_finding_list', {
      p_campaign_id: filters.campaignId || null,
      p_search:      filters.search || null,
      p_status:      filters.status || null,
      p_severity:    filters.severity || null,
      p_type:        filters.type || null,
      p_tester_id:   filters.testerId || null,
      p_run_id:      filters.runId || null,
      p_page:        filters.page || 1,
      p_page_size:   filters.pageSize || 30,
    }),
    ...options,
  })
  return {
    findings: q.data?.items || [],
    total: q.data?.total || 0,
    stats: q.data?.stats || { total: 0, byStatus: {}, bySeverity: {}, byType: {} },
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/** Détail : { finding, campaign, tester, run, runStep, issue, comments[] } */
export const useTestFinding = (ref, options = {}) => {
  const q = useDocsQuery({
    queryKey: testsKeys.findings.detail(ref),
    queryFn: () => adminRpc('docs_test_finding_get', { p_ref: ref }),
    enabled: !!ref,
    staleTime: 10_000,
    ...options,
  })
  return {
    data: q.data || null,
    finding:  q.data?.finding || null,
    campaign: q.data?.campaign || null,
    tester:   q.data?.tester || null,
    run:      q.data?.run || null,
    runStep:  q.data?.runStep || null,
    issue:    q.data?.issue || null,
    comments: q.data?.comments || [],
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

export const useTestFindingMutations = () => {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: testsKeys.all() })
    qc.invalidateQueries({ queryKey: docsKeys.issues.all() })
  }

  /**
   * Saisie par l'admin — camelCase :
   *  campaignId | runId (déduit campagne+testeur), testerId, runStepId, findingType, severity,
   *  title, descriptionMd, reproductionSteps, expectedBehavior, actualBehavior, environment{}, attachments[]
   */
  const create = useDocsMutation({
    mutationFn: (payload) => adminRpc('docs_test_finding_create', { p_payload: payload }),
    onSuccess: (data) => { invalidate(); toast.success(`Retour ${data.finding.code} enregistré`) },
  })
  /** payload : findingType, severity, title, descriptionMd */
  const update = useDocsMutation({
    mutationFn: ({ id, payload }) =>
      adminRpc('docs_test_finding_update', { p_finding_id: id, p_payload: payload }),
    onSuccess: () => { invalidate(); toast.success('Retour mis à jour') },
  })
  /**
   * decision : 'CONFIRM'|'REJECT'|'NEED_INFO'|'REOPEN'
   * payload  : { severity, note, issueMode:'CREATE'|'LINK'|'NONE', issueId, issuePriority, featureId }
   *  - REJECT et NEED_INFO exigent `note`
   *  - CONFIRM d'un BUG exige `severity`
   */
  const triage = useDocsMutation({
    mutationFn: ({ id, decision, payload }) =>
      adminRpc('docs_test_finding_triage', {
        p_finding_id: id, p_decision: decision, p_payload: payload || {},
      }),
    onSuccess: (data, vars) => {
      invalidate()
      qc.invalidateQueries({ queryKey: docsKeys.dashboard() })
      const issue = data?.issue
      toast.success(
        vars.decision === 'CONFIRM' && issue ? `Confirmé · issue ${issue.code}`
        : vars.decision === 'CONFIRM' ? 'Retour confirmé'
        : vars.decision === 'REJECT' ? 'Retour rejeté'
        : vars.decision === 'NEED_INFO' ? 'Précisions demandées'
        : 'Retour remis à trier')
    },
  })
  const comment = useDocsMutation({
    mutationFn: ({ id, content }) =>
      adminRpc('docs_test_finding_comment', { p_finding_id: id, p_content: content }),
    onSuccess: () => { invalidate() },
  })
  /** Après correction : marque le retour et crée une nouvelle tentative pour le même testeur. */
  const requestRetest = useDocsMutation({
    mutationFn: ({ id, note }) =>
      adminRpc('docs_test_finding_request_retest', { p_finding_id: id, p_note: note || null }),
    onSuccess: () => { invalidate(); toast.success('Re-test demandé') },
  })

  return { create, update, triage, comment, requestRetest }
}
