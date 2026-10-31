import { useEffect } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getAdminId } from '../lib/admin'
import { useFilterStore } from '../store/filterStore'

export const usePayments = (options = {}) => {
  const { dateRange, globalFilters, sorting, pagination, setPagination } = useFilterStore()

  const paymentsQuery = useQuery({
    queryKey: ['payments', { dateRange, globalFilters, sorting, page: pagination.page, pageSize: pagination.pageSize, ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()

      const { data, error } = await supabase
        .schema('admin')
        .rpc('payments_list', {
          p_admin_id: adminId,
          p_search: globalFilters.search || null,
          p_status: globalFilters.status || null,
          p_method: globalFilters.method || null,
          p_date_start: dateRange?.start || null,
          p_date_end:   dateRange?.end   || null,
          p_sort_by: sorting?.field || 'processed_at',
          p_sort_dir: (sorting?.order || 'desc').toUpperCase(),
          p_page: pagination.page,
          p_page_size: pagination.pageSize,
        })

      if (error) throw error

      return {
        payments: data?.payments || [],
        total: data?.total || 0,
        totals: data?.totals || { total: 0, fees: 0, net: 0 },
      }
    },
    placeholderData: keepPreviousData,
    ...options,
  })

  useEffect(() => {
    if (paymentsQuery.data?.total !== undefined) {
      setPagination({ total: paymentsQuery.data.total })
    }
  }, [paymentsQuery.data?.total, setPagination])

  return {
    payments: paymentsQuery.data?.payments || [],
    total: paymentsQuery.data?.total || 0,
    totals: paymentsQuery.data?.totals || { total: 0, fees: 0, net: 0 },
    isLoading: paymentsQuery.isLoading,
    isFetching: paymentsQuery.isFetching,
    isError: paymentsQuery.isError,
    error: paymentsQuery.error,
    refetch: paymentsQuery.refetch,
  }
}

/* ─────────────────────────────────────────────
   Stats agrégées (méthodes + quotidien)
───────────────────────────────────────────── */
export const usePaymentStats = (options = {}) => {
  const { dateRange } = useFilterStore()

  const statsQuery = useQuery({
    queryKey: ['payments_stats', { dateRange, ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()

      const { data, error } = await supabase
        .schema('admin')
        .rpc('payments_stats', {
          p_admin_id: adminId,
          p_date_start: dateRange?.start || null,
          p_date_end:   dateRange?.end   || null,
        })

      if (error) throw error
      return data || { total_amount: 0, by_method: [], daily: [] }
    },
    placeholderData: keepPreviousData,
    ...options,
  })

  return {
    data: statsQuery.data,
    isLoading: statsQuery.isLoading,
    isFetching: statsQuery.isFetching,
    isError: statsQuery.isError,
    error: statsQuery.error,
    refetch: statsQuery.refetch,
  }
}