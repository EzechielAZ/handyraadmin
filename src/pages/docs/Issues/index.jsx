import { useState, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Plus, RefreshCw, Pencil, ExternalLink, ArrowRight, Copy,
} from 'lucide-react'
import {
  Button, Table, ActionsMenu, StatCard,
} from '../../../components/ui'
import {
  DocsHeader, DocsFilters, StatusBadge, DocsErrorState,
  Tooltip, ModuleIcon,
} from '../../../components/docs'
import {
  useIssues, useIssueMutations, useFeatures,
  ISSUE_TYPE, ISSUE_STATUS, ISSUE_SEVERITY, ISSUE_PRIORITY,
  MODULE_SUGGESTIONS, toSelectOptions,
} from '../../../hooks/docs'
import { useDebounce } from '../../../hooks/useDebounce'
import {
  formatDateShort, formatDateTime, formatRelative,
} from '../../../utils/docsFormatters'
import toast from 'react-hot-toast'
import { IssueDrawer } from './IssueDrawer'
import styles from './Issues.module.css'

const PAGE_SIZE = 20

export const IssuesPage = () => {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const search    = params.get('q') || ''
  const status    = params.get('status') || null
  const type      = params.get('type') || null
  const severity  = params.get('severity') || null
  const featureId = params.get('feature') || null
  const page      = Math.max(1, Number(params.get('page') || 1))
  const sortBy    = params.get('sort') || 'created_at'
  const sortDir   = params.get('dir') || 'desc'

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

  const filters = {
    search: debouncedSearch, status, type, severity, featureId,
    page, pageSize: PAGE_SIZE, sortBy, sortDir,
  }
  const { issues, total, stats, isLoading, isFetching, isError, error, refetch } = useIssues(filters)
  const mutations = useIssueMutations()

  // Liste des features pour le filtre
  const { features: allFeatures } = useFeatures({ pageSize: 300 })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)

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

  const activeCount = [search, status, type, severity, featureId].filter(Boolean).length

  const openCreate = () => { setEditing(null); setDrawerOpen(true) }
  const openEdit = (i) => { setEditing(i); setDrawerOpen(true) }
  const closeDrawer = () => { setDrawerOpen(false); setEditing(null) }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success(`Code "${code}" copié`)
  }

  const rowActions = (row) => [
    { label: 'Ouvrir', icon: ExternalLink, onClick: () => navigate(`/docs/issues/${row.code}`) },
    { label: 'Modifier', icon: Pencil, onClick: () => openEdit(row) },
    { label: 'Copier le code', icon: Copy, onClick: () => copyCode(row.code) },
  ]

  const columns = [
    {
      id: 'code',
      header: 'Code',
      accessor: 'code',
      width: '140px',
      sortable: true,
      cell: ({ value }) => <span className={styles.codeCell}>{value}</span>,
    },
    {
      id: 'issue_type',
      header: 'Type',
      accessor: 'issue_type',
      width: '130px',
      sortable: true,
      cell: ({ value }) => <StatusBadge map={ISSUE_TYPE} value={value} />,
    },
    {
      id: 'title',
      header: 'Titre',
      accessor: 'title',
      sortable: true,
      cell: ({ value, row }) => (
        <div className={styles.titleCell}>
          <span className={styles.titlePrimary}>{value}</span>
          {row.module && (
            <span className={styles.titleMeta}>
              <ModuleIcon module={row.module} size={10} />
              {row.module}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'severity',
      header: 'Sévérité',
      accessor: 'severity',
      width: '110px',
      sortable: true,
      cell: ({ value }) => value
        ? <StatusBadge map={ISSUE_SEVERITY} value={value} />
        : <span className={styles.muted}>—</span>,
    },
    {
      id: 'priority',
      header: 'Priorité',
      accessor: 'priority',
      width: '90px',
      sortable: true,
      cell: ({ value }) => value
        ? <StatusBadge map={ISSUE_PRIORITY} value={value} showIcon={false} />
        : <span className={styles.muted}>—</span>,
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: 'status',
      width: '140px',
      sortable: true,
      cell: ({ value }) => <StatusBadge map={ISSUE_STATUS} value={value} />,
    },
    {
      id: 'updated_at',
      header: 'Modifiée',
      accessor: 'updated_at',
      width: '130px',
      cell: ({ value }) => (
        <Tooltip content={formatDateTime(value)}>
          <span className={styles.timeCell}>{formatRelative(value)}</span>
        </Tooltip>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: '50px',
      sortable: false,
      cell: ({ row }) => <ActionsMenu items={rowActions(row)} />,
    },
  ]

  const statusOptions   = toSelectOptions(ISSUE_STATUS,   { withAll: true, allLabel: 'Tous statuts' })
  const typeOptions     = toSelectOptions(ISSUE_TYPE,     { withAll: true, allLabel: 'Tous types' })
  const severityOptions = toSelectOptions(ISSUE_SEVERITY, { withAll: true, allLabel: 'Toutes sévérités' })

  const featureOptions = useMemo(() => [
    { value: 'all', label: 'Toutes features' },
    ...(allFeatures || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .map((f) => ({ value: f.id_feature, label: `${f.code} · ${f.name}` })),
  ], [allFeatures])

  if (isError) {
    return (
      <div className={styles.page}>
        <DocsHeader eyebrow="Documentation" title="Issues" />
        <DocsErrorState
          error={error}
          onRetry={refetch}
          title="Impossible de charger les issues"
        />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <DocsHeader
        eyebrow="Suivi qualité"
        title="Issues"
        description={
          stats.total > 0
            ? `${stats.total} issue${stats.total > 1 ? 's' : ''} · ${Object.values(stats.byStatus || {}).reduce((s, n) => s + n, 0)} au total`
            : 'Bugs, incidents, améliorations et tâches'
        }
        actions={
          <>
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={refetch}
              isLoading={isFetching}
              aria-label="Rafraîchir"
            />
            <Button variant="primary" icon={Plus} onClick={openCreate}>
              Nouvelle issue
            </Button>
          </>
        }
      />

      <div className={styles.statsGrid}>
        <StatCard
          title="Ouvertes"
          value={(stats.byStatus?.OPEN || 0) + (stats.byStatus?.TRIAGED || 0) + (stats.byStatus?.IN_PROGRESS || 0) + (stats.byStatus?.IN_REVIEW || 0)}
          icon={ArrowRight}
          loading={isLoading}
        />
        <StatCard
          title="Critiques"
          value={(stats.bySeverity?.BLOCKER || 0) + (stats.bySeverity?.CRITICAL || 0)}
          changeLabel="bloquantes + critiques"
          icon={ArrowRight}
          color={(stats.bySeverity?.BLOCKER || 0) + (stats.bySeverity?.CRITICAL || 0) > 0 ? 'danger' : 'primary'}
          loading={isLoading}
        />
        <StatCard
          title="Fermées"
          value={(stats.byStatus?.CLOSED || 0) + (stats.byStatus?.WONT_FIX || 0) + (stats.byStatus?.DUPLICATE || 0)}
          icon={ArrowRight}
          loading={isLoading}
        />
        <StatCard
          title="Total"
          value={stats.total || 0}
          icon={ArrowRight}
          loading={isLoading}
        />
      </div>

      <DocsFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Rechercher une issue (code, titre)…"
        activeCount={activeCount}
        onClear={clearFilters}
        filters={[
          { key: 'status',   label: 'Statut',   value: status,   options: statusOptions,   onChange: (v) => updateFilter('status', v) },
          { key: 'type',     label: 'Type',     value: type,     options: typeOptions,     onChange: (v) => updateFilter('type', v) },
          { key: 'severity', label: 'Sévérité', value: severity, options: severityOptions, onChange: (v) => updateFilter('severity', v) },
          { key: 'feature',  label: 'Feature',  value: featureId, options: featureOptions, onChange: (v) => updateFilter('feature', v), searchable: true },
        ]}
      />

      <Table
        columns={columns}
        data={issues}
        rowKey="id_issue"
        loading={isLoading}
        onRowClick={(row) => navigate(`/docs/issues/${row.code}`)}
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
            ? 'Aucune issue ne correspond à vos filtres.'
            : 'Aucune issue enregistrée.'
        }
      />

      <IssueDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        issue={editing}
        features={allFeatures}
        mutations={mutations}
      />
    </div>
  )
}

export default IssuesPage