import { useState, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Plus, RefreshCw, Pencil, ExternalLink, Globe, Archive, Send, FileText,
} from 'lucide-react'
import {
  Button, Table, ActionsMenu, StatCard,
} from '../../../components/ui'
import {
  DocsHeader, DocsFilters, StatusBadge, DocsErrorState, Tooltip,
} from '../../../components/docs'
import {
  usePages, usePageMutations, useFeatures,
  PAGE_CATEGORY, PAGE_STATUS, PAGE_VISIBILITY, toSelectOptions,
} from '../../../hooks/docs'
import { useDebounce } from '../../../hooks/useDebounce'
import { formatDateTime, formatRelative } from '../../../utils/docsFormatters'
import styles from './Pages.module.css'
import { PageDrawer } from './PageDrawer'

const PAGE_SIZE = 20

export const PagesPage = () => {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const search    = params.get('q') || ''
  const category  = params.get('category') || null
  const status    = params.get('status') || null
  const featureId = params.get('feature') || null
  const page      = Math.max(1, Number(params.get('page') || 1))

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

  const filters = { search: debouncedSearch, category, status, featureId, page, pageSize: PAGE_SIZE }
  const { pages, total, stats, isLoading, isFetching, isError, error, refetch } = usePages(filters)
  const mutations = usePageMutations()
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

  const activeCount = [search, category, status, featureId].filter(Boolean).length

  const openCreate = () => { setEditing(null); setDrawerOpen(true) }
  const openEdit = (p) => { setEditing(p); setDrawerOpen(true) }
  const closeDrawer = () => { setDrawerOpen(false); setEditing(null) }

  const handlePublish = async (row) => {
    try {
      await mutations.publish.mutateAsync(row.id_page)
      refetch()
    } catch { /* toast */ }
  }

  const handleArchive = async (row) => {
    try {
      await mutations.archive.mutateAsync(row.id_page)
      refetch()
    } catch { /* toast */ }
  }

  const rowActions = (row) => {
    const items = [
      { label: 'Ouvrir', icon: ExternalLink, onClick: () => navigate(`/docs/pages/${row.slug}`) },
      { label: 'Modifier', icon: Pencil, onClick: () => openEdit(row) },
    ]
    if (row.status !== 'PUBLISHED') {
      items.push({ label: 'Publier', icon: Send, onClick: () => handlePublish(row) })
    }
    if (row.status !== 'ARCHIVED') {
      items.push({ separator: true })
      items.push({ label: 'Archiver', icon: Archive, onClick: () => handleArchive(row) })
    }
    return items
  }

  const columns = [
    {
      id: 'slug',
      header: 'Slug',
      accessor: 'slug',
      width: '200px',
      sortable: true,
      cell: ({ value }) => <span className={styles.slugCell}>{value}</span>,
    },
    {
      id: 'title',
      header: 'Titre',
      accessor: 'title',
      sortable: true,
      cell: ({ value, row }) => (
        <div className={styles.titleCell}>
          <span className={styles.titlePrimary}>{value}</span>
          {row.summary && (
            <span className={styles.titleSummary}>{row.summary}</span>
          )}
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Catégorie',
      accessor: 'category',
      width: '160px',
      sortable: true,
      cell: ({ value }) => <StatusBadge map={PAGE_CATEGORY} value={value} showIcon={false} />,
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: 'status',
      width: '130px',
      sortable: true,
      cell: ({ value }) => <StatusBadge map={PAGE_STATUS} value={value} />,
    },
    {
      id: 'visibility',
      header: 'Visibilité',
      accessor: 'visibility',
      width: '110px',
      cell: ({ value }) => <StatusBadge map={PAGE_VISIBILITY} value={value} />,
    },
    {
      id: 'version_number',
      header: 'Version',
      accessor: 'version_number',
      width: '80px',
      align: 'center',
      cell: ({ value }) => <span className={styles.versionCell}>v{value}</span>,
    },
    {
      id: 'updated_at',
      header: 'Modifiée',
      accessor: 'updated_at',
      width: '130px',
      sortable: true,
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

  const categoryOptions = toSelectOptions(PAGE_CATEGORY, { withAll: true, allLabel: 'Toutes catégories' })
  const statusOptions   = toSelectOptions(PAGE_STATUS,   { withAll: true, allLabel: 'Tous statuts' })

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
        <DocsHeader eyebrow="Documentation" title="Pages" />
        <DocsErrorState error={error} onRetry={refetch} title="Impossible de charger les pages" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <DocsHeader
        eyebrow="Base de connaissance"
        title="Pages"
        description={
          stats.total > 0
            ? `${stats.total} page${stats.total > 1 ? 's' : ''} · ${stats.byStatus?.PUBLISHED || 0} publiée${(stats.byStatus?.PUBLISHED || 0) > 1 ? 's' : ''}`
            : 'Documentation produit, guides, specs'
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
              Nouvelle page
            </Button>
          </>
        }
      />

      <div className={styles.statsGrid}>
        <StatCard
          title="Publiées"
          value={stats.byStatus?.PUBLISHED || 0}
          icon={Globe}
          loading={isLoading}
        />
        <StatCard
          title="Brouillons"
          value={(stats.byStatus?.DRAFT || 0) + (stats.byStatus?.IN_REVIEW || 0)}
          icon={FileText}
          loading={isLoading}
        />
        <StatCard
          title="Archivées"
          value={stats.byStatus?.ARCHIVED || 0}
          icon={Archive}
          loading={isLoading}
        />
        <StatCard
          title="Total"
          value={stats.total || 0}
          icon={FileText}
          loading={isLoading}
        />
      </div>

      <DocsFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Rechercher une page (slug, titre)…"
        activeCount={activeCount}
        onClear={clearFilters}
        filters={[
          { key: 'category', label: 'Catégorie', value: category,  options: categoryOptions, onChange: (v) => updateFilter('category', v), searchable: true },
          { key: 'status',   label: 'Statut',    value: status,    options: statusOptions,   onChange: (v) => updateFilter('status', v) },
          { key: 'feature',  label: 'Feature',   value: featureId, options: featureOptions,  onChange: (v) => updateFilter('feature', v), searchable: true },
        ]}
      />

      <Table
        columns={columns}
        data={pages}
        rowKey="id_page"
        loading={isLoading}
        onRowClick={(row) => navigate(`/docs/pages/${row.slug}`)}
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
            ? 'Aucune page ne correspond à vos filtres.'
            : 'Aucune page documentée.'
        }
      />

      <PageDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        page={editing}
        features={allFeatures}
        mutations={mutations}
      />
    </div>
  )
}

export default PagesPage