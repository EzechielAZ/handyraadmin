import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHPOContracts } from '../../hooks/useHPO'
import { Button, Input, Select, Badge, Table, Spinner, EmptyState } from '../../components/ui'
import {
  Search,
  Filter,
  FileText,
  Calendar,
  TrendingUp,
  MoreVertical,
  HardHat,
  User,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { formatDate, formatCurrency } from '../../utils/formatters'
import styles from './HPO.module.css'

const ContractsList = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  
  const { contracts, isLoading } = useHPOContracts()

  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'COMPLETED', label: 'Terminé' },
    { value: 'SUSPENDED', label: 'Suspendu' },
    { value: 'CANCELLED', label: 'Annulé' },
  ]

  const columns = [
    {
      id: 'contract',
      header: 'Contrat',
      accessor: (row) => ({
        id: row.id_contract.slice(0, 8),
        type: row.contract_type,
        project: row.mission?.description,
      }),
      cell: ({ value }) => (
        <div className={styles.contractCell}>
          <div className={styles.contractId}>#HPO-{value.id}</div>
          <div className={styles.contractType}>
            <Badge variant={value.type === 'PREMIUM' ? 'primary' : 'secondary'} size="xs">
              {value.type}
            </Badge>
          </div>
          <div className={styles.contractProject}>
            {value.project?.substring(0, 50)}...
          </div>
        </div>
      ),
    },
    {
      id: 'client',
      header: 'Client',
      accessor: (row) => row.client?.full_name,
    },
    {
      id: 'supervisor',
      header: 'Superviseur',
      accessor: (row) => row.supervisor?.artisan?.user?.full_name,
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => row.status,
      cell: ({ value }) => {
        const colors = {
          ACTIVE: 'success',
          COMPLETED: 'info',
          SUSPENDED: 'warning',
          CANCELLED: 'error',
        }
        return (
          <Badge variant={colors[value] || 'secondary'} size="sm" dot>
            {value}
          </Badge>
        )
      },
    },
    {
      id: 'amount',
      header: 'Montant',
      accessor: (row) => row.total_construction_amount,
      cell: ({ value }) => formatCurrency(value),
    },
    {
      id: 'progress',
      header: 'Progression',
      accessor: (row) => row.progress,
      cell: ({ value }) => (
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${value || 0}%` }}
            />
          </div>
          <span className={styles.progressValue}>{value || 0}%</span>
        </div>
      ),
    },
    {
      id: 'dates',
      header: 'Dates',
      accessor: (row) => ({
        start: row.activated_at,
        end: row.completed_at,
      }),
      cell: ({ value }) => (
        <div className={styles.dates}>
          <div className={styles.dateItem}>
            <Calendar size={12} />
            <span>Début: {value.start ? formatDate(value.start) : '-'}</span>
          </div>
          <div className={styles.dateItem}>
            <CheckCircle size={12} />
            <span>Fin: {value.end ? formatDate(value.end) : 'En cours'}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'fees',
      header: 'Frais',
      accessor: (row) => ({
        total: row.hpo_total_fee,
        supervisor: row.supervisor_fee,
        handyra: row.handyra_fee,
      }),
      cell: ({ value }) => (
        <div className={styles.fees}>
          <div className={styles.feeItem}>
            <span>Total:</span>
            <strong>{formatCurrency(value.total)}</strong>
          </div>
          <div className={styles.feeItem}>
            <HardHat size={12} />
            <span>{formatCurrency(value.supervisor)}</span>
          </div>
          <div className={styles.feeItem}>
            <TrendingUp size={12} />
            <span>{formatCurrency(value.handyra)}</span>
          </div>
        </div>
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
            navigate(`/hpo/contracts/${value.id_contract}`)
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
            placeholder="Rechercher un contrat..."
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

      {contracts.length > 0 ? (
        <Table
          columns={columns}
          data={contracts}
          onRowClick={(row) => navigate(`/hpo/contracts/${row.id_contract}`)}
        />
      ) : (
        <EmptyState
          icon={FileText}
          title="Aucun contrat"
          description="Aucun contrat HPO n'a encore été créé."
          action={{
            label: "Créer un contrat",
            onClick: () => navigate('/hpo/contracts/new')
          }}
        />
      )}
    </div>
  )
}

export default ContractsList