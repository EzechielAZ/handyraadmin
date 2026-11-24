import { adminRpc } from '../../lib/adminRpc'
import { docsKeys } from './keys'
import { useDocsQuery } from './useDocsQuery'

export const useDocsActivity = (limit = 50, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.activity(limit),
    queryFn: () => adminRpc('docs_activity_recent', { p_limit: limit }),
    staleTime: 30_000,
    ...options,
  })
  return {
    activity: q.data?.items || [],
    total:    q.data?.total || 0,
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}