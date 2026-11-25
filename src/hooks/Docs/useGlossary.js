import { adminRpc } from '../../lib/adminRpc'
import { docsKeys } from './keys'
import { useDocsQuery, useDocsMutation } from './useDocsQuery'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export const useGlossary = (filters = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.glossary.list(filters),
    queryFn: () =>
      adminRpc('docs_glossary_list', { p_category: filters.category || null }),
    staleTime: 5 * 60_000,
  })
  return {
    terms: q.data?.items || [],
    total: q.data?.total || 0,
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

export const useGlossaryMutations = () => {
  const qc = useQueryClient()
  const invalidateAll = () => qc.invalidateQueries({ queryKey: docsKeys.glossary.all() })

  const upsert = useDocsMutation({
    mutationFn: (p) => adminRpc('docs_glossary_upsert', {
      p_term:        p.term,
      p_definition:  p.definition,
      p_example_md:  p.exampleMd || null,
      p_category:    p.category || null,
      p_related:     p.related || [],
    }),
    onSuccess: () => { invalidateAll(); toast.success('Terme enregistré') },
  })

  const remove = useDocsMutation({
    mutationFn: (id) => adminRpc('docs_glossary_delete', { p_term_id: id }),
    onSuccess: () => { invalidateAll(); toast.success('Terme supprimé') },
  })

  return { upsert, remove }
}