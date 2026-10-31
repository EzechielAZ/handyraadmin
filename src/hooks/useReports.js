import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getAdminId } from '../lib/admin'
import { useFilterStore } from '../store/filterStore'
import toast from 'react-hot-toast'

export const useReports = (options = {}) => {
  const queryClient = useQueryClient()
  const { dateRange, globalFilters, sorting, pagination, setPagination } = useFilterStore()

  const reportsQuery = useQuery({
    queryKey: ['reports', { dateRange, globalFilters, sorting, page: pagination.page, pageSize: pagination.pageSize, ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()

      const { data, error } = await supabase
        .schema('admin')
        .rpc('reports_list', {
          p_admin_id: adminId,
          p_search: globalFilters.search || null,
          p_status: globalFilters.status || null,
          p_reason: globalFilters.reason || null,
          p_date_start: dateRange?.start || null,
          p_date_end:   dateRange?.end   || null,
          p_sort_by: sorting?.field || 'created_at',
          p_sort_dir: (sorting?.order || 'desc').toUpperCase(),
          p_page: pagination.page,
          p_page_size: pagination.pageSize,
        })

      if (error) throw error

      return {
        reports: data?.reports || [],
        total: data?.total || 0,
        stats: data?.stats || { open: 0, investigating: 0, resolved: 0, dismissed: 0 },
      }
    },
    placeholderData: keepPreviousData,
    ...options,
  })

  useEffect(() => {
    if (reportsQuery.data?.total !== undefined) {
      setPagination({ total: reportsQuery.data.total })
    }
  }, [reportsQuery.data?.total, setPagination])

  const updateReport = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('reports')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id_report', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Signalement mis à jour')
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  return {
    reports: reportsQuery.data?.reports || [],
    total: reportsQuery.data?.total || 0,
    stats: reportsQuery.data?.stats || { open: 0, investigating: 0, resolved: 0, dismissed: 0 },
    isLoading: reportsQuery.isLoading,
    isFetching: reportsQuery.isFetching,
    isError: reportsQuery.isError,
    error: reportsQuery.error,
    refetch: reportsQuery.refetch,
    updateReport: updateReport.mutate,
    isUpdating: updateReport.isPending,
  }
}