import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatCard } from '../../components/ui/StatCard'
import { Tabs } from '../../components/ui/Tabs'
import {
  Search,
  Filter,
  Download,
  Crown,
  Users,
  TrendingUp,
  Calendar,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Gift,
  Star,
  Zap,
  Award
} from 'lucide-react'
import { formatDate, formatCurrency } from '../../utils/formatters'
import styles from './Subscriptions.module.css'

// Données mockées pour l'exemple
const mockSubscriptions = [
  {
    id_sub: '1',
    user: {
      full_name: 'Jean Kouamé',
      email: 'jean.kouame@email.com',
      user_role: 'ARTISAN',
    },
    plan_name: 'PRO',
    status: 'ACTIVE',
    price_paid: 5000,
    billing_cycle: 'MONTHLY',
    start_date: '2024-01-15T10:30:00Z',
    end_date: '2024-02-15T10:30:00Z',
    auto_renew: true,
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id_sub: '2',
    user: {
      full_name: 'Fatou Sylla',
      email: 'fatou.sylla@email.com',
      user_role: 'ARTISAN',
    },
    plan_name: 'EXPERT',
    status: 'ACTIVE',
    price_paid: 10000,
    billing_cycle: 'MONTHLY',
    start_date: '2024-02-01T14:20:00Z',
    end_date: '2024-03-01T14:20:00Z',
    auto_renew: true,
    created_at: '2024-02-01T14:20:00Z',
  },
  {
    id_sub: '3',
    user: {
      full_name: 'Ibrahim Koné',
      email: 'ibrahim.kone@email.com',
      user_role: 'ARTISAN',
    },
    plan_name: 'MASTER',
    status: 'ACTIVE',
    price_paid: 20000,
    billing_cycle: 'QUARTERLY',
    start_date: '2024-01-01T09:00:00Z',
    end_date: '2024-04-01T09:00:00Z',
    auto_renew: true,
    created_at: '2024-01-01T09:00:00Z',
  },
  {
    id_sub: '4',
    user: {
      full_name: 'Mariam Traoré',
      email: 'mariam.traore@email.com',
      user_role: 'CLIENT',
    },
    plan_name: 'PREMIUM_CLIENT',
    status: 'EXPIRED',
    price_paid: 3000,
    billing_cycle: 'MONTHLY',
    start_date: '2023-12-10T11:15:00Z',
    end_date: '2024-01-10T11:15:00Z',
    auto_renew: false,
    created_at: '2023-12-10T11:15:00Z',
  },
  {
    id_sub: '5',
    user: {
      full_name: 'Ousmane Diallo',
      email: 'ousmane.diallo@email.com',
      user_role: 'ARTISAN',
    },
    plan_name: 'STARTER',
    status: 'CANCELED',
    price_paid: 0,
    billing_cycle: 'MONTHLY',
    start_date: '2024-01-20T16:45:00Z',
    end_date: '2024-02-20T16:45:00Z',
    auto_renew: false,
    created_at: '2024-01-20T16:45:00Z',
  },
]

// Plans disponibles
const plans = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 0,
    icon: Gift,
    color: '#94a3b8',
    features: [
      'Missions limitées (5/mois)',
      'Support standard',
      'Profil basique',
    ],
    target: 'ARTISAN',
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 5000,
    icon: Star,
    color: '#f59e0b',
    features: [
      'Missions illimitées',
      'Support prioritaire',
      'Statistiques avancées',
      'Badge Pro',
    ],
    target: 'ARTISAN',
  },
  {
    id: 'EXPERT',
    name: 'Expert',
    price: 10000,
    icon: Award,
    color: '#8b5cf6',
    features: [
      'Tout du Pro',
      'HPO inclus',
      'Garantie étendue',
      'Formation incluse',
      'Badge Expert',
    ],
    target: 'ARTISAN',
  },
  {
    id: 'MASTER',
    name: 'Master',
    price: 20000,
    icon: Crown,
    color: '#2563eb',
    features: [
      'Tout de l\'Expert',
      'Support dédié 24/7',
      'Consultant personnel',
      'Badge Master',
      'Accès anticipé aux nouvelles fonctionnalités',
    ],
    target: 'ARTISAN',
  },
  {
    id: 'BASIC',
    name: 'Basic',
    price: 0,
    icon: Gift,
    color: '#94a3b8',
    features: [
      'Recherche d\'artisans',
      '5 demandes/mois',
      'Support standard',
    ],
    target: 'CLIENT',
  },
  {
    id: 'PREMIUM_CLIENT',
    name: 'Premium',
    price: 3000,
    icon: Crown,
    color: '#2563eb',
    features: [
      'Demandes illimitées',
      'Artisans vérifiés',
      'Support prioritaire',
      'Garantie satisfait',
    ],
    target: 'CLIENT',
  },
]

const Subscriptions = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [isLoading] = useState(false)

  // Statistiques
  const stats = {
    total: mockSubscriptions.length,
    active: mockSubscriptions.filter(s => s.status === 'ACTIVE').length,
    expired: mockSubscriptions.filter(s => s.status === 'EXPIRED').length,
    canceled: mockSubscriptions.filter(s => s.status === 'CANCELED').length,
    revenue: mockSubscriptions
      .filter(s => s.status === 'ACTIVE')
      .reduce((sum, s) => sum + s.price_paid, 0),
    artisans: mockSubscriptions.filter(s => s.user.user_role === 'ARTISAN').length,
    clients: mockSubscriptions.filter(s => s.user.user_role === 'CLIENT').length,
  }

  // Revenu mensuel estimé
  const monthlyRevenue = mockSubscriptions
    .filter(s => s.status === 'ACTIVE')
    .reduce((sum, s) => {
      if (s.billing_cycle === 'MONTHLY') return sum + s.price_paid
      if (s.billing_cycle === 'QUARTERLY') return sum + (s.price_paid / 3)
      if (s.billing_cycle === 'YEARLY') return sum + (s.price_paid / 12)
      return sum
    }, 0)

  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'EXPIRED', label: 'Expiré' },
    { value: 'CANCELED', label: 'Annulé' },
  ]

  const planOptions = [
    { value: 'all', label: 'Tous les plans' },
    ...plans.map(p => ({ value: p.id, label: p.name })),
  ]

  const roleOptions = [
    { value: 'all', label: 'Tous les rôles' },
    { value: 'ARTISAN', label: 'Artisans' },
    { value: 'CLIENT', label: 'Clients' },
  ]

  const tabs = [
    {
      id: 'all',
      label: 'Tous',
      icon: Crown,
      count: stats.total,
    },
    {
      id: 'active',
      label: 'Actifs',
      icon: CheckCircle,
      count: stats.active,
    },
    {
      id: 'expired',
      label: 'Expirés',
      icon: Clock,
      count: stats.expired,
    },
    {
      id: 'canceled',
      label: 'Annulés',
      icon: XCircle,
      count: stats.canceled,
    },
  ]

  const columns = [
    {
      id: 'subscriber',
      header: 'Abonné',
      accessor: (row) => ({
        name: row.user?.full_name,
        email: row.user?.email,
        role: row.user?.user_role,
      }),
      cell: ({ value }) => (
        <div className={styles.userCell}>
          <div className={styles.userIcon}>
            {value.role === 'ARTISAN' ? '👤' : '👥'}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{value.name}</div>
            <div className={styles.userEmail}>{value.email}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'plan',
      header: 'Plan',
      accessor: (row) => {
        const plan = plans.find(p => p.id === row.plan_name)
        return {
          name: row.plan_name,
          icon: plan?.icon,
          color: plan?.color,
        }
      },
      cell: ({ value }) => {
        const Icon = value.icon || Gift
        return (
          <div className={styles.planCell}>
            <div className={styles.planIcon} style={{ background: value.color + '20', color: value.color }}>
              <Icon size={16} />
            </div>
            <span className={styles.planName}>{value.name}</span>
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => row.status,
      cell: ({ value }) => {
        const colors = {
          ACTIVE: 'success',
          EXPIRED: 'secondary',
          CANCELED: 'error',
        }
        const labels = {
          ACTIVE: 'Actif',
          EXPIRED: 'Expiré',
          CANCELED: 'Annulé',
        }
        return (
          <Badge variant={colors[value]} size="sm" dot>
            {labels[value]}
          </Badge>
        )
      },
    },
    {
      id: 'amount',
      header: 'Montant',
      accessor: (row) => row.price_paid,
      cell: ({ value }) => (
        <div className={styles.amount}>
          <span className={styles.amountValue}>{formatCurrency(value)}</span>
        </div>
      ),
    },
    {
      id: 'cycle',
      header: 'Cycle',
      accessor: (row) => row.billing_cycle,
      cell: ({ value }) => (
        <Badge variant="secondary" size="sm">
          {value === 'MONTHLY' ? 'Mensuel' :
           value === 'QUARTERLY' ? 'Trimestriel' :
           value === 'YEARLY' ? 'Annuel' : value}
        </Badge>
      ),
    },
    {
      id: 'period',
      header: 'Période',
      accessor: (row) => ({
        start: row.start_date,
        end: row.end_date,
      }),
      cell: ({ value }) => (
        <div className={styles.period}>
          <div className={styles.periodItem}>
            <Calendar size={12} />
            <span>Début: {formatDate(value.start)}</span>
          </div>
          <div className={styles.periodItem}>
            <Calendar size={12} />
            <span>Fin: {formatDate(value.end)}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'renew',
      header: 'Renouvellement',
      accessor: (row) => row.auto_renew,
      cell: ({ value }) => value ? (
        <Badge variant="success" size="sm">
          Auto
        </Badge>
      ) : (
        <Badge variant="secondary" size="sm">
 Manuel
        </Badge>
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
            navigate(`/subscriptions/${value.id_sub}`)
          }}
        >
          <MoreVertical size={16} />
        </Button>
      ),
    },
  ]

  // Filtrer selon l'onglet actif
  const filteredSubscriptions = mockSubscriptions.filter(sub => {
    if (activeTab === 'all') return true
    if (activeTab === 'active') return sub.status === 'ACTIVE'
    if (activeTab === 'expired') return sub.status === 'EXPIRED'
    if (activeTab === 'canceled') return sub.status === 'CANCELED'
    return true
  })

  const handleSearch = (value) => {
    setSearch(value)
  }

  const handleExport = () => {
    const csv = filteredSubscriptions.map(s => ({
      Nom: s.user?.full_name,
      Email: s.user?.email,
      Rôle: s.user?.user_role,
      Plan: s.plan_name,
      Statut: s.status,
      Montant: s.price_paid,
      Cycle: s.billing_cycle,
      'Début': formatDate(s.start_date),
      'Fin': formatDate(s.end_date),
      'Renouvellement auto': s.auto_renew ? 'Oui' : 'Non',
    }))

    const blob = new Blob([JSON.stringify(csv, null, 2)], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `abonnements_${new Date().toISOString().split('T')[0]}.csv`
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
          <h1 className={styles.title}>Abonnements</h1>
          <p className={styles.subtitle}>
            Gérez les abonnements des artisans et clients
          </p>
        </div>
        
        <div className={styles.actions}>
          <Button
            variant="outline"
            size="md"
            icon={Download}
            onClick={handleExport}
          >
            Exporter
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Crown}
            onClick={() => navigate('/subscriptions/plans')}
          >
            Gérer les plans
          </Button>
        </div>
      </div>

      {/* Cartes des plans */}
      <div className={styles.plansGrid}>
        {plans.filter(p => p.target === 'ARTISAN').map(plan => {
          const Icon = plan.icon
          const count = mockSubscriptions.filter(s => 
            s.plan_name === plan.id && s.status === 'ACTIVE'
          ).length
          
          return (
            <div key={plan.id} className={styles.planCard}>
              <div className={styles.planHeader} style={{ background: plan.color + '10' }}>
                <Icon size={24} style={{ color: plan.color }} />
                <h3>{plan.name}</h3>
              </div>
              <div className={styles.planPrice}>
                <span className={styles.price}>{formatCurrency(plan.price)}</span>
                <span className={styles.period}>/mois</span>
              </div>
              <ul className={styles.planFeatures}>
                {plan.features.map((feature, i) => (
                  <li key={i}>
                    <CheckCircle size={14} color="#10b981" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className={styles.planFooter}>
                <span className={styles.subscriberCount}>
                  <Users size={14} /> {count} abonnés
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Statistiques */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Abonnements actifs"
          value={stats.active}
          icon={CheckCircle}
          color="success"
        />
        
        <StatCard
          title="Revenu mensuel"
          value={monthlyRevenue}
          icon={TrendingUp}
          color="primary"
          format="currency"
        />
        
        <StatCard
          title="Artisans abonnés"
          value={stats.artisans}
          icon={Users}
          color="info"
        />
        
        <StatCard
          title="Clients abonnés"
          value={stats.clients}
          icon={Users}
          color="secondary"
        />
        
        <StatCard
          title="Expirés"
          value={stats.expired}
          icon={AlertTriangle}
          color="warning"
        />
        
        <StatCard
          title="Annulés"
          value={stats.canceled}
          icon={XCircle}
          color="error"
        />
      </div>

      {/* Tabs de statut */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        className={styles.tabs}
      />

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <Input
            placeholder="Rechercher un abonné..."
            value={search}
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
                label="Plan"
                options={planOptions}
                value={planFilter}
                onChange={setPlanFilter}
                size="sm"
              />
              
              <Select
                label="Statut"
                options={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                size="sm"
              />
              
              <Select
                label="Rôle"
                options={roleOptions}
                value={roleFilter}
                onChange={setRoleFilter}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>

      {filteredSubscriptions.length > 0 ? (
        <Table
          columns={columns}
          data={filteredSubscriptions}
          onRowClick={(row) => navigate(`/subscriptions/${row.id_sub}`)}
        />
      ) : (
        <EmptyState
          icon={Crown}
          title="Aucun abonnement"
          description="Aucun abonnement ne correspond à vos critères."
          action={{
            label: "Voir tous les abonnements",
            onClick: () => {
              setSearch('')
              setPlanFilter('all')
              setStatusFilter('all')
              setRoleFilter('all')
              setActiveTab('all')
            }
          }}
        />
      )}
    </div>
  )
}

export default Subscriptions