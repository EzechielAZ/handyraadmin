import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw, Bug } from 'lucide-react'
import { Button, Select, Spinner } from '../../../components/ui'
import { DocsDrawer, StatusBadge } from '../../../components/docs'
import Markdown from '../../../components/docs/Markdown/Markdown'
import {
  useTestRun, useTestRunMutations, RUN_STATUS, RUN_STEP_STATUS, FINDING_SEVERITY, FINDING_STATUS, toSelectOptions,
} from '../../../hooks/tests'
import { formatDateTime } from '../../../utils/docsFormatters'
import styles from '../Tests.module.css'
import local from './Runs.module.css'

const STEP_CHOICES = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED']
const derive = (steps) => {
  const v = steps.map((s) => s.status)
  if (v.includes('FAILED')) return 'FAILED'
  if (v.includes('BLOCKED')) return 'BLOCKED'
  if (v.length && v.every((x) => x === 'PASSED' || x === 'SKIPPED') && v.includes('PASSED')) return 'PASSED'
  if (v.length && v.every((x) => x === 'SKIPPED')) return 'SKIPPED'
  return v.some((x) => x !== 'PENDING') ? 'IN_PROGRESS' : 'ASSIGNED'
}

export const RunDrawer = ({ runId, onClose, readOnly, onReport }) => {
  const { run, scenario, tester, campaign, steps, findings, attempts, isLoading } = useTestRun(runId)
  const { record, requestRetest } = useTestRunMutations()
  const [local_, setLocal] = useState({})   // position -> {status, comment}
  const [status, setStatus] = useState('')
  const [note, setNote] = useState('')
  const [manual, setManual] = useState(false)

  useEffect(() => {
    if (!run) return
    /* eslint-disable react-hooks/set-state-in-effect -- initialisation depuis les données serveur */
    setLocal(Object.fromEntries(steps.map((s) => [s.position, { status: s.status, comment: s.comment || '' }])))
    setStatus(run.status); setNote(run.result_note || ''); setManual(false)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [run, steps])

  const merged = useMemo(() => steps.map((s) => ({ ...s, ...(local_[s.position] || {}) })), [steps, local_])
  const editable = !readOnly && campaign && !['COMPLETED', 'CANCELLED'].includes(campaign.status)

  const setStep = (pos, patch) => {
    const next = { ...local_, [pos]: { ...local_[pos], ...patch } }
    setLocal(next)
    if (!manual) setStatus(derive(steps.map((x) => ({ status: next[x.position]?.status }))))
  }

  const save = async () => {
    try {
      await record.mutateAsync({
        id: runId, status, note,
        steps: merged.map((s) => ({ position: s.position, status: s.status, comment: s.comment })),
      })
    } catch { /* toast serveur (ex. PASSED refusé) */ }
  }

  return (
    <DocsDrawer isOpen={!!runId} onClose={onClose} width="xl" eyebrow="Exécution"
      title={scenario ? scenario.title : 'Chargement…'}
      keyBadge={scenario ? { label: `${scenario.code} · tentative ${run?.attempt || 1}` } : undefined}
      saveLabel={editable ? 'Enregistrer le résultat' : 'Fermer'} saving={record.isPending}
      onSave={editable ? save : onClose}
      footerExtra={editable && run && ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'].includes(run.status) ? (
        <Button variant="outline" icon={RotateCcw} isLoading={requestRetest.isPending}
          onClick={() => requestRetest.mutate({ id: runId })}>Demander un re-test</Button>) : undefined}>
      {isLoading || !run ? <Spinner /> : (
        <div className={local.sections}>
          <section className={styles.card}>
            <dl className={styles.kv}>
              <dt>Testeur</dt><dd>{tester.fullName || tester.email} {tester.fullName && <span className={styles.muted}>({tester.email})</span>}</dd>
              <dt>Appareil</dt><dd>{[tester.platform, tester.deviceModel, tester.osVersion].filter(Boolean).join(' · ') || '—'}</dd>
              <dt>Révision testée</dt><dd>r{run.scenario_revision}{scenario.revision !== run.scenario_revision && <span className={styles.muted}> (le scénario est maintenant en r{scenario.revision})</span>}</dd>
              <dt>Statut</dt><dd><StatusBadge map={RUN_STATUS} value={run.status} /></dd>
              {run.finished_at && (<><dt>Terminée</dt><dd>{formatDateTime(run.finished_at)}{run.duration_seconds != null ? ` · ${Math.max(1, Math.round(run.duration_seconds / 60))} min` : ''}</dd></>)}
              {attempts.length > 1 && (<><dt>Tentatives</dt><dd>{attempts.map((a) => `#${a.attempt} ${RUN_STATUS[a.status]?.label}`).join(' → ')}</dd></>)}
            </dl>
          </section>

          {(scenario.preconditionsMd || scenario.testDataMd) && (
            <section className={styles.card}>
              {scenario.preconditionsMd && <><h3 className={styles.cardTitle}>Préconditions</h3><Markdown compact>{scenario.preconditionsMd}</Markdown></>}
              {scenario.testDataMd && <><h3 className={styles.cardTitle} style={{ marginTop: 12 }}>Données de test</h3><Markdown compact>{scenario.testDataMd}</Markdown></>}
            </section>
          )}

          <section className={styles.stack} style={{ gap: 10 }}>
            <h3 className={styles.cardTitle}>Étapes ({merged.length})</h3>
            {merged.map((s) => (
              <div key={s.position} className={local.stepCard}>
                <div className={local.stepHead}>
                  <strong style={{ fontSize: 'var(--fs-sm)' }}>Étape {s.position}</strong>
                  {editable ? (
                    <div className={local.stepBtns} role="group" aria-label={`Résultat de l'étape ${s.position}`}>
                      {STEP_CHOICES.map((c) => (
                        <button key={c} type="button" className={`${local.sb} ${local[`s_${c}`]}`} aria-pressed={s.status === c}
                          onClick={() => setStep(s.position, { status: s.status === c ? 'PENDING' : c })}>{RUN_STEP_STATUS[c].label}</button>
                      ))}
                    </div>
                  ) : <StatusBadge map={RUN_STEP_STATUS} value={s.status} />}
                </div>
                <div><div className={styles.stepLabel}>Action</div><div className={styles.stepBody}><Markdown compact>{s.action_md}</Markdown></div></div>
                <div><div className={styles.stepLabel}>Résultat attendu</div><div className={styles.stepBody}><Markdown compact>{s.expected_md}</Markdown></div></div>
                {editable ? (
                  <input className={styles.textarea} style={{ minHeight: 0, height: 34 }} placeholder="Commentaire (optionnel)"
                    aria-label={`Commentaire étape ${s.position}`} value={s.comment || ''} onChange={(e) => setStep(s.position, { comment: e.target.value })} />
                ) : s.comment && <p className={styles.hint}>💬 {s.comment}</p>}
              </div>
            ))}
          </section>

          {editable && (
            <section className={styles.formSection}>
              <h3 className={styles.cardTitle}>Résultat global</h3>
              <Select label="Statut" options={toSelectOptions(RUN_STATUS)} value={status} onChange={(v) => { setStatus(v); setManual(true) }} />
              <div className={styles.field}>
                <label className={styles.label} htmlFor="run-note">Note</label>
                <textarea id="run-note" className={styles.textarea} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </section>
          )}
          {!editable && run.result_note && <section className={styles.card}><h3 className={styles.cardTitle}>Note</h3><p>{run.result_note}</p></section>}

          <section className={styles.stack} style={{ gap: 8 }}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>Retours liés ({findings.length})</h3>
              {editable && <Button variant="outline" size="sm" icon={Bug} onClick={() => onReport?.(run)}>Signaler un retour</Button>}
            </div>
            {findings.map((f) => (
              <Link key={f.id_finding} to={`/tests/findings/${f.code}`} className={styles.card} style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <span className={styles.titleCell}><span className={styles.titlePrimary}>{f.title}</span><span className={styles.titleMeta}>{f.code}</span></span>
                <span className={styles.badges}>
                  {f.severity && <StatusBadge map={FINDING_SEVERITY} value={f.severity} showIcon={false} />}
                  <StatusBadge map={FINDING_STATUS} value={f.status} showIcon={false} />
                </span>
              </Link>
            ))}
          </section>
        </div>
      )}
    </DocsDrawer>
  )
}

export default RunDrawer
