import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getAdminId } from '../lib/admin'
import { useFilterStore } from '../store/filterStore'
import toast from 'react-hot-toast'

const EMPTY_STATS = {
  total: 0, active_accounts: 0, active_30d: 0, active_7d: 0,
  online_now: 0, never_connected: 0, suspended: 0, banned: 0,
}

export const useUsers = (options = {}) => {
  const queryClient = useQueryClient()
  const { globalFilters, sorting, pagination, setPagination } = useFilterStore()

  const usersQuery = useQuery({
    queryKey: ['users', { globalFilters, sorting, page: pagination.page, pageSize: pagination.pageSize, ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()
      const { data, error } = await supabase.schema('admin').rpc('users_list', {
        p_admin_id: adminId,
        p_search: globalFilters.search || null,
        p_role: globalFilters.role || null,
        p_status: globalFilters.status || null,
        p_verified:
          globalFilters.verified === 'true'  ? true  :
          globalFilters.verified === 'false' ? false : null,
        p_sort_by: sorting?.field || 'created_at',
        p_sort_dir: (sorting?.order || 'desc').toUpperCase(),
        p_page: pagination.page,
        p_page_size: pagination.pageSize,
      })
      if (error) throw error
      return {
        users: data?.users || [],
        total: data?.total || 0,
        stats: data?.stats || EMPTY_STATS,
      }
    },
    placeholderData: keepPreviousData,
    ...options,
  })

  useEffect(() => {
    if (usersQuery.data?.total !== undefined) {
      setPagination({ total: usersQuery.data.total })
    }
  }, [usersQuery.data?.total, setPagination])

  return {
    users: usersQuery.data?.users || [],
    total: usersQuery.data?.total || 0,
    stats: usersQuery.data?.stats || EMPTY_STATS,
    isLoading: usersQuery.isLoading,
    isFetching: usersQuery.isFetching,
    isError: usersQuery.isError,
    error: usersQuery.error,
    refetch: usersQuery.refetch,
  }
}

/* ─────────────────────────────────────────────
   Détail + mutations (invalidations complètes)
───────────────────────────────────────────── */
export const useUser = (id, options = {}) => {
  const queryClient = useQueryClient()

  const q = useQuery({
    queryKey: ['user', id, { ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()
      const { data, error } = await supabase.schema('admin').rpc('user_detail', {
        p_user_id: id, p_admin_id: adminId,
      })
      if (error) throw error
      return data
    },
    enabled: !!id,
    ...options,
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['user', id] })
    queryClient.invalidateQueries({ queryKey: ['users'] })   // ← rafraîchit liste + stats
  }

  const updateUser = useMutation({
    mutationFn: async ({ updates }) => {
      const { data, error } = await supabase.from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id_user', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { invalidateAll(); toast.success('Utilisateur mis à jour') },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  const suspendUser = useMutation({
    mutationFn: async ({ reason, durationDays }) => {
      const { data, error } = await supabase.from('users')
        .update({ status: 'SUSPENDED', ban_reason: reason || null, updated_at: new Date().toISOString() })
        .eq('id_user', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { invalidateAll(); toast.success('Utilisateur suspendu') },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  const banUser = useMutation({
    mutationFn: async ({ reason }) => {
      const { data, error } = await supabase.from('users')
        .update({ status: 'BANNED', ban_reason: reason || null, updated_at: new Date().toISOString() })
        .eq('id_user', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { invalidateAll(); toast.success('Utilisateur banni') },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  const reactivateUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('users')
        .update({ status: 'ACTIVE', ban_reason: null, updated_at: new Date().toISOString() })
        .eq('id_user', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { invalidateAll(); toast.success('Compte réactivé') },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  return {
    user: q.data,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    isError: q.isError,
    error: q.error,
    refetch: q.refetch,
    updateUser: updateUser.mutate,       isUpdating: updateUser.isPending,
    suspendUser: suspendUser.mutate,     isSuspending: suspendUser.isPending,
    banUser: banUser.mutate,             isBanning: banUser.isPending,
    reactivateUser: reactivateUser.mutate, isReactivating: reactivateUser.isPending,
  }
}