import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useArtisans } from '../../hooks/useArtisans'
import { useCategories, buildCategoryOptions } from '../../hooks/useCategories'
import { useDebounce } from '../../hooks/useDebounce'
import { useFilterStore } from '../../store/filterStore'
import { Button, Input, Select, Badge, Table, Spinner, EmptyState, ActionsMenu } from '../../components/ui'
import {
  Search, Download, Users, CheckCircle, Clock, Shield,
  X, TrendingUp, Star, BarChart3, Briefcase,
  RefreshCw, ArrowUpRight, PieChart, Award, Zap,
  Eye, Copy, AlertTriangle, Mail,
} from 'lucide-react'
import { formatDate, formatCurrency, formatStatus } from '../../utils/formatters'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import styles from './Artisans.module.css'

const Artisans = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    globalFilters, setGlobalFilter,
    pagination, setPagination,
    sorting, setSorting,
    activateScope,
  } = useFilterStore()

  useEffect(() => { activateScope('artisans') }, [location.pathname])

  const [selectedArtisans, setSelectedArtisans] = useState([])
  const [exportLoading, setExportLoading] = useState(false)

  const [searchInput, setSearchInput] = useState(globalFilters.search || '')
  const debouncedSearch = useDebounce(searchInput, 350)

  useEffect(() => {
    if (debouncedSearch !== globalFilters.search) setGlobalFilter('search', debouncedSearch)
  }, [debouncedSearch])

  useEffect(() => {
    if (globalFilters.search === '' && searchInput !== '') setSearchInput('')
  }, [globalFilters.search])

  const { artisans, total, stats, isLoading, isFetching, isError, error, refetch } = useArtisans()

  const { categories } = useCategories()
  const categoryOptions = useMemo(
    () => buildCategoryOptions(categories, 'Toutes catégories'),
    [categories]
  )

  /* ── Actions rapides ── */
  const copy = (text, label = 'Copié') => {
    navigator.clipboard.writeText(text)
    toast.success(label)
  }

  const quickKyc = async (artisan, status) => {
    const { error } = await supabase
      .from('artisan_profiles')
      .update({ kyc_status: status, updated_at: new Date().toISOString() })
      .eq('id_artisan', artisan.id_artisan)
    if (error) return toast.error(error.message)
    toast.success(status === 'VALIDATED' ? 'KYC validé' : 'KYC rejeté')
    refetch()
  }

  const quickSuspend = async (artisan) => {
    const { error } = await supabase
      .from('users')
      .update({ status: 'SUSPENDED', updated_at: new Date().toISOString() })
      .eq('id_user', artisan.id_artisan)
    if (error) return toast.error(error.message)
    toast.success('Artisan suspendu')
    refetch()
  }

  const quickReactivate = async (artisan) => {
    const { error } = await supabase
      .from('users')
      .update({ status: 'ACTIVE', ban_reason: null, updated_at: new Date().toISOString() })
      .eq('id_user', artisan.id_artisan)
    if (error) return toast.error(error.message)
    toast.success('Artisan réactivé')
    refetch()
  }

  const rowActions = (row) => {
    const items = [
      { label: 'Voir détails', icon: Eye, onClick: () => navigate(`/artisans/${row.id_artisan}`) },
      { label: 'Copier IFU', icon: Copy, onClick: () => copy(row.ifu_number, 'IFU copié') },
      { label: 'Copier email', icon: Mail, onClick: () => copy(row.user?.email || '', 'Email copié') },
    ]
    if (row.kyc_status !== 'VALIDATED') {
      items.push({ separator: true })
      items.push({ label: 'Valider KYC', icon: CheckCircle, onClick: () => quickKyc(row, 'VALIDATED') })
    }
    if (row.kyc_status === 'PENDING') {
      items.push({ label: 'Rejeter KYC', icon: X, onClick: () => quickKyc(row, 'REJECTED') })
    }
    items.push({ separator: true })
    if (row.user?.status === 'SUSPENDED') {
      items.push({ label: 'Réactiver', icon: RefreshCw, onClick: () => quickReactivate(row) })
    } else {
      items.push({ label: 'Suspendre', icon: AlertTriangle, danger: true, onClick: () => quickSuspend(row) })
    }
    return items
  }

  const statusOptions = [
    { value: 'all', label: 'Tous statuts KYC' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'VALIDATED', label: 'Validé' },
    { value: 'REJECTED', label: 'Rejeté' },
  ]
  const availabilityOptions = [
    { value: 'all', label: 'Toute dispo' },
    { value: 'AVAILABLE', label: 'Disponible' },
    { value: 'BUSY', label: 'Occupé' },
    { value: 'OFFLINE', label: 'Hors ligne' },
  ]

  const columns = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={selectedArtisans.length === artisans.length && artisans.length > 0}
          onChange={(e) => setSelectedArtisans(e.target.checked ? artisans.map(a => a.id_artisan) : [])}
        />
      ),
      accessor: (row) => row.id_artisan,
      cell: ({ value }) => (
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={selectedArtisans.includes(value)}
          onChange={(e) => {
            e.stopPropagation()
            setSelectedArtisans(prev =>
              e.target.checked ? [...prev, value] : prev.filter(id => id !== value)
            )
          }}
        />
      ),
      width: '40px',
      sortable: false,
    },
    {
      id: 'artisan',
      header: 'Artisan',
      accessor: (row) => ({
        name: row.user?.full_name,
        ifu: row.ifu_number,
        avatar: row.user?.avatar_url,
        email: row.user?.email,
      }),
      cell: ({ value }) => (
        <div className={styles.artisanCell}>
          <div className={styles.avatar}>
            {value.avatar ? (
              <img src={value.avatar} alt={value.name} />
            ) : (
              <span className={styles.avatarFallback}>{value.name?.charAt(0) || '?'}</span>
            )}
          </div>
          <div className={styles.artisanInfo}>
            <span className={styles.artisanName}>{value.name || '—'}</span>
            <span className={styles.artisanMeta}>
              <span className={styles.mono}>IFU·{value.ifu || '—'}</span>
              <span>{value.email || '—'}</span>
            </span>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'category',
      header: 'Catégorie',
      accessor: (row) => row.category,
      cell: ({ value }) => value?.name ? (
        <span className={styles.categoryCell}>
          <span className={styles.categoryIcon}>{value.name.charAt(0)}</span>
          {value.name}
        </span>
      ) : <span className={styles.muted}>—</span>,
    },
    {
      id: 'status',
      header: 'KYC',
      accessor: (row) => row.kyc_status,
      cell: ({ value }) => {
        const s = formatStatus(value)
        return <Badge variant={s.color} size="sm" dot>{s.label}</Badge>
      },
      sortable: true,
    },
    {
      id: 'availability',
      header: 'Disponibilité',
      accessor: (row) => row.availability_status,
      cell: ({ value }) => {
        const map = {
          AVAILABLE: { color: 'success', label: 'Disponible' },
          BUSY:      { color: 'warning', label: 'Occupé' },
          OFFLINE:   { color: 'secondary', label: 'Hors ligne' },
        }
        const s = map[value] || { color: 'secondary', label: value || '—' }
        return <Badge variant={s.color} size="sm" dot>{s.label}</Badge>
      },
    },
    {
      id: 'rating',
      header: 'Note',
      accessor: (row) => row.average_rating,
      cell: ({ value }) => (
        <span className={styles.rating}>
          <Star size={11} className={styles.starIcon} />
          {value?.toFixed(1) ?? '—'}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'missions',
      header: 'Missions',
      accessor: (row) => row.total_missions,
      cell: ({ value }) => (
        <span className={styles.inlineMetric}>
          <Briefcase size={11} />{value || 0}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'revenue',
      header: 'Revenu',
      accessor: (row) => row.wallet?.balance ?? row.total_revenue,
      cell: ({ value }) => (
        <span className={styles.amount}>{formatCurrency(value || 0)}</span>
      ),
    },
    {
      id: 'badge',
      header: 'Badge',
      accessor: (row) => row.badge,
      cell: ({ value }) => value?.name ? (
        <span className={styles.inlineMetric}>
          <Award size={11} />{value.name}
        </span>
      ) : <span className={styles.muted}>—</span>,
    },
    {
      id: 'joined',
      header: 'Inscription',
      accessor: (row) => row.created_at,
      cell: ({ value }) => (
        <span className={styles.muted}>{formatDate(value)}</span>
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
    globalFilters.availability, globalFilters.category,
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearchInput('')
    setGlobalFilter('search', '')
    setGlobalFilter('status', null)
    setGlobalFilter('availability', null)
    setGlobalFilter('category', null)
  }

  const resetFilters = () => { clearFilters(); setSelectedArtisans([]) }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const rows = selectedArtisans.length > 0
        ? artisans.filter(a => selectedArtisans.includes(a.id_artisan))
        : artisans
      const csv = rows.map(a => ({
        Nom: a.user?.full_name, Email: a.user?.email, Téléphone: a.user?.phone_number,
        IFU: a.ifu_number, Catégorie: a.category?.name, KYC: a.kyc_status,
        Disponibilité: a.availability_status,
        Note: a.average_rating?.toFixed(1) || 'N/A',
        Missions: a.total_missions || 0,
        Revenu: a.total_revenue || 0,
        'Date inscription': formatDate(a.created_at),
      }))
      const headers = Object.keys(csv[0]).join(',')
      const lines = csv.map(r => Object.values(r).map(v =>
        typeof v === 'string' && v.includes(',') ? `"${v}"` : v
      ).join(','))
      const blob = new Blob([[headers, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `artisans_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportLoading(false)
    }
  }

  if (isLoading && artisans.length === 0) {
    return <div className={styles.loading}><Spinner size="lg" /><span className={styles.loadingText}>Chargement des artisans…</span></div>
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <div style={{ padding: 16, background: 'var(--danger-subtle)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius)', color: 'var(--danger)', fontSize: 'var(--fs-sm)' }}>
          <strong>Erreur :</strong> {error?.message || 'Erreur inconnue'}
          <br />
          <button onClick={() => refetch()} style={{ marginTop: 8, padding: '6px 10px', border: '1px solid var(--danger-border)', background: 'var(--bg)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Réessayer</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.toolbar}>
            <div className={styles.filtersGroup}>
              <div className={styles.searchWrap}>
                <Input size="md" icon={Search}
                  placeholder="Rechercher par nom, email ou IFU…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)} />
              </div>
              <div className={styles.filterItem}>
                <Select size="md" options={statusOptions}
                  value={globalFilters.status || 'all'}
                  onChange={(v) => setGlobalFilter('status', v === 'all' ? null : v)} />
              </div>
              <div className={styles.filterItem}>
                <Select size="md" options={availabilityOptions}
                  value={globalFilters.availability || 'all'}
                  onChange={(v) => setGlobalFilter('availability', v === 'all' ? null : v)} />
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
              <Button variant="outline" size="md" icon={RefreshCw} onClick={() => refetch()} aria-label="Rafraîchir" />
              <Button variant="outline" size="md" icon={Download} onClick={handleExport} isLoading={exportLoading}>Exporter</Button>
              <Button variant="primary" size="md" icon={ArrowUpRight} onClick={() => navigate('/artisans/register')}>Nouvel artisan</Button>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <Users size={18} />
            <div>
              <span className={styles.statValue}>{total}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
          </div>
          <div className={styles.stat} title="Artisans actuellement disponibles pour accepter des missions">
            <Zap size={18} className={styles.success} />
            <div>
              <span className={styles.statValue}>{stats?.available || 0}</span>
              <span className={styles.statLabel}>Disponibles</span>
            </div>
          </div>
          <div className={styles.stat}>
            <CheckCircle size={18} className={styles.success} />
            <div>
              <span className={styles.statValue}>{stats?.validated || 0}</span>
              <span className={styles.statLabel}>KYC validés</span>
            </div>
          </div>
          <div className={styles.stat}>
            <Clock size={18} className={styles.warning} />
            <div>
              <span className={styles.statValue}>{stats?.pending || 0}</span>
              <span className={styles.statLabel}>En attente</span>
            </div>
          </div>
          <div className={styles.stat}>
            <Shield size={18} className={styles.info} />
            <div>
              <span className={styles.statValue}>{stats?.proMembers || 0}</span>
              <span className={styles.statLabel}>Pro membres</span>
            </div>
          </div>
        </div>

        {selectedArtisans.length > 0 && (
          <div className={styles.bulkBar}>
            <span className={styles.bulkInfo}>
              <CheckCircle size={13} /> {selectedArtisans.length} sélectionné(s)
            </span>
            <div className={styles.bulkActions}>
              <Button variant="outline" size="sm">Actions groupées</Button>
              <Button variant="ghost" size="sm" icon={X} onClick={() => setSelectedArtisans([])} />
            </div>
          </div>
        )}

        {artisans.length > 0 ? (
          <Table
            columns={columns}
            data={artisans}
            rowKey="id_artisan"
            loading={isFetching}
            sortable
            onSort={(col, dir) => setSorting(col, dir)}
            onRowClick={(row) => navigate(`/artisans/${row.id_artisan}`)}
            pagination={{
              currentPage: pagination.page,
              totalPages: Math.ceil(total / pagination.pageSize),
              pageSize: pagination.pageSize,
              total,
              onPageChange: (page) => setPagination({ page }),
            }}
          />
        ) : (
          <EmptyState icon={Users} title="Aucun artisan trouvé" description="Aucun artisan ne correspond à vos critères."
            action={{ label: 'Réinitialiser', onClick: resetFilters }}
            secondaryAction={{ label: 'Ajouter un artisan', onClick: () => navigate('/artisans/register') }} />
        )}

        {artisans.length > 0 && (
          <div className={styles.insights}>
            <div className={styles.insightsHeader}>
              <BarChart3 size={13} />
              <span>Analytiques rapides</span>
            </div>
            <div className={styles.insightsGrid}>
              <div className={styles.insight}><PieChart size={13} /><span>Taux de complétion KYC</span><strong>{stats?.kycCompletionRate || 0}%</strong></div>
              <div className={styles.insight}><TrendingUp size={13} /><span>Missions / artisan</span><strong>{stats?.avgMissionsPerArtisan || 0}</strong></div>
              <div className={styles.insight}><Star size={13} /><span>Note moyenne</span><strong>{stats?.avgRating?.toFixed(1) || '—'}/5</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Artisans