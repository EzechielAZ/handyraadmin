import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupervisors } from '../../hooks/useHPO'
import { Button, Input, Select, Badge, Table, Spinner, EmptyState } from '../../components/ui'
import {
  Search,
  Filter,
  HardHat,
  Star,
  Briefcase,
  Shield,
  MoreVertical,
  MapPin,
  Calendar
} from 'lucide-react'
import { formatDate, formatCurrency } from '../../utils/formatters'
import styles from './HPO.module.css'

const SupervisorsList = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  
  const { supervisors, isLoading } = useSupervisors()

  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'SUSPENDED', label: 'Suspendu' },
    { value: 'REVOKED', label: 'Révoqué' },
  ]

  const columns = [
    {
      id: 'supervisor',
      header: 'Superviseur',
      accessor: (row) => ({
        name: row.artisan?.user?.full_name,
        ifu: row.artisan?.ifu_number,
        isFounder: row.is_founder,
        avatar: row.artisan?.user?.avatar_url,
      }),
      cell: ({ value }) => (
        <div className={styles.userCell}>
          <div className={styles.avatar}>
            {value.avatar ? (
              <img src={value.avatar} alt={value.name} />
            ) : (
              <div className={styles.avatarFallback}>
                {value.name?.charAt(0)}
              </div>
            )}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>
              {value.name}
              {value.isFounder && (
                <Badge variant="primary" size="xs" className={styles.founderBadge}>
                  Fondateur
                </Badge>
              )}
            </div>
            <div className={styles.userIfu}>IFU: {value.ifu}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => row.certification_status,
      cell: ({ value }) => {
        const colors = {
          ACTIVE: 'success',
          SUSPENDED: 'warning',
          REVOKED: 'error',
        }
        return (
          <Badge variant={colors[value] || 'secondary'} size="sm" dot>
            {value}
          </Badge>
        )
      },
    },
    {
      id: 'certification',
      header: 'Certification',
      accessor: (row) => ({
        date: row.certification_date,
      }),
      cell: ({ value }) => (
        <div className={styles.certification}>
          <Calendar size={14} />
          <span>{formatDate(value.date)}</span>
        </div>
      ),
    },
    {
      id: 'stats',
      header: 'Statistiques',
      accessor: (row) => ({
        contracts: row.total_supervisions,
        rating: row.avg_rating,
        disputes: row.total_disputes,
      }),
      cell: ({ value }) => (
        <div className={styles.statsCell}>
          <div className={styles.statItem} title="Contrats supervisés">
            <Briefcase size={14} />
            <span>{value.contracts || 0}</span>
          </div>
          <div className={styles.statItem} title="Note moyenne">
            <Star size={14} />
            <span>{value.rating?.toFixed(1) || 'N/A'}</span>
          </div>
          <div className={styles.statItem} title="Litiges">
            <Shield size={14} />
            <span>{value.disputes || 0}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'specialties',
      header: 'Spécialités',
      accessor: (row) => row.specialties,
      cell: ({ value }) => (
        <div className={styles.specialties}>
          {value?.slice(0, 2).map((s, i) => (
            <Badge key={i} variant="secondary" size="xs">
              {s}
            </Badge>
          ))}
          {value?.length > 2 && (
            <Badge variant="secondary" size="xs">
              +{value.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'fund',
      header: 'Fonds de garantie',
      accessor: (row) => row.guarantee_fund_balance,
      cell: ({ value }) => formatCurrency(value || 0),
    },
    {
      id: 'actions',
      header: '',
      accessor: (row) => row,
      cell: ({ value }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/hpo/supervisors/${value.id_supervisor}`)
          }}
        >
          <MoreVertical size={16} />
        </Button>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <Input
            placeholder="Rechercher un superviseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
            size="md"
            fullWidth
          />
          
          <Button
            variant={showFilters ? 'primary' : 'outline'}
            size="md"
            icon={Filter}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtres
          </Button>
        </div>

        {showFilters && (
          <div className={styles.filterPanel}>
            <div className={styles.filterGrid}>
              <Select
                label="Statut"
                options={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>

      {supervisors.length > 0 ? (
        <Table
          columns={columns}
          data={supervisors}
          onRowClick={(row) => navigate(`/hpo/supervisors/${row.id_supervisor}`)}
        />
      ) : (
        <EmptyState
          icon={HardHat}
          title="Aucun superviseur"
          description="Aucun superviseur HPO n'a encore été enregistré."
        />
      )}
    </div>
  )
}

export default SupervisorsList