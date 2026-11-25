import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminRpc } from '../../lib/adminRpc'
import { docsKeys } from './keys'
import { useDocsQuery, useDocsMutation } from './useDocsQuery'

/* ─── Liste paginée ─── */
export const useFeatures = (filters = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.features.list(filters),
    queryFn: () =>
      adminRpc('docs_feature_list', {
        p_search:    filters.search || null,
        p_module:    filters.module || null,
        p_status:    filters.status || null,
        p_sort_by:   filters.sortBy || 'created_at',
        p_sort_dir:  (filters.sortDir || 'desc').toUpperCase(),
        p_page:      filters.page || 1,
        p_page_size: filters.pageSize || 20,
      }),
  })

  return {
    features:   q.data?.items || [],
    total:      q.data?.total || 0,
    stats:      q.data?.stats || { total: 0, byStatus: {}, byModule: {} },
    isLoading:  q.isLoading,
    isFetching: q.isFetching,
    isError:    q.isError,
    error:      q.error,
    refetch:    q.refetch,
  }
}

/* ─── Détail ─── */
export const useFeature = (ref, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.features.detail(ref),
    queryFn: () => adminRpc('docs_feature_get', { p_ref: ref }),
    enabled: !!ref,
    ...options,
  })

  return {
    feature:         q.data?.feature || null,
    stakeholders:    q.data?.stakeholders || [],
    dependenciesOut: q.data?.dependenciesOut || [],
    dependenciesIn:  q.data?.dependenciesIn || [],
    openIssuesCount: q.data?.openIssuesCount || 0,
    pagesCount:      q.data?.pagesCount || 0,
    isLoading:  q.isLoading,
    isFetching: q.isFetching,
    isError:    q.isError,
    error:      q.error,
    refetch:    q.refetch,
  }
}

/* ─── Mutations ─── */
export const useFeatureMutations = () => {
  const qc = useQueryClient()

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: docsKeys.features.all() })
    qc.invalidateQueries({ queryKey: docsKeys.dashboard() })
  }

  const create = useDocsMutation({
    mutationFn: (payload) =>
      adminRpc('docs_feature_create', {
        p_code:           payload.code,
        p_module:         payload.module,
        p_name:           payload.name,
        p_summary:        payload.summary || null,
        p_description_md: payload.descriptionMd || null,
        p_parent_id:      payload.parentId || null,
        p_priority:       payload.priority || null,
        p_complexity:     payload.complexity || null,
        p_owner_id:       payload.ownerId || null,
      }),
    onSuccess: () => {
      invalidateAll()
      toast.success('Feature créée')
    },
  })

  const update = useDocsMutation({
    mutationFn: ({ id, payload }) =>
      adminRpc('docs_feature_update', { p_feature_id: id, p_payload: payload }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: docsKeys.features.detail(data.feature.id_feature) })
      invalidateAll()
      toast.success('Feature mise à jour')
    },
  })

  const softDelete = useDocsMutation({
    mutationFn: ({ id, reason }) =>
      adminRpc('docs_feature_soft_delete', { p_feature_id: id, p_reason: reason || null }),
    onSuccess: () => {
      invalidateAll()
      toast.success('Feature supprimée')
    },
  })

  const restore = useDocsMutation({
    mutationFn: (id) => adminRpc('docs_feature_restore', { p_feature_id: id }),
    onSuccess: () => {
      invalidateAll()
      toast.success('Feature restaurée')
    },
  })

  const addDependency = useDocsMutation({
    mutationFn: ({ featureId, dependsOnId, type, notes }) =>
      adminRpc('docs_feature_add_dependency', {
        p_feature_id:    featureId,
        p_depends_on_id: dependsOnId,
        p_type:          type || 'BLOCKS',
        p_notes:         notes || null,
      }),
    onSuccess: (data) => {
      invalidateAll()
      toast.success('Dépendance ajoutée')
      return data
    },
  })

  const removeDependency = useDocsMutation({
    mutationFn: (dependencyId) =>
      adminRpc('docs_feature_remove_dependency', { p_dependency_id: dependencyId }),
    onSuccess: () => {
      invalidateAll()
      toast.success('Dépendance retirée')
    },
  })

  return {
    create,
    update,
    softDelete,
    restore,
    addDependency,
    removeDependency,
  }
}

/* ─── Arbre ─── */
export const useFeatureTree = (rootId = null, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.features.tree(rootId),
    queryFn: () => adminRpc('docs_feature_tree', { p_root_id: rootId }),
    ...options,
  })
  return {
    tree:      q.data?.tree || [],
    isLoading: q.isLoading,
    isError:   q.isError,
    error:     q.error,
  }
}

/* ─── Recherche ─── */
export const useFeatureSearch = (query, limit = 20, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.features.search(query, limit),
    queryFn: () => adminRpc('docs_feature_search', { p_query: query, p_limit: limit }),
    enabled: !!query && query.trim().length > 0,
    staleTime: 15_000,
    ...options,
  })
  return {
    results:   q.data?.items || [],
    total:     q.data?.total || 0,
    isLoading: q.isLoading,
    isError:   q.isError,
    error:     q.error,
  }
}