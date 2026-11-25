import { adminRpc } from '../../lib/adminRpc'
import { docsKeys } from './keys'
import { useDocsQuery, useDocsMutation } from './useDocsQuery'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export const useRunbooks = (filters = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.runbooks.list(filters),
    queryFn: () =>
      adminRpc('docs_runbook_list', { p_category: filters.category || null }),
    staleTime: 5 * 60_000,
  })
  return {
    runbooks: q.data?.items || [],
    total:    q.data?.total || 0,
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

export const useRunbookMutations = () => {
  const qc = useQueryClient()
  const invalidateAll = () => qc.invalidateQueries({ queryKey: docsKeys.runbooks.all() })

  const create = useDocsMutation({
    mutationFn: (p) => adminRpc('docs_runbook_create', {
      p_title:         p.title,
      p_category:      p.category,
      p_steps_md:      p.stepsMd,
      p_trigger_md:    p.triggerMd || null,
      p_rollback_md:   p.rollbackMd || null,
      p_feature_id:    p.featureId || null,
      p_severity_scope:p.severityScope || null,
    }),
    onSuccess: () => { invalidateAll(); toast.success('Runbook créé') },
  })

  const update = useDocsMutation({
    mutationFn: ({ id, payload }) =>
      adminRpc('docs_runbook_update', { p_runbook_id: id, p_payload: payload }),
    onSuccess: () => { invalidateAll(); toast.success('Runbook mis à jour') },
  })

  return { create, update }
}