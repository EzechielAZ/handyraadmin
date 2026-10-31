import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Select, Badge, Table, Spinner, EmptyState } from '../../components/ui'
import {
  Search,
  Filter,
  Shield,
  AlertTriangle,
  Scale,
  MoreVertical,
  Calendar,
  User,
  HardHat
} from 'lucide-react'
import { formatDate, formatDateTime } from '../../utils/formatters'
import styles from './HPO.module.css'

// Données mockées pour l'exemple
const mockArbitrations = [
  {
    id_arbitration: '1',
    arbitration_reason: 'Désaccord sur la qualité des matériaux',
    artisan: {
      user: { full_name: 'Jean Kouamé' },
    },
    supervisor: {
      artisan: { user: { full_name: 'Marie Koné' } },
    },
    status: 'OPEN',
    opened_at: '2024-03-10T14:30:00Z',
    deadline_at: '2024-03-17T14:30:00Z',
    rejection_count: 2,
  },
  {
    id_arbitration: '2',
    arbitration_reason: 'Retard de livraison du chantier',
    artisan: {
      user: { full_name: 'Amadou Diallo' },
    },
    supervisor: {
      artisan: { user: { full_name: 'Fatou Sylla' } },
    },
    status: 'UNDER_REVIEW',
    opened_at: '2024-03-12T09:15:00Z',
    deadline_at: '2024-03-19T09:15:00Z',
    rejection_count: 1,
  },
  {
    id_arbitration: '3',
    arbitration_reason: 'Facturation excessive',
    artisan: {
      user: { full_name: 'Ibrahim Traoré' },
    },
    supervisor: {
      artisan: { user: { full_name: 'Ousmane Diallo' } },
    },
    status: 'RESOLVED',
    opened_at: '2024-03-05T11:00:00Z',
    resolved_at: '2024-03-12T16:20:00Z',
    decision: 'ARTISAN_RIGHT',
    rejection_count: 3,
  },
]

const ArbitrationsList = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading] = useState(false)

  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'OPEN', label: 'Ouvert' },
    { value: 'UNDER_REVIEW', label: 'En cours' },
    { value: 'RESOLVED', label: 'Résolu' },
  ]

  const columns = [
    {
      id: 'arbitration',
      header: 'Arbitrage',
      accessor: (row) => ({
        id: row.id_arbitration.slice(0, 8),
        reason: row.arbitration_reason,
      }),
      cell: ({ value }) => (
        <div className={styles.arbitrationCell}>
          <div className={styles.arbitrationId}>#ARB-{value.id}</div>
          <div className={styles.arbitrationReason}>
            {value.reason || 'Litige non spécifié'}
          </div>
        </div>
      ),
    },
    {
      id: 'parties',
      header: 'Parties',
      accessor: (row) => ({
        artisan: row.artisan?.user?.full_name,
        supervisor: row.supervisor?.artisan?.user?.full_name,
      }),
      cell: ({ value }) => (
        <div className={styles.parties}>
          <div className={styles.party}>
            <User size={12} />
            <span>Artisan: {value.artisan}</span>
          </div>
          <div className={styles.party}>
            <HardHat size={12} />
            <span>Superviseur: {value.supervisor}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => row.status,
      cell: ({ value }) => {
        const colors = {
          OPEN: 'warning',
          UNDER_REVIEW: 'info',
          RESOLVED: 'success',
        }
        const labels = {
          OPEN: 'Ouvert',
          UNDER_REVIEW: 'En cours',
          RESOLVED: 'Résolu',
        }
        return (
          <Badge variant={colors[value] || 'secondary'} size="sm" dot>
            {labels[value] || value}
          </Badge>
        )
      },
    },
    {
      id: 'dates',
      header: 'Dates',
      accessor: (row) => ({
        opened: row.opened_at,
        deadline: row.deadline_at,
        resolved: row.resolved_at,
      }),
      cell: ({ value }) => (
        <div className={styles.dates}>
          <div className={styles.dateItem}>
            <Calendar size={12} />
            <span>Ouvert: {formatDate(value.opened)}</span>
          </div>
          {value.deadline && (
            <div className={styles.dateItem}>
              <AlertTriangle size={12} />
              <span>Deadline: {formatDate(value.deadline)}</span>
            </div>
          )}
          {value.resolved && (
            <div className={styles.dateItem}>
              <Scale size={12} />
              <span>Résolu: {formatDate(value.resolved)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'rejections',
      header: 'Rejets',
      accessor: (row) => row.rejection_count,
      cell: ({ value }) => (
        <Badge variant={value >= 3 ? 'danger' : 'warning'} size="sm">
          {value} / 3
        </Badge>
      ),
    },
    {
      id: 'decision',
      header: 'Décision',
      accessor: (row) => row.decision,
      cell: ({ value }) => value ? (
        <Badge variant={
          value === 'ARTISAN_RIGHT' ? 'success' :
          value === 'SUPERVISOR_RIGHT' ? 'warning' :
          value === 'PARTIAL' ? 'info' : 'secondary'
        } size="sm">
          {value === 'ARTISAN_RIGHT' ? 'Artisan' :
           value === 'SUPERVISOR_RIGHT' ? 'Superviseur' :
           value === 'PARTIAL' ? 'Partagé' : value}
        </Badge>
      ) : '-',
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
            navigate(`/hpo/arbitrations/${value.id_arbitration}`)
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
            placeholder="Rechercher un arbitrage..."
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

      {mockArbitrations.length > 0 ? (
        <Table
          columns={columns}
          data={mockArbitrations}
          onRowClick={(row) => navigate(`/hpo/arbitrations/${row.id_arbitration}`)}
        />
      ) : (
        <EmptyState
          icon={Shield}
          title="Aucun arbitrage"
          description="Aucun arbitrage en cours."
        />
      )}
    </div>
  )
}

export default ArbitrationsList