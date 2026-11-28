import { useState, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Pencil, ExternalLink, Copy, Upload, Sparkles, Archive, ArchiveRestore } from 'lucide-react'
import { Button, Table, ActionsMenu, StatCard } from '../../../components/ui'
import { DocsHeader, DocsFilters, StatusBadge, DocsErrorState, Tooltip, ModuleIcon } from '../../../components/docs'
import {
  useTestScenarios, useTestScenarioMutations, useTestsAccess,
  SCENARIO_STATUS, SCENARIO_PROFILE, SCENARIO_PRIORITY, SCENARIO_TYPE, toSelectOptions,
} from '../../../hooks/tests'
import { MODULE_SUGGESTIONS } from '../../../hooks/docs'
import { useDebounce } from '../../../hooks/useDebounce'
import { formatDateTime, formatRelative } from '../../../utils/docsFormatters'
import { adminRpc } from '../../../lib/adminRpc'
import { ScenarioDrawer } from './ScenarioDrawer'
import { ScenarioImportModal } from './ScenarioImportModal'
import { ScenarioAssistantModal } from './ScenarioAssistantModal'
import styles from '../Tests.module.css'

const PAGE_SIZE = 20

export const ScenariosPage = () => {
  const navigate = useNavigate()
  const { canWrite } = useTestsAccess()
  const [params, setParams] = useSearchParams()

  const search   = params.get('q') || ''
  const status   = params.get('status') || null
  const profile  = params.get('profile') || null
  const priority = params.get('priority') || null
  const type     = params.get('type') || null
  const module   = params.get('module') || null
  const page     = Math.max(1, Number(params.get('page') || 1))
  const sortBy   = params.get('sort') || 'updated_at'
  const sortDir  = params.get('dir') || 'desc'

  const [searchInput, setSearchInput] = useState(search)
  const debouncedSearch = useDebounce(searchInput, 300)
  useMemo(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (debouncedSearch) next.set('q', debouncedSearch); else next.delete('q')
      next.delete('page')
      return next
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const filters = { search: debouncedSearch, status, profile, priority, type, module, page, pageSize: PAGE_SIZE, sortBy, sortDir }
  const { scenarios, total, stats, isLoading, isFetching, isError, error, refetch } = useTestScenarios(filters)
  const mutations = useTestScenarioMutations()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)       // { scenario, steps }
  const [importOpen, setImportOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  const updateFilter = useCallback((key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === null || value === '' || value === undefined) next.delete(key); else next.set(key, value)
      if (key !== 'page') next.delete('page')
      return next
    }, { replace: true })
  }, [setParams])
  const clearFilters = () => { setSearchInput(''); setParams({}, { replace: true }) }
  const activeCount = [search, status, profile, priority, type, module].filter(Boolean).length

  const openEdit = async (row) => {
    try {
      const d = await adminRpc('docs_test_scenario_get', { p_ref: row.id_scenario })
      setEditing({ scenario: d.scenario, steps: d.steps }); setDrawerOpen(true)
    } catch { /* erreur déjà affichée par adminRpc/toast global */ }
  }
  const toggleArchive = (row) => mutations.update.mutate({
    id: row.id_scenario, payload: { status: row.status === 'ARCHIVED' ? 'DRAFT' : 'ARCHIVED' },
  })

  const rowActions = (row) => [
    { label: 'Ouvrir', icon: ExternalLink, onClick: () => navigate(`/tests/scenarios/${row.code}`) },
    ...(canWrite ? [
      { label: 'Modifier', icon: Pencil, onClick: () => openEdit(row) },
      { label: 'Dupliquer', icon: Copy, onClick: () => mutations.duplicate.mutate(row.id_scenario) },
      row.status === 'ARCHIVED'
        ? { label: 'Restaurer', icon: ArchiveRestore, onClick: () => toggleArchive(row) }
        : { label: 'Archiver', icon: Archive, onClick: () => toggleArchive(row) },
    ] : []),
  ]

  const columns = [
    { id: 'code', header: 'Code', accessor: 'code', width: '110px', sortable: true,
      cell: ({ value }) => <span className={styles.codeCell}>{value}</span> },
    { id: 'title', header: 'Scénario', accessor: 'title', sortable: true,
      cell: ({ value, row }) => (
        <div className={styles.titleCell}>
          <span className={styles.titlePrimary}>{value}</span>
          <span className={styles.titleMeta}>
            {row.module && <><ModuleIcon module={row.module} size={10} />{row.module} · </>}
            {row.stepCount} étape{row.stepCount > 1 ? 's' : ''}
            {row.campaignCount > 0 && ` · ${row.campaignCount} campagne${row.campaignCount > 1 ? 's' : ''}`}
          </span>
        </div>
      ) },
    { id: 'priority', header: 'Priorité', accessor: 'priority', width: '90px', sortable: true,
      cell: ({ value }) => <StatusBadge map={SCENARIO_PRIORITY} value={value} showIcon={false} label={value} /> },
    { id: 'profile', header: 'Profil', accessor: 'profile', width: '130px',
      cell: ({ value }) => <StatusBadge map={SCENARIO_PROFILE} value={value} /> },
    { id: 'scenario_type', header: 'Type', accessor: 'scenario_type', width: '130px',
      cell: ({ value }) => <StatusBadge map={SCENARIO_TYPE} value={value} /> },
    { id: 'status', header: 'Statut', accessor: 'status', width: '120px', sortable: true,
      cell: ({ value }) => <StatusBadge map={SCENARIO_STATUS} value={value} /> },
    { id: 'updated_at', header: 'Modifié', accessor: 'updated_at', width: '120px',
      cell: ({ value }) => (
        <Tooltip content={formatDateTime(value)}><span className={styles.timeCell}>{formatRelative(value)}</span></Tooltip>
      ) },
    { id: 'actions', header: '', width: '50px', sortable: false,
      cell: ({ row }) => <ActionsMenu items={rowActions(row)} /> },
  ]

  const moduleOptions = useMemo(() => {
    const set = new Set([...MODULE_SUGGESTIONS, ...Object.keys(stats.byModule || {})])
    return [{ value: 'all', label: 'Tous modules' }, ...[...set].sort().map((m) => ({ value: m, label: m }))]
  }, [stats.byModule])

  if (isError) {
    return (
      <div className={styles.page}>
        <DocsHeader eyebrow="Tests de validation" title="Scénarios" />
        <DocsErrorState error={error} onRetry={refetch} title="Impossible de charger les scénarios" />
      </div>
    )
  }

  const bs = stats.byStatus || {}
  const p0 = stats.byPriority?.P0 || 0
  return (
    <div className={styles.page}>
      <DocsHeader
        eyebrow="Tests de validation"
        title="Scénarios"
        description="Bibliothèque réutilisable : écrivez un scénario une fois, utilisez-le dans toutes vos campagnes."
        actions={<>
          <Button variant="outline" icon={RefreshCw} onClick={refetch} isLoading={isFetching} aria-label="Rafraîchir" />
          {canWrite && <Button variant="outline" icon={Sparkles} onClick={() => setAiOpen(true)}>Assistant IA</Button>}
          {canWrite && <Button variant="outline" icon={Upload} onClick={() => setImportOpen(true)}>Importer</Button>}
          {canWrite && <Button variant="primary" icon={Plus} onClick={() => { setEditing(null); setDrawerOpen(true) }}>Nouveau scénario</Button>}
        </>}
      />

      <div className={styles.statsGrid}>
        <StatCard title="Prêts" value={bs.READY || 0} icon={Plus} color="success" loading={isLoading} />
        <StatCard title="Brouillons" value={bs.DRAFT || 0} icon={Pencil} loading={isLoading} />
        <StatCard title="Priorité P0" value={p0} changeLabel="parcours critiques" icon={Plus} color={p0 ? 'danger' : 'primary'} loading={isLoading} />
        <StatCard title="Total" value={stats.total || 0} icon={Plus} loading={isLoading} />
      </div>

      <DocsFilters
        search={searchInput} onSearchChange={setSearchInput}
        searchPlaceholder="Rechercher un scénario (code, titre)…"
        activeCount={activeCount} onClear={clearFilters}
        filters={[
          { key: 'status', label: 'Statut', value: status, options: toSelectOptions(SCENARIO_STATUS, { withAll: true, allLabel: 'Tous statuts' }), onChange: (v) => updateFilter('status', v) },
          { key: 'priority', label: 'Priorité', value: priority, options: toSelectOptions(SCENARIO_PRIORITY, { withAll: true, allLabel: 'Toutes priorités' }), onChange: (v) => updateFilter('priority', v) },
          { key: 'profile', label: 'Profil', value: profile, options: toSelectOptions(SCENARIO_PROFILE, { withAll: true, allLabel: 'Tous profils' }), onChange: (v) => updateFilter('profile', v) },
          { key: 'type', label: 'Type', value: type, options: toSelectOptions(SCENARIO_TYPE, { withAll: true, allLabel: 'Tous types' }), onChange: (v) => updateFilter('type', v) },
          { key: 'module', label: 'Module', value: module, options: moduleOptions, onChange: (v) => updateFilter('module', v), searchable: true },
        ]}
      />

      <Table
        columns={columns} data={scenarios} rowKey="id_scenario" loading={isLoading}
        onRowClick={(row) => navigate(`/tests/scenarios/${row.code}`)}
        pagination={{ currentPage: page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), pageSize: PAGE_SIZE, total,
          onPageChange: (p) => updateFilter('page', String(p)) }}
        sortable
        onSort={(field, dir) => setParams((prev) => {
          const next = new URLSearchParams(prev); next.set('sort', field); next.set('dir', dir); next.delete('page'); return next
        }, { replace: true })}
        emptyMessage={activeCount > 0 ? 'Aucun scénario ne correspond à vos filtres.'
          : 'Aucun scénario. Créez-en un ou importez le pack de démarrage.'}
      />

      <ScenarioDrawer
        isOpen={drawerOpen} onClose={() => { setDrawerOpen(false); setEditing(null) }}
        scenario={editing?.scenario} steps={editing?.steps} mutations={mutations}
      />
      <ScenarioAssistantModal isOpen={aiOpen} onClose={() => setAiOpen(false)} mutations={mutations} />
      <ScenarioImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} mutations={mutations} />
    </div>
  )
}

export default ScenariosPage
