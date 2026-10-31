import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getAdminId } from '../lib/admin'

export const useDashboard = (options = {}) => {
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', { ...options }],
    queryFn: async () => {
      const adminId = await getAdminId()

      /* Les 2 RPCs en parallèle */
      const [overview, recent] = await Promise.all([
        supabase
          .schema('admin')
          .rpc('dashboard_overview', { p_admin_id: adminId }),
        supabase
          .schema('admin')
          .rpc('dashboard_recent_missions', {
            p_admin_id: adminId,
            p_limit: 10,
          }),
      ])

      if (overview.error) throw overview.error
      if (recent.error) throw recent.error

      const o = overview.data || {}

      /* Reshape pour matcher les charts existants */
      return {
        stats: o.stats || {
          artisans: { total: 0, new: 0 },
          clients: { total: 0 },
          missions: { total: 0, completed: 0, pending: 0, inProgress: 0 },
          revenue: { total: 0, commissions: 0, subscriptions: 0 },
          rating: { average: 0, count: 0 },
        },
        alerts: o.alerts || {
          kycPending: 0,
          openIncidents: 0,
          pendingDisputes: 0,
          desintermAlerts: 0,
        },
        charts: {
          revenue: o.charts?.revenue || { labels: [], revenue: [], commissions: [] },
          missionDonut: { items: o.charts?.missionDonut || [] },
          userGrowth: o.charts?.userGrowth || { labels: [], clients: [], artisans: [] },
          paymentMethods: o.charts?.paymentMethods || { labels: [], values: [] },
        },
        recentMissions: recent.data || [],
      }
    },
    staleTime: 2 * 60 * 1000,   // 2 min — le dashboard peut être légèrement mis en cache
    ...options,
  })

  return {
    data: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
    isFetching: dashboardQuery.isFetching,
    isError: dashboardQuery.isError,
    error: dashboardQuery.error,
    refetch: dashboardQuery.refetch,
  }
}