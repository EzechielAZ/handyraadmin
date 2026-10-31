import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button, Badge } from '../../components/ui'
import { useHPODashboardCounts } from '../../hooks/useHPO'
import {
  HardHat,
  Users,
  FileText,
  AlertTriangle,
  BarChart3,
  Shield,
} from 'lucide-react'
import styles from './HPO.module.css'

const HPO = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { counts } = useHPODashboardCounts()

  const tabs = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: BarChart3,
      path: '/hpo',
      exact: true,
    },
    {
      id: 'supervisors',
      label: 'Superviseurs',
      icon: HardHat,
      path: '/hpo/supervisors',
    },
    {
      id: 'agents',
      label: 'Agents HPO',
      icon: Users,
      path: '/hpo/agents',
    },
    {
      id: 'contracts',
      label: 'Contrats',
      icon: FileText,
      path: '/hpo/contracts',
    },
    {
      id: 'arbitrations',
      label: 'Arbitrages',
      icon: Shield,
      path: '/hpo/arbitrations',
      badge: counts?.arbitrations_open || 0,
    },
    {
      id: 'alerts',
      label: 'Alertes',
      icon: AlertTriangle,
      path: '/hpo/alerts',
      badge: counts?.alerts_unresolved || 0,
    },
  ]

  const isActive = (tab) => {
    if (tab.exact) {
      return location.pathname === tab.path
    }
    return location.pathname.startsWith(tab.path)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>HPO</h1>
          <p className={styles.subtitle}>
            Handyra Project Oversight — Supervision de chantiers
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={HardHat}
          onClick={() => navigate('/hpo/contracts/new')}
        >
          Nouveau contrat
        </Button>
      </div>

      <div className={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${isActive(tab) ? styles.active : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
            {tab.badge > 0 && (
              <Badge variant="danger" size="sm" className={styles.tabBadge}>
                {tab.badge}
              </Badge>
            )}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  )
}

export default HPO