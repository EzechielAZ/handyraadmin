import { useState, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Plus, RefreshCw, Pencil, Trash2, ExternalLink, Rocket, Calendar,
} from 'lucide-react'
import {
  Button, Table, Spinner, ActionsMenu, Badge, StatCard,
} from '../../../components/ui'
import {
  DocsHeader, DocsFilters, StatusBadge, ConfirmDialog, DocsErrorState,
  Tooltip, Icon,
} from '../../../components/docs'
import {
  useReleases,
  RELEASE_STATUS, RELEASE_TYPE, toSelectOptions,
} from '../../../hooks/docs'
import { useDebounce } from '../../../hooks/useDebounce'
import {
  formatDateShort, formatDateTime, formatTargetDate, formatPercent,
} from '../../../utils/docsFormatters'
import styles from './Releases.module.css'
import { ReleaseDrawer } from './ReleaseDrawer'

const PAGE_SIZE = 20

export const ReleasesPage = () => {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const search  = params.get('q') || ''
  const status  = params.get('status') || null
  const page    = Math.max(1, Number(params.get('page') || 1))
  const sortBy  = params.get('sort') || 'target_date'
  const sortDir = params.get('dir') || 'desc'

  const [searchInput, setSearchInput] = useState(search)
  const debouncedSearch = useDebounce(searchInput, 300)

  useMemo(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (debouncedSearch) next.set('q', debouncedSearch)
      else next.delete('q')
      next.delete('page')
      return next
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const filters = { search: debouncedSearch, status, page, pageSize: PAGE_SIZE, sortBy, sortDir }
  const { releases, total, stats, isLoading, isFetching, isError, error, refetch } = useReleases(filters)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const updateFilter = useCallback((key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === null || value === '' || value === undefined) next.delete(key)
      else next.set(key, value)
      if (key !== 'page') next.delete('page')
      return next
    }, { replace: true })
  }, [setParams])

  const clearFilters = () => {
    setSearchInput('')
    setParams({}, { replace: true })
  }

  const activeCount = [search, status].filter(Boolean).length
  const statusOptions = toSelectOptions(RELEASE_STATUS, { withAll: true, allLabel: 'Tous statuts' })

  const openCreate = () => { setEditing(null); setDrawerOpen(true) }
  const openEdit = (r) => { setEditing(r); setDrawerOpen(true) }
  const closeDrawer = () => { setDrawerOpen(false); setEditing(null) }

  const rowActions = (row) => [
    { label: 'Ouvrir', icon: ExternalLink, onClick: () => navigate(`/docs/releases/${row.version}`) },
    { label: 'Modifier', icon: Pencil, onClick: () => openEdit(row) },
  ]

  const columns = [
    {
      id: 'version',
      header: 'Version',
      accessor: 'version',
      width: '120px',
      sortable: true,
      cell: ({ value, row }) => (
        <span className={styles.versionCell}>
          <span className={styles.versionLabel}>v{value}</span>
          {row.codename && <span className={styles.codename}>{row.codename}</span>}
        </span>
      ),
    },
    {
      id: 'release_type',
      header: 'Type',
      accessor: 'release_type',
      width: '110px',
      sortable: true,
      cell: ({ value }) => <StatusBadge map={RELEASE_TYPE} value={value} />,
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: 'status',
      width: '140px',
      sortable: true,
      cell: ({ value }) => <StatusBadge map={RELEASE_STATUS} value={value} />,
    },
    {
      id: 'target_date',
      header: 'Cible',
      accessor: 'target_date',
      width: '160px',
      sortable: true,
      cell: ({ value, row }) => {
        if (!value) return '—'
        const isLate = row.status !== 'RELEASED' && new Date(value) < new Date()
        return (
          <Tooltip content={formatDateShort(value)}>
            <span className={isLate ? styles.lateCell : styles.dateCell}>
              {formatTargetDate(value)}
            </span>
          </Tooltip>
        )
      },
    },
    {
      id: 'actual_release_date',
      header: 'Publiée',
      accessor: 'actual_release_date',
      width: '140px',
      sortable: true,
      cell: ({ value }) => value
        ? <span className={styles.dateCell}>{formatDateShort(value)}</span>
        : <span className={styles.mutedCell}>—</span>,
    },
    {
      id: 'summary',
      header: 'Résumé',
      accessor: 'summary',
      cell: ({ value }) => value
        ? <span className={styles.summaryCell}>{value}</span>
        : <span className={styles.mutedCell}>—</span>,
    },
    {
      id: 'actions',
      header: '',
      width: '50px',
      sortable: false,
      cell: ({ row }) => <ActionsMenu items={rowActions(row)} />,
    },
  ]

  if (isError) {
    return (
      <div className={styles.page}>
        <DocsHeader eyebrow="Documentation" title="Releases" />
        <DocsErrorState
          error={error}
          onRetry={refetch}
          title="Impossible de charger les releases"
        />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <DocsHeader
        eyebrow="Livraisons produit"
        title="Releases"
        description={
          stats.total > 0
            ? `${stats.total} release${stats.total > 1 ? 's' : ''} · ${stats.upcomingCount || 0} à venir`
            : 'Planifiez et suivez les livraisons produit'
        }
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              icon={RefreshCw}
              onClick={refetch}
              isLoading={isFetching}
              aria-label="Rafraîchir"
            />
            <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>
              Nouvelle release
            </Button>
          </>
        }
      />

      <div className={styles.statsGrid}>
        <StatCard
          title="Total"
          value={stats.total}
          icon={Rocket}
          loading={isLoading}
        />
        <StatCard
          title="À venir"
          value={stats.upcomingCount || 0}
          changeLabel="planifiées ou en cours"
          icon={Calendar}
          loading={isLoading}
        />
        <StatCard
          title="Publiées"
          value={stats.byStatus?.RELEASED || 0}
          icon={Rocket}
          loading={isLoading}
        />
        <StatCard
          title="En test / review"
          value={(stats.byStatus?.IN_TEST || 0) + (stats.byStatus?.IN_REVIEW || 0)}
          icon={Calendar}
          loading={isLoading}
        />
      </div>

      <DocsFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Rechercher une version, un codename…"
        activeCount={activeCount}
        onClear={clearFilters}
        filters={[
          {
            key: 'status',
            label: 'Statut',
            value: status,
            options: statusOptions,
            onChange: (v) => updateFilter('status', v),
          },
        ]}
      />

      <Table
        columns={columns}
        data={releases}
        rowKey="id_release"
        loading={isLoading}
        onRowClick={(row) => navigate(`/docs/releases/${row.version}`)}
        pagination={{
          currentPage: page,
          totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
          pageSize: PAGE_SIZE,
          total,
          onPageChange: (p) => updateFilter('page', String(p)),
        }}
        sortable
        onSort={(field, dir) => {
          setParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('sort', field)
            next.set('dir', dir)
            next.delete('page')
            return next
          }, { replace: true })
        }}
        emptyMessage={
          activeCount > 0
            ? 'Aucune release ne correspond à vos filtres.'
            : 'Aucune release planifiée.'
        }
      />

      <ReleaseDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        release={editing}
      />

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {}}
        title="Supprimer la release"
        description="Action non disponible pour les releases."
        confirmLabel="Compris"
        variant="warning"
      />
    </div>
  )
}

export default ReleasesPage