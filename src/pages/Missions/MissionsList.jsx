import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMission } from '../../hooks/useMissions'
import { Button, Badge, Spinner, Modal, Tabs, Input, Select } from '../../components/ui'
import {
  ArrowLeft, CheckCircle, XCircle, FileText, User, Calendar, MapPin,
  Clock, CreditCard, AlertTriangle, MessageSquare, Send,
} from 'lucide-react'
import {
  formatDate, formatDateTime, formatCurrency, formatStatus,
} from '../../utils/formatters'
import styles from './MissionDetail.module.css'

const MissionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { mission, isLoading } = useMission(id)
  const [activeTab, setActiveTab] = useState('info')
  const [showCancelModal, setShowCancelModal] = useState(false)

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
        <span className={styles.loadingText}>Chargement…</span>
      </div>
    )
  }

  if (!mission) {
    return (
      <div className={styles.errorPage}>
        <AlertTriangle size={32} className={styles.errorIcon} />
        <h2>Mission introuvable</h2>
        <p>Cette mission n'existe pas ou a été supprimée.</p>
        <Button onClick={() => navigate('/missions')}>Retour à la liste</Button>
      </div>
    )
  }

  const statusColors = {
    PENDING: 'warning',
    ACCEPTED: 'info',
    ON_WAY: 'info',
    IN_PROGRESS: 'primary',
    COMPLETED: 'success',
    CANCELLED: 'error',
  }

  const tabs = [
    { id: 'info',       label: 'Informations', icon: FileText,      content: <InfoTab mission={mission} /> },
    { id: 'client',     label: 'Client',       icon: User,          content: <ClientTab mission={mission} /> },
    { id: 'artisan',    label: 'Artisan',      icon: User,          content: <ArtisanTab mission={mission} /> },
    { id: 'milestones', label: 'Jalons',       icon: Clock,         content: <MilestonesTab mission={mission} /> },
    { id: 'payments',   label: 'Paiements',    icon: CreditCard,    content: <PaymentsTab mission={mission} /> },
    {
      id: 'chat', label: 'Chat', icon: MessageSquare,
      badge: mission.chat?.filter(m => !m.is_read).length,
      content: <ChatTab mission={mission} />,
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/missions')}>
            Retour
          </Button>
          <span className={styles.divider} />
          <div>
            <p className={styles.eyebrow}>Mission</p>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>#{mission.id_mission.slice(0, 8)}</h1>
              <Badge variant={statusColors[mission.status] || 'secondary'} size="md" dot>
                {formatStatus(mission.status).label}
              </Badge>
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          {mission.status === 'IN_PROGRESS' && (
            <Button variant="success" size="sm" icon={CheckCircle}>Terminer</Button>
          )}
          {!['COMPLETED', 'CANCELLED'].includes(mission.status) && (
            <Button variant="danger" size="sm" icon={XCircle} onClick={() => setShowCancelModal(true)}>
              Annuler
            </Button>
          )}
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.main}>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          <div className={styles.tabContent}>
            {tabs.find(t => t.id === activeTab)?.content}
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Résumé</h3>
            </div>
            <div className={styles.cardBody}>
              <SummaryRow icon={Calendar}   label="Créée le"     value={formatDateTime(mission.created_at)} />
              {mission.scheduled_at && <SummaryRow icon={Clock}    label="Planifiée"   value={formatDateTime(mission.scheduled_at)} />}
              {mission.started_at   && <SummaryRow icon={Clock}    label="Démarrée"    value={formatDateTime(mission.started_at)} />}
              {mission.ended_at     && <SummaryRow icon={Clock}    label="Terminée"    value={formatDateTime(mission.ended_at)} />}
              <SummaryRow icon={MapPin} label="Adresse" value={mission.location?.address_name || 'Non spécifiée'} />

              <div className={styles.divider} />

              <SummaryRow icon={CreditCard} label="Estimé"       value={formatCurrency(mission.estimated_price || 0)} />
              {mission.final_price && <SummaryRow icon={CreditCard} label="Final"    value={formatCurrency(mission.final_price)} />}
              <SummaryRow icon={CreditCard} label="Frais Handyra" value={formatCurrency(mission.handyra_fee || 0)} />
              {mission.material_cost_total > 0 && <SummaryRow icon={CreditCard} label="Matériaux" value={formatCurrency(mission.material_cost_total)} />}

              {mission.cancellation_reason && (
                <>
                  <div className={styles.divider} />
                  <div className={styles.cancellation}>
                    <AlertTriangle size={13} />
                    <div>
                      <span className={styles.summaryLabel}>Motif d'annulation</span>
                      <p className={styles.cancellationReason}>{mission.cancellation_reason}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Annuler la mission">
        <CancelModalContent
          mission={mission}
          onClose={() => setShowCancelModal(false)}
          onSuccess={() => setShowCancelModal(false)}
        />
      </Modal>
    </div>
  )
}

/* ── Helper ── */
const SummaryRow = ({ icon: Icon, label, value }) => (
  <div className={styles.summaryRow}>
    <Icon size={12} className={styles.summaryIcon} />
    <div>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
    </div>
  </div>
)

/* ── Tab: Info ── */
const InfoTab = ({ mission }) => (
  <div className={styles.tabStack}>
    <div className={styles.card}>
      <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Description</h3></div>
      <div className={styles.cardBody}>
        <p className={styles.description}>{mission.description}</p>
      </div>
    </div>

    <div className={styles.card}>
      <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Catégorie</h3></div>
      <div className={styles.cardBody}>
        <Badge variant="primary" size="md">{mission.category?.name || 'Non catégorisée'}</Badge>
      </div>
    </div>

    {mission.materials?.length > 0 && (
      <div className={styles.card}>
        <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Matériaux</h3></div>
        <div className={styles.cardBody}>
          <div className={styles.materials}>
            {mission.materials.map(m => (
              <div key={m.id_material} className={styles.materialRow}>
                <span className={styles.materialName}>{m.item_name}</span>
                <span className={styles.materialQty}>
                  {m.quantity} × {formatCurrency(m.unit_price)}
                </span>
                <span className={styles.materialTotal}>{formatCurrency(m.total_price)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
)

/* ── Tab: Client ── */
const ClientTab = ({ mission }) => (
  <div className={styles.card}>
    <div className={styles.profileHeader}>
      <div className={styles.avatar}>
        {mission.client?.avatar_url ? (
          <img src={mission.client.avatar_url} alt={mission.client.full_name} />
        ) : (
          <span className={styles.avatarFallback}>{mission.client?.full_name?.charAt(0)}</span>
        )}
      </div>
      <div className={styles.profileInfo}>
        <h3 className={styles.profileName}>{mission.client?.full_name}</h3>
        <Badge variant={mission.client?.status === 'ACTIVE' ? 'success' : 'secondary'} size="sm" dot>
          {mission.client?.status || 'Inconnu'}
        </Badge>
      </div>
    </div>

    <div className={styles.contactGrid}>
      <ContactItem label="Email"           value={mission.client?.email} href={`mailto:${mission.client?.email}`} />
      <ContactItem label="Téléphone"       value={mission.client?.phone_number} href={`tel:${mission.client?.phone_number}`} />
      <ContactItem label="Membre depuis"   value={formatDate(mission.client?.created_at)} />
    </div>
  </div>
)

/* ── Tab: Artisan ── */
const ArtisanTab = ({ mission }) => {
  if (!mission.artisan) {
    return (
      <div className={styles.empty}>
        <User size={20} />
        <span>Aucun artisan assigné</span>
      </div>
    )
  }
  const a = mission.artisan
  return (
    <div className={styles.card}>
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          {a.user?.avatar_url ? (
            <img src={a.user.avatar_url} alt={a.user.full_name} />
          ) : (
            <span className={styles.avatarFallback}>{a.user?.full_name?.charAt(0)}</span>
          )}
        </div>
        <div className={styles.profileInfo}>
          <h3 className={styles.profileName}>{a.user?.full_name}</h3>
          <div className={styles.profileBadges}>
            <Badge variant={
              a.availability_status === 'AVAILABLE' ? 'success' :
              a.availability_status === 'BUSY' ? 'warning' : 'secondary'
            } size="sm" dot>
              {a.availability_status}
            </Badge>
            {a.is_pro_member && <Badge variant="primary" size="sm">PRO</Badge>}
          </div>
        </div>
      </div>

      <div className={styles.contactGrid}>
        <ContactItem label="Email"     value={a.user?.email} href={`mailto:${a.user?.email}`} />
        <ContactItem label="Téléphone" value={a.user?.phone_number} href={`tel:${a.user?.phone_number}`} />
        <ContactItem label="IFU"       value={a.ifu_number} />
      </div>

      <div className={styles.miniStats}>
        <div className={styles.miniStat}>
          <span className={styles.miniStatLabel}>Note</span>
          <span className={styles.miniStatValue}>{a.average_rating?.toFixed(1) || '—'}/5</span>
        </div>
        <div className={styles.miniStat}>
          <span className={styles.miniStatLabel}>Missions</span>
          <span className={styles.miniStatValue}>{a.total_missions || 0}</span>
        </div>
        <div className={styles.miniStat}>
          <span className={styles.miniStatLabel}>Expérience</span>
          <span className={styles.miniStatValue}>{a.experience_years || 0} ans</span>
        </div>
      </div>
    </div>
  )
}

/* ── Tab: Milestones ── */
const MilestonesTab = ({ mission }) => (
  <div className={styles.tabStack}>
    {(mission.milestones || []).map((m, i) => (
      <div key={m.id_milestone} className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.milestoneNumber}>Jalon {i + 1}</span>
          <Badge variant={
            m.status === 'PAID' ? 'success' :
            m.status === 'COMPLETED' ? 'info' :
            m.status === 'IN_PROGRESS' ? 'warning' : 'secondary'
          } size="sm" dot>
            {m.status}
          </Badge>
        </div>
        <div className={styles.cardBody}>
          <h4 className={styles.milestoneTitle}>{m.title}</h4>
          {m.description && <p className={styles.milestoneDesc}>{m.description}</p>}
          <div className={styles.milestoneDetails}>
            <div className={styles.miniStat}>
              <span className={styles.miniStatLabel}>Pourcentage</span>
              <span className={styles.miniStatValue}>{m.amount_percentage}%</span>
            </div>
            {m.due_date && (
              <div className={styles.miniStat}>
                <span className={styles.miniStatLabel}>Échéance</span>
                <span className={styles.miniStatValue}>{formatDate(m.due_date)}</span>
              </div>
            )}
            {m.completed_at && (
              <div className={styles.miniStat}>
                <span className={styles.miniStatLabel}>Terminé</span>
                <span className={styles.miniStatValue}>{formatDate(m.completed_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    ))}
    {(!mission.milestones || mission.milestones.length === 0) && (
      <div className={styles.empty}><Clock size={20} /><span>Aucun jalon</span></div>
    )}
  </div>
)

/* ── Tab: Payments ── */
const PaymentsTab = ({ mission }) => (
  <div className={styles.tabStack}>
    {(mission.payments || []).map(p => (
      <div key={p.id_request} className={styles.card}>
        <div className={styles.cardHeader}>
          <Badge variant={
            p.status === 'PAID' ? 'success' :
            p.status === 'PENDING' ? 'warning' : 'secondary'
          } size="sm" dot>
            {p.status}
          </Badge>
          <span className={styles.paymentAmount}>{formatCurrency(p.amount)}</span>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.milestoneDetails}>
            <div className={styles.miniStat}>
              <span className={styles.miniStatLabel}>Type</span>
              <span className={styles.miniStatValue}>{p.type}</span>
            </div>
            <div className={styles.miniStat}>
              <span className={styles.miniStatLabel}>Date</span>
              <span className={styles.miniStatValue}>{formatDateTime(p.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    ))}
    {(!mission.payments || mission.payments.length === 0) && (
      <div className={styles.empty}><CreditCard size={20} /><span>Aucun paiement</span></div>
    )}
  </div>
)

/* ── Tab: Chat ── */
const ChatTab = ({ mission }) => (
  <div className={styles.chatCard}>
    <div className={styles.chatMessages}>
      {(mission.chat || []).map(m => (
        <div key={m.id_message} className={styles.message}>
          <div className={styles.messageHeader}>
            <span className={styles.messageSender}>{m.sender?.full_name}</span>
            <span className={styles.messageTime}>{formatDateTime(m.sent_at)}</span>
          </div>
          <p className={styles.messageContent}>{m.content}</p>
        </div>
      ))}
      {(!mission.chat || mission.chat.length === 0) && (
        <div className={styles.empty}><MessageSquare size={20} /><span>Aucun message</span></div>
      )}
    </div>
    <div className={styles.chatInput}>
      <textarea placeholder="Écrire un message…" />
      <Button variant="primary" icon={Send}>Envoyer</Button>
    </div>
  </div>
)

const ContactItem = ({ label, value, href }) => (
  <div className={styles.contactItem}>
    <span className={styles.contactLabel}>{label}</span>
    {href
      ? <a href={href} className={styles.contactValue}>{value || '—'}</a>
      : <span className={styles.contactValue}>{value || '—'}</span>}
  </div>
)

/* ── Modal ── */
const CancelModalContent = ({ mission, onClose, onSuccess }) => {
  const [reasonCode, setReasonCode] = useState('')
  const [reason, setReason] = useState('')

  const reasonOptions = [
    { value: 'client_cancelled',    label: 'Annulation par le client' },
    { value: 'artisan_unavailable', label: 'Artisan indisponible' },
    { value: 'payment_issue',       label: 'Problème de paiement' },
    { value: 'duplicate',           label: 'Mission en double' },
    { value: 'other',               label: 'Autre raison' },
  ]

  return (
    <div className={styles.modalStack}>
      <p className={styles.modalText}>Confirmer l'annulation de la mission #{mission.id_mission.slice(0, 8)} ?</p>
      <Select
        label="Motif"
        options={reasonOptions}
        value={reasonCode}
        onChange={setReasonCode}
        placeholder="Sélectionner un motif…"
        required
      />
      {reasonCode === 'other' && (
        <Input
          label="Précisez"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Raison de l'annulation…"
        />
      )}
      <div className={styles.modalActions}>
        <Button variant="outline" onClick={onClose}>Retour</Button>
        <Button variant="danger" onClick={onSuccess}>Confirmer l'annulation</Button>
      </div>
    </div>
  )
}

export default MissionDetail