import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../hooks/useUsers'
import { Button, Badge, Spinner, Modal, Tabs, Input, Select } from '../../components/ui'
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  AlertTriangle,
  UserCheck,
  UserX,
  CreditCard,
  Briefcase,
  Star,
  MessageSquare,
  FileText,
  Crown
} from 'lucide-react'
import { formatDate, formatDateTime, formatStatus } from '../../utils/formatters'
import styles from './UserDetail.module.css'

const UserDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isLoading } = useUser(id)
  const [activeTab, setActiveTab] = useState('info')
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showBanModal, setShowBanModal] = useState(false)

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.error}>
        <AlertTriangle size={48} />
        <h2>Utilisateur non trouvé</h2>
        <p>L'utilisateur que vous recherchez n'existe pas.</p>
        <Button onClick={() => navigate('/users')}>
          Retour à la liste
        </Button>
      </div>
    )
  }

  const tabs = [
    {
      id: 'info',
      label: 'Informations',
      icon: FileText,
      content: <InfoTab user={user} />,
    },
    {
      id: 'activity',
      label: 'Activité',
      icon: Briefcase,
      content: <ActivityTab user={user} />,
    },
    {
      id: 'subscriptions',
      label: 'Abonnements',
      icon: Crown,
      content: <SubscriptionsTab user={user} />,
    },
    {
      id: 'payments',
      label: 'Paiements',
      icon: CreditCard,
      content: <PaymentsTab user={user} />,
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: user.received_messages?.filter(m => !m.is_read).length,
      content: <MessagesTab user={user} />,
    },
  ]

  const roleColors = {
    CLIENT: 'secondary',
    ARTISAN: 'primary',
    ADMIN: 'warning',
    SUPER_ADMIN: 'danger',
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/users')}
          >
            Retour
          </Button>
          
          <div className={styles.titleSection}>
            <h1 className={styles.title}>
              {user.full_name}
            </h1>
            <Badge variant={roleColors[user.user_role]} size="md">
              {user.user_role === 'ARTISAN' ? '👤 Artisan' : 
               user.user_role === 'CLIENT' ? '👥 Client' : 
               user.user_role}
            </Badge>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <Button
            variant="outline"
            size="sm"
            icon={Edit}
            onClick={() => navigate(`/users/${id}/edit`)}
          >
            Modifier
          </Button>
          
          {user.status === 'ACTIVE' ? (
            <>
              <Button
                variant="warning"
                size="sm"
                icon={Shield}
                onClick={() => setShowSuspendModal(true)}
              >
                Suspendre
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={UserX}
                onClick={() => setShowBanModal(true)}
              >
                Bannir
              </Button>
            </>
          ) : user.status === 'SUSPENDED' ? (
            <Button
              variant="success"
              size="sm"
              icon={UserCheck}
              onClick={() => {/* Réactiver */}}
            >
              Réactiver
            </Button>
          ) : null}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainContent}>
          {/* Profil */}
          <div className={styles.profileCard}>
            <div className={styles.profileHeader}>
              <div className={styles.avatar}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} />
                ) : (
                  <div className={styles.avatarFallback}>
                    {user.full_name?.charAt(0)}
                  </div>
                )}
              </div>
              
              <div className={styles.profileInfo}>
                <h2>{user.full_name}</h2>
                <div className={styles.badges}>
                  <Badge variant={user.is_verified ? 'success' : 'warning'} size="sm">
                    {user.is_verified ? '✓ Vérifié' : '⏳ Non vérifié'}
                  </Badge>
                  
                  {user.user_role === 'ARTISAN' && user.artisan_profile?.is_pro_member && (
                    <Badge variant="primary" size="sm">
                      <Crown size={12} /> Pro Member
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.contactGrid}>
              <div className={styles.contactItem}>
                <Mail size={16} />
                <div>
                  <span className={styles.contactLabel}>Email</span>
                  <a href={`mailto:${user.email}`} className={styles.contactValue}>
                    {user.email}
                  </a>
                </div>
              </div>
              
              <div className={styles.contactItem}>
                <Phone size={16} />
                <div>
                  <span className={styles.contactLabel}>Téléphone</span>
                  <a href={`tel:${user.phone_number}`} className={styles.contactValue}>
                    {user.phone_number}
                  </a>
                </div>
              </div>
              
              <div className={styles.contactItem}>
                <Calendar size={16} />
                <div>
                  <span className={styles.contactLabel}>Inscription</span>
                  <span className={styles.contactValue}>
                    {formatDate(user.created_at)}
                  </span>
                </div>
              </div>
              
              {user.country && (
                <div className={styles.contactItem}>
                  <MapPin size={16} />
                  <div>
                    <span className={styles.contactLabel}>Pays</span>
                    <span className={styles.contactValue}>
                      {user.country.country_name}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {user.user_role === 'ARTISAN' && user.artisan_profile && (
              <div className={styles.artisanStats}>
                <div className={styles.stat}>
                  <Star size={16} />
                  <div>
                    <span className={styles.statLabel}>Note moyenne</span>
                    <span className={styles.statValue}>
                      {user.artisan_profile.average_rating?.toFixed(1) || 'N/A'}/5
                    </span>
                  </div>
                </div>
                
                <div className={styles.stat}>
                  <Briefcase size={16} />
                  <div>
                    <span className={styles.statLabel}>Missions</span>
                    <span className={styles.statValue}>
                      {user.artisan_profile.total_missions || 0}
                    </span>
                  </div>
                </div>
                
                <div className={styles.stat}>
                  <Shield size={16} />
                  <div>
                    <span className={styles.statLabel}>KYC</span>
                    <span className={styles.statValue}>
                      {user.artisan_profile.kyc_status}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            className={styles.tabs}
          />
        </div>

        <div className={styles.sidebar}>
          {/* Loyalty Points */}
          {user.loyalty && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Points de fidélité</h3>
              <div className={styles.loyaltyInfo}>
                <div className={styles.loyaltyPoints}>
                  <span className={styles.loyaltyValue}>
                    {user.loyalty.current_balance}
                  </span>
                  <span className={styles.loyaltyLabel}>points</span>
                </div>
                <Badge variant="primary" size="sm">
                  {user.loyalty.tier_level}
                </Badge>
              </div>
              <div className={styles.loyaltyStats}>
                <div>
                  <span>Total gagnés</span>
                  <strong>{user.loyalty.total_earned_lifetime}</strong>
                </div>
                <div>
                  <span>Total utilisés</span>
                  <strong>{user.loyalty.total_spent_lifetime}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Dernières activités */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Dernières activités</h3>
            <div className={styles.activityList}>
              {user.sent_messages?.slice(0, 3).map(msg => (
                <div key={msg.id_message} className={styles.activityItem}>
                  <MessageSquare size={14} />
                  <div>
                    <p>{msg.content.substring(0, 50)}...</p>
                    <span>{formatDateTime(msg.sent_at)}</span>
                  </div>
                </div>
              ))}
              {(!user.sent_messages || user.sent_messages.length === 0) && (
                <p className={styles.noActivity}>Aucune activité récente</p>
              )}
            </div>
          </div>

          {/* Localisations */}
          {user.locations && user.locations.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Adresses</h3>
              {user.locations.map(loc => (
                <div key={loc.id_location} className={styles.location}>
                  <MapPin size={14} />
                  <span>{loc.address_name || 'Adresse non spécifiée'}</span>
                  {loc.is_current && (
                    <Badge variant="success" size="xs">Actuelle</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        title="Suspendre l'utilisateur"
        size="md"
      >
        <SuspendModalContent
          user={user}
          onClose={() => setShowSuspendModal(false)}
          onSuccess={() => {
            setShowSuspendModal(false)
            // Rafraîchir
          }}
        />
      </Modal>

      <Modal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        title="Bannir l'utilisateur"
        size="md"
      >
        <BanModalContent
          user={user}
          onClose={() => setShowBanModal(false)}
          onSuccess={() => {
            setShowBanModal(false)
            // Rafraîchir
          }}
        />
      </Modal>
    </div>
  )
}

// Sous-composants pour les onglets
const InfoTab = ({ user }) => (
  <div className={styles.tabContent}>
    <div className={styles.card}>
      <h3>Informations personnelles</h3>
      <div className={styles.infoGrid}>
        <div className={styles.infoRow}>
          <span>Nom complet</span>
          <strong>{user.full_name}</strong>
        </div>
        <div className={styles.infoRow}>
          <span>Email</span>
          <strong>{user.email}</strong>
        </div>
        <div className={styles.infoRow}>
          <span>Téléphone</span>
          <strong>{user.phone_number}</strong>
        </div>
        <div className={styles.infoRow}>
          <span>Rôle</span>
          <strong>{user.user_role}</strong>
        </div>
        <div className={styles.infoRow}>
          <span>Statut</span>
          <Badge variant={formatStatus(user.status).color}>
            {user.status}
          </Badge>
        </div>
        <div className={styles.infoRow}>
          <span>Vérifié</span>
          <Badge variant={user.is_verified ? 'success' : 'warning'}>
            {user.is_verified ? 'Oui' : 'Non'}
          </Badge>
        </div>
        <div className={styles.infoRow}>
          <span>Code de parrainage</span>
          <strong>{user.referral_code || '-'}</strong>
        </div>
        <div className={styles.infoRow}>
          <span>Inscription</span>
          <strong>{formatDateTime(user.created_at)}</strong>
        </div>
        <div className={styles.infoRow}>
          <span>Dernière mise à jour</span>
          <strong>{formatDateTime(user.updated_at)}</strong>
        </div>
      </div>
    </div>
  </div>
)

const ActivityTab = ({ user }) => (
  <div className={styles.tabContent}>
    <div className={styles.card}>
      <h3>Missions en tant que client</h3>
      {/* Liste des missions client */}
    </div>
    
    {user.user_role === 'ARTISAN' && (
      <div className={styles.card}>
        <h3>Missions en tant qu'artisan</h3>
        {/* Liste des missions artisan */}
      </div>
    )}
    
    <div className={styles.card}>
      <h3>Rapports</h3>
      {/* Liste des reports */}
    </div>
  </div>
)

const SubscriptionsTab = ({ user }) => (
  <div className={styles.tabContent}>
    {user.subscriptions?.map(sub => (
      <div key={sub.id_sub} className={styles.subscription}>
        <div className={styles.subscriptionHeader}>
          <h4>{sub.plan_name}</h4>
          <Badge variant={
            sub.status === 'ACTIVE' ? 'success' :
            sub.status === 'EXPIRED' ? 'secondary' : 'warning'
          }>
            {sub.status}
          </Badge>
        </div>
        
        <div className={styles.subscriptionDetails}>
          <div>
            <span>Montant</span>
            <strong>{sub.price_paid} FCFA</strong>
          </div>
          <div>
            <span>Début</span>
            <strong>{formatDate(sub.start_date)}</strong>
          </div>
          <div>
            <span>Fin</span>
            <strong>{formatDate(sub.end_date)}</strong>
          </div>
          <div>
            <span>Cycle</span>
            <strong>{sub.billing_cycle}</strong>
          </div>
        </div>
      </div>
    ))}
  </div>
)

const PaymentsTab = ({ user }) => (
  <div className={styles.tabContent}>
    {/* Historique des paiements */}
  </div>
)

const MessagesTab = ({ user }) => (
  <div className={styles.tabContent}>
    <div className={styles.messages}>
      {user.sent_messages?.map(msg => (
        <div key={msg.id_message} className={styles.message}>
          <div className={styles.messageHeader}>
            <span className={styles.messageDirection}>Envoyé à</span>
            <span className={styles.messageTime}>
              {formatDateTime(msg.sent_at)}
            </span>
          </div>
          <p className={styles.messageContent}>{msg.content}</p>
        </div>
      ))}
    </div>
  </div>
)

const SuspendModalContent = ({ user, onClose, onSuccess }) => {
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('temporary')

  const durationOptions = [
    { value: 'temporary', label: 'Temporaire (7 jours)' },
    { value: '15days', label: '15 jours' },
    { value: '30days', label: '30 jours' },
    { value: 'indefinite', label: 'Indéfini' },
  ]

  return (
    <div className={styles.modalContent}>
      <p className={styles.modalText}>
        Êtes-vous sûr de vouloir suspendre {user.full_name} ?
      </p>

      <Select
        label="Durée de la suspension"
        options={durationOptions}
        value={duration}
        onChange={setDuration}
        required
        fullWidth
      />

      <Input
        label="Raison de la suspension"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Raison de la suspension..."
        required
        fullWidth
      />

      <div className={styles.modalActions}>
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          variant="warning"
          onClick={() => {
            // Logique de suspension
            onSuccess()
          }}
        >
          Confirmer la suspension
        </Button>
      </div>
    </div>
  )
}

const BanModalContent = ({ user, onClose, onSuccess }) => {
  const [reason, setReason] = useState('')

  return (
    <div className={styles.modalContent}>
      <div className={styles.banWarning}>
        <AlertTriangle size={24} />
        <p>
          Cette action est irréversible. L'utilisateur sera définitivement banni
          de la plateforme.
        </p>
      </div>

      <Input
        label="Raison du bannissement"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Raison du bannissement..."
        required
        fullWidth
      />

      <div className={styles.modalActions}>
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            // Logique de bannissement
            onSuccess()
          }}
        >
          Confirmer le bannissement
        </Button>
      </div>
    </div>
  )
}

export default UserDetail