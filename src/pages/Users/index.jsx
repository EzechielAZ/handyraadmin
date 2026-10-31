import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUsers } from '../../hooks/useUsers'
import { useDebounce } from '../../hooks/useDebounce'
import { useFilterStore } from '../../store/filterStore'
import { Button, Input, Select, Badge, Table, Spinner, EmptyState } from '../../components/ui'
import {
  Search, Download, Users as UsersIcon, UserCheck, UserX,
  Calendar, MoreVertical, Crown, X, Zap, AlertCircle,
  Globe, UserPlus, Link2, Clock, Wifi, WifiOff,
} from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import styles from './Users.module.css'

/* Formate un timestamptz en "il y a 2h", "il y a 3j", etc. */
const formatRelative = (iso) => {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  const hr   = Math.floor(diff / 3600000)
  const day  = Math.floor(diff / 86400000)
  if (min < 1)   return "à l'instant"
  if (min < 60)  return `il y a ${min} min`
  if (hr  < 24)  return `il y a ${hr} h`
  if (day < 30)  return `il y a ${day} j`
  return formatDate(iso)
}

const Users = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    globalFilters, setGlobalFilter,
    pagination, setPagination,
    sorting, setSorting,
    activateScope,
  } = useFilterStore()

  useEffect(() => {
    activateScope('users')
  }, [location.pathname])

  const [searchInput, setSearchInput] = useState(globalFilters.search || '')
  const debouncedSearch = useDebounce(searchInput, 350)

  useEffect(() => {
    if (debouncedSearch !== globalFilters.search) {
      setGlobalFilter('search', debouncedSearch)
    }
  }, [debouncedSearch])

  useEffect(() => {
    if (globalFilters.search === '' && searchInput !== '') {
      setSearchInput('')
    }
  }, [globalFilters.search])

  const { users, total, stats, isLoading, isFetching, isError, error, refetch } = useUsers()

  const roleOptions = [
    { value: 'all', label: 'Tous rôles' },
    { value: 'CLIENT', label: 'Client' },
    { value: 'ARTISAN', label: 'Artisan' },
  ]
  const statusOptions = [
    { value: 'all', label: 'Tous statuts' },
    { value: 'ACTIVE', label: 'Compte activé' },
    { value: 'SUSPENDED', label: 'Suspendu' },
    { value: 'BANNED', label: 'Banni' },
  ]
  const verifiedOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'true', label: 'Vérifié' },
    { value: 'false', label: 'Non vérifié' },
  ]

  const columns = [
    /* ─── 1. Utilisateur (avatar + nom + présence) ─── */
    {
      id: 'user',
      header: 'Utilisateur',
      accessor: (row) => ({
        name: row.full_name,
        avatar: row.avatar_url,
        role: row.user_role,
        presence: row.presence_status,
      }),
      cell: ({ value }) => (
        <div className={styles.userCell}>
          <div className={styles.avatar}>
            {value.avatar ? (
              <img src={value.avatar} alt={value.name} />
            ) : (
              <span className={styles.avatarFallback}>{value.name?.charAt(0) || '?'}</span>
            )}
            {value.presence === 'online' && <span className={styles.presenceDot} />}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>
              {value.name}
              {value.role?.toUpperCase() === 'ARTISAN' && (
                <Crown size={13} className={styles.artisanIcon} />
              )}
            </div>
          </div>
        </div>
      ),
      sortable: true,
    },

    /* ─── 2. Rôle ─── */
    {
      id: 'role',
      header: 'Rôle',
      accessor: (row) => row.user_role,
      cell: ({ value }) => (
        <Badge variant={value?.toUpperCase() === 'ARTISAN' ? 'primary' : 'secondary'} size="sm">
          {value?.toUpperCase() === 'ARTISAN' ? 'Artisan' : 'Client'}
        </Badge>
      ),
      sortable: true,
    },

    /* ─── 3. Compte (statut administratif) ─── */
    {
      id: 'status',
      header: 'Compte',
      accessor: (row) => row.status,
      cell: ({ value }) => {
        const map = {
          ACTIVE:    { variant: 'success', label: 'Activé' },
          SUSPENDED: { variant: 'warning', label: 'Suspendu' },
          BANNED:    { variant: 'danger',  label: 'Banni' },
        }
        const s = map[value] || { variant: 'secondary', label: value }
        return <Badge variant={s.variant} size="sm" dot>{s.label}</Badge>
      },
      sortable: true,
    },

    /* ─── 4. Vérifié ─── */
    {
      id: 'verified',
      header: 'Vérifié',
      accessor: (row) => row.is_verified,
      cell: ({ value }) => value ? (
        <Badge variant="success" size="sm"><UserCheck size={11} /> Vérifié</Badge>
      ) : (
        <Badge variant="warning" size="sm"><UserX size={11} /> Non vérifié</Badge>
      ),
    },

    /* ─── 5. Présence temps réel (NOUVEAU) ─── */
    {
      id: 'presence',
      header: 'Présence',
      accessor: (row) => ({
        status: row.presence_status,
        lastSeen: row.presence_last_seen,
      }),
      cell: ({ value }) => {
        if (!value.status || value.status === 'offline') {
          return (
            <span className={styles.presenceCell}>
              <WifiOff size={11} className={styles.presenceIconOff} />
              <span className={styles.presenceText}>Hors ligne</span>
            </span>
          )
        }
        if (value.status === 'online') {
          return (
            <span className={styles.presenceCell}>
              <Wifi size={11} className={styles.presenceIconOn} />
              <span className={styles.presenceTextOn}>En ligne</span>
            </span>
          )
        }
        return (
          <span className={styles.presenceCell}>
            <Clock size={11} className={styles.presenceIconAway} />
            <span className={styles.presenceTextAway}>
              Away · {formatRelative(value.lastSeen)}
            </span>
          </span>
        )
      },
    },

    /* ─── 6. Email ─── */
    {
      id: 'email',
      header: 'Email',
      accessor: (row) => row.email,
      cell: ({ value }) => value
        ? <span className={styles.monoText}>{value}</span>
        : <span className={styles.empty}>—</span>,
    },

    /* ─── 7. Téléphone ─── */
    {
      id: 'phone',
      header: 'Téléphone',
      accessor: (row) => row.phone_number,
      cell: ({ value }) => value && value.trim() !== ''
        ? <span className={styles.monoText}>{value}</span>
        : <span className={styles.empty}>—</span>,
    },

    /* ─── 8. Pays ─── */
    {
      id: 'country',
      header: 'Pays',
      accessor: (row) => row.country_name,
      cell: ({ value }) => value
        ? (
          <span className={styles.countryCell}>
            <Globe size={11} />
            {value}
          </span>
        )
        : <span className={styles.empty}>—</span>,
    },

    /* ─── 9. Parrainage (parrain + code) ─── */
    {
      id: 'referral',
      header: 'Parrainage',
      accessor: (row) => ({
        parrain: row.referred_by_name,
        code: row.referral_code,
      }),
      cell: ({ value }) => {
        if (!value.parrain && !value.code) {
          return <span className={styles.empty}>—</span>
        }
        return (
          <div className={styles.referralCell}>
            {value.parrain && (
              <span className={styles.referralLine}>
                <UserPlus size={11} />
                Par : {value.parrain}
              </span>
            )}
            {value.code && (
              <span className={styles.referralLine}>
                <Link2 size={11} />
                <span className={styles.monoTextSm}>{value.code}</span>
              </span>
            )}
          </div>
        )
      },
    },

    /* ─── 10. Filleuls (NOUVEAU) ─── */
    {
      id: 'referral_count',
      header: 'Filleuls',
      accessor: (row) => row.referral_count || 0,
      cell: ({ value }) => (
        <span className={value > 0 ? styles.referralCount : styles.empty}>
          {value > 0 ? value : '—'}
        </span>
      ),
    },

    /* ─── 11. Dernière activité (NOUVEAU) ─── */
    {
      id: 'last_active',
      header: 'Dernière activité',
      accessor: (row) => row.presence_last_seen || row.last_active_at || row.updated_at,
      cell: ({ value }) => (
        <span className={styles.date}>
          <Clock size={11} />
          {formatRelative(value)}
        </span>
      ),
      sortable: true,
    },

    /* ─── 12. Inscrit ─── */
    {
      id: 'joined',
      header: 'Inscrit',
      accessor: (row) => row.created_at,
      cell: ({ value }) => (
        <span className={styles.date}>
          <Calendar size={11} />
          {formatDate(value)}
        </span>
      ),
      sortable: true,
    },

    /* ─── 13. Actions ─── */
    {
      id: 'actions',
      header: '',
      accessor: (row) => row,
      cell: ({ value }) => (
        <Button
          variant="ghost"
          size="sm"
          icon={MoreVertical}
          onClick={(e) => { e.stopPropagation(); navigate(`/users/${value.id_user}`) }}
        />
      ),
      width: '44px',
      sortable: false,
    },
  ]

  const activeFiltersCount = [
    globalFilters.search, globalFilters.role,
    globalFilters.status, globalFilters.verified,
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearchInput('')
    setGlobalFilter('search', '')
    setGlobalFilter('role', null)
    setGlobalFilter('status', null)
    setGlobalFilter('verified', null)
  }

  const handleExport = async () => {
    const csv = users.map(u => ({
      Nom: u.full_name, Email: u.email, Téléphone: u.phone_number,
      Rôle: u.user_role, Compte: u.status, Vérifié: u.is_verified ? 'Oui' : 'Non',
      Présence: u.presence_status || 'offline',
      'Dernière activité': formatRelative(u.presence_last_seen || u.last_active_at),
      Pays: u.country_name || '—',
      Parrain: u.referred_by_name || '—',
      Filleuls: u.referral_count || 0,
      'Code parrain': u.referral_code || '—',
      Inscription: formatDate(u.created_at),
    }))
    const headers = Object.keys(csv[0] || {}).join(',')
    const lines = csv.map(r => Object.values(r).map(v =>
      typeof v === 'string' && v.includes(',') ? `"${v}"` : v
    ).join(','))
    const blob = new Blob([[headers, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading && users.length === 0) {
    return <div className={styles.loading}><Spinner size="lg" /></div>
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

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.toolbar}>
            <div className={styles.filtersGroup}>
              <div className={styles.searchWrap}>
                <Input
                  size="md"
                  icon={Search}
                  placeholder="Rechercher un utilisateur…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <div className={styles.filterItem}>
                <Select size="md" options={roleOptions}
                  value={globalFilters.role || 'all'}
                  onChange={(v) => setGlobalFilter('role', v === 'all' ? null : v)} />
              </div>
              <div className={styles.filterItem}>
                <Select size="md" options={statusOptions}
                  value={globalFilters.status || 'all'}
                  onChange={(v) => setGlobalFilter('status', v === 'all' ? null : v)} />
              </div>
              <div className={styles.filterItem}>
                <Select size="md" options={verifiedOptions}
                  value={globalFilters.verified || 'all'}
                  onChange={(v) => setGlobalFilter('verified', v === 'all' ? null : v)} />
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
            <UsersIcon size={18} />
            <div>
              <span className={styles.statValue}>{stats?.total || 0}</span>
              <span className={styles.statLabel}>Comptes</span>
            </div>
          </div>
          <div className={styles.stat} title="Comptes non suspendus ni bannis">
            <UserCheck size={18} className={styles.success} />
            <div>
              <span className={styles.statValue}>{stats?.active_accounts || 0}</span>
              <span className={styles.statLabel}>Activés</span>
            </div>
          </div>
          <div className={styles.stat} title="Au moins une session dans les 30 derniers jours">
            <Zap size={18} className={styles.info} />
            <div>
              <span className={styles.statValue}>{stats?.active_30d || 0}</span>
              <span className={styles.statLabel}>Actifs 30j</span>
            </div>
          </div>
          <div className={styles.stat} title="Comptes activés sans aucune session">
            <AlertCircle size={18} className={styles.warning} />
            <div>
              <span className={styles.statValue}>{stats?.never_connected || 0}</span>
              <span className={styles.statLabel}>Jamais connectés</span>
            </div>
          </div>
        </div>

        {users.length > 0 ? (
          <Table
            columns={columns}
            data={users}
            rowKey="id_user"
            loading={isFetching}
            sortable
            onSort={(col, dir) => setSorting(col, dir)}
            onRowClick={(row) => navigate(`/users/${row.id_user}`)}
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
            icon={UsersIcon}
            title="Aucun utilisateur trouvé"
            description="Aucun utilisateur ne correspond à vos critères."
            action={{ label: 'Réinitialiser', onClick: clearFilters }}
          />
        )}
      </div>
    </div>
  )
}

export default Users