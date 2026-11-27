import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, MessageCircle, RotateCcw, Paperclip, Send } from 'lucide-react'
import { Button, Spinner } from '../../../components/ui'
import { StatusBadge, DocsErrorState } from '../../../components/docs'
import Markdown from '../../../components/docs/Markdown/Markdown'
import {
  useTestFinding, useTestFindingMutations, useTestsAccess, FINDING_TYPE, FINDING_SEVERITY, FINDING_STATUS, RUN_STATUS, isCampaignClosed,
} from '../../../hooks/tests'
import { formatDateTime } from '../../../utils/docsFormatters'
import { TriageDialog } from './TriageDialog'
import styles from '../Tests.module.css'
import local from './Findings.module.css'

const Block = ({ title, children }) => children ? (
  <div className={styles.card}><h2 className={styles.cardTitle} style={{ marginBottom: 8 }}>{title}</h2>{children}</div>
) : null

export const FindingDetailPage = () => {
  const { ref } = useParams()
  const { canWrite } = useTestsAccess()
  const { finding, campaign, tester, run, issue, comments, isLoading, isError, error, refetch } = useTestFinding(ref)
  const { triage, comment, requestRetest } = useTestFindingMutations()
  const [decision, setDecision] = useState(null)
  const [reply, setReply] = useState('')

  if (isLoading) return <div className={styles.page}><Spinner /></div>
  if (isError || !finding) return <div className={styles.page}><DocsErrorState error={error} onRetry={refetch} title="Retour introuvable" /></div>

  const writable = canWrite && campaign && !isCampaignClosed(campaign.status)
  const decisions = {
    NEW: ['CONFIRM', 'NEED_INFO', 'REJECT'],
    NEED_INFO: ['CONFIRM', 'REJECT'],
    CONFIRMED: ['REOPEN'],
    REJECTED: ['REOPEN'],
  }[finding.status] || []
  const ICON = { CONFIRM: CheckCircle2, REJECT: XCircle, NEED_INFO: MessageCircle, REOPEN: RotateCcw }
  const fixed = issue && ['FIXED', 'VERIFIED'].includes(issue.status)
  const canRetest = writable && fixed && run && !finding.retest_requested_at
  const env = finding.environment && typeof finding.environment === 'object' ? Object.entries(finding.environment) : []
  const files = Array.isArray(finding.attachments) ? finding.attachments : []

  const submitTriage = async (payload) => {
    await triage.mutateAsync({ id: finding.id_finding, decision, payload })
    setDecision(null)
  }
  const sendReply = async () => {
    if (!reply.trim()) return
    try { await comment.mutateAsync({ id: finding.id_finding, content: reply }); setReply('') } catch { /* toast */ }
  }

  return (
    <div className={styles.page}>
      <Link to="/tests/findings" className={styles.muted} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
        <ArrowLeft size={13} /> Retours
      </Link>
      <div className={styles.stack} style={{ gap: 10, marginBottom: 20 }}>
        <div className={styles.badges}>
          <span className={styles.codeCell}>{finding.code}</span>
          <StatusBadge map={FINDING_STATUS} value={finding.status} />
          <StatusBadge map={FINDING_TYPE} value={finding.finding_type} />
          {finding.severity && <StatusBadge map={FINDING_SEVERITY} value={finding.severity} />}
        </div>
        <h1 style={{ margin: 0, fontSize: 'var(--fs-2xl)', letterSpacing: 'var(--ls-tight)' }}>{finding.title}</h1>
        <span className={styles.muted}>Reçu le {formatDateTime(finding.created_at)}{finding.created_by_admin ? ' · saisi par l\'équipe' : ''}</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.stack}>
          <Block title="Description"><Markdown>{finding.description_md}</Markdown></Block>
          <Block title="Étapes pour reproduire">{finding.reproduction_steps && <Markdown>{finding.reproduction_steps}</Markdown>}</Block>
          {(finding.expected_behavior || finding.actual_behavior) && (
            <div className={styles.card}>
              <dl className={styles.kv}>
                {finding.expected_behavior && <><dt>Attendu</dt><dd>{finding.expected_behavior}</dd></>}
                {finding.actual_behavior && <><dt>Constaté</dt><dd>{finding.actual_behavior}</dd></>}
              </dl>
            </div>
          )}
          {files.length > 0 && (
            <Block title={`Pièces jointes (${files.length})`}>
              <div className={local.attach}>
                {files.map((f, i) => {
                  const label = f.name || (f.path || f.url || `Fichier ${i + 1}`).split('/').pop()
                  const href = f.url && /^https?:\/\//.test(f.url) ? f.url : null
                  return href
                    ? <a key={i} className={local.attachItem} href={href} target="_blank" rel="noopener noreferrer"><Paperclip size={12} />{label}</a>
                    : <span key={i} className={local.attachItem} style={{ color: 'var(--text-2)' }}><Paperclip size={12} />{label}</span>
                })}
              </div>
            </Block>
          )}

          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>Discussion ({comments.length})</h2>
            <div className={local.thread}>
              {comments.length === 0 && <p className={styles.muted}>Aucun échange.</p>}
              {comments.map((c) => (
                <div key={c.id_comment} className={`${local.msg} ${c.authorKind === 'ADMIN' ? local.msgAdmin : ''}`}>
                  <div className={local.msgHead}><span>{c.authorKind === 'ADMIN' ? (c.authorName || 'Équipe') : 'Testeur'}</span><span>{formatDateTime(c.created_at)}</span></div>
                  <div className={local.msgBody}>{c.content_md}</div>
                </div>
              ))}
            </div>
            {writable && (
              <div className={styles.field} style={{ marginTop: 12 }}>
                <label className={styles.label} htmlFor="reply">Répondre</label>
                <textarea id="reply" className={styles.textarea} rows={3} value={reply} maxLength={5000} onChange={(e) => setReply(e.target.value)} />
                <div><Button variant="primary" size="sm" icon={Send} onClick={sendReply} isLoading={comment.isPending} disabled={!reply.trim()}>Envoyer</Button></div>
              </div>
            )}
          </div>
        </div>

        <aside className={styles.stack}>
          {writable && decisions.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>Triage</h2>
              <div className={local.decisions}>
                {decisions.map((d) => {
                  const I = ICON[d]
                  return (
                    <Button key={d} variant={d === 'CONFIRM' ? 'primary' : 'outline'} icon={I}
                      onClick={() => (d === 'REOPEN' ? triage.mutate({ id: finding.id_finding, decision: d }) : setDecision(d))}>
                      {{ CONFIRM: 'Confirmer', NEED_INFO: 'Demander des précisions', REJECT: 'Rejeter', REOPEN: 'Remettre à trier' }[d]}
                    </Button>
                  )
                })}
              </div>
              {finding.triage_note && <p className={styles.hint} style={{ marginTop: 10 }}>Note : {finding.triage_note}</p>}
            </div>
          )}

          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>Contexte</h2>
            <dl className={styles.kv}>
              <dt>Campagne</dt><dd>{campaign && <Link to={`/tests/campaigns/${campaign.code}`}>{campaign.code}</Link>}</dd>
              <dt>Testeur</dt><dd>{tester ? (tester.fullName || tester.email) : '—'}</dd>
              {tester && <><dt>Appareil</dt><dd>{[tester.platform, tester.deviceModel, tester.osVersion].filter(Boolean).join(' · ') || '—'}</dd></>}
              {run && <><dt>Scénario</dt><dd><Link to={`/tests/scenarios/${run.scenarioCode}`}>{run.scenarioCode}</Link> · {RUN_STATUS[run.status]?.label}</dd></>}
              <dt>Issue</dt><dd>{issue ? <><Link to={`/docs/issues/${issue.code}`}>{issue.code}</Link> · {issue.status}</> : '—'}</dd>
            </dl>
            {finding.retest_requested_at && <p className={styles.hint} style={{ marginTop: 10 }}>Re-test demandé le {formatDateTime(finding.retest_requested_at)}.</p>}
            {canRetest && (
              <Button variant="outline" icon={RotateCcw} style={{ marginTop: 12 }} isLoading={requestRetest.isPending}
                onClick={() => requestRetest.mutate({ id: finding.id_finding })}>Demander un re-test</Button>
            )}
          </div>

          {env.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>Environnement</h2>
              <dl className={styles.kv}>{env.map(([k, v]) => <><dt key={`k${k}`}>{k}</dt><dd key={`v${k}`}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></>)}</dl>
            </div>
          )}
        </aside>
      </div>

      <TriageDialog isOpen={!!decision} onClose={() => setDecision(null)} decision={decision} finding={finding}
        onSubmit={submitTriage} loading={triage.isPending} />
    </div>
  )
}

export default FindingDetailPage
