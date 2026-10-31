import { useEffect } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getAdminId } from '../lib/admin'
import { useFilterStore } from '../store/filterStore'

/* ── Reshapers (flat → shape attendue par les pages) ── */

const reshapeSupervisor = (s) => ({
  id_supervisor: s.id_supervisor,
  is_founder: s.is_founder,
  certification_status: s.certification_status,
  certification_date: s.certification_date,
  total_supervisions: s.total_supervisions,
  avg_rating: s.avg_rating,
  total_disputes: s.total_disputes,
  specialties: s.specialties || [],
  guarantee_fund_balance: s.guarantee_fund_balance,
  created_at: s.created_at,
  artisan: {
    ifu_number: s.ifu_number,
    user: { full_name: s.artisan_name, avatar_url: s.artisan_avatar, email: s.artisan_email },
  },
})

const reshapeAgent = (a) => ({
  id_agent: a.id_agent,
  certification_status: a.certification_status,
  certification_date: a.certification_date,
  experience_years: a.experience_years,
  working_city: a.working_city,
  total_contracts: a.total_contracts,
  total_days_worked: a.total_days_worked,
  avg_rating: a.avg_rating,
  guarantee_fund_balance: a.guarantee_fund_balance,
  has_diploma: a.has_diploma,
  created_at: a.created_at,
  user: { full_name: a.user_name, avatar_url: a.user_avatar, email: a.user_email },
})

const reshapeContract = (c) => ({
  id_contract: c.id_contract,
  contract_type: c.contract_type,
  status: c.status,
  total_construction_amount: c.total_construction_amount,
  hpo_rate: c.hpo_rate,
  hpo_total_fee: c.hpo_total_fee,
  supervisor_fee: c.supervisor_fee,
  handyra_fee: c.handyra_fee,
  is_diaspora: c.is_diaspora,
  client_country: c.client_country,
  activated_at: c.activated_at,
  completed_at: c.completed_at,
  created_at: c.created_at,
  progress: c.progress || 0,
  mission: { description: c.mission_description },
  client: { full_name: c.client_name },
  supervisor: c.supervisor_name
    ? { artisan: { user: { full_name: c.supervisor_name } } }
    : null,
})

const reshapeArbitration = (a) => ({
  id_arbitration: a.id_arbitration,
  arbitration_reason: a.arbitration_reason,
  rejection_count: a.rejection_count,
  status: a.status,
  decision: a.decision,
  decision_notes: a.decision_notes,
  opened_at: a.opened_at,
  deadline_at: a.deadline_at,
  resolved_at: a.resolved_at,
  created_at: a.created_at,
  artisan: { user: { full_name: a.artisan_name, avatar_url: a.artisan_avatar } },
  supervisor: { artisan: { user: { full_name: a.supervisor_name, avatar_url: a.supervisor_avatar } } },
})

const reshapeAlert = (al) => ({
  id_alert: al.id_alert,
  alert_type: al.alert_type,
  severity: al.severity,
  description: al.description,
  is_resolved: al.is_resolved,
  resolution_notes: al.resolution_notes,
  resolved_at: al.resolved_at,
  created_at: al.created_at,
  contract: { id_contract: al.id_contract, mission: { description: al.mission_description } },
  supervisor: { artisan: { user: { full_name: al.supervisor_name, avatar_url: al.supervisor_avatar } } },
})

/* ── Hooks ── */

export const useSupervisors = (options = {}) => {
  const { globalFilters, sorting, pagination, setPagination } = useFilterStore()
  const q = useQuery({
    queryKey: ['hpo_supervisors', { globalFilters, sorting, page: pagination.page, pageSize: pagination.pageSize, ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()
      const { data, error } = await supabase.schema('admin').rpc('hpo_supervisors_list', {
        p_admin_id: adminId,
        p_search: globalFilters.search || null,
        p_status: globalFilters.status || null,
        p_sort_by: sorting?.field || 'created_at',
        p_sort_dir: (sorting?.order || 'desc').toUpperCase(),
        p_page: pagination.page,
        p_page_size: pagination.pageSize,
      })
      if (error) throw error
      return {
        supervisors: (data?.supervisors || []).map(reshapeSupervisor),
        total: data?.total || 0,
      }
    },
    placeholderData: keepPreviousData,
    ...options,
  })
  useEffect(() => {
    if (q.data?.total !== undefined) setPagination({ total: q.data.total })
  }, [q.data?.total, setPagination])
  return {
    supervisors: q.data?.supervisors || [],
    total: q.data?.total || 0,
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

export const useAgents = (options = {}) => {
  const { globalFilters, sorting, pagination, setPagination } = useFilterStore()
  const q = useQuery({
    queryKey: ['hpo_agents', { globalFilters, sorting, page: pagination.page, pageSize: pagination.pageSize, ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()
      const { data, error } = await supabase.schema('admin').rpc('hpo_agents_list', {
        p_admin_id: adminId,
        p_search: globalFilters.search || null,
        p_status: globalFilters.status || null,
        p_sort_by: sorting?.field || 'created_at',
        p_sort_dir: (sorting?.order || 'desc').toUpperCase(),
        p_page: pagination.page,
        p_page_size: pagination.pageSize,
      })
      if (error) throw error
      return {
        agents: (data?.agents || []).map(reshapeAgent),
        total: data?.total || 0,
      }
    },
    placeholderData: keepPreviousData,
    ...options,
  })
  useEffect(() => {
    if (q.data?.total !== undefined) setPagination({ total: q.data.total })
  }, [q.data?.total, setPagination])
  return {
    agents: q.data?.agents || [],
    total: q.data?.total || 0,
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

export const useHPOContracts = (options = {}) => {
  const { globalFilters, sorting, pagination, setPagination } = useFilterStore()
  const q = useQuery({
    queryKey: ['hpo_contracts', { globalFilters, sorting, page: pagination.page, pageSize: pagination.pageSize, ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()
      const { data, error } = await supabase.schema('admin').rpc('hpo_contracts_list', {
        p_admin_id: adminId,
        p_search: globalFilters.search || null,
        p_status: globalFilters.status || null,
        p_sort_by: sorting?.field || 'created_at',
        p_sort_dir: (sorting?.order || 'desc').toUpperCase(),
        p_page: pagination.page,
        p_page_size: pagination.pageSize,
      })
      if (error) throw error
      return {
        contracts: (data?.contracts || []).map(reshapeContract),
        total: data?.total || 0,
      }
    },
    placeholderData: keepPreviousData,
    ...options,
  })
  useEffect(() => {
    if (q.data?.total !== undefined) setPagination({ total: q.data.total })
  }, [q.data?.total, setPagination])
  return {
    contracts: q.data?.contracts || [],
    total: q.data?.total || 0,
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

export const useArbitrations = (options = {}) => {
  const { globalFilters, sorting, pagination, setPagination } = useFilterStore()
  const q = useQuery({
    queryKey: ['hpo_arbitrations', { globalFilters, sorting, page: pagination.page, pageSize: pagination.pageSize, ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()
      const { data, error } = await supabase.schema('admin').rpc('hpo_arbitrations_list', {
        p_admin_id: adminId,
        p_search: globalFilters.search || null,
        p_status: globalFilters.status || null,
        p_sort_by: sorting?.field || 'opened_at',
        p_sort_dir: (sorting?.order || 'desc').toUpperCase(),
        p_page: pagination.page,
        p_page_size: pagination.pageSize,
      })
      if (error) throw error
      return {
        arbitrations: (data?.arbitrations || []).map(reshapeArbitration),
        total: data?.total || 0,
      }
    },
    placeholderData: keepPreviousData,
    ...options,
  })
  useEffect(() => {
    if (q.data?.total !== undefined) setPagination({ total: q.data.total })
  }, [q.data?.total, setPagination])
  return {
    arbitrations: q.data?.arbitrations || [],
    total: q.data?.total || 0,
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

export const useAlerts = (options = {}) => {
  const { globalFilters, sorting, pagination, setPagination } = useFilterStore()
  const q = useQuery({
    queryKey: ['hpo_alerts', { globalFilters, sorting, page: pagination.page, pageSize: pagination.pageSize, ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()
      const { data, error } = await supabase.schema('admin').rpc('hpo_alerts_list', {
        p_admin_id: adminId,
        p_search: globalFilters.search || null,
        p_severity: globalFilters.severity || null,
        p_resolved: globalFilters.resolved || null,
        p_sort_by: sorting?.field || 'created_at',
        p_sort_dir: (sorting?.order || 'desc').toUpperCase(),
        p_page: pagination.page,
        p_page_size: pagination.pageSize,
      })
      if (error) throw error
      return {
        alerts: (data?.alerts || []).map(reshapeAlert),
        total: data?.total || 0,
      }
    },
    placeholderData: keepPreviousData,
    ...options,
  })
  useEffect(() => {
    if (q.data?.total !== undefined) setPagination({ total: q.data.total })
  }, [q.data?.total, setPagination])
  return {
    alerts: q.data?.alerts || [],
    total: q.data?.total || 0,
    isLoading: q.isLoading, isFetching: q.isFetching,
    isError: q.isError, error: q.error, refetch: q.refetch,
  }
}

/* ── Compteurs pour les badges des tabs HPO ── */
export const useHPODashboardCounts = (options = {}) => {
  const q = useQuery({
    queryKey: ['hpo_dashboard_counts', { ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()
      const { data, error } = await supabase.schema('admin').rpc('hpo_dashboard_counts', { p_admin_id: adminId })
      if (error) throw error
      return data || { arbitrations_open: 0, alerts_unresolved: 0, contracts_active: 0, supervisors_total: 0, agents_total: 0 }
    },
    staleTime: 60 * 1000,
    ...options,
  })
  return {
    counts: q.data,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: q.refetch,
  }
}