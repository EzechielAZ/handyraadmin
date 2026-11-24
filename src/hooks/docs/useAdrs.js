import { adminRpc } from '../../lib/adminRpc'
import { docsKeys } from './keys'
import { useDocsQuery, useDocsMutation } from './useDocsQuery'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export const useAdrs = (filters = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.adrs.list(filters),
    queryFn: () =>
      adminRpc('docs_adr_list', {
        p_status: filters.status || null,
        p_limit: filters.limit || 100,
      }),
    staleTime: 5 * 60_000,
  })
  return {
    adrs:    q.data?.items || [],
    total:   q.data?.total || 0,
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

export const useAdr = (id, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.adrs.detail(id),
    queryFn: async () => {
      // Détail via la liste complète (pas de RPC dédiée)
      const { items } = await adminRpc('docs_adr_list', { p_limit: 500 })
      return items.find((a) => a.id_adr === id) || null
    },
    enabled: !!id,
    ...options,
  })
  return {
    adr: q.data || null,
    isLoading: q.isLoading, isError: q.isError, error: q.error,
  }
}

export const useAdrMutations = () => {
  const qc = useQueryClient()
  const invalidateAll = () => qc.invalidateQueries({ queryKey: docsKeys.adrs.all() })

  const create = useDocsMutation({
    mutationFn: (p) => adminRpc('docs_adr_create', {
      p_title:           p.title,
      p_context_md:      p.contextMd,
      p_decision_md:     p.decisionMd,
      p_consequences_md: p.consequencesMd || null,
      p_alternatives_md: p.alternativesMd || null,
      p_feature_id:      p.featureId || null,
    }),
    onSuccess: (data) => { invalidateAll(); toast.success(`ADR-${data.adr.number} créé`) },
  })

  const update = useDocsMutation({
    mutationFn: ({ id, payload }) =>
      adminRpc('docs_adr_update', { p_adr_id: id, p_payload: payload }),
    onSuccess: () => { invalidateAll(); toast.success('ADR mis à jour') },
  })

  const supersede = useDocsMutation({
    mutationFn: ({ oldId, newId }) =>
      adminRpc('docs_adr_supersede', { p_old_id: oldId, p_new_id: newId }),
    onSuccess: () => { invalidateAll(); toast.success('ADR remplacé') },
  })

  return { create, update, supersede }
}