import { adminRpc } from '../../lib/adminRpc'
import { docsKeys } from './keys'
import { useDocsQuery } from './useDocsQuery'

/**
 * Recherche globale (features + pages + issues).
 * Utilise un debounce externe (useDebounce) côté composant.
 */
export const useDocsGlobalSearch = (query, limit = 30, options = {}) => {
  const trimmed = (query || '').trim()
  const q = useDocsQuery({
    queryKey: docsKeys.search(trimmed, limit),
    queryFn: () => adminRpc('docs_global_search', { p_query: trimmed, p_limit: limit }),
    enabled: trimmed.length >= 2,
    staleTime: 20_000,
    ...options,
  })
  return {
    items: q.data?.items || [],
    total: q.data?.total || 0,
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error,
  }
}