import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePayments, usePaymentStats } from '../../hooks/usePayments'
import { useFilterStore } from '../../store/filterStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Table from '../../components/ui/Table'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'
import {
  Search,
  Filter,
  Download,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  MoreVertical,
  Calendar,
  DollarSign
} from 'lucide-react'
import { formatDate, formatDateTime, formatCurrency, formatStatus } from '../../utils/formatters'
import styles from './Payments.module.css'

const Payments = () => {
  const navigate = useNavigate()
  const { globalFilters, setGlobalFilter, dateRange, setDateRange, pagination, setPagination } = useFilterStore()
  const [showFilters, setShowFilters] = useState(false)
  
  const { payments, totals, total, isLoading } = usePayments()
  const { data: stats, isLoading: statsLoading } = usePaymentStats()

  // Options pour les selects
  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'SUCCESS', label: 'Réussi' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'FAILED', label: 'Échoué' },
    { value: 'REFUNDED', label: 'Remboursé' },
  ]

  const methodOptions = [
    { value: 'all', label: 'Toutes méthodes' },
    { value: 'WALLET', label: 'Portefeuille' },
    { value: 'MOMO', label: 'Mobile Money' },
    { value: 'CARD', label: 'Carte' },
    { value: 'CASH', label: 'Espèces' },
  ]

  const periodOptions = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'yesterday', label: 'Hier' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'quarter', label: 'Ce trimestre' },
    { value: 'year', label: 'Cette année' },
    { value: 'custom', label: 'Personnalisé' },
  ]

  // Configuration des colonnes
  const columns = [
    {
      id: 'transaction',
      header: 'Transaction',
      accessor: (row) => ({
        ref: row.transaction_ref,
        method: row.payment_method,
        request: row.request,
      }),
      cell: ({ value }) => (
        <div className={styles.transactionCell}>
          <div className={styles.transactionRef}>#{value.ref}</div>
          <div className={styles.transactionMethod}>
            <Badge variant="secondary" size="xs">
              {value.method}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      id: 'mission',
      header: 'Mission',
      accessor: (row) => row.request?.mission?.description,
      cell: ({ value }) => (
        <div className={styles.missionCell}>
          {value ? (
            <>
              <span className={styles.missionDesc}>{value.substring(0, 50)}...</span>
            </>
          ) : (
            <span className={styles.noMission}>-</span>
          )}
        </div>
      ),
    },
    {
      id: 'sender',
      header: 'Expéditeur',
      accessor: (row) => row.sender?.full_name,
    },
    {
      id: 'amount',
      header: 'Montant',
      accessor: (row) => row.amount,
      cell: ({ value }) => (
        <span className={styles.amount}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      id: 'fees',
      header: 'Frais',
      accessor: (row) => row.handyra_fee,
      cell: ({ value }) => formatCurrency(value),
    },
    {
      id: 'net',
      header: 'Net',
      accessor: (row) => row.artisan_net,
      cell: ({ value }) => (
        <span className={styles.net}>
          {formatCurrency(value)}
        </span>
      ),
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
      id: 'escrow',
      header: 'Séquestre',
      accessor: (row) => row.escrow_status,
      cell: ({ value }) => value ? (
        <Badge variant={
          value === 'RELEASED' ? 'success' :
          value === 'HELD' ? 'warning' : 'secondary'
        } size="xs">
          {value}
        </Badge>
      ) : '-',
    },
    {
      id: 'date',
      header: 'Date',
      accessor: (row) => row.processed_at,
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
            // Naviguer vers détail paiement
          }}
        >
          <MoreVertical size={16} />
        </Button>
      ),
    },
  ]

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
    const csv = payments.map(p => ({
      'Ref Transaction': p.transaction_ref,
      Mission: p.request?.mission?.description,
      Client: p.sender?.full_name,
      Montant: p.amount,
      Frais: p.handyra_fee,
      Net: p.artisan_net,
      Méthode: p.payment_method,
      Statut: p.status,
      Séquestre: p.escrow_status || '-',
      Date: formatDateTime(p.processed_at),
    }))

    const blob = new Blob([JSON.stringify(csv, null, 2)], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (isLoading || statsLoading) {
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
          <h1 className={styles.title}>Paiements</h1>
          <p className={styles.subtitle}>
            Gérez tous les paiements de la plateforme
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

      {/* Statistiques */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Volume total"
          value={totals.total}
          icon={DollarSign}
          color="primary"
          format="currency"
        />
        
        <StatCard
          title="Frais Handyra"
          value={totals.fees}
          icon={TrendingUp}
          color="success"
          format="currency"
        />
        
        <StatCard
          title="Net artisans"
          value={totals.net}
          icon={Wallet}
          color="info"
          format="currency"
        />
        
        <StatCard
          title="Transactions"
          value={total}
          icon={CreditCard}
          color="warning"
        />
      </div>

      {/* Graphiques rapides */}
      {stats && (
        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <h3>Répartition par méthode</h3>
            <div className={styles.methodStats}>
              {stats.by_method.map(method => (
                <div key={method.method} className={styles.methodStat}>
                  <div className={styles.methodHeader}>
                    <Badge variant="secondary" size="sm">
                      {method.method}
                    </Badge>
                    <span className={styles.methodAmount}>
                      {formatCurrency(method.total)}
                    </span>
                  </div>
                  <div className={styles.methodBar}>
                    <div 
                      className={styles.methodBarFill}
                      style={{ 
                        width: `${(method.total / stats.total_amount) * 100}%` 
                      }}
                    />
                  </div>
                  <span className={styles.methodCount}>
                    {method.count} transactions
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3>Évolution quotidienne</h3>
            <div className={styles.dailyStats}>
              {stats.daily.slice(-7).map(day => (
                <div key={day.date} className={styles.dailyStat}>
                  <span className={styles.dailyDate}>
                    {formatDate(day.date, 'dd/MM')}
                  </span>
                  <span className={styles.dailyAmount}>
                    {formatCurrency(day.total)}
                  </span>
                  <span className={styles.dailyCount}>
                    {day.count} tx
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <Input
            placeholder="Rechercher une transaction..."
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
                label="Méthode"
                options={methodOptions}
                value={globalFilters.method || 'all'}
                onChange={(value) => setGlobalFilter('method', value === 'all' ? null : value)}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>

      {payments.length > 0 ? (
        <Table
          columns={columns}
          data={payments}
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
          icon={CreditCard}
          title="Aucun paiement trouvé"
          description="Aucun paiement ne correspond à vos critères de recherche."
          action={{
            label: "Réinitialiser les filtres",
            onClick: () => {
              setGlobalFilter('search', '')
              setGlobalFilter('status', null)
              setGlobalFilter('method', null)
              setDateRange('month')
            }
          }}
        />
      )}
    </div>
  )
}

export default Payments