import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { getAdminId } from '../lib/admin'
import { useFilterStore } from '../store/filterStore'
import { INSTANT_SECTIONS } from '../pages/Missions/missionsConfig'

/* Toutes les clés commencent par ['missions-admin', …] : un seul invalidateQueries({queryKey:['missions-admin']})
   rafraîchit ce qui est affiché, sans toucher à ce qui n'a pas été chargé.
   (L'ancien hook useMissions.js n'est pas modifié : il continue de servir les autres écrans.) */

const rpc = async (fn, args) => {
  const { data, error } = await supabase.schema('admin').rpc(fn, args)
  if (error) throw error
  return data
}

/* ───────────── Liste paginée (onglet Missions) ───────────── */
const SORTABLE = new Set(['created_at', 'scheduled_at', 'status', 'amount', 'client_name', 'artisan_name', 'category_name', 'attempts'])

const listArgs = (adminId, s, o = {}) => ({
  p_admin_id: adminId,
  p_search: s.globalFilters.search || null,
  p_statuses: s.globalFilters.status ? [s.globalFilters.status] : null,
  p_type: s.globalFilters.type || null,
  p_category_id: s.globalFilters.category || null,
  p_attention: s.globalFilters.attention || null,
  p_cancelled_by: s.globalFilters.cancelledBy || null,
  p_artisan_id: s.globalFilters.artisanId || null,
  p_client_id: s.globalFilters.clientId || null,
  p_date_start: s.dateRange?.start || null,
  p_date_end: s.dateRange?.end || null,
  p_sort_by: SORTABLE.has(s.sorting?.field) ? s.sorting.field : 'created_at',
  p_sort_dir: (s.sorting?.order || 'desc').toUpperCase(),
  p_page: s.pagination.page,
  p_page_size: s.pagination.pageSize,
  ...o,
})

export const listQueryOptions = (s) => ({
  queryKey: ['missions-admin', 'list', {
    start: s.dateRange?.start || null, end: s.dateRange?.end || null,
    search: s.globalFilters.search || null, status: s.globalFilters.status || null,
    type: s.globalFilters.type || null, category: s.globalFilters.category || null,
    attention: s.globalFilters.attention || null, cancelledBy: s.globalFilters.cancelledBy || null,
    artisanId: s.globalFilters.artisanId || null, clientId: s.globalFilters.clientId || null,
    sortBy: s.sorting?.field || null, sortDir: s.sorting?.order || null,
    page: s.pagination.page, pageSize: s.pagination.pageSize,
  }],
  queryFn: async () => {
    const data = await rpc('missions_search', listArgs(await getAdminId(), s))
    return { items: data?.items || [], total: data?.total || 0, facets: data?.facets || {} }
  },
  staleTime: 30_000,
})

export const useMissionsList = ({ enabled = true } = {}) => {
  const state = useFilterStore()
  const query = useQuery({ ...listQueryOptions(state), placeholderData: keepPreviousData, enabled })

  const total = query.data?.total
  const { setPagination } = state
  useEffect(() => {
    if (total !== undefined) setPagination({ total })
  }, [total, setPagination])

  return {
    missions: query.data?.items || [],
    total: query.data?.total || 0,
    facets: query.data?.facets || {},
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/* Export : TOUTES les lignes filtrées (max 5000), à la demande uniquement */
export const fetchMissionsForExport = async ({ onlyPeriod = false } = {}) => {
  const s = useFilterStore.getState()
  const scope = onlyPeriod
    ? { p_search: null, p_statuses: null, p_type: null, p_category_id: null, p_attention: null, p_cancelled_by: null }
    : {}
  const data = await rpc('missions_search', listArgs(await getAdminId(), s, { ...scope, p_page: 1, p_page_size: 5000 }))
  return data?.items || []
}

/* ───────────── Une SECTION du tableau de bord ───────────── */
export const sectionQueryOptions = (section, dateRange) => {
  const instant = INSTANT_SECTIONS.has(section)
  const start = instant ? null : dateRange?.start || null
  const end = instant ? null : dateRange?.end || null
  return {
    queryKey: ['missions-admin', 'section', section, { start, end }],
    queryFn: async () => rpc('missions_section', {
      p_admin_id: await getAdminId(), p_section: section, p_date_start: start, p_date_end: end,
    }),
    staleTime: instant ? 30_000 : 60_000,
    refetchOnWindowFocus: false,
  }
}

export const useMissionSection = (section, { enabled = true } = {}) => {
  const dateRange = useFilterStore((s) => s.dateRange)
  return useQuery({
    ...sectionQueryOptions(section, dateRange),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/* ───────────── Détail d'UNE mission : un onglet = une requête ───────────── */
export const useMissionDetail = (id, section, { enabled = true } = {}) =>
  useQuery({
    queryKey: ['missions-admin', 'detail', id, section],
    queryFn: async () => rpc('mission_detail_section', {
      p_admin_id: await getAdminId(), p_mission_id: id, p_section: section,
    }),
    enabled: !!id && enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

/* ───────────── Préchargement au survol d'un onglet de la liste ───────────── */
export const usePrefetchMissionsTab = () => {
  const qc = useQueryClient()
  return (tab) => {
    const s = useFilterStore.getState()
    if (tab === 'missions') qc.prefetchQuery(listQueryOptions(s))
    if (tab === 'analytics') qc.prefetchQuery(sectionQueryOptions('cancellations', s.dateRange))
  }
}

/* ───────────── Actions (écriture + journal côté base) ───────────── */
export const useMissionActions = () => {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['missions-admin'] })
    /* caches des anciens écrans (liste historique, détail, tableau de bord, paiements) */
    qc.invalidateQueries({ queryKey: ['missions'] })
    qc.invalidateQueries({ queryKey: ['mission'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['payments'] })
  }
  const fail = (e) => toast.error(e?.message || 'Action impossible')

  const cancel = useMutation({
    mutationFn: async ({ id, reasonCode, reason }) => rpc('mission_cancel', {
      p_admin_id: await getAdminId(), p_mission_id: id, p_reason_code: reasonCode || null, p_reason: reason || null,
    }),
    onSuccess: (r) => {
      refresh()
      toast.success(r?.refund_started ? 'Mission annulée · remboursement lancé' : 'Mission annulée')
    },
    onError: fail,
  })

  const complete = useMutation({
    mutationFn: async ({ id, note }) => rpc('mission_complete', {
      p_admin_id: await getAdminId(), p_mission_id: id, p_note: note,
    }),
    onSuccess: () => { refresh(); toast.success('Mission terminée') },
    onError: fail,
  })

  const addNote = useMutation({
    mutationFn: async ({ id, note }) => rpc('mission_add_note', {
      p_admin_id: await getAdminId(), p_mission_id: id, p_note: note,
    }),
    onSuccess: () => { refresh(); toast.success('Note ajoutée') },
    onError: fail,
  })

  return { cancel, complete, addNote }
}