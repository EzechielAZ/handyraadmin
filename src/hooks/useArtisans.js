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
  kyc_stage: a.kyc_stage,
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

/* null = donnée indisponible (l'UI affiche « — » et non un 0 trompeur).
   Toutes les valeurs sont calculées par le RPC sur le même périmètre que `total`. */
const EMPTY_STATS = {
  validated: 0,
  awaitingSubmission: 0,
  toReview: 0,
  rejected: 0,
  proMembers: 0,
  available: 0,
  suspended: 0,
  kycValidationRate: null,
  avgMissionsPerArtisan: null,
  avgRating: null,
  ratedCount: 0,
}

const normalizeStats = (s) => ({ ...EMPTY_STATS, ...(s || {}) })

/* ─────────────────────────────────────────────
   Opérations unitaires (partagées liste / détail / actions groupées)
   La suppression de compte relève de la gestion des clients.
───────────────────────────────────────────── */
const nowIso = () => new Date().toISOString()

const setKycStatus = async (id, status) => {
  const { data, error } = await supabase
    .from('artisan_profiles')
    .update({ kyc_status: status, updated_at: nowIso() })
    .eq('id_artisan', id)
    .select()
    .single()
  if (error) throw error
  return data
}

const suspendOne = async (id, { reasonCode, details, durationDays, indefinite } = {}) => {
  const adminId = await getAdminId()
  const { error } = await supabase.schema('admin').rpc('artisan_suspend', {
    p_artisan_id: id,
    p_admin_id: adminId,
    p_reason_code: reasonCode,
    p_details: details || null,
    p_duration_days: durationDays ?? null,
    p_indefinite: !!indefinite,
  })
  if (error) throw error
  return { id }
}

const reactivateOne = async (id, { trainingDone, note } = {}) => {
  const adminId = await getAdminId()
  const { error } = await supabase.schema('admin').rpc('artisan_reactivate', {
    p_artisan_id: id,
    p_admin_id: adminId,
    p_training_done: !!trainingDone,
    p_note: note || null,
  })
  if (error) throw error
  return { id }
}

/* Actions disponibles en unitaire comme en groupé */
const BULK_ACTIONS = {
  suspend:     { run: (id, p) => suspendOne(id, p),            done: ['Artisan suspendu', 'artisans suspendus'] },
  reactivate:  { run: (id, p) => reactivateOne(id, p),         done: ['Artisan réactivé', 'artisans réactivés'] },
  validateKYC: { run: (id) => setKycStatus(id, 'VALIDATED'),   done: ['KYC validé', 'KYC validés'] },
  rejectKYC:   { run: (id) => setKycStatus(id, 'REJECTED'),    done: ['KYC rejeté', 'KYC rejetés'] },
}

/* ─────────────────────────────────────────────
   Liste paginée des artisans
───────────────────────────────────────────── */
export const useArtisans = (options = {}) => {
  const queryClient = useQueryClient()
  const { globalFilters, sorting, pagination, setPagination } = useFilterStore()

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['artisans'] })
    queryClient.invalidateQueries({ queryKey: ['artisan'] })
  }

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
        stats: normalizeStats(data?.stats),
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
        .update({ ...updates, updated_at: nowIso() })
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
    mutationFn: ({ id, status }) => setKycStatus(id, status),
    onSuccess: (d) => {
      invalidateAll()
      toast.success(`KYC ${d.kyc_status === 'VALIDATED' ? 'validé' : 'rejeté'}`)
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  const suspendArtisan = useMutation({
    mutationFn: ({ id, ...payload }) => suspendOne(id, payload),
    onSuccess: () => { invalidateAll(); toast.success('Artisan suspendu') },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  const reactivateArtisan = useMutation({
    mutationFn: ({ id, ...p }) => reactivateOne(id, p),
    onSuccess: () => { invalidateAll(); toast.success('Artisan réactivé') },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  /* Action sur 1 ou N artisans : { action, ids, payload }
     Chaque id est traité indépendamment : un échec n'annule pas les autres. */
  const runAction = useMutation({
    mutationFn: async ({ action, ids, payload }) => {
      const def = BULK_ACTIONS[action]
      if (!def) throw new Error(`Action inconnue : ${action}`)
      const settled = await Promise.allSettled(ids.map((id) => def.run(id, payload)))
      const failed = settled.filter((s) => s.status === 'rejected')
      return {
        action,
        total: ids.length,
        ok: ids.length - failed.length,
        failed: failed.length,
        firstError: failed[0]?.reason?.message,
      }
    },
    onSuccess: ({ action, total, ok, failed, firstError }) => {
      invalidateAll()
      const [one, many] = BULK_ACTIONS[action].done
      if (ok > 0) toast.success(total === 1 ? one : `${ok} ${many}`)
      if (failed > 0) toast.error(`${failed} échec(s)${firstError ? ` : ${firstError}` : ''}`)
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

    runAction: runAction.mutateAsync,
    isRunningAction: runAction.isPending,
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
        .update({ ...updates, updated_at: nowIso() })
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
    mutationFn: ({ status }) => setKycStatus(id, status),
    onSuccess: (d) => {
      invalidateAll()
      toast.success(`KYC ${d.kyc_status === 'VALIDATED' ? 'validé' : 'rejeté'}`)
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  const suspendArtisan = useMutation({
    mutationFn: (payload) => suspendOne(id, payload),
    onSuccess: () => { invalidateAll(); toast.success('Artisan suspendu') },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  })

  const reactivateArtisan = useMutation({
    mutationFn: (p) => reactivateOne(id, p),
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

/* ─────────────────────────────────────────────
   Catalogue des motifs de suspension (RPC admin.suspension_reasons_list)
   Mis en cache 10 minutes : liste quasi statique côté back-office.
───────────────────────────────────────────── */
export const useSuspensionReasons = () =>
  useQuery({
    queryKey: ['suspension-reasons'],
    queryFn: async () => {
      const adminId = await getAdminId()
      const { data, error } = await supabase
        .schema('admin')
        .rpc('suspension_reasons_list', { p_admin_id: adminId })
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000,
  })