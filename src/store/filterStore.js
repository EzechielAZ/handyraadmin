import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { subDays, startOfDay, endOfDay } from 'date-fns'

/* ── Validateur UUID ── */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isValidUUID = (s) => typeof s === 'string' && UUID_RE.test(s)

/* Nettoie les filtres : nullifie tout champ UUID invalide */
const sanitizeFilters = (filters) => {
  if (!filters) return filters
  return {
    ...filters,
    category: isValidUUID(filters.category) ? filters.category : null,
  }
}

/* Filtres vides (source de vérité pour reset) */
const emptyFilters = () => ({
  status: null,
  category: null,
  region: null,
  search: '',
})

export const useFilterStore = create(
  persist(
    (set, get) => ({
      // ─────────────────────────────────────────────
      // Date range — null = toute la période
      // ─────────────────────────────────────────────
      dateRange: null,

      globalFilters: emptyFilters(),

      pageFilters: {},

      sorting: {
        field: 'created_at',
        order: 'desc',
      },

      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
      },

      /* Scope actuel (page en cours) — pour détecter les changements de page */
      _lastScope: null,

      // ─────────────────────────────────────────────
      // Actions
      // ─────────────────────────────────────────────

      /**
       * ✅ NEW : reset les filtres quand on change de page (scope).
       * Appelé au mount de chaque page avec son identifiant unique.
       * Ex: activateScope('artisans'), activateScope('users'), ...
       */
      activateScope: (scope) => set((state) => {
        if (state._lastScope === scope) return {}
        return {
          _lastScope: scope,
          globalFilters: emptyFilters(),
          sorting: { field: 'created_at', order: 'desc' },
          pagination: { ...state.pagination, page: 1 },
        }
      }),

      setDateRange: (range) => {
        if (!range || range === 'all') {
          set({
            dateRange: null,
            pagination: { ...get().pagination, page: 1 },
          })
          return
        }

        let start, end, label

        if (typeof range === 'string') {
          const now = new Date()
          switch (range) {
            case 'today':
              start = startOfDay(now).toISOString()
              end = endOfDay(now).toISOString()
              label = "Aujourd'hui"
              break
            case 'yesterday':
              start = startOfDay(subDays(now, 1)).toISOString()
              end = endOfDay(subDays(now, 1)).toISOString()
              label = 'Hier'
              break
            case '7days':
              start = subDays(now, 7).toISOString()
              end = now.toISOString()
              label = '7 derniers jours'
              break
            case '30days':
              start = subDays(now, 30).toISOString()
              end = now.toISOString()
              label = '30 derniers jours'
              break
            case '90days':
              start = subDays(now, 90).toISOString()
              end = now.toISOString()
              label = '90 derniers jours'
              break
            case 'thisMonth':
              start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).toISOString()
              end = endOfDay(now).toISOString()
              label = 'Ce mois'
              break
            case 'lastMonth':
              start = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)).toISOString()
              end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)).toISOString()
              label = 'Mois dernier'
              break
            default:
              set({
                dateRange: null,
                pagination: { ...get().pagination, page: 1 },
              })
              return
          }
        } else if (typeof range === 'object' && range.start && range.end) {
          start = range.start
          end = range.end
          label = range.label || 'Personnalisé'
        } else {
          set({
            dateRange: null,
            pagination: { ...get().pagination, page: 1 },
          })
          return
        }

        set({
          dateRange: { start, end, label },
          pagination: { ...get().pagination, page: 1 },
        })
      },

      setGlobalFilter: (key, value) => {
        // Guard UUID : si key = 'category', n'accepter que des UUID ou null/'all'
        let nextValue = value
        if (key === 'category') {
          if (value === 'all' || value === '' || value == null) {
            nextValue = null
          } else if (!isValidUUID(value)) {
            console.warn(`[filterStore] category invalide ignorée : "${value}"`)
            nextValue = null
          }
        }

        set((state) => ({
          globalFilters: {
            ...state.globalFilters,
            [key]: nextValue,
          },
          pagination: { ...state.pagination, page: 1 },
        }))
      },

      setPageFilters: (page, filters) =>
        set((state) => ({
          pageFilters: {
            ...state.pageFilters,
            [page]: filters,
          },
          pagination: { ...state.pagination, page: 1 },
        })),

      getPageFilters: (page) => get().pageFilters[page] || {},

      setSorting: (field, order) => set({ sorting: { field, order } }),

      setPagination: (updates) =>
        set((state) => ({
          pagination: { ...state.pagination, ...updates },
        })),

      nextPage: () =>
        set((state) => ({
          pagination: { ...state.pagination, page: state.pagination.page + 1 },
        })),

      prevPage: () =>
        set((state) => ({
          pagination: {
            ...state.pagination,
            page: Math.max(1, state.pagination.page - 1),
          },
        })),

      resetFilters: () =>
        set({
          dateRange: null,
          globalFilters: emptyFilters(),
          sorting: {
            field: 'created_at',
            order: 'desc',
          },
          pagination: {
            page: 1,
            pageSize: 20,
            total: 0,
          },
        }),

      resetPageFilters: (page) =>
        set((state) => {
          const newPageFilters = { ...state.pageFilters }
          delete newPageFilters[page]
          return { pageFilters: newPageFilters }
        }),

      buildQueryParams: () => {
        const { dateRange, globalFilters, sorting, pagination } = get()
        const params = new URLSearchParams()

        if (dateRange?.start) params.append('start_date', dateRange.start)
        if (dateRange?.end) params.append('end_date', dateRange.end)

        Object.entries(globalFilters).forEach(([key, value]) => {
          if (value !== null && value !== '' && value !== undefined) {
            params.append(key, value)
          }
        })

        params.append('sort_by', sorting.field)
        params.append('sort_order', sorting.order)
        params.append('page', pagination.page)
        params.append('limit', pagination.pageSize)

        return params
      },
    }),
    {
      name: 'handyra-filters-storage',
      version: 4,

      /* Migration : v<4 → nettoie les filtres + init scope */
      migrate: (persistedState, version) => {
        if (!persistedState) return persistedState
        if (version < 4) {
          return {
            ...persistedState,
            dateRange: persistedState.dateRange ?? null,
            globalFilters: sanitizeFilters(persistedState.globalFilters),
            _lastScope: null,
          }
        }
        return persistedState
      },

      /* Rehydrate : nettoie À CHAQUE chargement */
      onRehydrateStorage: () => (state) => {
        if (state?.globalFilters?.category && !isValidUUID(state.globalFilters.category)) {
          console.warn('[filterStore] nettoyage category invalide au rehydrate')
          state.globalFilters.category = null
        }
      },

      partialize: (state) => ({
        dateRange: state.dateRange,
        globalFilters: state.globalFilters,
        sorting: state.sorting,
        pagination: { ...state.pagination, total: 0 },
        _lastScope: state._lastScope,
      }),
    }
  )
)