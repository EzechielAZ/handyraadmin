import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getAdminId } from '../lib/admin'
import { useFilterStore } from '../store/filterStore'
import toast from 'react-hot-toast'

/* ─────────────────────────────────────────────
   Reshaper : flat row (RPC) → shape imbriquée (UI)
───────────────────────────────────────────── */
const reshapeArtisan = (a) => ({
  id_artisan: a.id_artisan,
  ifu_number: a.ifu_number,
  kyc_status: a.kyc_status,
  availability_status: a.availability_status,
  average_rating: a.average_rating,
  total_missions: a.total_missions,
  is_pro_member: a.is_pro_member,
  created_at: a.created_at,
  experience_years: a.experience_years,
  bio: a.bio,
  user: {
    full_name: a.full_name,
    email: a.email,
    phone_number: a.phone_number,
    avatar_url: a.avatar_url,
    is_verified: a.is_verified,
    status: a.user_status,
    created_at: a.user_created_at,
  },
  category: a.category_name
    ? { name: a.category_name, icon_url: a.category_icon }
    : null,
  badge: a.badge_name
    ? { name: a.badge_name, icon_url: a.badge_icon, hpre_bonus_points: a.badge_points }
    : null,
  wallet: a.wallet_balance !== null && a.wallet_balance !== undefined
    ? {
        balance: a.wallet_balance,
        frozen_balance: a.wallet_frozen,
        currency: a.wallet_currency,
      }
    : null,
})

const EMPTY_STATS = {
  validated: 0,
  pending: 0,
  proMembers: 0,
  available: 0,
  suspended: 0,
}

/* ─────────────────────────────────────────────
   Liste paginée des artisans
───────────────────────────────────────────── */
export const useArtisans = (options = {}) => {
  const queryClient = useQueryClient()
  const { globalFilters, sorting, pagination, setPagination } = useFilterStore()

  const artisansQuery = useQuery({
    queryKey: [
      'artisans',
      {
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
        .rpc('artisans_list', {
          p_admin_id: adminId,
          p_search: globalFilters.search || null,
          p_kyc_status: globalFilters.status || null,
          p_availability: globalFilters.availability || null,
          p_category_id: globalFilters.category || null,
          p_is_pro: globalFilters.isProMember ?? null,
          p_sort_by: sorting?.field || 'created_at',
          p_sort_dir: (sorting?.order || 'desc').toUpperCase(),
          p_page: pagination.page,
          p_page_size: pagination.pageSize,
        })

      if (error) throw error

      return {
        artisans: (data?.artisans || []).map(reshapeArtisan),
        total: data?.total || 0,
        stats: data?.stats || EMPTY_STATS,
      }
    },
    placeholderData: keepPreviousData,
    ...options,
  })

  useEffect(() => {
    if (artisansQuery.data?.total !== undefined) {
      setPagination({ total: artisansQuery.data.total })
    }
  }, [artisansQuery.data?.total, setPagination])

  /* ── Mutations ── */
  const updateArtisan = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('artisan_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id_artisan', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artisans'] })
      queryClient.invalidateQueries({ queryKey: ['artisan'] })
      toast.success('Artisan mis à jour')
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  const validateKYC = useMutation({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from('artisan_profiles')
        .update({ kyc_status: status, updated_at: new Date().toISOString() })
        .eq('id_artisan', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['artisans'] })
      queryClient.invalidateQueries({ queryKey: ['artisan'] })
      toast.success(`KYC ${d.kyc_status === 'VALIDATED' ? 'validé' : 'rejeté'}`)
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  const suspendArtisan = useMutation({
    mutationFn: async ({ id, reason, suspensionType, durationDays }) => {
      const { error: userError } = await supabase
        .from('users')
        .update({
          status: 'SUSPENDED',
          ban_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id_user', id)
      if (userError) throw userError

      await supabase
        .from('artisan_profiles')
        .update({ availability_status: 'OFFLINE', updated_at: new Date().toISOString() })
        .eq('id_artisan', id)

      const validTypes = ['CONSECUTIVE_DISPUTES', 'RATE_15_20', 'RATE_20_30', 'PERMANENT_BAN']
      const finalType = validTypes.includes(suspensionType) ? suspensionType : 'RATE_15_20'
      const suspendedUntil = durationDays
        ? new Date(Date.now() + durationDays * 86400000).toISOString()
        : null

      await supabase.from('artisan_suspensions').insert({
        artisan_id: id,
        suspension_type: finalType,
        suspended_until: suspendedUntil,
        is_active: true,
      })

      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artisans'] })
      queryClient.invalidateQueries({ queryKey: ['artisan'] })
      toast.success('Artisan suspendu')
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  const reactivateArtisan = useMutation({
    mutationFn: async ({ id }) => {
      await supabase
        .from('artisan_suspensions')
        .update({ is_active: false, lifted_at: new Date().toISOString() })
        .eq('artisan_id', id)
        .eq('is_active', true)

      const { error } = await supabase
        .from('users')
        .update({
          status: 'ACTIVE',
          ban_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id_user', id)
      if (error) throw error

      await supabase
        .from('artisan_profiles')
        .update({ availability_status: 'AVAILABLE', updated_at: new Date().toISOString() })
        .eq('id_artisan', id)

      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artisans'] })
      queryClient.invalidateQueries({ queryKey: ['artisan'] })
      toast.success('Artisan réactivé')
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  return {
    artisans: artisansQuery.data?.artisans || [],
    total: artisansQuery.data?.total || 0,
    stats: artisansQuery.data?.stats || EMPTY_STATS,
    isLoading: artisansQuery.isLoading,
    isFetching: artisansQuery.isFetching,
    isError: artisansQuery.isError,
    error: artisansQuery.error,
    refetch: artisansQuery.refetch,

    updateArtisan: updateArtisan.mutate,
    isUpdating: updateArtisan.isPending,

    validateKYC: validateKYC.mutate,
    isValidating: validateKYC.isPending,

    suspendArtisan: suspendArtisan.mutate,
    isSuspending: suspendArtisan.isPending,

    reactivateArtisan: reactivateArtisan.mutate,
    isReactivating: reactivateArtisan.isPending,
  }
}

/* ─────────────────────────────────────────────
   Détail d'un artisan (avec mutations)
───────────────────────────────────────────── */
export const useArtisan = (id, options = {}) => {
  const queryClient = useQueryClient()

  const q = useQuery({
    queryKey: ['artisan', id, { ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()
      const { data, error } = await supabase
        .schema('admin')
        .rpc('artisan_detail', { p_artisan_id: id, p_admin_id: adminId })
      if (error) throw error
      return data
    },
    enabled: !!id,
    ...options,
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['artisan', id] })
    queryClient.invalidateQueries({ queryKey: ['artisans'] })
  }

  const updateArtisan = useMutation({
    mutationFn: async ({ updates }) => {
      const { data, error } = await supabase
        .from('artisan_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id_artisan', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => { invalidateAll(); toast.success('Artisan mis à jour') },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  const validateKYC = useMutation({
    mutationFn: async ({ status, notes }) => {
      const { data, error } = await supabase
        .from('artisan_profiles')
        .update({ kyc_status: status, updated_at: new Date().toISOString() })
        .eq('id_artisan', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (d) => {
      invalidateAll()
      toast.success(`KYC ${d.kyc_status === 'VALIDATED' ? 'validé' : 'rejeté'}`)
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  const suspendArtisan = useMutation({
    mutationFn: async ({ reason, suspensionType, durationDays }) => {
      const { error: ue } = await supabase
        .from('users')
        .update({
          status: 'SUSPENDED',
          ban_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id_user', id)
      if (ue) throw ue

      await supabase
        .from('artisan_profiles')
        .update({ availability_status: 'OFFLINE', updated_at: new Date().toISOString() })
        .eq('id_artisan', id)

      const valid = ['CONSECUTIVE_DISPUTES', 'RATE_15_20', 'RATE_20_30', 'PERMANENT_BAN']
      const finalType = valid.includes(suspensionType) ? suspensionType : 'RATE_15_20'
      const suspendedUntil = durationDays
        ? new Date(Date.now() + durationDays * 86400000).toISOString()
        : null

      await supabase.from('artisan_suspensions').insert({
        artisan_id: id,
        suspension_type: finalType,
        suspended_until: suspendedUntil,
        is_active: true,
      })

      return { id }
    },
    onSuccess: () => { invalidateAll(); toast.success('Artisan suspendu') },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  const reactivateArtisan = useMutation({
    mutationFn: async () => {
      await supabase
        .from('artisan_suspensions')
        .update({ is_active: false, lifted_at: new Date().toISOString() })
        .eq('artisan_id', id)
        .eq('is_active', true)

      const { error } = await supabase
        .from('users')
        .update({
          status: 'ACTIVE',
          ban_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id_user', id)
      if (error) throw error

      await supabase
        .from('artisan_profiles')
        .update({ availability_status: 'AVAILABLE', updated_at: new Date().toISOString() })
        .eq('id_artisan', id)

      return { id }
    },
    onSuccess: () => { invalidateAll(); toast.success('Artisan réactivé') },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  return {
    artisan: q.data,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    isError: q.isError,
    error: q.error,
    refetch: q.refetch,

    updateArtisan: updateArtisan.mutate,
    isUpdating: updateArtisan.isPending,

    validateKYC: validateKYC.mutate,
    isValidating: validateKYC.isPending,

    suspendArtisan: suspendArtisan.mutate,
    isSuspending: suspendArtisan.isPending,

    reactivateArtisan: reactivateArtisan.mutate,
    isReactivating: reactivateArtisan.isPending,
  }
}