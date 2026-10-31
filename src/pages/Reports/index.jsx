import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReports } from '../../hooks/useReports'
import { useFilterStore } from '../../store/filterStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Table from '../../components/ui/Table'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Tabs from '../../components/ui/Tabs'
import {
  Search,
  Filter,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Flag,
  MoreVertical,
  Calendar,
  MessageSquare,
  Eye
} from 'lucide-react'
import { formatDate, formatDateTime, formatStatus } from '../../utils/formatters'
import styles from './Reports.module.css'

const Reports = () => {
  const navigate = useNavigate()
  const { globalFilters, setGlobalFilter, dateRange, setDateRange, pagination, setPagination } = useFilterStore()
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  
  const { reports, total, isLoading } = useReports()

  // Options pour les selects
  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'OPEN', label: 'Ouvert' },
    { value: 'UNDER_INVESTIGATION', label: 'En cours' },
    { value: 'RESOLVED', label: 'Résolu' },
    { value: 'DISMISSED', label: 'Rejeté' },
  ]

  const reasonOptions = [
    { value: 'all', label: 'Toutes les raisons' },
    { value: 'FRAUD', label: 'Fraude' },
    { value: 'LATE', label: 'Retard' },
    { value: 'UNPROFESSIONAL', label: 'Non professionnel' },
    { value: 'SECURITY', label: 'Sécurité' },
    { value: 'OTHER', label: 'Autre' },
  ]

  const periodOptions = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'quarter', label: 'Ce trimestre' },
    { value: 'custom', label: 'Personnalisé' },
  ]

  // Configuration des tabs
  const tabs = [
    {
      id: 'all',
      label: 'Tous',
      icon: FileText,
      count: reports.length,
    },
    {
      id: 'open',
      label: 'Ouverts',
      icon: AlertTriangle,
      count: reports.filter(r => r.status === 'OPEN').length,
    },
    {
      id: 'investigating',
      label: 'En cours',
      icon: Clock,
      count: reports.filter(r => r.status === 'UNDER_INVESTIGATION').length,
    },
    {
      id: 'resolved',
      label: 'Résolus',
      icon: CheckCircle,
      count: reports.filter(r => r.status === 'RESOLVED').length,
    },
    {
      id: 'dismissed',
      label: 'Rejetés',
      icon: XCircle,
      count: reports.filter(r => r.status === 'DISMISSED').length,
    },
  ]

  // Configuration des colonnes
  const columns = [
    {
      id: 'report',
      header: 'Signalement',
      accessor: (row) => ({
        id: row.id_report.slice(0, 8),
        reason: row.reason_type,
        description: row.description,
      }),
      cell: ({ value }) => (
        <div className={styles.reportCell}>
          <div className={styles.reportHeader}>
            <span className={styles.reportId}>#RPT-{value.id}</span>
            <Badge variant={
              value.reason === 'FRAUD' ? 'danger' :
              value.reason === 'SECURITY' ? 'error' :
              value.reason === 'LATE' ? 'warning' : 'info'
            } size="xs">
              {value.reason}
            </Badge>
          </div>
          <div className={styles.reportDescription}>
            {value.description.substring(0, 80)}...
          </div>
        </div>
      ),
    },
    {
      id: 'reporter',
      header: 'Signalé par',
      accessor: (row) => ({
        name: row.reporter?.full_name,
        role: row.reporter?.user_role,
      }),
      cell: ({ value }) => (
        <div className={styles.userCell}>
          <div className={styles.userIcon}>
            <User size={16} />
          </div>
          <div>
            <div className={styles.userName}>{value.name}</div>
            <Badge variant="secondary" size="xs">
              {value.role}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      id: 'reported',
      header: 'Signalé',
      accessor: (row) => ({
        name: row.reported?.full_name,
        role: row.reported?.user_role,
      }),
      cell: ({ value }) => (
        <div className={styles.userCell}>
          <div className={styles.userIcon}>
            <User size={16} />
          </div>
          <div>
            <div className={styles.userName}>{value.name}</div>
            <Badge variant="secondary" size="xs">
              {value.role}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      id: 'mission',
      header: 'Mission',
      accessor: (row) => row.mission?.id_mission,
      cell: ({ value }) => value ? (
        <Badge variant="info" size="sm">
          #{value.slice(0, 8)}
        </Badge>
      ) : '-',
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => row.status,
      cell: ({ value }) => {
        const status = formatStatus(value)
        return (
          <Badge variant={status.color} size="sm" dot>
            {status.label}
          </Badge>
        )
      },
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
      id: 'evidence',
      header: 'Preuve',
      accessor: (row) => row.evidence_url,
      cell: ({ value }) => value ? (
        <Button variant="ghost" size="xs" icon={Eye} onClick={() => window.open(value, '_blank')}>
          Voir
        </Button>
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
            navigate(`/reports/${value.id_report}`)
          }}
        >
          <MoreVertical size={16} />
        </Button>
      ),
    },
  ]

  // Filtrer les rapports selon l'onglet actif
  const filteredReports = reports.filter(report => {
    if (activeTab === 'all') return true
    if (activeTab === 'open') return report.status === 'OPEN'
    if (activeTab === 'investigating') return report.status === 'UNDER_INVESTIGATION'
    if (activeTab === 'resolved') return report.status === 'RESOLVED'
    if (activeTab === 'dismissed') return report.status === 'DISMISSED'
    return true
  })

  const handleSearch = (value) => {
    setGlobalFilter('search', value)
  }

  const handlePeriodChange = (value) => {
    if (value === 'custom') {
      // Ouvrir calendrier
    } else {
      setDateRange(value)
    }
  }

  const handleExport = async () => {
    const csv = filteredReports.map(r => ({
      ID: r.id_report,
      'Signalé par': r.reporter?.full_name,
      'Signalé': r.reported?.full_name,
      'Raison': r.reason_type,
      Description: r.description,
      Statut: r.status,
      Mission: r.mission?.id_mission || '-',
      Date: formatDateTime(r.created_at),
    }))

    const blob = new Blob([JSON.stringify(csv, null, 2)], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `signalements_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Signalements</h1>
          <p className={styles.subtitle}>
            Gérez les signalements et litiges
          </p>
        </div>
        
        <div className={styles.actions}>
          <Select
            options={periodOptions}
            value={dateRange.label}
            onChange={handlePeriodChange}
            size="sm"
            className={styles.periodSelect}
          />
          
          <Button
            variant="outline"
            size="md"
            icon={Download}
            onClick={handleExport}
          >
            Exporter
          </Button>
        </div>
      </div>

      {/* Tabs de statut */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        className={styles.tabs}
      />

      {/* Statistiques rapides */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fee2e2', color: '#ef4444' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className={styles.statValue}>
              {reports.filter(r => r.status === 'OPEN').length}
            </span>
            <span className={styles.statLabel}>Ouverts</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>
            <Clock size={20} />
          </div>
          <div>
            <span className={styles.statValue}>
              {reports.filter(r => r.status === 'UNDER_INVESTIGATION').length}
            </span>
            <span className={styles.statLabel}>En cours</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dcfce7', color: '#10b981' }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <span className={styles.statValue}>
              {reports.filter(r => r.status === 'RESOLVED').length}
            </span>
            <span className={styles.statLabel}>Résolus</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f1f5f9', color: '#64748b' }}>
            <XCircle size={20} />
          </div>
          <div>
            <span className={styles.statValue}>
              {reports.filter(r => r.status === 'DISMISSED').length}
            </span>
            <span className={styles.statLabel}>Rejetés</span>
          </div>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <Input
            placeholder="Rechercher un signalement..."
            value={globalFilters.search || ''}
            onChange={(e) => handleSearch(e.target.value)}
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
                value={globalFilters.status || 'all'}
                onChange={(value) => setGlobalFilter('status', value === 'all' ? null : value)}
                size="sm"
              />
              
              <Select
                label="Raison"
                options={reasonOptions}
                value={globalFilters.reason || 'all'}
                onChange={(value) => setGlobalFilter('reason', value === 'all' ? null : value)}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>

      {filteredReports.length > 0 ? (
        <Table
          columns={columns}
          data={filteredReports}
          onRowClick={(row) => navigate(`/reports/${row.id_report}`)}
          pagination={{
            currentPage: pagination.page,
            totalPages: Math.ceil(total / pagination.pageSize),
            pageSize: pagination.pageSize,
            total: total,
            onPageChange: (page) => setPagination({ page }),
          }}
        />
      ) : (
        <EmptyState
          icon={Flag}
          title="Aucun signalement"
          description="Aucun signalement ne correspond à vos critères."
          action={{
            label: "Réinitialiser les filtres",
            onClick: () => {
              setGlobalFilter('search', '')
              setGlobalFilter('status', null)
              setGlobalFilter('reason', null)
              setDateRange('month')
              setActiveTab('all')
            }
          }}
        />
      )}
    </div>
  )
}

export default Reports