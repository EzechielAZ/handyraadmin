// pages/Dashboard/index.jsx
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useDashboard } from '../../hooks/useDashboard'
import StatCard from '../../components/ui/StatCard'
import EngagementSection from '../../components/dashboard/EngagementSection'
import AcquisitionCard from '../../components/dashboard/AcquisitionCard'
import RevenueChart from '../../components/charts/RevenueChart'
import MissionDonut from '../../components/charts/MissionDonut'
import UserGrowthChart from '../../components/charts/UserGrowthChart'
import PaymentMethodChart from '../../components/charts/PaymentMethodChart'
import {
  Users, Briefcase, CreditCard, Star,
  UserCheck, ShieldAlert, Scale, ArrowUpRight, MessageSquareWarning,
  Building2, Wrench, Check, X, Clock, Play, AlertTriangle,
} from 'lucide-react'
import styles from './Dashboard.module.css'

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

const STATUS_CONFIG = {
  COMPLETED:          { label: 'Terminée',   cls: 'completed', icon: Check },
  PENDING:            { label: 'En attente', cls: 'pending',   icon: Clock },
  ACCEPTED:           { label: 'Acceptée',   cls: 'active',    icon: Play },
  IN_PROGRESS:        { label: 'En cours',   cls: 'active',    icon: Play },
  ON_WAY:             { label: 'En chemin',  cls: 'active',    icon: Play },
  CANCELLED:          { label: 'Annulée',    cls: 'cancelled', icon: X },
  INCIDENT:           { label: 'Incident',   cls: 'incident',  icon: AlertTriangle },
  PENDING_VALIDATION: { label: 'Validation', cls: 'pending',   icon: Clock },
}

const ALERT_CONFIG = [
  { key: 'kycPending',      icon: UserCheck,            label: 'KYC en attente',            action: 'Traiter' },
  { key: 'openIncidents',   icon: ShieldAlert,          label: 'Incidents ouverts',         action: 'Voir', urgent: true },
  { key: 'pendingDisputes', icon: Scale,                label: 'Litiges en arbitrage',      action: 'Gérer' },
  { key: 'desintermAlerts', icon: MessageSquareWarning, label: 'Alertes désintermédiation', action: 'Voir' },
]

const CANCELLED_BY_LABEL = {
  CLIENT:  'Client',
  ARTISAN: 'Artisan',
  SYSTEM:  'Système',
}

/* À aligner sur les routes réelles de ton routeur */
const PROFILE_PATH = {
  client:  (id) => `/clients/${id}`,
  artisan: (id) => `/artisans/${id}`,
}

/* created_at est un "timestamp without time zone" (UTC côté Supabase) :
   sans suffixe, JS l'interpréterait en heure locale et décalerait l'heure. */
const parseDbDate = (v) => {
  if (!v) return null
  const s = String(v).replace(' ', 'T')
  const hasTz = /T.*([zZ]|[+-]\d{2}(:?\d{2})?)$/.test(s)
  const d = new Date(hasTz ? s : `${s}Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

/* Disque opaque + icône blanche, avant le texte de la pastille */
const StatusContent = ({ sc }) => {
  const Icon = sc.icon
  return (
    <>
      <span
        className={`${styles.statusIcon} ${styles[`statusIcon_${sc.cls}`]}`}
        aria-hidden="true"
      >
        <Icon size={10} strokeWidth={3} />
      </span>
      {sc.label}
    </>
  )
}

/* Nom cliquable vers le profil ; le clic ne déclenche pas le clic de ligne */
const PersonLink = ({ to, name, fallback = '—' }) => {
  if (!to || !name) return <span>{name || fallback}</span>
  return (
    <Link to={to} className={styles.personLink} onClick={(e) => e.stopPropagation()}>
      {name}
    </Link>
  )
}

/* ─────────────────────────────────────────────
   Badge « Annulée » avec tooltip (portal, jamais clippé par le tableau)
   Affiche : qui a annulé → cause → détail libre → date
───────────────────────────────────────────── */
const CancelledBadge = ({ children, className, mission }) => {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  const show = () => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    const below = r.top < 160
    setPos({
      x: r.left + r.width / 2,
      y: below ? r.bottom : r.top,
      below,
    })
  }
  const hide = () => setPos(null)

  useEffect(() => {
    if (!pos) return
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [pos])

  const by = mission.cancelled_by
  const byLabel = CANCELLED_BY_LABEL[by] || 'Non renseigné'
  const byName =
    by === 'CLIENT'  ? mission.clientName :
    by === 'ARTISAN' ? mission.artisanName :
    null

  const reasonLabel = mission.cancellation_reason_label || mission.cancellation_reason_code
  const reasonDetail = mission.cancellation_reason
  const hasReason = Boolean(reasonLabel || reasonDetail)

  const cancelledAtDate = parseDbDate(mission.cancelled_at)
  const cancelledAt = cancelledAtDate
    ? cancelledAtDate.toLocaleString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <>
      <span
        ref={ref}
        className={className}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={pos ? 'cancel-tooltip' : undefined}
      >
        {children}
      </span>
      {pos && createPortal(
        <div
          id="cancel-tooltip"
          role="tooltip"
          className={`${styles.tooltip} ${pos.below ? styles.tooltipBelow : styles.tooltipAbove}`}
          style={{ left: pos.x, top: pos.y }}
        >
          <span className={styles.tooltipEyebrow}>Annulée par</span>
          <span className={styles.tooltipText}>
            {byLabel}{byName ? ` · ${byName}` : ''}
          </span>

          <span className={styles.tooltipDivider} />

          <span className={styles.tooltipEyebrow}>Cause</span>
          <span className={styles.tooltipText}>
            {hasReason ? (reasonLabel || reasonDetail) : 'Aucune cause renseignée'}
          </span>
          {reasonLabel && reasonDetail && (
            <span className={styles.tooltipDetail}>{reasonDetail}</span>
          )}

          {cancelledAt && <span className={styles.tooltipMeta}>{cancelledAt}</span>}
        </div>,
        document.body
      )}
    </>
  )
}

const Dashboard = () => {
  const { data, isLoading, isError, error } = useDashboard()

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingOrb} />
        <span className={styles.loadingText}>Chargement du tableau de bord…</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadingText} style={{ color: 'var(--danger)' }}>
          Erreur : {error?.message}
        </span>
      </div>
    )
  }

  const { stats, alerts, charts, recentMissions, engagement, acquisition } = data

  const activeAlerts = ALERT_CONFIG.filter(a => alerts[a.key] > 0)

  return (
    <div className={styles.dashboard}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.headerEyebrow}>
            Vue d'ensemble · {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
          <h1 className={styles.title}>Tableau de bord</h1>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.exportBtn}>
            <ArrowUpRight size={14} strokeWidth={2} />
            Exporter
          </button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {activeAlerts.length > 0 && (
        <div className={styles.alerts}>
          {activeAlerts.map(({ key, icon: Icon, label, action, urgent }) => (
            <div
              key={key}
              className={`${styles.alert} ${urgent ? styles.alertUrgent : ''}`}
            >
              <span className={styles.alertIcon}>
                <Icon size={15} strokeWidth={1.75} />
              </span>
              <div className={styles.alertBody}>
                <span className={styles.alertCount}>{alerts[key]}</span>
                <span className={styles.alertLabel}>{label}</span>
              </div>
              <button type="button" className={styles.alertAction}>
                {action}
                <ArrowUpRight size={12} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Stats ── */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Artisans"
          value={stats.artisans.total}
          change={stats.artisans.new}
          changeLabel="nouveaux ce mois"
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Clients"
          value={stats.clients.total}
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Missions"
          value={stats.missions.total}
          change={stats.missions.completed}
          changeLabel="terminées ce mois"
          icon={Briefcase}
          color="primary"
        />
        <StatCard
          title="Revenus"
          value={stats.revenue.total}
          change={stats.revenue.commissions}
          changeLabel="en commissions"
          changeFormat="currency"
          icon={CreditCard}
          color="primary"
          format="currency"
        />
        <StatCard
          title="Abonnements"
          value={stats.revenue.subscriptions}
          changeLabel="ce mois"
          icon={CreditCard}
          color="primary"
          format="currency"
        />
        <StatCard
          title="Note moyenne"
          value={stats.rating.average}
          change={stats.rating.count}
          changeLabel="avis ce mois"
          icon={Star}
          color="primary"
          format="number"
          decimals={1}
        />
        <StatCard
          title="En attente"
          value={stats.missions.pending}
          changeLabel="missions PENDING"
          icon={Briefcase}
          color="primary"
        />
        <StatCard
          title="En cours"
          value={stats.missions.inProgress}
          changeLabel="missions actives"
          icon={Briefcase}
          color="primary"
        />
      </div>

      {/* ── Charts ── */}
      <div className={styles.chartsGrid}>
        <div className={`${styles.chartCard} ${styles.chartCardWide}`}>
          <div className={styles.chartHeader}>
            <div>
              <p className={styles.chartEyebrow}>Finance</p>
              <h3 className={styles.chartTitle}>Revenus & Commissions — 12 mois</h3>
            </div>
          </div>
          <RevenueChart data={charts.revenue} />
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <p className={styles.chartEyebrow}>Suivi</p>
              <h3 className={styles.chartTitle}>Répartition des missions</h3>
            </div>
          </div>
          <MissionDonut data={charts.missionDonut} />
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <p className={styles.chartEyebrow}>Croissance</p>
              <h3 className={styles.chartTitle}>Nouveaux utilisateurs — 12 mois</h3>
            </div>
          </div>
          <UserGrowthChart data={charts.userGrowth} />
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <p className={styles.chartEyebrow}>Finance</p>
              <h3 className={styles.chartTitle}>Méthodes de paiement</h3>
            </div>
          </div>
          <PaymentMethodChart data={charts.paymentMethods} />
        </div>

        {/* ── Acquisition : canaux d'inscription clients ── */}
        <AcquisitionCard data={acquisition} />
      </div>

      {/* ── Engagement : usage & rétention ── */}
      <EngagementSection data={engagement} />

      {/* ── Missions récentes ── */}
      {recentMissions.length > 0 && (
        <div className={styles.tableSection}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.chartEyebrow}>Activité</p>
              <h3 className={styles.sectionTitle}>Missions récentes</h3>
            </div>
            <button type="button" className={styles.viewAllBtn}>
              Voir tout <ArrowUpRight size={13} strokeWidth={2} />
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Client</th>
                  <th>Artisan</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Montant</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentMissions.map(m => {
                  const sc = STATUS_CONFIG[m.status] || { label: m.status, cls: 'pending', icon: Clock }
                  const TypeIcon = m.mission_world === 'CONSTRUCTION' ? Building2 : Wrench
                  const badgeClass = `${styles.statusBadge} ${styles[`status_${sc.cls}`]}`
                  const created = parseDbDate(m.created_at)
                  return (
                    <tr key={m.id_mission} className={styles.tableRow}>
                      <td>
                        <span className={styles.missionId}>
                          #{m.id_mission.slice(0, 8)}
                        </span>
                      </td>
                      <td className={styles.cellPrimary}>
                        <PersonLink
                          to={m.client_id ? PROFILE_PATH.client(m.client_id) : null}
                          name={m.clientName}
                        />
                      </td>
                      <td className={styles.cellSecondary}>
                        <PersonLink
                          to={m.artisan_id ? PROFILE_PATH.artisan(m.artisan_id) : null}
                          name={m.artisanName}
                          fallback="Non assigné"
                        />
                        {m.artisanName && m.assignment_number != null && (
                          <span
                            className={styles.assignmentNum}
                            title={`Assignation n°${m.assignment_number} pour cette mission`}
                          >
                            ({m.assignment_number})
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={styles.typeBadge}>
                          <TypeIcon size={12} strokeWidth={1.75} />
                          {m.mission_type}
                        </span>
                      </td>
                      <td>
                        {m.status === 'CANCELLED' ? (
                          <CancelledBadge
                            className={`${badgeClass} ${styles.hasTooltip}`}
                            mission={m}
                          >
                            <StatusContent sc={sc} />
                          </CancelledBadge>
                        ) : (
                          <span className={badgeClass}>
                            <StatusContent sc={sc} />
                          </span>
                        )}
                      </td>
                      <td className={styles.cellAmount}>
                        {fmt(m.final_price || m.estimated_price || 0)}
                      </td>
                      <td className={styles.cellSecondary}>
                        {created ? (
                          <>
                            <span>{created.toLocaleDateString('fr-FR')}</span>
                            <span className={styles.cellTime}>
                              {created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}

export default Dashboard