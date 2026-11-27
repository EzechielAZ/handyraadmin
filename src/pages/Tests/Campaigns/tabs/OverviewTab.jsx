import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button, Spinner } from '../../../../components/ui'
import { DocsErrorState } from '../../../../components/docs'
import { ProgressBar } from '../../../../components/tests'
import { useTestCampaignOverview, VERDICT } from '../../../../hooks/tests'
import styles from '../../Tests.module.css'
import local from '../Campaigns.module.css'

const fmtVal = (c) => {
  const unit = c.unit || ''
  if (c.key === 'p0') return `${c.actual} / ${c.target}`
  const cmp = c.comparator === 'max' ? '≤' : '≥'
  return `${c.actual}${unit} ${cmp} ${c.target}${unit}`
}

export const OverviewTab = ({ campaignId, campaign, onNavigateTab }) => {
  const { overview, readiness, isLoading, isFetching, isError, error, refetch } = useTestCampaignOverview(campaignId, {
    refetchInterval: campaign?.status === 'ACTIVE' ? 60_000 : false,
  })

  if (isLoading) return <Spinner />
  if (isError) return <DocsErrorState error={error} onRetry={refetch} title="Impossible de charger la vue d'ensemble" />

  const m = readiness.metrics
  const att = overview.attention
  const closed = campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED'
  const go = readiness.verdict === 'GO'
  const tl = overview.timeline || []
  const tlMax = Math.max(1, ...tl.map((d) => d.runs + d.findings))

  const attention = [
    { n: att.untriaged, label: 'retours à trier', tab: 'findings' },
    { n: att.needInfo, label: 'retours en attente de précisions', tab: 'findings' },
    { n: att.pendingRetest.length, label: 'corrections à re-tester', tab: 'findings' },
    { n: att.testersNotJoined, label: 'testeurs invités n\'ayant pas rejoint', tab: 'testers' },
    { n: att.runsNotStarted, label: 'exécutions pas encore démarrées', tab: 'runs' },
  ].filter((a) => a.n > 0)

  return (
    <div className={styles.stack} style={{ gap: 16 }}>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Décision go / no-go {closed && '(état actuel)'}</h2>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={refetch} isLoading={isFetching} aria-label="Rafraîchir" />
        </div>
        <div className={local.verdict}>
          <div className={`${local.verdictBadge} ${go ? local.go : local.nogo}`} role="status">
            {go ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
            <span className={local.verdictWord}>{VERDICT[readiness.verdict].label}</span>
            <span className={local.verdictSub}>
              {go ? 'Tous les critères sont remplis' : `${readiness.checks.filter((c) => !c.ok).length} critère(s) non rempli(s)`}
            </span>
          </div>
          <div>
            <div className={local.checks}>
              {readiness.checks.map((c) => (
                <div key={c.key} className={local.check}>
                  {c.ok ? <CheckCircle2 size={16} className={local.checkOk} /> : <XCircle size={16} className={local.checkKo} />}
                  <span className={local.checkLabel}>{c.label}<span className={local.checkDetail}>{c.detail}</span></span>
                  <span className={local.checkVal}>{fmtVal(c)}</span>
                </div>
              ))}
            </div>
            {readiness.warnings?.map((w) => (
              <div key={w} className={`${styles.banner} ${styles.bannerWarn}`} style={{ margin: '12px 0 0' }}>
                <AlertTriangle size={15} /> {w}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={local.kpis}>
        <div className={local.kpi}><div className={local.kpiVal}>{m.coverage}%</div><div className={local.kpiLabel}>Couverture</div></div>
        <div className={local.kpi}><div className={local.kpiVal}>{m.passRate}%</div><div className={local.kpiLabel}>Réussite</div></div>
        <div className={local.kpi}><div className={local.kpiVal}>{m.runsDone}<span style={{ fontSize: 14, color: 'var(--text-3)' }}> / {m.runsTotal}</span></div><div className={local.kpiLabel}>Exécutions</div></div>
        <div className={local.kpi}><div className={local.kpiVal}>{m.openBlocker + m.openCritical}</div><div className={local.kpiLabel}>Bloquants + critiques ouverts</div></div>
        <div className={local.kpi}><div className={local.kpiVal}>{m.untriaged}</div><div className={local.kpiLabel}>Retours à trier</div></div>
      </div>

      <div className={local.twoCol}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>À traiter maintenant</h2>
          {attention.length === 0 ? <p className={styles.muted}>Rien en attente. 👌</p> : (
            <div className={local.attn}>
              {attention.map((a) => (
                <button key={a.label} type="button" className={local.attnItem} onClick={() => onNavigateTab(a.tab)}>
                  <span>{a.label}</span><span className={local.attnCount}>{a.n}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>Activité — 30 jours</h2>
          <div className={local.timeline} role="img" aria-label="Exécutions terminées et retours par jour sur 30 jours">
            {tl.map((d) => (
              <div key={d.day} className={local.tlCol} title={`${d.day} : ${d.runs} exécution(s), ${d.findings} retour(s)`}>
                <div className={local.tlFind} style={{ height: `${(d.findings / tlMax) * 100}%` }} />
                <div className={local.tlRuns} style={{ height: `${(d.runs / tlMax) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className={local.legend}>
            <span><i className={local.dot} style={{ background: 'var(--accent)' }} />Exécutions terminées</span>
            <span><i className={local.dot} style={{ background: '#ea580c' }} />Retours</span>
          </div>
        </div>
      </div>

      <div className={local.twoCol}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>Avancement par module</h2>
          {overview.byModule.length === 0 ? <p className={styles.muted}>Aucun scénario.</p> : (
            <div className={local.bars}>
              {overview.byModule.map((b) => (
                <div key={b.module} className={local.barRow}>
                  <span>{b.module}</span>
                  <ProgressBar total={b.scenarios} segments={[
                    { value: b.passed, color: 'green', label: 'validés' },
                    { value: Math.max(0, b.executed - b.passed), color: 'red', label: 'en échec' },
                  ]} />
                  <span>{b.executed}/{b.scenarios}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>Meilleurs contributeurs</h2>
          {overview.topTesters.length === 0 ? <p className={styles.muted}>Aucun testeur.</p> : (
            <div className={local.bars}>
              {overview.topTesters.slice(0, 6).map((t) => (
                <div key={t.id_tester} className={local.barRow} style={{ gridTemplateColumns: '1fr 120px 70px' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.fullName || t.email}</span>
                  <ProgressBar total={t.runsTotal} segments={[{ value: t.runsDone, color: 'green' }]} />
                  <span>{t.runsDone}/{t.runsTotal} · {t.findings}🐞</span>
                </div>
              ))}
            </div>
          )}
          {overview.byPlatform.length > 0 && (
            <p className={styles.hint} style={{ marginTop: 14 }}>
              {overview.byPlatform.map((p) => `${p.platform} : ${p.testers} testeur(s), ${p.runsFailed} échec(s)`).join(' · ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default OverviewTab
