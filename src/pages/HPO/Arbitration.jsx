import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useArbitrations } from '../../hooks/useHPO'
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

const ArbitrationsList = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  
  const { arbitrations, isLoading } = useArbitrations()

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
        return (
          <Badge variant={colors[value] || 'secondary'} size="sm" dot>
            {value}
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
      id: 'decision',
      header: 'Décision',
      accessor: (row) => row.decision,
      cell: ({ value }) => value ? (
        <Badge variant={
          value === 'ARTISAN_RIGHT' ? 'success' :
          value === 'SUPERVISOR_RIGHT' ? 'warning' :
          value === 'PARTIAL' ? 'info' : 'secondary'
        } size="sm">
          {value}
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

      {arbitrations.length > 0 ? (
        <Table
          columns={columns}
          data={arbitrations}
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