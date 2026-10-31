import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  User,
  MapPin,
  Calendar,
  Award,
  MoreVertical,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import styles from './HPO.module.css'

// Données mockées pour l'exemple
const mockAgents = [
  {
    id_agent: '1',
    user: {
      full_name: 'Jean Kouamé',
      avatar_url: null,
    },
    certification_status: 'ACTIVE',
    certification_date: '2024-01-15',
    experience_years: 8,
    working_city: 'Abidjan',
    total_contracts: 12,
    total_days_worked: 145,
    avg_rating: 4.8,
    guarantee_fund_balance: 250000,
    has_diploma: true,
  },
  // Ajouter plus d'agents...
]

const AgentsList = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading] = useState(false)

  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'SUSPENDED', label: 'Suspendu' },
    { value: 'REVOKED', label: 'Révoqué' },
  ]

  const columns = [
    {
      id: 'agent',
      header: 'Agent',
      accessor: (row) => ({
        name: row.user?.full_name,
        experience: row.experience_years,
        hasDiploma: row.has_diploma,
        avatar: row.user?.avatar_url,
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
              {value.hasDiploma && (
                <Award size={14} className={styles.diplomaIcon} />
              )}
            </div>
            <div className={styles.userExperience}>
              {value.experience} ans d'expérience
            </div>
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
          PENDING: 'warning',
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
      header: 'Certifié le',
      accessor: (row) => row.certification_date,
      cell: ({ value }) => (
        <div className={styles.date}>
          <Calendar size={14} />
          {value ? formatDate(value) : '-'}
        </div>
      ),
    },
    {
      id: 'location',
      header: 'Zone',
      accessor: (row) => row.working_city,
      cell: ({ value }) => (
        <div className={styles.location}>
          <MapPin size={14} />
          {value}
        </div>
      ),
    },
    {
      id: 'contracts',
      header: 'Contrats',
      accessor: (row) => row.total_contracts,
    },
    {
      id: 'days',
      header: 'Jours travaillés',
      accessor: (row) => row.total_days_worked,
    },
    {
      id: 'rating',
      header: 'Note',
      accessor: (row) => row.avg_rating,
      cell: ({ value }) => (
        <div className={styles.rating}>
          <span className={styles.stars}>
            {'★'.repeat(Math.floor(value || 0))}
            {'☆'.repeat(5 - Math.floor(value || 0))}
          </span>
          <span>({value?.toFixed(1) || 'N/A'})</span>
        </div>
      ),
    },
    {
      id: 'fund',
      header: 'Fonds garantie',
      accessor: (row) => row.guarantee_fund_balance,
      cell: ({ value }) => (
        <span className={styles.fund}>
          {value?.toLocaleString()} FCFA
        </span>
      ),
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
            navigate(`/hpo/agents/${value.id_agent}`)
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
            placeholder="Rechercher un agent..."
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

      {mockAgents.length > 0 ? (
        <Table
          columns={columns}
          data={mockAgents}
          onRowClick={(row) => navigate(`/hpo/agents/${row.id_agent}`)}
        />
      ) : (
        <EmptyState
          icon={User}
          title="Aucun agent"
          description="Aucun agent HPO n'a encore été enregistré."
        />
      )}
    </div>
  )
}

export default AgentsList