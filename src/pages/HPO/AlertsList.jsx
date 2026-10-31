import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Select, Badge, Table, Spinner, EmptyState } from '../../components/ui'
import {
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  MoreVertical,
  Calendar,
  Flag
} from 'lucide-react'
import { formatDateTime } from '../../utils/formatters'
import styles from './HPO.module.css'

// Données mockées pour l'exemple
const mockAlerts = [
  {
    id_alert: '1',
    contract: {
      id_contract: 'ct_123',
      mission: { description: 'Construction villa' },
    },
    supervisor: {
      artisan: { user: { full_name: 'Jean Kouamé' } },
    },
    alert_type: 'MATERIAL_QUALITY',
    severity: 'HIGH',
    description: 'Matériaux de qualité inférieure détectés',
    is_resolved: false,
    created_at: '2024-03-15T10:30:00Z',
  },
  // Ajouter plus d'alertes...
]

const AlertsList = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [resolvedFilter, setResolvedFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading] = useState(false)

  const severityOptions = [
    { value: 'all', label: 'Toutes sévérités' },
    { value: 'LOW', label: 'Faible' },
    { value: 'MEDIUM', label: 'Moyenne' },
    { value: 'HIGH', label: 'Haute' },
    { value: 'CRITICAL', label: 'Critique' },
  ]

  const resolvedOptions = [
    { value: 'all', label: 'Toutes' },
    { value: 'resolved', label: 'Résolues' },
    { value: 'unresolved', label: 'Non résolues' },
  ]

  const columns = [
    {
      id: 'alert',
      header: 'Alerte',
      accessor: (row) => ({
        type: row.alert_type,
        description: row.description,
        severity: row.severity,
      }),
      cell: ({ value }) => (
        <div className={styles.alertCell}>
          <div className={styles.alertHeader}>
            <Badge variant={
              value.severity === 'CRITICAL' ? 'danger' :
              value.severity === 'HIGH' ? 'error' :
              value.severity === 'MEDIUM' ? 'warning' : 'info'
            } size="xs">
              {value.severity}
            </Badge>
            <span className={styles.alertType}>{value.type}</span>
          </div>
          <div className={styles.alertDescription}>{value.description}</div>
        </div>
      ),
    },
    {
      id: 'contract',
      header: 'Contrat',
      accessor: (row) => ({
        id: row.contract?.id_contract.slice(0, 8),
        mission: row.contract?.mission?.description,
      }),
      cell: ({ value }) => (
        <div className={styles.contractInfo}>
          <div className={styles.contractId}>#{value.id}</div>
          <div className={styles.contractDesc}>
            {value.mission?.substring(0, 30)}...
          </div>
        </div>
      ),
    },
    {
      id: 'supervisor',
      header: 'Superviseur',
      accessor: (row) => row.supervisor?.artisan?.user?.full_name,
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => row.is_resolved,
      cell: ({ value }) => value ? (
        <Badge variant="success" size="sm">
          <CheckCircle size={12} /> Résolue
        </Badge>
      ) : (
        <Badge variant="warning" size="sm">
          <AlertTriangle size={12} /> En cours
        </Badge>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      accessor: (row) => row.created_at,
      cell: ({ value }) => (
        <div className={styles.date}>
          <Calendar size={14} />
          {formatDateTime(value)}
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
            navigate(`/hpo/alerts/${value.id_alert}`)
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
            placeholder="Rechercher une alerte..."
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
                label="Sévérité"
                options={severityOptions}
                value={severityFilter}
                onChange={setSeverityFilter}
                size="sm"
              />
              
              <Select
                label="Statut"
                options={resolvedOptions}
                value={resolvedFilter}
                onChange={setResolvedFilter}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>

      {mockAlerts.length > 0 ? (
        <Table
          columns={columns}
          data={mockAlerts}
          onRowClick={(row) => navigate(`/hpo/alerts/${row.id_alert}`)}
        />
      ) : (
        <EmptyState
          icon={Flag}
          title="Aucune alerte"
          description="Aucune alerte pour le moment."
        />
      )}
    </div>
  )
}

export default AlertsList