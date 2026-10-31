import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Store,
  Truck,
  Package,
  Star,
  MapPin,
  Phone,
  Mail,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'
import { formatDate, formatCurrency } from '../../utils/formatters'
import styles from './Hardware.module.css'

// Données mockées pour l'exemple
const mockStores = [
  {
    id_store: '1',
    name: 'Quincaillerie du Centre',
    owner_name: 'Mamadou Diallo',
    phone: '+225 07 89 76 54',
    address: '15 Rue des Artisans, Abidjan',
    city: 'Abidjan',
    ifu_number: 'IFU123456789',
    is_active: true,
    is_verified: true,
    avg_rating: 4.5,
    total_transactions: 234,
    created_at: '2024-01-15T10:30:00Z',
    verified_at: '2024-01-20T14:30:00Z',
  },
  {
    id_store: '2',
    name: 'Matériaux Plus',
    owner_name: 'Fatou Sylla',
    phone: '+225 05 43 21 98',
    address: 'Boulevard de la Paix, Abidjan',
    city: 'Abidjan',
    ifu_number: 'IFU987654321',
    is_active: true,
    is_verified: false,
    avg_rating: 3.8,
    total_transactions: 89,
    created_at: '2024-02-20T09:15:00Z',
  },
  {
    id_store: '3',
    name: 'BTP Express',
    owner_name: 'Ibrahim Koné',
    phone: '+225 01 23 45 67',
    address: 'Zone Industrielle, Yopougon',
    city: 'Yopougon',
    ifu_number: 'IFU456789123',
    is_active: false,
    is_verified: true,
    avg_rating: 4.2,
    total_transactions: 567,
    created_at: '2023-11-05T16:45:00Z',
    verified_at: '2023-11-10T11:20:00Z',
  },
]

const Hardware = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [verifiedFilter, setVerifiedFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading] = useState(false)

  // Statistiques
  const stats = {
    total: mockStores.length,
    active: mockStores.filter(s => s.is_active).length,
    verified: mockStores.filter(s => s.is_verified).length,
    pending: mockStores.filter(s => !s.is_verified).length,
    transactions: mockStores.reduce((sum, s) => sum + s.total_transactions, 0),
    avgRating: mockStores.reduce((sum, s) => sum + s.avg_rating, 0) / mockStores.length,
  }

  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'active', label: 'Actif' },
    { value: 'inactive', label: 'Inactif' },
  ]

  const verifiedOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'verified', label: 'Vérifiés' },
    { value: 'pending', label: 'En attente' },
  ]

  const columns = [
    {
      id: 'store',
      header: 'Quincaillerie',
      accessor: (row) => ({
        name: row.name,
        owner: row.owner_name,
        ifu: row.ifu_number,
      }),
      cell: ({ value }) => (
        <div className={styles.storeCell}>
          <div className={styles.storeIcon}>
            <Store size={24} />
          </div>
          <div className={styles.storeInfo}>
            <div className={styles.storeName}>{value.name}</div>
            <div className={styles.storeOwner}>
              <span>Gérant: {value.owner}</span>
              <span className={styles.storeIfu}>IFU: {value.ifu}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'location',
      header: 'Localisation',
      accessor: (row) => ({
        city: row.city,
        address: row.address,
      }),
      cell: ({ value }) => (
        <div className={styles.location}>
          <MapPin size={14} />
          <div>
            <div className={styles.locationCity}>{value.city}</div>
            <div className={styles.locationAddress}>{value.address}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      accessor: (row) => ({
        phone: row.phone,
      }),
      cell: ({ value }) => (
        <div className={styles.contact}>
          <Phone size={14} />
          <span>{value.phone}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => ({
        active: row.is_active,
        verified: row.is_verified,
      }),
      cell: ({ value }) => (
        <div className={styles.statuses}>
          {value.active ? (
            <Badge variant="success" size="sm" dot>
              Actif
            </Badge>
          ) : (
            <Badge variant="secondary" size="sm" dot>
              Inactif
            </Badge>
          )}
          
          {value.verified ? (
            <Badge variant="success" size="sm">
              <CheckCircle size={12} /> Vérifié
            </Badge>
          ) : (
            <Badge variant="warning" size="sm">
              <AlertTriangle size={12} /> En attente
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'rating',
      header: 'Note',
      accessor: (row) => row.avg_rating,
      cell: ({ value }) => (
        <div className={styles.rating}>
          <span className={styles.stars}>
            {'★'.repeat(Math.floor(value))}
            {'☆'.repeat(5 - Math.floor(value))}
          </span>
          <span className={styles.ratingValue}>{value.toFixed(1)}</span>
        </div>
      ),
    },
    {
      id: 'transactions',
      header: 'Transactions',
      accessor: (row) => row.total_transactions,
      cell: ({ value }) => (
        <div className={styles.transactions}>
          <Package size={14} />
          <span>{value}</span>
        </div>
      ),
    },
    {
      id: 'verified_date',
      header: 'Vérifié le',
      accessor: (row) => row.verified_at,
      cell: ({ value }) => value ? formatDate(value) : '-',
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
            navigate(`/hardware/${value.id_store}`)
          }}
        >
          <MoreVertical size={16} />
        </Button>
      ),
    },
  ]

  const handleExport = () => {
    const csv = mockStores.map(s => ({
      Nom: s.name,
      Gérant: s.owner_name,
      Téléphone: s.phone,
      Ville: s.city,
      Adresse: s.address,
      IFU: s.ifu_number,
      Statut: s.is_active ? 'Actif' : 'Inactif',
      Vérifié: s.is_verified ? 'Oui' : 'Non',
      Note: s.avg_rating,
      Transactions: s.total_transactions,
      'Date création': formatDate(s.created_at),
      'Date vérification': s.verified_at ? formatDate(s.verified_at) : '-',
    }))

    const blob = new Blob([JSON.stringify(csv, null, 2)], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quincailleries_${new Date().toISOString().split('T')[0]}.csv`
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
          <h1 className={styles.title}>Quincailleries</h1>
          <p className={styles.subtitle}>
            Gérez les quincailleries partenaires
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
            icon={Store}
            onClick={() => navigate('/hardware/new')}
          >
            Nouvelle quincaillerie
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Total quincailleries"
          value={stats.total}
          icon={Store}
          color="primary"
        />
        
        <StatCard
          title="Actives"
          value={stats.active}
          icon={CheckCircle}
          color="success"
        />
        
        <StatCard
          title="En attente de vérification"
          value={stats.pending}
          icon={AlertTriangle}
          color="warning"
        />
        
        <StatCard
          title="Transactions totales"
          value={stats.transactions}
          icon={TrendingUp}
          color="info"
        />
        
        <StatCard
          title="Note moyenne"
          value={stats.avgRating.toFixed(1)}
          icon={Star}
          color="secondary"
          suffix="/5"
        />
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <Input
            placeholder="Rechercher une quincaillerie..."
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
              
              <Select
                label="Vérification"
                options={verifiedOptions}
                value={verifiedFilter}
                onChange={setVerifiedFilter}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>

      {mockStores.length > 0 ? (
        <Table
          columns={columns}
          data={mockStores}
          onRowClick={(row) => navigate(`/hardware/${row.id_store}`)}
        />
      ) : (
        <EmptyState
          icon={Store}
          title="Aucune quincaillerie"
          description="Aucune quincaillerie n'a encore été enregistrée."
          action={{
            label: "Ajouter une quincaillerie",
            onClick: () => navigate('/hardware/new')
          }}
        />
      )}
    </div>
  )
}

export default Hardware