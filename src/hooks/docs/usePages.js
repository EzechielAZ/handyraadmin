import { adminRpc } from '../../lib/adminRpc'
import { docsKeys } from './keys'
import { useDocsQuery, useDocsMutation } from './useDocsQuery'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

/* ─── Liste paginée ─── */
export const usePages = (filters = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.pages.list(filters),
    queryFn: () =>
      adminRpc('docs_page_list', {
        p_search:     filters.search || null,
        p_category:   filters.category || null,
        p_status:     filters.status || null,
        p_feature_id: filters.featureId || null,
        p_page:       filters.page || 1,
        p_page_size:  filters.pageSize || 20,
      }),
  })
  return {
    pages:    q.data?.items || [],
    total:    q.data?.total || 0,
    stats:    q.data?.stats || { total: 0, byStatus: {}, byCategory: {} },
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/* ─── Détail ─── */
export const usePage = (ref, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.pages.detail(ref),
    queryFn: () => adminRpc('docs_page_get', { p_ref: ref }),
    enabled: !!ref,
    ...options,
  })
  return {
    page:      q.data?.page || null,
    backlinks: q.data?.backlinks || [],
    outlinks:  q.data?.outlinks || [],
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/* ─── Versions ─── */
export const usePageVersions = (pageId, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.pages.versions(pageId),
    queryFn: () => adminRpc('docs_page_get_versions', { p_page_id: pageId }),
    enabled: !!pageId,
    ...options,
  })
  return {
    versions: q.data?.versions || [],
    isLoading: q.isLoading, isError: q.isError, error: q.error,
  }
}

/* ─── Recherche ─── */
export const usePageSearch = (query, limit = 20, options = {}) => {
  const q = useDocsQuery({
    queryKey: docsKeys.pages.search(query, limit),
    queryFn: () => adminRpc('docs_page_search', { p_query: query, p_limit: limit }),
    enabled: !!query && query.trim().length > 0,
    staleTime: 15_000,
    ...options,
  })
  return {
    results: q.data?.items || [], total: q.data?.total || 0,
    isLoading: q.isLoading, isError: q.isError, error: q.error,
  }
}

/* ─── Mutations ─── */
export const usePageMutations = () => {
  const qc = useQueryClient()

  /*
   * IMPORTANT : usePage(ref) met en cache sous detail(ref) où `ref` est le slug
   * (paramètre d'URL), alors que les mutations connaissent l'UUID (id_page).
   * On invalide donc par PRÉFIXE (pages.all()) : liste, détail (slug ou UUID),
   * versions et recherche sont tous rafraîchis.
   * Prérequis : dans keys.js, list/detail/versions/search commencent par all().
   */
  const invalidateList = () => {
    qc.invalidateQueries({ queryKey: docsKeys.pages.all() })
    qc.invalidateQueries({ queryKey: docsKeys.dashboard() })
  }

  const create = useDocsMutation({
    mutationFn: (p) => adminRpc('docs_page_create', {
      p_slug:       p.slug,
      p_title:      p.title,
      p_category:   p.category,
      p_content_md: p.contentMd,
      p_summary:    p.summary || null,
      p_parent_id:  p.parentId || null,
      p_feature_id: p.featureId || null,
      p_visibility: p.visibility || 'INTERNAL',
      p_tags:       p.tags || [],
    }),
    onSuccess: () => {
      invalidateList()
      toast.success('Page créée')
    },
  })

  const update = useDocsMutation({
    mutationFn: ({ id, payload, changeSummary }) =>
      adminRpc('docs_page_update', {
        p_page_id: id, p_payload: payload, p_change_summary: changeSummary || null,
      }),
    onSuccess: (data) => {
      invalidateList()
      toast.success(`Page mise à jour (v${data.versionNumber})`)
    },
  })

  const publish = useDocsMutation({
    mutationFn: (id) => adminRpc('docs_page_publish', { p_page_id: id }),
    onSuccess: () => {
      invalidateList()
      toast.success('Page publiée')
    },
  })

  const archive = useDocsMutation({
    mutationFn: (id) => adminRpc('docs_page_archive', { p_page_id: id }),
    onSuccess: () => {
      invalidateList()
      toast.success('Page archivée')
    },
  })

  const softDelete = useDocsMutation({
    mutationFn: ({ id, reason }) =>
      adminRpc('docs_page_soft_delete', { p_page_id: id, p_reason: reason || null }),
    onSuccess: () => { invalidateList(); toast.success('Page supprimée') },
  })

  const restoreVersion = useDocsMutation({
    mutationFn: ({ pageId, versionId }) =>
      adminRpc('docs_page_restore_version', { p_page_id: pageId, p_version_id: versionId }),
    onSuccess: () => {
      invalidateList()
      toast.success('Version restaurée')
    },
  })

  return { create, update, publish, archive, softDelete, restoreVersion }
}