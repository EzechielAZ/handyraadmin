import React, { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useArtisan } from '../../hooks/useArtisans'
import { Button, Badge, Spinner, Modal, Tabs, Input, Select } from '../../components/ui'
import {
  ArrowLeft, Edit, Shield, Award, Star, Briefcase, CreditCard,
  FileText, AlertTriangle, CheckCircle, XCircle, Mail, Phone,
  Calendar, Clock, ChevronRight, FileCheck, Download, Eye,
  MoreVertical, MessageSquare, TrendingUp, Users, DollarSign, PieChart,
  MapPin, Wallet, AlertOctagon, Wrench, Globe,
} from 'lucide-react'
import { formatDate, formatCurrency, formatStatus } from '../../utils/formatters'
import styles from './ArtisanDetail.module.css'

const ArtisanDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    artisan, isLoading, refetch,
    validateKYC, isValidating,
    suspendArtisan, isSuspending,
    reactivateArtisan, isReactivating,
  } = useArtisan(id)

  const [activeTab, setActiveTab] = useState('info')
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showKYCModal, setShowKYCModal] = useState(false)
  const [kycDecision, setKycDecision] = useState('VALIDATED')
  const [kycReason, setKycReason] = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendType, setSuspendType] = useState('RATE_15_20')

  const tabsBarRef = useRef(null)

  /* Auto-scroll systématique au changement de tab */
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    requestAnimationFrame(() => {
      tabsBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
        <span className={styles.loadingText}>Chargement…</span>
      </div>
    )
  }

  if (!artisan) {
    return (
      <div className={styles.errorPage}>
        <AlertTriangle size={32} className={styles.errorIcon} />
        <h2>Artisan introuvable</h2>
        <p>Cet artisan n'existe pas ou a été supprimé.</p>
        <Button onClick={() => navigate('/artisans')}>Retour à la liste</Button>
      </div>
    )
  }

  const isSuspended = artisan.user?.status === 'SUSPENDED'

  const submitKYC = () => {
    validateKYC({ status: kycDecision, notes: kycReason }, {
      onSuccess: () => { setShowKYCModal(false); setKycReason('') }
    })
  }

  const submitSuspend = () => {
    if (!suspendReason.trim()) return
    suspendArtisan(
      { reason: suspendReason, suspensionType: suspendType },
      { onSuccess: () => { setShowSuspendModal(false); setSuspendReason('') } }
    )
  }

  const tabs = [
    { id: 'info',      label: 'Informations', icon: FileText,   content: <InfoTab artisan={artisan} onOpenKYC={() => { setKycDecision('VALIDATED'); setShowKYCModal(true) }} /> },
    { id: 'missions',  label: 'Missions',     icon: Briefcase,  content: <MissionsTab artisan={artisan} onViewAll={() => navigate('/missions')} /> },
    { id: 'payments',  label: 'Paiements',    icon: CreditCard, content: <PaymentsTab artisan={artisan} /> },
    { id: 'kyc',       label: 'KYC',          icon: Shield,     content: <KYCTab artisan={artisan} onVerify={() => { setKycDecision('VALIDATED'); setShowKYCModal(true) }} /> },
    { id: 'reviews',   label: 'Avis',         icon: Star,       content: <ReviewsTab artisan={artisan} /> },
    { id: 'analytics', label: 'Analytiques',  icon: TrendingUp, content: <AnalyticsTab artisan={artisan} /> },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.headerLeft}>
            <Button
              variant="ghost"
              size="md"
              icon={ArrowLeft}
              onClick={() => navigate('/artisans')}
              aria-label="Retour à la liste"
              title="Retour"
            />
            <h1 className={styles.title}>{artisan.user?.full_name}</h1>
            {artisan.is_pro_member && (
              <Badge variant="primary" size="sm"><Award size={10} /> PRO</Badge>
            )}
            {isSuspended && (
              <Badge variant="danger" size="sm" dot>Suspendu</Badge>
            )}
          </div>

          <div className={styles.headerActions}>
            <Button variant="outline" size="md" icon={Edit} onClick={() => navigate(`/artisans/${id}/edit`)}>
              Modifier
            </Button>
            {isSuspended ? (
              <Button
                variant="success"
                size="md"
                icon={CheckCircle}
                onClick={() => reactivateArtisan()}
                isLoading={isReactivating}
              >
                Réactiver
              </Button>
            ) : (
              <Button
                variant="danger"
                size="md"
                icon={AlertTriangle}
                onClick={() => setShowSuspendModal(true)}
              >
                Suspendre
              </Button>
            )}
            <Button variant="ghost" size="md" icon={MoreVertical} aria-label="Plus d'actions" />
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.profile}>
          <div className={styles.profileHeader}>
            <div className={styles.avatar}>
              {artisan.user?.avatar_url ? (
                <img src={artisan.user.avatar_url} alt={artisan.user.full_name} />
              ) : (
                <span className={styles.avatarFallback}>{artisan.user?.full_name?.charAt(0)}</span>
              )}
            </div>
            <div className={styles.profileInfo}>
              <div className={styles.nameRow}>
                <h2 className={styles.name}>{artisan.user?.full_name}</h2>
                <Badge variant="secondary" size="sm">
                  <span className={styles.mono}>IFU·{artisan.ifu_number}</span>
                </Badge>
              </div>
              <div className={styles.badges}>
                <Badge variant={formatStatus(artisan.kyc_status).color} size="sm" dot>
                  {formatStatus(artisan.kyc_status).label}
                </Badge>
                <Badge
                  variant={
                    artisan.availability_status === 'AVAILABLE' ? 'success' :
                    artisan.availability_status === 'BUSY' ? 'warning' : 'secondary'
                  }
                  size="sm" dot
                >
                  {artisan.availability_status === 'AVAILABLE' ? 'Disponible' :
                   artisan.availability_status === 'BUSY' ? 'Occupé' : 'Hors ligne'}
                </Badge>
                {artisan.badge?.name && (
                  <Badge variant="primary" size="sm"><Award size={10} />{artisan.badge.name}</Badge>
                )}
              </div>
            </div>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <Star size={14} className={styles.statIcon} />
              <span className={styles.statValue}>{artisan.average_rating?.toFixed(1) || '—'}</span>
              <span className={styles.statLabel}>Note</span>
            </div>
            <div className={styles.statItem}>
              <Briefcase size={14} className={styles.statIcon} />
              <span className={styles.statValue}>{artisan.total_missions || 0}</span>
              <span className={styles.statLabel}>Missions</span>
            </div>
            <div className={styles.statItem}>
              <TrendingUp size={14} className={styles.statIcon} />
              <span className={styles.statValue}>{Number(artisan.hpre_score || 0).toFixed(1)}</span>
              <span className={styles.statLabel}>HPRE</span>
            </div>
            <div className={styles.statItem}>
              <Wallet size={14} className={styles.statIcon} />
              <span className={styles.statValue}>{formatCurrency(artisan.revenue?.current_balance || 0)}</span>
              <span className={styles.statLabel}>Solde</span>
            </div>
          </div>

          <div className={styles.contactRow}>
            <span className={styles.contactItem}>
              <Mail size={12} />
              <a href={`mailto:${artisan.user?.email}`}>{artisan.user?.email}</a>
            </span>
            <span className={styles.contactItem}>
              <Phone size={12} />
              <a href={`tel:${artisan.user?.phone_number}`}>{artisan.user?.phone_number}</a>
            </span>
            <span className={styles.contactItem}>
              <Calendar size={12} />
              Inscrit le {formatDate(artisan.created_at)}
            </span>
          </div>
        </section>

        <div ref={tabsBarRef} className={styles.tabsBar}>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
        </div>

        <div className={styles.tabContent}>
          {tabs.find(t => t.id === activeTab)?.content}
        </div>
      </div>

      {/* Modale Suspendre */}
      <Modal isOpen={showSuspendModal} onClose={() => setShowSuspendModal(false)} title="Suspendre l'artisan">
        <div className={styles.modalStack}>
          <p className={styles.modalText}>
            Confirmer la suspension de <strong>{artisan.user?.full_name}</strong> ? Le compte sera marqué SUSPENDED et l'artisan basculé hors ligne.
          </p>
          <Select
            label="Type de suspension"
            options={[
              { value: 'RATE_15_20',            label: 'Taux de litige 15–20%' },
              { value: 'RATE_20_30',            label: 'Taux de litige 20–30%' },
              { value: 'CONSECUTIVE_DISPUTES',  label: 'Litiges consécutifs' },
              { value: 'PERMANENT_BAN',         label: 'Bannissement permanent' },
            ]}
            value={suspendType}
            onChange={setSuspendType}
          />
          <Input
            label="Motif (visible dans l'audit)"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Ex : 3 litiges confirmés sur 5 missions"
          />
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setShowSuspendModal(false)}>Annuler</Button>
            <Button variant="danger" onClick={submitSuspend} isLoading={isSuspending} disabled={!suspendReason.trim()}>
              Confirmer la suspension
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modale KYC */}
      <Modal isOpen={showKYCModal} onClose={() => setShowKYCModal(false)} title="Décision KYC">
        <div className={styles.modalStack}>
          <Select
            label="Décision"
            options={[
              { value: 'VALIDATED', label: 'Valider le KYC' },
              { value: 'REJECTED',  label: 'Rejeter le KYC' },
            ]}
            value={kycDecision}
            onChange={setKycDecision}
          />
          <Input
            label={kycDecision === 'REJECTED' ? 'Motif du rejet (obligatoire)' : 'Note interne (optionnel)'}
            value={kycReason}
            onChange={(e) => setKycReason(e.target.value)}
            placeholder={kycDecision === 'REJECTED' ? 'Ex : CNI illisible' : 'Ex : Documents conformes'}
          />
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setShowKYCModal(false)}>Annuler</Button>
            <Button
              variant={kycDecision === 'VALIDATED' ? 'success' : 'danger'}
              onClick={submitKYC}
              isLoading={isValidating}
              disabled={kycDecision === 'REJECTED' && !kycReason.trim()}
            >
              {kycDecision === 'VALIDATED' ? 'Valider' : 'Rejeter'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ── Info ── */
const InfoTab = ({ artisan, onOpenKYC }) => (
  <div className={styles.infoGrid}>
    <div className={styles.card}>
      <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Informations personnelles</h3></div>
      <div className={styles.cardBody}>
        <InfoRow label="Nom complet"  value={artisan.user?.full_name} />
        <InfoRow label="IFU"          value={artisan.ifu_number} mono />
        <InfoRow label="Bio"          value={artisan.bio || 'Non renseigné'} full />
      </div>
    </div>

    <div className={styles.card}>
      <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Performance & HPRE</h3></div>
      <div className={styles.cardBody}>
        <div className={styles.statsGrid}>
          <StatMini label="Note"        value={`${artisan.average_rating?.toFixed(1) || '—'}/5`} icon={Star} />
          <StatMini label="Missions"    value={artisan.total_missions || 0} icon={Briefcase} />
          <StatMini label="Complétion"  value={`${artisan.stats?.completion_rate || 0}%`} />
          <StatMini label="Ponctualité" value={`${artisan.stats?.on_time_rate || 0}%`} />
          <StatMini label="Score HPRE"  value={Number(artisan.hpre_score || 0).toFixed(1)} icon={TrendingUp} highlight />
          <StatMini label="Récompenses HPRE" value={formatCurrency(artisan.hpre_accrued_rewards || 0)} />
        </div>
      </div>
    </div>

    <div className={styles.card}>
      <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Revenus & Commissions</h3></div>
      <div className={styles.cardBody}>
        <InfoRow label="Commissions Handyra" value={formatCurrency(artisan.revenue?.total_commission || 0)} />
        <InfoRow label="Volume total encaissé" value={formatCurrency(artisan.revenue?.total_gross || 0)} />
        <InfoRow label="Solde disponible" value={formatCurrency(artisan.revenue?.current_balance || 0)} />
        <InfoRow label="En attente" value={formatCurrency(artisan.revenue?.pending_amount || 0)} />
      </div>
    </div>

    <div className={styles.card}>
      <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Litiges & Alertes</h3></div>
      <div className={styles.cardBody}>
        <div className={styles.statsGrid}>
          <StatMini label="Litiges totaux"    value={artisan.disputes?.total || 0} icon={AlertOctagon} />
          <StatMini label="Litiges en attente" value={artisan.disputes?.pending || 0} />
          <StatMini label="Désintermédiation" value={artisan.desinterm?.total || 0} icon={AlertTriangle} />
          <StatMini label="Alertes pending"   value={artisan.desinterm?.pending || 0} />
        </div>
      </div>
    </div>

    <div className={styles.card}>
      <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Localisation</h3></div>
      <div className={styles.cardBody}>
        <InfoRow label="Adresse" value={artisan.location?.address || 'Non renseignée'} />
        <InfoRow label="Ville"   value={artisan.location?.city || 'Non renseignée'} />
        <div className={styles.subSection}>
          <span className={styles.subSectionLabel}>Zones d'intervention</span>
          {artisan.top_zones?.length > 0 ? (
            <div className={styles.pillList}>
              {artisan.top_zones.map((z, i) => (
                <span key={i} className={styles.pill}>
                  <Globe size={11} />{z.name}
                  <span className={styles.pillCount}>{z.count}</span>
                </span>
              ))}
            </div>
          ) : (
            <span className={styles.muted}>Aucune mission localisée</span>
          )}
        </div>
      </div>
    </div>

    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Spécialités & services</h3>
        <Badge variant="secondary" size="sm">{artisan.services?.active || 0} actifs</Badge>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.subSection}>
          <span className={styles.subSectionLabel}>Spécialités</span>
          {artisan.specialties?.length > 0 ? (
            <div className={styles.pillList}>
              {artisan.specialties.map((s, i) => (
                <span key={i} className={styles.pill}><Wrench size={11} />{s}</span>
              ))}
            </div>
          ) : (
            <span className={styles.muted}>Aucune spécialité déclarée</span>
          )}
        </div>

        {artisan.services?.custom?.length > 0 && (
          <div className={styles.subSection}>
            <span className={styles.subSectionLabel}>Services custom ({artisan.services.custom.length})</span>
            <div className={styles.serviceList}>
              {artisan.services.custom.map(s => (
                <div key={s.id} className={styles.serviceItem}>
                  <div>
                    <span className={styles.serviceName}>{s.label}</span>
                    {s.description && <span className={styles.serviceDesc}>{s.description}</span>}
                  </div>
                  <span className={styles.servicePrice}>
                    {s.price_amount
                      ? `${formatCurrency(s.price_amount)}${s.price_unit ? ` / ${s.price_unit}` : ''}`
                      : s.price_type === 'QUOTE' ? 'Sur devis' : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {artisan.services?.catalog?.length > 0 && (
          <div className={styles.subSection}>
            <span className={styles.subSectionLabel}>Catalogue Handyra ({artisan.services.catalog.length})</span>
            <div className={styles.pillList}>
              {artisan.services.catalog.map(s => (
                <span key={s.id} className={styles.pill}>{s.label}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    <div className={styles.card}>
      <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Services les plus demandés</h3></div>
      <div className={styles.cardBody}>
        {artisan.top_services_requested?.length > 0 ? (
          <div className={styles.rankList}>
            {artisan.top_services_requested.map((s, i) => (
              <div key={i} className={styles.rankRow}>
                <span className={styles.rankPos}>{i + 1}</span>
                <span className={styles.rankLabel}>{s.label}</span>
                <span className={styles.rankCount}>{s.count} missions</span>
              </div>
            ))}
          </div>
        ) : (
          <span className={styles.muted}>Aucun service demandé</span>
        )}
      </div>
    </div>

    <div className={styles.card}>
      <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Statut KYC</h3></div>
      <div className={styles.cardBody}>
        <div className={styles.kycStatusRow}>
          <Shield size={16} className={styles.mutedIcon} />
          <Badge variant={formatStatus(artisan.kyc_status).color} size="md" dot>
            {formatStatus(artisan.kyc_status).label}
          </Badge>
          <div className={styles.kycActions}>
            {artisan.kyc_status !== 'VALIDATED' && (
              <Button variant="success" size="sm" onClick={onOpenKYC}>Valider</Button>
            )}
            {artisan.kyc_status === 'VALIDATED' && (
              <Button variant="ghost" size="sm" onClick={onOpenKYC}>Modifier</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
)

const InfoRow = ({ label, value, mono, full }) => (
  <div className={`${styles.infoRow} ${full ? styles.infoRowFull : ''}`}>
    <span className={styles.infoLabel}>{label}</span>
    <span className={mono ? styles.mono : full ? styles.infoValueLeft : styles.infoValue}>
      {value || '—'}
    </span>
  </div>
)

const StatMini = ({ label, value, icon: Icon, highlight }) => (
  <div className={`${styles.statMini} ${highlight ? styles.statMiniHighlight : ''}`}>
    <span className={styles.statMiniLabel}>{label}</span>
    <span className={styles.statMiniValue}>
      {Icon && <Icon size={12} />}
      {value}
    </span>
  </div>
)

/* ── Missions ── */
const MissionsTab = ({ artisan, onViewAll }) => {
  const missions = artisan.missions || []
  return (
    <div>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>Missions récentes</h3>
        <Button variant="ghost" size="sm" icon={ChevronRight} onClick={onViewAll}>Voir tout</Button>
      </div>
      {missions.length === 0 ? (
        <div className={styles.empty}><Briefcase size={20} /><span>Aucune mission</span></div>
      ) : (
        <div className={styles.list}>
          {missions.map(m => (
            <div key={m.id_mission} className={styles.listItem}>
              <div className={styles.listItemHeader}>
                <div>
                  <h4 className={styles.listItemTitle}>{m.title}</h4>
                  <p className={styles.listItemSub}>{m.client_name}</p>
                </div>
                <Badge variant={formatStatus(m.status).color} size="sm" dot>
                  {formatStatus(m.status).label}
                </Badge>
              </div>
              <div className={styles.listItemMeta}>
                <span><Calendar size={11} />{formatDate(m.start_date)}</span>
                <span><DollarSign size={11} />{formatCurrency(m.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Payments ── */
const PaymentsTab = ({ artisan }) => {
  const payments = artisan.payments || []
  return (
    <div>
      <div className={styles.summary3}>
        <SummaryCard label="Total gagné" value={formatCurrency(artisan.total_earnings || 0)} />
        <SummaryCard label="En attente"  value={formatCurrency(artisan.pending_payments || 0)} />
        <SummaryCard label="Paiements"   value={artisan.payments_count || 0} />
      </div>
      {payments.length === 0 ? (
        <div className={styles.empty}><CreditCard size={20} /><span>Aucun paiement</span></div>
      ) : (
        <div className={styles.plainTableWrap}>
          <table className={styles.plainTable}>
            <thead>
              <tr><th>Date</th><th>Mission</th><th>Montant</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>{formatDate(p.created_at)}</td>
                  <td>{p.mission_title}</td>
                  <td className={styles.amount}>{formatCurrency(p.amount)}</td>
                  <td>
                    <Badge variant={formatStatus(p.status).color} size="sm" dot>
                      {formatStatus(p.status).label}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => window.open(`/payments?ref=${p.id}`, '_blank')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const SummaryCard = ({ label, value }) => (
  <div className={styles.summaryCard}>
    <span className={styles.summaryLabel}>{label}</span>
    <span className={styles.summaryValue}>{value}</span>
  </div>
)

/* ── KYC ── */
const KYCTab = ({ artisan, onVerify }) => {
  const docs = artisan.kyc_documents || []
  return (
    <div>
      <div className={styles.kycBanner}>
        <div className={styles.kycBannerLeft}>
          <Shield size={16} className={styles.statIcon} />
          <div>
            <span className={styles.statMiniLabel}>Statut KYC</span>
            <Badge variant={formatStatus(artisan.kyc_status).color} size="md">
              {formatStatus(artisan.kyc_status).label}
            </Badge>
          </div>
        </div>
        <Button variant="primary" size="sm" icon={Shield} onClick={onVerify}>
          {artisan.kyc_status === 'VALIDATED' ? 'Modifier la décision' : 'Prendre une décision'}
        </Button>
      </div>

      <h4 className={styles.sectionTitle}>Documents fournis</h4>
      {docs.length === 0 ? (
        <div className={styles.empty}><FileText size={20} /><span>Aucun document</span></div>
      ) : (
        <div className={styles.docsGrid}>
          {docs.map(doc => (
            <div key={doc.id} className={styles.docCard}>
              <div className={styles.docIcon}>
                {doc.type === 'IDENTITY' ? <FileCheck size={16} /> : <FileText size={16} />}
              </div>
              <div className={styles.docInfo}>
                <span className={styles.docName}>{doc.name}</span>
                <span className={styles.muted}>{formatDate(doc.uploaded_at)}</span>
              </div>
              <div className={styles.docActions}>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Download}
                  onClick={() => window.open(doc.file_url, '_blank')}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Eye}
                  onClick={() => window.open(doc.file_url, '_blank')}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Reviews ── */
const ReviewsTab = ({ artisan }) => {
  const reviews = artisan.reviews || []
  return (
    <div>
      <div className={styles.reviewsSummary}>
        <div className={styles.ratingBig}>
          <span className={styles.ratingValueBig}>{artisan.average_rating?.toFixed(1) || '—'}</span>
          <div className={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} size={14}
                fill={s <= (artisan.average_rating || 0) ? 'currentColor' : 'none'}
                className={s <= (artisan.average_rating || 0) ? styles.starFilled : styles.starEmpty}
              />
            ))}
          </div>
          <span className={styles.muted}>{artisan.total_reviews || 0} avis</span>
        </div>
        <div className={styles.ratingBreakdown}>
          {[5, 4, 3, 2, 1].map(r => {
            const count = artisan.rating_breakdown?.[r] || 0
            const pct = ((count / (artisan.total_reviews || 1)) * 100).toFixed(0)
            return (
              <div key={r} className={styles.ratingBar}>
                <span className={styles.ratingBarLabel}>{r}★</span>
                <div className={styles.ratingBarTrack}><div style={{ width: `${pct}%` }} /></div>
                <span className={styles.ratingBarCount}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className={styles.empty}><MessageSquare size={20} /><span>Aucun avis</span></div>
      ) : (
        <div className={styles.list}>
          {reviews.map(r => (
            <div key={r.id_review} className={styles.listItem}>
              <div className={styles.listItemHeader}>
                <div className={styles.reviewer}>
                  <div className={styles.reviewerAvatar}>
                    {r.reviewer_avatar ? (
                      <img src={r.reviewer_avatar} alt={r.reviewer_name} />
                    ) : (
                      <span>{r.reviewer_name?.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <span className={styles.reviewerName}>{r.reviewer_name}</span>
                    <span className={styles.muted}>{formatDate(r.created_at)}</span>
                  </div>
                </div>
                <div className={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={11}
                      fill={s <= r.rating ? 'currentColor' : 'none'}
                      className={s <= r.rating ? styles.starFilled : styles.starEmpty}
                    />
                  ))}
                </div>
              </div>
              <p className={styles.reviewComment}>{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Analytics ── */
const AnalyticsTab = ({ artisan }) => (
  <div className={styles.analyticsGrid}>
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Performance mensuelle</h3>
        <PieChart size={14} className={styles.mutedIcon} />
      </div>
      <div className={styles.cardBody}>
        <MetricRow label="Missions ce mois" value={artisan.stats?.monthly_missions || 0} />
        <MetricRow label="Revenu ce mois"  value={formatCurrency(artisan.revenue?.total_gross || 0)} />
        <MetricRow label="Occupation"      value={`${artisan.stats?.occupancy_rate || 0}%`} />
      </div>
    </div>

    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Engagement</h3>
        <Users size={14} className={styles.mutedIcon} />
      </div>
      <div className={styles.cardBody}>
        <MetricRow label="Taux de réponse"  value={`${artisan.stats?.response_rate || 0}%`} />
        <MetricRow label="Temps de réponse" value={artisan.stats?.response_time_avg || 'N/A'} />
        <MetricRow label="Litiges" value={artisan.disputes?.total || 0} />
      </div>
    </div>

    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Qualité</h3>
        <Star size={14} className={styles.mutedIcon} />
      </div>
      <div className={styles.cardBody}>
        <MetricRow label="Taux de complétion" value={`${artisan.stats?.completion_rate || 0}%`} />
        <MetricRow label="Ponctualité" value={`${artisan.stats?.on_time_rate || 0}%`} />
        <MetricRow label="Avis" value={artisan.total_reviews || 0} />
      </div>
    </div>
  </div>
)

const MetricRow = ({ label, value }) => (
  <div className={styles.metricRow}>
    <span className={styles.metricLabel}>{label}</span>
    <span className={styles.metricValue}>{value}</span>
  </div>
)

export default ArtisanDetail