import { RefreshCw } from 'lucide-react'
import { Button, StatCard } from '../../../components/ui'
import { DocsHeader } from '../../../components/docs'
import { useTestFindings, useTestCampaigns } from '../../../hooks/tests'
import { FindingsList } from './FindingsList'
import styles from '../Tests.module.css'

export const FindingsPage = () => {
  const { stats, isLoading, isFetching, refetch } = useTestFindings({ pageSize: 1 })
  const { campaigns } = useTestCampaigns({ pageSize: 100 })
  const bs = stats.byStatus || {}
  const bad = (stats.bySeverity?.BLOCKER || 0) + (stats.bySeverity?.CRITICAL || 0)
  return (
    <div className={styles.page}>
      <DocsHeader eyebrow="Tests de validation" title="Retours"
        description="Tout ce que vos testeurs signalent, à trier, confirmer ou rejeter. Un retour confirmé devient une issue."
        actions={<Button variant="outline" icon={RefreshCw} onClick={refetch} isLoading={isFetching} aria-label="Rafraîchir" />} />
      <div className={styles.statsGrid}>
        <StatCard title="À trier" value={bs.NEW || 0} icon={RefreshCw} color={bs.NEW ? 'primary' : undefined} loading={isLoading} />
        <StatCard title="Bloquants + critiques" value={bad} icon={RefreshCw} color={bad ? 'danger' : 'primary'} loading={isLoading} />
        <StatCard title="Confirmés" value={bs.CONFIRMED || 0} icon={RefreshCw} loading={isLoading} />
        <StatCard title="Rejetés" value={bs.REJECTED || 0} icon={RefreshCw} loading={isLoading} />
      </div>
      <FindingsList campaigns={campaigns} />
    </div>
  )
}

export default FindingsPage
