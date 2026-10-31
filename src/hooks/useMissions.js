import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getAdminId } from '../lib/admin'
import { useFilterStore } from '../store/filterStore'
import toast from 'react-hot-toast'

const sanitizeSearch = (s) => (s || '').trim()

/* RPC row → shape attendue par la page */
const reshapeMission = (m) => ({
  ...m,
  client: m.client_name
    ? { full_name: m.client_name, email: m.client_email }
    : null,
  artisan: m.artisan_name
    ? { user: { full_name: m.artisan_name, email: m.artisan_email } }
    : null,
  category: m.category_name ? { name: m.category_name } : null,
  location: m.location_address ? { address_name: m.location_address } : null,
})

export const useMissions = (options = {}) => {
  const queryClient = useQueryClient()
  const { dateRange, globalFilters, sorting, pagination, setPagination } = useFilterStore()

  const missionsQuery = useQuery({
    queryKey: [
      'missions',
      {
        dateRange,
        globalFilters,
        sorting,
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...options,
      },
    ],
    queryFn: async () => {
      const adminId = await getAdminId()

      const { data, error } = await supabase
        .schema('admin')
        .rpc('missions_list', {
          p_admin_id: adminId,
          p_search: globalFilters.search ? sanitizeSearch(globalFilters.search) : null,
          p_status: globalFilters.status || null,
          p_type: globalFilters.type || null,
          p_world: globalFilters.world || null,
          p_category_id: globalFilters.category || null,
          p_date_start: dateRange?.start || null,
          p_date_end: dateRange?.end || null,
          p_sort_by: sorting?.field || 'created_at',
          p_sort_dir: (sorting?.order || 'desc').toUpperCase(),
          p_page: pagination.page,
          p_page_size: pagination.pageSize,
          p_ip: null,
          p_user_agent: null,
        })

      if (error) throw error

      const missions = (data?.missions || []).map(reshapeMission)
      const total = data?.total || 0

      return { missions, total }
    },
    placeholderData: keepPreviousData,
    ...options,
  })

  useEffect(() => {
    if (missionsQuery.data?.total !== undefined) {
      setPagination({ total: missionsQuery.data.total })
    }
  }, [missionsQuery.data?.total, setPagination])

  /* ── Mutations ── */
  const updateMission = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('missions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id_mission', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['missions'] })
      queryClient.invalidateQueries({ queryKey: ['mission', data.id_mission] })
      toast.success('Mission mise à jour')
    },
    onError: (error) => toast.error(`Erreur: ${error.message}`),
  })

  const cancelMission = useMutation({
    mutationFn: async ({ id, reason, reasonCode }) => {
      const { data, error } = await supabase
        .from('missions')
        .update({
          status: 'CANCELLED',
          cancellation_reason: reason,
          cancellation_reason_code: reasonCode || null,
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'SYSTEM',
          updated_at: new Date().toISOString(),
        })
        .eq('id_mission', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] })
      toast.success('Mission annulée')
    },
    onError: (error) => toast.error(`Erreur: ${error.message}`),
  })

  return {
    missions: missionsQuery.data?.missions || [],
    total: missionsQuery.data?.total || 0,
    isLoading: missionsQuery.isLoading,
    isFetching: missionsQuery.isFetching,
    isError: missionsQuery.isError,
    error: missionsQuery.error,
    refetch: missionsQuery.refetch,

    updateMission: updateMission.mutate,
    isUpdating: updateMission.isPending,
    cancelMission: cancelMission.mutate,
    isCancelling: cancelMission.isPending,
  }
}

/* ─────────────────────────────────────────────
   Détail d'une mission
───────────────────────────────────────────── */
export const useMission = (id, options = {}) => {
  const missionQuery = useQuery({
    queryKey: ['mission', id, { ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()

      const { data, error } = await supabase
        .schema('admin')
        .rpc('mission_detail', {
          p_mission_id: id,
          p_admin_id: adminId,
        })

      if (error) throw error
      if (!data) return null
      return data
    },
    enabled: !!id,
    ...options,
  })

  return {
    mission: missionQuery.data,
    isLoading: missionQuery.isLoading,
    isFetching: missionQuery.isFetching,
    isError: missionQuery.isError,
    error: missionQuery.error,
    refetch: missionQuery.refetch,
  }
}