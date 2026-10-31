// pages/Dashboard/index.jsx
import React from 'react'
import { useDashboard } from '../../hooks/useDashboard'
import StatCard from '../../components/ui/StatCard'
import RevenueChart from '../../components/charts/RevenueChart'
import MissionDonut from '../../components/charts/MissionDonut'
import UserGrowthChart from '../../components/charts/UserGrowthChart'
import PaymentMethodChart from '../../components/charts/PaymentMethodChart'
import {
  Users, Briefcase, CreditCard, Star,
  AlertTriangle, ShieldAlert, Info, ArrowUpRight, MessageSquareWarning,
} from 'lucide-react'
import styles from './Dashboard.module.css'

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

const STATUS_CONFIG = {
  COMPLETED:        { label: 'Terminée',       cls: 'completed' },
  PENDING:          { label: 'En attente',      cls: 'pending'   },
  ACCEPTED:         { label: 'Acceptée',        cls: 'active'    },
  IN_PROGRESS:      { label: 'En cours',        cls: 'active'    },
  ON_WAY:           { label: 'En chemin',       cls: 'active'    },
  CANCELLED:        { label: 'Annulée',         cls: 'cancelled' },
  INCIDENT:         { label: 'Incident',        cls: 'incident'  },
  PENDING_VALIDATION:{ label: 'Validation',     cls: 'pending'   },
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
        <span className={styles.loadingText} style={{ color: '#f87171' }}>
          Erreur : {error?.message}
        </span>
      </div>
    )
  }

  const { stats, alerts, charts, recentMissions } = data

  const hasAlerts = Object.values(alerts).some(v => v > 0)

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
          <button className={styles.exportBtn}>
            <ArrowUpRight size={14} strokeWidth={2} />
            Exporter
          </button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {hasAlerts && (
        <div className={styles.alerts}>
          {alerts.kycPending > 0 && (
            <div className={`${styles.alert} ${styles.alertWarning}`}>
              <span className={styles.alertIcon}><AlertTriangle size={13} /></span>
              <span className={styles.alertCount}>{alerts.kycPending}</span>
              <span className={styles.alertLabel}>KYC en attente</span>
              <button className={styles.alertAction}>Traiter →</button>
            </div>
          )}
          {alerts.openIncidents > 0 && (
            <div className={`${styles.alert} ${styles.alertDanger}`}>
              <span className={styles.alertIcon}><ShieldAlert size={13} /></span>
              <span className={styles.alertCount}>{alerts.openIncidents}</span>
              <span className={styles.alertLabel}>Incidents ouverts</span>
              <button className={styles.alertAction}>Voir →</button>
            </div>
          )}
          {alerts.pendingDisputes > 0 && (
            <div className={`${styles.alert} ${styles.alertInfo}`}>
              <span className={styles.alertIcon}><Info size={13} /></span>
              <span className={styles.alertCount}>{alerts.pendingDisputes}</span>
              <span className={styles.alertLabel}>Litiges en arbitrage</span>
              <button className={styles.alertAction}>Gérer →</button>
            </div>
          )}
          {alerts.desintermAlerts > 0 && (
            <div className={`${styles.alert} ${styles.alertDanger}`}>
              <span className={styles.alertIcon}><MessageSquareWarning size={13} /></span>
              <span className={styles.alertCount}>{alerts.desintermAlerts}</span>
              <span className={styles.alertLabel}>Alertes désintermédiation</span>
              <button className={styles.alertAction}>Voir →</button>
            </div>
          )}
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
          variant="gradient"
        />
        <StatCard
          title="Clients"
          value={stats.clients.total}
          icon={Users}
          color="info"
          variant="gradient"
        />
        <StatCard
          title="Missions"
          value={stats.missions.total}
          change={stats.missions.completed}
          changeLabel="terminées ce mois"
          icon={Briefcase}
          color="success"
          variant="gradient"
        />
        <StatCard
          title="Revenus"
          value={stats.revenue.total}
          change={stats.revenue.commissions}
          changeLabel="en commissions"
          icon={CreditCard}
          color="warning"
          variant="gradient"
          format="currency"
        />
        <StatCard
          title="Abonnements"
          value={stats.revenue.subscriptions}
          changeLabel="ce mois"
          icon={CreditCard}
          color="primary"
          variant="gradient"
          format="currency"
        />
        <StatCard
          title="Note moyenne"
          value={stats.rating.average}
          change={stats.rating.count}
          changeLabel="avis ce mois"
          icon={Star}
          color="info"
          variant="gradient"
          format="number"
          decimals={1}
        />
        <StatCard
          title="En attente"
          value={stats.missions.pending}
          changeLabel="missions PENDING"
          icon={Briefcase}
          color="warning"
          variant="gradient"
        />
        <StatCard
          title="En cours"
          value={stats.missions.inProgress}
          changeLabel="missions actives"
          icon={Briefcase}
          color="success"
          variant="gradient"
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
      </div>

      {/* ── Missions récentes ── */}
      {recentMissions.length > 0 && (
        <div className={styles.tableSection}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.chartEyebrow}>Activité</p>
              <h3 className={styles.sectionTitle}>Missions récentes</h3>
            </div>
            <button className={styles.viewAllBtn}>
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
                  const sc = STATUS_CONFIG[m.status] || { label: m.status, cls: 'pending' }
                  return (
                    <tr key={m.id_mission} className={styles.tableRow}>
                      <td>
                        <span className={styles.missionId}>
                          #{m.id_mission.slice(0, 8)}
                        </span>
                      </td>
                      <td className={styles.cellPrimary}>{m.clientName || '—'}</td>
                      <td className={styles.cellSecondary}>{m.artisanName || 'Non assigné'}</td>
                      <td>
                        <span className={styles.typeBadge}>
                          {m.mission_world === 'CONSTRUCTION' ? '🏗' : '🔧'} {m.mission_type}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status_${sc.cls}`]}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className={styles.cellAmount}>
                        {fmt(m.final_price || m.estimated_price || 0)}
                      </td>
                      <td className={styles.cellSecondary}>
                        {new Date(m.created_at).toLocaleDateString('fr-FR')}
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