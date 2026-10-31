import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMissions } from '../../hooks/useMissions'
import { useCategories, buildCategoryOptions } from '../../hooks/useCategories'
import { useDebounce } from '../../hooks/useDebounce'
import { useFilterStore } from '../../store/filterStore'
import { Button, Input, Select, Badge, Table, Spinner, EmptyState, ActionsMenu } from '../../components/ui'
import {
  Search, Download, Briefcase, CheckCircle, Clock, XCircle,
  Calendar, X, Zap, Eye, Ban,
} from 'lucide-react'
import { formatDate, formatCurrency, formatStatus } from '../../utils/formatters'
import styles from './Missions.module.css'

const Missions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    globalFilters, setGlobalFilter,
    pagination, setPagination,
    sorting, setSorting,
    activateScope,
  } = useFilterStore()

  /* Reset des filtres quand on change de scope */
  useEffect(() => { activateScope('missions') }, [location.pathname])

  const [searchInput, setSearchInput] = useState(globalFilters.search || '')
  const debouncedSearch = useDebounce(searchInput, 350)

  useEffect(() => {
    if (debouncedSearch !== globalFilters.search) setGlobalFilter('search', debouncedSearch)
  }, [debouncedSearch])

  useEffect(() => {
    if (globalFilters.search === '' && searchInput !== '') setSearchInput('')
  }, [globalFilters.search])

  const { missions, total, isLoading, isFetching, isError, error, refetch, cancelMission } = useMissions()

  const { categories } = useCategories()
  const categoryOptions = useMemo(
    () => buildCategoryOptions(categories, 'Toutes catégories'),
    [categories]
  )

  const statusOptions = [
    { value: 'all', label: 'Tous statuts' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'ACCEPTED', label: 'Acceptée' },
    { value: 'ON_WAY', label: 'En chemin' },
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'COMPLETED', label: 'Terminée' },
    { value: 'CANCELLED', label: 'Annulée' },
    { value: 'INCIDENT', label: 'Incident' },
  ]
  const typeOptions = [
    { value: 'all', label: 'Tous types' },
    { value: 'IMMEDIATE', label: 'Immédiate' },
    { value: 'SCHEDULED', label: 'Planifiée' },
  ]
  const worldOptions = [
    { value: 'all', label: 'Tous mondes' },
    { value: 'SERVICE', label: 'Service' },
    { value: 'CONSTRUCTION', label: 'Construction' },
  ]

  const rowActions = (row) => {
    const items = [
      { label: 'Voir détails', icon: Eye, onClick: () => navigate(`/missions/${row.id_mission}`) },
    ]
    if (!['COMPLETED', 'CANCELLED'].includes(row.status)) {
      items.push({ separator: true })
      items.push({
        label: 'Annuler la mission',
        icon: Ban,
        danger: true,
        onClick: () => {
          if (confirm('Confirmer l\'annulation ?')) {
            cancelMission({ id: row.id_mission, reason: 'Annulée par admin' })
          }
        },
      })
    }
    return items
  }

  const columns = [
    {
      id: 'mission',
      header: 'Mission',
      accessor: (row) => ({
        id: row.id_mission?.slice(0, 8),
        description: row.description,
        type: row.mission_type,
        world: row.mission_world,
      }),
      cell: ({ value }) => (
        <div className={styles.missionCell}>
          <span className={styles.missionId}>#{value.id}</span>
          <span className={styles.missionDesc}>{value.description}</span>
          <span className={styles.missionType}>
            {value.type === 'IMMEDIATE'
              ? <><Zap size={10} /> Immédiate</>
              : <><Calendar size={10} /> Planifiée</>}
            {value.world === 'CONSTRUCTION' && <> · 🏗 Construction</>}
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'client',
      header: 'Client',
      accessor: (row) => row.client?.full_name,
      cell: ({ value }) => <span className={styles.cellPrimary}>{value || '—'}</span>,
    },
    {
      id: 'artisan',
      header: 'Artisan',
      accessor: (row) => row.artisan?.user?.full_name || null,
      cell: ({ value }) => value
        ? <span className={styles.cellSecondary}>{value}</span>
        : <span className={styles.unassigned}>Non assigné</span>,
    },
    {
      id: 'category',
      header: 'Catégorie',
      accessor: (row) => row.category?.name,
      cell: ({ value }) => value
        ? <span className={styles.cellSecondary}>{value}</span>
        : <span className={styles.muted}>—</span>,
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => row.status,
      cell: ({ value }) => {
        const s = formatStatus(value)
        return <Badge variant={s.color} size="sm" dot>{s.label}</Badge>
      },
      sortable: true,
    },
    {
      id: 'amount',
      header: 'Montant',
      accessor: (row) => row.final_price || row.estimated_price,
      cell: ({ value }) => (
        <span className={styles.amount}>{formatCurrency(value || 0)}</span>
      ),
      sortable: true,
    },
    {
      id: 'date',
      header: 'Date',
      accessor: (row) => row.scheduled_at || row.created_at,
      cell: ({ value }) => (
        <span className={styles.dateCell}><Calendar size={11} />{formatDate(value)}</span>
      ),
      sortable: true,
    },
    {
      id: 'actions',
      header: '',
      accessor: (row) => row,
      cell: ({ value }) => <ActionsMenu items={rowActions(value)} />,
      width: '50px',
      sortable: false,
    },
  ]

  const activeFiltersCount = [
    globalFilters.search, globalFilters.status,
    globalFilters.type, globalFilters.world, globalFilters.category,
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearchInput('')
    setGlobalFilter('search', '')
    setGlobalFilter('status', null)
    setGlobalFilter('type', null)
    setGlobalFilter('world', null)
    setGlobalFilter('category', null)
  }

  const handleExport = () => {
    const csv = missions.map(m => ({
      ID: m.id_mission, Description: m.description,
      Client: m.client?.full_name, Artisan: m.artisan?.user?.full_name || 'Non assigné',
      Catégorie: m.category?.name, Statut: m.status,
      Montant: m.final_price || m.estimated_price,
      Date: formatDate(m.created_at),
    }))
    const headers = Object.keys(csv[0] || {}).join(',')
    const lines = csv.map(r => Object.values(r).map(v =>
      typeof v === 'string' && v.includes(',') ? `"${v}"` : v
    ).join(','))
    const blob = new Blob([[headers, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `missions_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading && missions.length === 0) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
        <span className={styles.loadingText}>Chargement des missions…</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <div style={{
          padding: 16, background: 'var(--danger-subtle)',
          border: '1px solid var(--danger-border)', borderRadius: 'var(--radius)',
          color: 'var(--danger)', fontSize: 'var(--fs-sm)',
        }}>
          <strong>Erreur :</strong> {error?.message || 'Erreur inconnue'}
          <br />
          <button onClick={() => refetch()} style={{
            marginTop: 8, padding: '6px 10px', border: '1px solid var(--danger-border)',
            background: 'var(--bg)', color: 'var(--danger)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          }}>Réessayer</button>
        </div>
      </div>
    )
  }

  const inProgress = missions.filter(m => ['ACCEPTED', 'ON_WAY', 'IN_PROGRESS'].includes(m.status)).length
  const completed  = missions.filter(m => m.status === 'COMPLETED').length
  const cancelled  = missions.filter(m => m.status === 'CANCELLED').length

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.toolbar}>
            <div className={styles.filtersGroup}>
              <div className={styles.searchWrap}>
                <Input size="md" icon={Search}
                  placeholder="Rechercher une mission…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)} />
              </div>
              <div className={styles.filterItem}>
                <Select size="md" options={statusOptions}
                  value={globalFilters.status || 'all'}
                  onChange={(v) => setGlobalFilter('status', v === 'all' ? null : v)} />
              </div>
              <div className={styles.filterItem}>
                <Select size="md" options={typeOptions}
                  value={globalFilters.type || 'all'}
                  onChange={(v) => setGlobalFilter('type', v === 'all' ? null : v)} />
              </div>
              <div className={styles.filterItem}>
                <Select size="md" options={worldOptions}
                  value={globalFilters.world || 'all'}
                  onChange={(v) => setGlobalFilter('world', v === 'all' ? null : v)} />
              </div>
              <div className={styles.filterItem}>
                <Select size="md" searchable clearable options={categoryOptions}
                  value={globalFilters.category || 'all'}
                  onChange={(v) => setGlobalFilter('category', v === 'all' ? null : v)} />
              </div>
              {activeFiltersCount > 0 && (
                <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                  <X size={11} /> Effacer
                </button>
              )}
            </div>
            <div className={styles.actions}>
              <Button variant="outline" size="md" icon={Download} onClick={handleExport}>
                Exporter
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <Briefcase size={18} />
            <div>
              <span className={styles.statValue}>{total}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
          </div>
          <div className={styles.stat}>
            <Clock size={18} className={styles.warning} />
            <div>
              <span className={styles.statValue}>{inProgress}</span>
              <span className={styles.statLabel}>En cours</span>
            </div>
          </div>
          <div className={styles.stat}>
            <CheckCircle size={18} className={styles.success} />
            <div>
              <span className={styles.statValue}>{completed}</span>
              <span className={styles.statLabel}>Terminées</span>
            </div>
          </div>
          <div className={styles.stat}>
            <XCircle size={18} className={styles.danger} />
            <div>
              <span className={styles.statValue}>{cancelled}</span>
              <span className={styles.statLabel}>Annulées</span>
            </div>
          </div>
        </div>

        {missions.length > 0 ? (
          <Table
            columns={columns}
            data={missions}
            rowKey="id_mission"
            loading={isFetching}
            sortable
            onSort={(col, dir) => setSorting(col, dir)}
            onRowClick={(row) => navigate(`/missions/${row.id_mission}`)}
            pagination={{
              currentPage: pagination.page,
              totalPages: Math.ceil(total / pagination.pageSize),
              pageSize: pagination.pageSize,
              total,
              onPageChange: (page) => setPagination({ page }),
            }}
          />
        ) : (
          <EmptyState
            icon={Briefcase}
            title="Aucune mission trouvée"
            description="Aucune mission ne correspond à vos critères."
            action={{ label: 'Réinitialiser', onClick: clearFilters }}
          />
        )}
      </div>
    </div>
  )
}

export default Missions