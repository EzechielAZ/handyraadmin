import { useState, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, ExternalLink, Copy, FlaskConical, Play, Users, Inbox } from 'lucide-react'
import { Button, Table, ActionsMenu, StatCard } from '../../../components/ui'
import { DocsHeader, DocsFilters, StatusBadge, DocsErrorState, DocsEmptyState } from '../../../components/docs'
import { ProgressBar } from '../../../components/tests'
import {
  useTestCampaigns, useTestCampaignMutations, useTestsAccess, CAMPAIGN_STATUS, toSelectOptions,
} from '../../../hooks/tests'
import { useDebounce } from '../../../hooks/useDebounce'
import { formatDateShort } from '../../../utils/docsFormatters'
import { CampaignDrawer } from './CampaignDrawer'
import styles from '../Tests.module.css'
import local from './Campaigns.module.css'

const PAGE_SIZE = 20

export const TestCampaignsPage = () => {
  const navigate = useNavigate()
  const { canWrite } = useTestsAccess()
  const [params, setParams] = useSearchParams()
  const search = params.get('q') || ''
  const status = params.get('status') || null
  const page = Math.max(1, Number(params.get('page') || 1))

  const [searchInput, setSearchInput] = useState(search)
  const debounced = useDebounce(searchInput, 300)
  useMemo(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (debounced) next.set('q', debounced); else next.delete('q')
      next.delete('page')
      return next
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const { campaigns, total, stats, isLoading, isFetching, isError, error, refetch } =
    useTestCampaigns({ search: debounced, status, page, pageSize: PAGE_SIZE })
  const mutations = useTestCampaignMutations()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const updateFilter = useCallback((key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === null || value === '' || value === undefined) next.delete(key); else next.set(key, value)
      if (key !== 'page') next.delete('page')
      return next
    }, { replace: true })
  }, [setParams])
  const clearFilters = () => { setSearchInput(''); setParams({}, { replace: true }) }
  const activeCount = [search, status].filter(Boolean).length

  const columns = [
    { id: 'code', header: 'Code', accessor: 'code', width: '130px',
      cell: ({ value }) => <span className={styles.codeCell}>{value}</span> },
    { id: 'name', header: 'Campagne', accessor: 'name',
      cell: ({ value, row }) => (
        <div className={styles.titleCell}>
          <span className={styles.titlePrimary}>{value}</span>
          <span className={styles.titleMeta}>
            {row.releaseVersion ? `v${row.releaseVersion}` : 'Sans release'}
            {row.platforms?.length > 0 && ` · ${row.platforms.map((p) => (p === 'IOS' ? 'iOS' : 'Android')).join(' + ')}`}
          </span>
        </div>
      ) },
    { id: 'status', header: 'Statut', accessor: 'status', width: '120px',
      cell: ({ value }) => <StatusBadge map={CAMPAIGN_STATUS} value={value} /> },
    { id: 'progress', header: 'Progression', width: '200px',
      cell: ({ row }) => (
        <div className={local.progressCell}>
          <ProgressBar segments={[{ value: row.runsDone, color: 'green', label: 'terminées' }]} total={row.runsTotal} />
          <span className={local.progressText}>{row.runsDone} / {row.runsTotal} exécutions</span>
        </div>
      ) },
    { id: 'testers', header: 'Testeurs', accessor: 'testerCount', width: '90px',
      cell: ({ value }) => <span className={styles.timeCell}>{value}</span> },
    { id: 'findings', header: 'À trier', accessor: 'findingsOpen', width: '90px',
      cell: ({ value }) => value > 0
        ? <StatusBadge map={{ x: { label: String(value), color: 'blue', icon: 'CircleDot' } }} value="x" />
        : <span className={styles.muted}>0</span> },
    { id: 'dates', header: 'Période', width: '150px',
      cell: ({ row }) => <span className={styles.timeCell}>
        {row.starts_at ? formatDateShort(row.starts_at) : '—'}{row.ends_at ? ` → ${formatDateShort(row.ends_at)}` : ''}
      </span> },
    { id: 'actions', header: '', width: '50px', sortable: false,
      cell: ({ row }) => <ActionsMenu items={[
        { label: 'Ouvrir', icon: ExternalLink, onClick: () => navigate(`/tests/campaigns/${row.code}`) },
        ...(canWrite ? [{ label: 'Dupliquer', icon: Copy, onClick: () => mutations.duplicate.mutate(row.id_campaign) }] : []),
      ]} /> },
  ]

  if (isError) {
    return (
      <div className={styles.page}>
        <DocsHeader eyebrow="Tests de validation" title="Campagnes" />
        <DocsErrorState error={error} onRetry={refetch} title="Impossible de charger les campagnes" />
      </div>
    )
  }

  const bs = stats.byStatus || {}
  const empty = !isLoading && stats.total === 0
  return (
    <div className={styles.page}>
      <DocsHeader
        eyebrow="Tests de validation" title="Campagnes"
        description="Pilotez chaque phase de test : scénarios, testeurs, avancement, retours et décision go / no-go."
        actions={<>
          <Button variant="outline" icon={RefreshCw} onClick={refetch} isLoading={isFetching} aria-label="Rafraîchir" />
          {canWrite && <Button variant="primary" icon={Plus} onClick={() => setDrawerOpen(true)}>Nouvelle campagne</Button>}
        </>}
      />

      {empty ? (
        <DocsEmptyState
          icon={FlaskConical} title="Lancez votre première campagne de test"
          description="Une campagne regroupe des scénarios, des testeurs et des critères de sortie."
          action={canWrite ? { label: 'Créer une campagne', icon: Plus, onClick: () => setDrawerOpen(true) } : undefined}
        />
      ) : (<>
        <div className={styles.statsGrid}>
          <StatCard title="En cours" value={bs.ACTIVE || 0} icon={Play} color="success" loading={isLoading} />
          <StatCard title="Brouillons" value={bs.DRAFT || 0} icon={Inbox} loading={isLoading} />
          <StatCard title="Terminées" value={bs.COMPLETED || 0} icon={Users} loading={isLoading} />
          <StatCard title="Total" value={stats.total || 0} icon={FlaskConical} loading={isLoading} />
        </div>
        <DocsFilters
          search={searchInput} onSearchChange={setSearchInput} searchPlaceholder="Rechercher une campagne…"
          activeCount={activeCount} onClear={clearFilters}
          filters={[{ key: 'status', label: 'Statut', value: status,
            options: toSelectOptions(CAMPAIGN_STATUS, { withAll: true, allLabel: 'Tous statuts' }), onChange: (v) => updateFilter('status', v) }]}
        />
        <Table
          columns={columns} data={campaigns} rowKey="id_campaign" loading={isLoading}
          onRowClick={(row) => navigate(`/tests/campaigns/${row.code}`)}
          pagination={{ currentPage: page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), pageSize: PAGE_SIZE, total,
            onPageChange: (p) => updateFilter('page', String(p)) }}
          emptyMessage="Aucune campagne ne correspond à vos filtres."
        />
      </>)}

      <CampaignDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} mutations={mutations}
        onSaved={(res) => res?.campaign?.code && navigate(`/tests/campaigns/${res.campaign.code}`)} />
    </div>
  )
}

export default TestCampaignsPage
