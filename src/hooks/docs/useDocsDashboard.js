import { adminRpc } from '../../lib/adminRpc'
import { docsKeys } from './keys'
import { useDocsQuery } from './useDocsQuery'

export const useDocsDashboard = (options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.dashboard(),
    queryFn: () => adminRpc('docs_dashboard_overview', {}),
    staleTime: 60_000,
    ...options,
  })
  return {
    features: q.data?.features || { total: 0, live: 0, inDev: 0, byModule: {} },
    issues:   q.data?.issues   || { open: 0, criticalOpen: 0, bySeverity: {} },
    releases: q.data?.releases || { current: null, upcomingCount: 0, releasedCount: 0 },
    pages:    q.data?.pages    || { published: 0, stale: 0 },
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

export const useModuleHealth = (module = null, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.moduleHealth(module),
    queryFn: () => adminRpc('docs_module_health', { p_module: module }),
    staleTime: 60_000,
    ...options,
  })
  return {
    modules: q.data?.modules || [],
    isLoading: q.isLoading, isError: q.isError, error: q.error, refetch: q.refetch,
  }
}