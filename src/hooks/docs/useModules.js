import { adminRpc } from '../../lib/adminRpc'
import { useDocsQuery } from './useDocsQuery'
import { MODULE_SUGGESTIONS } from './constants'

/** Référentiel des modules (table docs.modules). Repli sur MODULE_SUGGESTIONS tant que la migration 006 n'est pas appliquée. */
export const useModuleCodes = () => {
  const q = useDocsQuery({
    queryKey: ['docs', 'modules'],
    queryFn: () => adminRpc('docs_module_list'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  return q.data?.length ? q.data.map((m) => m.code) : MODULE_SUGGESTIONS
}
