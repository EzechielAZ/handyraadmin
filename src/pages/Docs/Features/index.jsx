import { useState, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Plus, RefreshCw, Pencil, Trash2, ExternalLink, Copy, Zap,
} from 'lucide-react'
import {
  Button, Table, Spinner, EmptyState, ActionsMenu, Badge,
} from '../../../components/ui'
import {
  DocsHeader, DocsFilters, StatusBadge, ConfirmDialog, DocsErrorState,
  Tooltip, ModuleIcon, Icon,
} from '../../../components/docs'
import {
  useFeatures, useFeatureMutations,
  FEATURE_STATUS, FEATURE_PRIORITY, FEATURE_COMPLEXITY,
  MODULE_SUGGESTIONS, toSelectOptions,
} from '../../../hooks/docs'
import { useDebounce } from '../../../hooks/useDebounce'
import { formatDateTime, formatDateShort } from '../../../utils/docsFormatters'
import toast from 'react-hot-toast'
import { FeatureDrawer } from './FeatureDrawer'
import styles from './Features.module.css'

const PAGE_SIZE = 20

export const FeaturesPage = () => {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  // ── Filtres URL ──
  const search  = params.get('q') || ''
  const module  = params.get('module') || null
  const status  = params.get('status') || null
  const page    = Math.max(1, Number(params.get('page') || 1))
  const sortBy  = params.get('sort') || 'created_at'
  const sortDir = params.get('dir') || 'desc'

  // ── Search input (debounced → URL) ──
  const [searchInput, setSearchInput] = useState(search)
  const debouncedSearch = useDebounce(searchInput, 300)

  // Sync debounced input → URL
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

  // ── Data ──
  const filters = { search: debouncedSearch, module, status, page, pageSize: PAGE_SIZE, sortBy, sortDir }
  const {
    features, total, stats, isLoading, isFetching, isError, error, refetch,
  } = useFeatures(filters)

  const mutations = useFeatureMutations()

  // ── Drawer state ──
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  // ── Delete confirm ──
  const [toDelete, setToDelete] = useState(null)

  // ── Filter helpers ──
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

  const activeCount = [search, module, status].filter(Boolean).length

  // ── Module options (suggestions + ceux réellement présents) ──
  const moduleOptions = useMemo(() => {
    const set = new Set([
      ...MODULE_SUGGESTIONS,
      ...Object.keys(stats.byModule || {}),
    ])
    return [
      { value: 'all', label: 'Tous modules' },
      ...Array.from(set).sort().map((m) => ({ value: m, label: m })),
    ]
  }, [stats.byModule])

  const statusOptions = toSelectOptions(FEATURE_STATUS, { withAll: true, allLabel: 'Tous statuts' })

  // ── Actions ──
  const openCreate = () => { setEditing(null); setDrawerOpen(true) }
  const openEdit = (f) => { setEditing(f); setDrawerOpen(true) }
  const closeDrawer = () => { setDrawerOpen(false); setEditing(null) }

  const handleSave = async (payload) => {
    try {
      if (editing) {
        await mutations.update.mutateAsync({ id: editing.id_feature, payload })
      } else {
        await mutations.create.mutateAsync(payload)
      }
      closeDrawer()
    } catch { /* toast géré par useDocsMutation */ }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await mutations.softDelete.mutateAsync({ id: toDelete.id_feature })
      setToDelete(null)
    } catch { /* toast géré */ }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success(`Code "${code}" copié`)
  }

  const rowActions = (row) => [
    { label: 'Ouvrir', icon: ExternalLink, onClick: () => navigate(`/docs/features/${row.code}`) },
    { label: 'Modifier', icon: Pencil, onClick: () => openEdit(row) },
    { label: 'Copier le code', icon: Copy, onClick: () => copyCode(row.code) },
    { separator: true },
    { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setToDelete(row) },
  ]

  // ── Colonnes ──
  const columns = [
    {
      id: 'code',
      header: 'Code',
      accessor: 'code',
      width: '130px',
      sortable: true,
      cell: ({ value }) => (
        <span className={styles.codeCell}>{value}</span>
      ),
    },
    {
      id: 'name',
      header: 'Nom',
      accessor: 'name',
      sortable: true,
      cell: ({ value, row }) => (
        <div className={styles.nameCell}>
          <span className={styles.namePrimary}>{value}</span>
          {row.summary && (
            <span className={styles.nameSummary}>{row.summary}</span>
          )}
        </div>
      ),
    },
    {
      id: 'module',
      header: 'Module',
      accessor: 'module',
      width: '140px',
      sortable: true,
      cell: ({ value }) => (
        <span className={styles.moduleCell}>
          <ModuleIcon module={value} size={12} />
          {value}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: 'status',
      width: '140px',
      sortable: true,
      cell: ({ value }) => <StatusBadge map={FEATURE_STATUS} value={value} />,
    },
    {
      id: 'priority',
      header: 'Priorité',
      accessor: 'priority',
      width: '110px',
      sortable: true,
      cell: ({ value }) => value ? <StatusBadge map={FEATURE_PRIORITY} value={value} /> : '—',
    },
    {
      id: 'complexity',
      header: 'Taille',
      accessor: 'complexity',
      width: '80px',
      align: 'center',
      cell: ({ value }) => value ? <StatusBadge map={FEATURE_COMPLEXITY} value={value} showIcon={false} /> : '—',
    },
    {
      id: 'updated_at',
      header: 'Modifié le',
      accessor: 'updated_at',
      width: '140px',
      cell: ({ value }) => (
        <Tooltip content={formatDateTime(value)}>
          <span className={styles.timeCell}>{formatDateShort(value)}</span>
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

  // ── Erreur ──
  if (isError) {
    return (
      <div className={styles.page}>
        <DocsHeader eyebrow="Documentation" title="Features" />
        <DocsErrorState
          error={error}
          onRetry={refetch}
          title="Impossible de charger les features"
        />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <DocsHeader
        eyebrow="Documentation produit"
        title="Features"
        description={
          stats.total > 0
            ? `${stats.total} feature${stats.total > 1 ? 's' : ''} cataloguée${stats.total > 1 ? 's' : ''}`
            : 'Cataloguez les fonctionnalités du produit'
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
              Nouvelle feature
            </Button>
          </>
        }
      />

      <DocsFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Rechercher une feature (code, nom, description)…"
        activeCount={activeCount}
        onClear={clearFilters}
        filters={[
          {
            key: 'module',
            label: 'Module',
            value: module,
            options: moduleOptions,
            onChange: (v) => updateFilter('module', v),
          },
          {
            key: 'status',
            label: 'Statut',
            value: status,
            options: statusOptions,
            onChange: (v) => updateFilter('status', v),
          },
        ]}
      />

      {/* Résumé rapide */}
      {stats.total > 0 && (
        <div className={styles.summaryBar}>
          {Object.entries(stats.byStatus || {})
            .filter(([, n]) => n > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([st, n]) => {
              const cfg = FEATURE_STATUS[st]
              return (
                <button
                  key={st}
                  type="button"
                  className={styles.summaryChip}
                  onClick={() => updateFilter('status', status === st ? null : st)}
                >
                  <StatusBadge map={FEATURE_STATUS} value={st} size="sm" showLabel={false} />
                  <span>{cfg?.label || st}</span>
                  <strong>{n}</strong>
                </button>
              )
            })}
        </div>
      )}

      <Table
        columns={columns}
        data={features}
        rowKey="id_feature"
        loading={isLoading}
        onRowClick={openEdit}
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
            ? 'Aucune feature ne correspond à vos filtres.'
            : 'Aucune feature cataloguée.'
        }
      />

      <FeatureDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        feature={editing}
        onSave={handleSave}
        saving={mutations.create.isPending || mutations.update.isPending}
        existingModules={Object.keys(stats.byModule || {})}
      />

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Supprimer la feature"
        description={
          <>
            <p>
              Supprimer <strong>{toDelete?.name}</strong>{' '}
              (<code>{toDelete?.code}</code>) ?
            </p>
            <p>
              Elle sera marquée supprimée et retirée des listes. Les releases
              et issues liées conserveront leurs références.
            </p>
          </>
        }
        confirmLabel="Supprimer"
        loading={mutations.softDelete.isPending}
      />
    </div>
  )
}

export default FeaturesPage