import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { Tabs } from '../../components/ui/Tabs'
import {
  ArrowLeft,
  Edit,
  Store,
  MapPin,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Package,
  Calendar,
  User,
  Download,
  Trash2
} from 'lucide-react'
import { formatDate, formatDateTime, formatRating } from '../../utils/formatters'
import styles from './Hardware.module.css'

// Données mockées pour l'exemple
const mockStore = {
  id_store: '1',
  name: 'Quincaillerie du Centre',
  owner_name: 'Mamadou Diallo',
  phone: '+225 07 89 76 54',
  email: 'contact@quincaillerie-centre.ci',
  address: '15 Rue des Artisans, Zone Industrielle',
  city: 'Abidjan',
  country: 'Côte d\'Ivoire',
  latitude: 5.336,
  longitude: -4.026,
  ifu_number: 'IFU123456789',
  access_code: 'QC2024-001',
  is_active: true,
  is_verified: true,
  avg_rating: 4.5,
  total_transactions: 234,
  created_at: '2024-01-15T10:30:00Z',
  verified_at: '2024-01-20T14:30:00Z',
  verified_by: 'Admin Koné',
  logo_url: null,
  
  // Statistiques supplémentaires
  monthly_transactions: 45,
  total_revenue: 12500000,
  pending_invoices: 3,
  
  // Dernières transactions
  recent_transactions: [
    { id: 'INV-001', date: '2024-03-15', amount: 350000, status: 'PAID' },
    { id: 'INV-002', date: '2024-03-14', amount: 125000, status: 'PAID' },
    { id: 'INV-003', date: '2024-03-13', amount: 275000, status: 'PENDING' },
    { id: 'INV-004', date: '2024-03-12', amount: 450000, status: 'PAID' },
    { id: 'INV-005', date: '2024-03-11', amount: 98000, status: 'PAID' },
  ],
}

const HardwareDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('info')
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [isLoading] = useState(false)

  // Simuler le chargement des données
  const store = mockStore
  const isLoading_store = false

  if (isLoading || isLoading_store) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className={styles.error}>
        <AlertTriangle size={48} />
        <h2>Quincaillerie non trouvée</h2>
        <p>La quincaillerie que vous recherchez n'existe pas.</p>
        <Button onClick={() => navigate('/hardware')}>
          Retour à la liste
        </Button>
      </div>
    )
  }

  const tabs = [
    {
      id: 'info',
      label: 'Informations',
      icon: Store,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: Package,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/hardware')}
          >
            Retour
          </Button>
          
          <div className={styles.titleSection}>
            <h1 className={styles.title}>{store.name}</h1>
            <div className={styles.badges}>
              {store.is_active ? (
                <Badge variant="success" size="md" dot>
                  Actif
                </Badge>
              ) : (
                <Badge variant="secondary" size="md" dot>
                  Inactif
                </Badge>
              )}
              
              {store.is_verified ? (
                <Badge variant="success" size="md">
                  <CheckCircle size={14} /> Vérifié
                </Badge>
              ) : (
                <Badge variant="warning" size="md">
                  <AlertTriangle size={14} /> En attente
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <Button
            variant="outline"
            size="sm"
            icon={Edit}
            onClick={() => navigate(`/hardware/${id}/edit`)}
          >
            Modifier
          </Button>
          
          {store.is_active ? (
            <Button
              variant="warning"
              size="sm"
              icon={XCircle}
              onClick={() => setShowDeactivateModal(true)}
            >
              Désactiver
            </Button>
          ) : (
            <Button
              variant="success"
              size="sm"
              icon={CheckCircle}
              onClick={() => {/* Réactiver */}}
            >
              Réactiver
            </Button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainContent}>
          {/* Carte d'identité */}
          <div className={styles.identityCard}>
            <div className={styles.storeIcon}>
              <Store size={48} />
            </div>
            
            <div className={styles.storeInfo}>
              <h2>{store.name}</h2>
              <p className={styles.storeOwner}>
                <User size={16} /> Gérant : {store.owner_name}
              </p>
              <p className={styles.storeIfu}>IFU: {store.ifu_number}</p>
              <p className={styles.storeCode}>Code: {store.access_code}</p>
            </div>

            <div className={styles.storeStats}>
              <div className={styles.stat}>
                <Star size={16} className={styles.statIcon} />
                <div>
                  <span className={styles.statValue}>{store.avg_rating}</span>
                  <span className={styles.statLabel}>Note moyenne</span>
                </div>
              </div>
              
              <div className={styles.stat}>
                <Package size={16} className={styles.statIcon} />
                <div>
                  <span className={styles.statValue}>{store.total_transactions}</span>
                  <span className={styles.statLabel}>Transactions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            className={styles.detailTabs}
          />

          {/* Contenu des onglets */}
          {activeTab === 'info' && (
            <div className={styles.tabContent}>
              <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                  <h3>Coordonnées</h3>
                  
                  <div className={styles.infoRow}>
                    <Phone size={16} />
                    <div>
                      <span className={styles.infoLabel}>Téléphone</span>
                      <a href={`tel:${store.phone}`} className={styles.infoValue}>
                        {store.phone}
                      </a>
                    </div>
                  </div>
                  
                  <div className={styles.infoRow}>
                    <Mail size={16} />
                    <div>
                      <span className={styles.infoLabel}>Email</span>
                      <a href={`mailto:${store.email}`} className={styles.infoValue}>
                        {store.email}
                      </a>
                    </div>
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <h3>Adresse</h3>
                  
                  <div className={styles.infoRow}>
                    <MapPin size={16} />
                    <div>
                      <span className={styles.infoLabel}>Localisation</span>
                      <span className={styles.infoValue}>
                        {store.address}<br />
                        {store.city}, {store.country}
                      </span>
                    </div>
                  </div>
                  
                  {store.latitude && store.longitude && (
                    <div className={styles.infoRow}>
                      <MapPin size={16} />
                      <div>
                        <span className={styles.infoLabel}>Coordonnées GPS</span>
                        <span className={styles.infoValue}>
                          {store.latitude}, {store.longitude}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.infoCard}>
                  <h3>Informations système</h3>
                  
                  <div className={styles.infoRow}>
                    <Calendar size={16} />
                    <div>
                      <span className={styles.infoLabel}>Date de création</span>
                      <span className={styles.infoValue}>
                        {formatDateTime(store.created_at)}
                      </span>
                    </div>
                  </div>
                  
                  {store.verified_at && (
                    <div className={styles.infoRow}>
                      <CheckCircle size={16} />
                      <div>
                        <span className={styles.infoLabel}>Vérifié le</span>
                        <span className={styles.infoValue}>
                          {formatDateTime(store.verified_at)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {store.verified_by && (
                    <div className={styles.infoRow}>
                      <User size={16} />
                      <div>
                        <span className={styles.infoLabel}>Vérifié par</span>
                        <span className={styles.infoValue}>
                          {store.verified_by}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className={styles.tabContent}>
              <div className={styles.statsSummary}>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>Transactions ce mois</span>
                  <span className={styles.summaryValue}>{store.monthly_transactions}</span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>CA total</span>
                  <span className={styles.summaryValue}>
                    {store.total_revenue?.toLocaleString()} FCFA
                  </span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>Factures en attente</span>
                  <span className={styles.summaryValue}>{store.pending_invoices}</span>
                </div>
              </div>

              <table className={styles.transactionsTable}>
                <thead>
                  <tr>
                    <th>N° Facture</th>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {store.recent_transactions.map(tx => (
                    <tr key={tx.id}>
                      <td className={styles.transactionId}>{tx.id}</td>
                      <td>{formatDate(tx.date)}</td>
                      <td className={styles.transactionAmount}>
                        {tx.amount.toLocaleString()} FCFA
                      </td>
                      <td>
                        <Badge variant={tx.status === 'PAID' ? 'success' : 'warning'} size="sm">
                          {tx.status === 'PAID' ? 'Payée' : 'En attente'}
                        </Badge>
                      </td>
                      <td>
                        <Button variant="ghost" size="xs" icon={FileText}>
                          Détails
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className={styles.tabContent}>
              <div className={styles.emptyDocuments}>
                <FileText size={48} />
                <h3>Aucun document</h3>
                <p>Cette quincaillerie n'a pas encore de documents.</p>
                <Button variant="primary" size="md" icon={Download}>
                  Télécharger un document
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          {/* Carte */}
          {store.latitude && store.longitude && (
            <div className={styles.mapCard}>
              <h3>Localisation</h3>
              <div className={styles.mapPlaceholder}>
                <MapPin size={24} />
                <p>Carte non disponible</p>
                <small>Lat: {store.latitude}, Lng: {store.longitude}</small>
              </div>
            </div>
          )}

          {/* Actions rapides */}
          <div className={styles.actionsCard}>
            <h3>Actions rapides</h3>
            <Button variant="outline" size="sm" fullWidth icon={Edit}>
              Modifier les informations
            </Button>
            <Button variant="outline" size="sm" fullWidth icon={Download}>
              Voir les factures
            </Button>
            <Button variant="danger" size="sm" fullWidth icon={Trash2}>
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de désactivation */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title="Désactiver la quincaillerie"
        size="sm"
      >
        <div className={styles.modalContent}>
          <AlertTriangle size={32} className={styles.modalIcon} />
          <p className={styles.modalText}>
            Êtes-vous sûr de vouloir désactiver <strong>{store.name}</strong> ?
          </p>
          <p className={styles.modalHint}>
            La quincaillerie ne pourra plus recevoir de nouvelles commandes.
          </p>
          
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setShowDeactivateModal(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                // Logique de désactivation
                setShowDeactivateModal(false)
              }}
            >
              Confirmer la désactivation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default HardwareDetail