import { useEffect } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getAdminId } from '../lib/admin'
import { useFilterStore } from '../store/filterStore'
import { INSTANT_SECTIONS } from '../pages/Payments/paymentsConfig'

/* Toutes les clés commencent par ['payments', …] : un seul invalidateQueries({queryKey:['payments']})
   rafraîchit ce qui est affiché, sans toucher à ce qui n'a pas été chargé. */

const rpc = async (fn, args) => {
  const { data, error } = await supabase.schema('admin').rpc(fn, args)
  if (error) throw error
  return data
}

/* ───────────── Liste paginée (onglet Transactions) ───────────── */
const listArgs = (adminId, s, o = {}) => ({
  p_admin_id: adminId,
  p_search: s.globalFilters.search || null,
  p_status: s.globalFilters.status || null,
  p_method: s.globalFilters.method || null,
  p_flow: s.globalFilters.flow || null,
  p_date_start: s.dateRange?.start || null,
  p_date_end: s.dateRange?.end || null,
  p_sort_by: s.sorting?.field || 'occurred_at',
  p_sort_dir: (s.sorting?.order || 'desc').toUpperCase(),
  p_page: s.pagination.page,
  p_page_size: s.pagination.pageSize,
  ...o,
})

export const listQueryOptions = (s) => ({
  queryKey: ['payments', 'list', {
    start: s.dateRange?.start || null, end: s.dateRange?.end || null,
    search: s.globalFilters.search || null, status: s.globalFilters.status || null,
    method: s.globalFilters.method || null, flow: s.globalFilters.flow || null,
    sortBy: s.sorting?.field || null, sortDir: s.sorting?.order || null,
    page: s.pagination.page, pageSize: s.pagination.pageSize,
  }],
  queryFn: async () => {
    const data = await rpc('payments_ledger_list', listArgs(await getAdminId(), s))
    return { items: data?.items || [], total: data?.total || 0 }
  },
  staleTime: 30_000,
})

export const usePayments = ({ enabled = true } = {}) => {
  const state = useFilterStore()
  const query = useQuery({ ...listQueryOptions(state), placeholderData: keepPreviousData, enabled })

  const total = query.data?.total
  const { setPagination } = state
  useEffect(() => {
    if (total !== undefined) setPagination({ total })
  }, [total, setPagination])

  return {
    payments: query.data?.items || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/* Export : TOUTES les lignes filtrées (max 5000), à la demande uniquement */
export const fetchPaymentsForExport = async ({ onlyPeriod = false } = {}) => {
  const s = useFilterStore.getState()
  const scope = onlyPeriod ? { p_search: null, p_status: null, p_method: null, p_flow: null } : {}
  const data = await rpc('payments_ledger_list', listArgs(await getAdminId(), s, { ...scope, p_page: 1, p_page_size: 5000 }))
  return data?.items || []
}

/* ───────────── Une SECTION du tableau de bord ───────────── */
export const sectionQueryOptions = (section, dateRange) => {
  const instant = INSTANT_SECTIONS.has(section)
  const start = instant ? null : dateRange?.start || null
  const end = instant ? null : dateRange?.end || null
  return {
    queryKey: ['payments', 'section', section, { start, end }],
    queryFn: async () => rpc('payments_section', {
      p_admin_id: await getAdminId(), p_section: section, p_date_start: start, p_date_end: end,
    }),
    staleTime: instant ? 30_000 : 60_000,
    refetchOnWindowFocus: false,
  }
}

export const usePaymentSection = (section, { enabled = true } = {}) => {
  const dateRange = useFilterStore((s) => s.dateRange)
  return useQuery({
    ...sectionQueryOptions(section, dateRange),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/* ───────────── Détail d'UNE opération (tiroir) ───────────── */
export const usePaymentDetail = (flow, id) =>
  useQuery({
    queryKey: ['payments', 'detail', flow, id],
    queryFn: async () => rpc('payments_ledger_detail', {
      p_admin_id: await getAdminId(), p_flow: flow, p_entry_id: id,
    }),
    enabled: !!flow && !!id,
    staleTime: 60_000,
  })

/* ───────────── Préchargement au survol d'un onglet ───────────── */
export const usePrefetchPaymentsTab = () => {
  const qc = useQueryClient()
  return (tab) => {
    const s = useFilterStore.getState()
    if (tab === 'transactions') qc.prefetchQuery(listQueryOptions(s))
    if (tab === 'analytics') qc.prefetchQuery(sectionQueryOptions('tx_series', s.dateRange))
  }
}

/* Conservé : d'autres écrans utilisent peut-être l'ancienne RPC */
export const usePaymentStats = (options = {}) => {
  const { dateRange } = useFilterStore()
  return useQuery({
    queryKey: ['payments', 'stats', { start: dateRange?.start || null, end: dateRange?.end || null }],
    queryFn: async () => (await rpc('payments_stats', {
      p_admin_id: await getAdminId(),
      p_date_start: dateRange?.start || null, p_date_end: dateRange?.end || null,
    })) || { total_amount: 0, by_method: [], daily: [] },
    placeholderData: keepPreviousData,
    ...options,
  })
}