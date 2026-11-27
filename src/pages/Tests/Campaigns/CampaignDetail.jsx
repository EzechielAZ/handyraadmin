import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Copy, Send, LayoutDashboard, ListChecks, Users, Grid3x3, Bug, Lock } from 'lucide-react'
import { Button, Spinner, Tabs, ActionsMenu } from '../../../components/ui'
import { StatusBadge, DocsErrorState, ConfirmDialog } from '../../../components/docs'
import {
  useTestCampaign, useTestCampaignMutations, useTestCampaignOverview, useTestsAccess,
  CAMPAIGN_STATUS, CAMPAIGN_TRANSITIONS, CAMPAIGN_ACTION_LABEL, isCampaignClosed, PLATFORM, VERDICT,
} from '../../../hooks/tests'
import { formatDateShort } from '../../../utils/docsFormatters'
import { CampaignDrawer } from './CampaignDrawer'
import { OverviewTab } from './tabs/OverviewTab'
import { ScenariosTab } from './tabs/ScenariosTab'
import { TestersTab } from './tabs/TestersTab'
import { RunsTab } from './tabs/RunsTab'
import { FindingsTab } from './tabs/FindingsTab'
import styles from '../Tests.module.css'
import local from './Campaigns.module.css'

const TAB_IDS = ['overview', 'scenarios', 'testers', 'runs', 'findings']
const VARIANT = { ACTIVE: 'primary', PAUSED: 'outline', COMPLETED: 'primary', CANCELLED: 'outline', DRAFT: 'outline' }

export const CampaignDetailPage = () => {
  const { ref } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = TAB_IDS.includes(params.get('tab')) ? params.get('tab') : 'overview'
  const { canWrite } = useTestsAccess()
  const { campaign, release, counts, scenarios, isLoading, isError, error, refetch } = useTestCampaign(ref)
  const { readiness } = useTestCampaignOverview(campaign?.id_campaign, { enabled: !!campaign })
  const mutations = useTestCampaignMutations()

  const [editOpen, setEditOpen] = useState(false)
  const [pending, setPending] = useState(null) // statut cible en attente de confirmation
  const [reason, setReason] = useState('')

  const setTab = (id) => setParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', id); return n }, { replace: true })

  if (isLoading) return <div className={styles.page}><Spinner /></div>
  if (isError || !campaign) {
    return <div className={styles.page}><DocsErrorState error={error} onRetry={refetch} title="Campagne introuvable" /></div>
  }

  const closed = isCampaignClosed(campaign.status)
  const readOnly = !canWrite || closed
  const actionLabel = (t) => (t === 'ACTIVE' && campaign.status === 'PAUSED' ? 'Reprendre' : t === 'ACTIVE' && campaign.status === 'COMPLETED' ? 'Rouvrir' : CAMPAIGN_ACTION_LABEL[t])
  const transitions = canWrite ? (CAMPAIGN_TRANSITIONS[campaign.status] || []) : []
  const primaryTargets = transitions.filter((t) => t !== 'CANCELLED')
  const verdict = readiness?.verdict

  const confirmTransition = async () => {
    try {
      await mutations.transition.mutateAsync({ id: campaign.id_campaign, newStatus: pending, reason: reason.trim() || null })
      setPending(null); setReason('')
    } catch { /* toast */ }
  }

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'scenarios', label: 'Scénarios', icon: ListChecks, count: counts?.scenarios },
    { id: 'testers', label: 'Testeurs', icon: Users, count: counts?.testers },
    { id: 'runs', label: 'Exécutions', icon: Grid3x3, count: counts?.runs },
    { id: 'findings', label: 'Retours', icon: Bug, count: counts?.findings },
  ]

  const menu = canWrite ? [
    { label: 'Modifier', icon: Pencil, onClick: () => setEditOpen(true) },
    { label: 'Dupliquer', icon: Copy, onClick: () => mutations.duplicate.mutate(campaign.id_campaign) },
    ...(campaign.status === 'ACTIVE' ? [{ label: 'Distribuer les scénarios manquants', icon: Send,
      onClick: () => mutations.generateRuns.mutate(campaign.id_campaign) }] : []),
    ...(transitions.includes('CANCELLED') ? [{ label: CAMPAIGN_ACTION_LABEL.CANCELLED, icon: Lock, onClick: () => setPending('CANCELLED') }] : []),
  ] : []

  return (
    <div className={styles.page}>
      <Link to="/tests" className={styles.muted} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
        <ArrowLeft size={13} /> Campagnes
      </Link>

      <div className={local.head}>
        <div className={local.headMain}>
          <div className={styles.badges}>
            <span className={styles.codeCell}>{campaign.code}</span>
            <StatusBadge map={CAMPAIGN_STATUS} value={campaign.status} />
            {verdict && !closed && <StatusBadge map={VERDICT} value={verdict} />}
          </div>
          <h1 className={local.title}>{campaign.name}</h1>
          <div className={local.meta}>
            {release && <span>Release v{release.version}</span>}
            {campaign.app_build && <span>Build {campaign.app_build}</span>}
            {campaign.platforms?.length > 0 && <span>{campaign.platforms.map((p) => PLATFORM[p]?.label || p).join(' + ')}</span>}
            {campaign.starts_at && <span>Du {formatDateShort(campaign.starts_at)}{campaign.ends_at ? ` au ${formatDateShort(campaign.ends_at)}` : ''}</span>}
          </div>
        </div>
        <div className={local.headActions}>
          {primaryTargets.map((t) => (
            <Button key={t} variant={VARIANT[t]} onClick={() => setPending(t)}>{actionLabel(t)}</Button>
          ))}
          {menu.length > 0 && <ActionsMenu items={menu} />}
        </div>
      </div>

      {closed && (
        <div className={`${styles.banner} ${styles.bannerInfo}`} role="status">
          <Lock size={16} />
          <span>
            Campagne {campaign.status === 'COMPLETED' ? 'terminée' : 'annulée'} : consultation seule.
            {campaign.closing_report?.verdict && <> Verdict à la clôture : <strong>{VERDICT[campaign.closing_report.verdict]?.label}</strong>.</>}
            {campaign.closing_report?.reason && <> Motif : {campaign.closing_report.reason}.</>}
            {canWrite && CAMPAIGN_TRANSITIONS[campaign.status]?.includes('ACTIVE') && ' Vous pouvez la rouvrir depuis les actions.'}
          </span>
        </div>
      )}

      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} className={local.tabs} />

      {tab === 'overview' && <OverviewTab campaignId={campaign.id_campaign} campaign={campaign} onNavigateTab={setTab} />}
      {tab === 'scenarios' && <ScenariosTab campaign={campaign} scenarios={scenarios} readOnly={readOnly} />}
      {tab === 'testers' && <TestersTab campaign={campaign} readOnly={readOnly} />}
      {tab === 'runs' && <RunsTab campaign={campaign} readOnly={readOnly} />}
      {tab === 'findings' && <FindingsTab campaign={campaign} readOnly={readOnly} />}

      <CampaignDrawer isOpen={editOpen} onClose={() => setEditOpen(false)} campaign={campaign} mutations={mutations} />

      <ConfirmDialog
        isOpen={!!pending} onClose={() => { setPending(null); setReason('') }} onConfirm={confirmTransition}
        loading={mutations.transition.isPending}
        variant={pending === 'CANCELLED' ? 'danger' : 'default'}
        title={pending ? `${actionLabel(pending)} la campagne ?` : ''}
        confirmLabel={pending ? actionLabel(pending) : 'Confirmer'}
        description={
          <div className={styles.stack} style={{ gap: 12 }}>
            {pending === 'ACTIVE' && campaign.status === 'DRAFT' && <span>Les exécutions seront distribuées aux testeurs selon leur profil.</span>}
            {pending === 'COMPLETED' && readiness && (
              <span>Verdict actuel : <strong>{VERDICT[readiness.verdict]?.label}</strong>
                {readiness.warnings?.length ? ` — ${readiness.warnings.join(' ; ')}` : ''}. Il sera figé dans le rapport de clôture.</span>
            )}
            {pending === 'CANCELLED' && <span>La campagne sera fermée sans verdict. Vous pourrez la remettre en brouillon.</span>}
            {['COMPLETED', 'CANCELLED', 'PAUSED'].includes(pending) && (
              <label className={styles.field}>
                <span className={styles.label}>Commentaire <span className={styles.optional}>optionnel</span></span>
                <textarea className={styles.textarea} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
            )}
          </div>
        }
      />
    </div>
  )
}

export default CampaignDetailPage
