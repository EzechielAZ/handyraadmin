import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Sparkles, Pencil, Copy, Archive, ArchiveRestore, Clock } from 'lucide-react'
import { Button, Spinner, ActionsMenu } from '../../../components/ui'
import { StatusBadge, DocsErrorState, ConfirmDialog } from '../../../components/docs'
import Markdown from '../../../components/docs/Markdown/Markdown'
import { ProgressBar } from '../../../components/tests'
import {
  useTestScenario, useTestScenarioMutations, useTestsAccess,
  SCENARIO_STATUS, SCENARIO_PROFILE, SCENARIO_PRIORITY, SCENARIO_TYPE, CAMPAIGN_STATUS,
} from '../../../hooks/tests'
import { formatDateTime } from '../../../utils/docsFormatters'
import { ScenarioDrawer } from './ScenarioDrawer'
import { ScenarioAssistantModal } from './ScenarioAssistantModal'
import styles from '../Tests.module.css'

export const ScenarioDetailPage = () => {
  const { ref } = useParams()
  const navigate = useNavigate()
  const { canWrite } = useTestsAccess()
  const [aiOpen, setAiOpen] = useState(false)
  const { scenario, steps, feature, campaigns, runStats, isLoading, isError, error, refetch } = useTestScenario(ref)
  const mutations = useTestScenarioMutations()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  if (isLoading) return <div className={styles.page}><Spinner /></div>
  if (isError || !scenario) {
    return (
      <div className={styles.page}>
        <DocsErrorState error={error} onRetry={refetch} title="Scénario introuvable" />
      </div>
    )
  }

  const archived = scenario.status === 'ARCHIVED'
  const doArchive = async () => {
    try {
      await mutations.update.mutateAsync({ id: scenario.id_scenario, payload: { status: archived ? 'DRAFT' : 'ARCHIVED' } })
      setConfirmArchive(false)
    } catch { /* toast */ }
  }
  const duplicate = async () => {
    try { const d = await mutations.duplicate.mutateAsync(scenario.id_scenario); navigate(`/tests/scenarios/${d.scenario.code}`) } catch { /* toast */ }
  }

  return (
    <div className={styles.page}>
      <Link to="/tests/scenarios" className={styles.muted} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
        <ArrowLeft size={13} /> Scénarios
      </Link>

      <div className={styles.cardHead} style={{ alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' }}>
        <div className={styles.stack} style={{ gap: 10, flex: '1 1 340px', minWidth: 0 }}>
          <div className={styles.badges}>
            <span className={styles.codeCell}>{scenario.code}</span>
            <span className={styles.codeCell}>r{scenario.revision}</span>
            <StatusBadge map={SCENARIO_STATUS} value={scenario.status} />
            <StatusBadge map={SCENARIO_PRIORITY} value={scenario.priority} showIcon={false} label={scenario.priority} />
            <StatusBadge map={SCENARIO_PROFILE} value={scenario.profile} />
            <StatusBadge map={SCENARIO_TYPE} value={scenario.scenario_type} />
          </div>
          <h1 style={{ margin: 0, fontSize: 'var(--fs-2xl)', letterSpacing: 'var(--ls-tight)' }}>{scenario.title}</h1>
          {scenario.summary && <p style={{ margin: 0, color: 'var(--text-2)', maxWidth: 720 }}>{scenario.summary}</p>}
        </div>
        {canWrite && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap', flex: 'none', whiteSpace: 'nowrap' }}>
            <Button variant="outline" icon={Sparkles} onClick={() => setAiOpen(true)}>Modifier avec l'IA</Button>
            <Button variant="primary" icon={Pencil} onClick={() => setEditOpen(true)}>Modifier</Button>
            <ActionsMenu items={[
              { label: 'Dupliquer', icon: Copy, onClick: duplicate },
              { label: archived ? 'Restaurer' : 'Archiver', icon: archived ? ArchiveRestore : Archive, onClick: () => setConfirmArchive(true) },
            ]} />
          </div>
        )}
      </div>

      <div className={styles.layout}>
        <div className={styles.stack}>
          {(scenario.preconditions_md || scenario.test_data_md) && (
            <div className={styles.card}>
              {scenario.preconditions_md && (<>
                <h2 className={styles.cardTitle} style={{ marginBottom: 8 }}>Préconditions</h2>
                <Markdown>{scenario.preconditions_md}</Markdown>
              </>)}
              {scenario.test_data_md && (<>
                <h2 className={styles.cardTitle} style={{ margin: '16px 0 8px' }}>Données de test</h2>
                <Markdown>{scenario.test_data_md}</Markdown>
              </>)}
            </div>
          )}

          <div className={styles.card}>
            <div className={styles.cardHead}><h2 className={styles.cardTitle}>Étapes ({steps.length})</h2></div>
            {steps.length === 0 ? <p className={styles.muted}>Aucune étape définie.</p> : (
              <ol className={styles.steps}>
                {steps.map((s) => (
                  <li key={s.id_step} className={styles.step}>
                    <div>
                      <div className={styles.stepLabel}>Action</div>
                      <div className={styles.stepBody}><Markdown compact>{s.action_md}</Markdown></div>
                      <div className={styles.stepLabel}>Résultat attendu</div>
                      <div className={styles.stepBody}><Markdown compact>{s.expected_md}</Markdown></div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <aside className={styles.stack}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>Informations</h2>
            <dl className={styles.kv}>
              <dt>Module</dt><dd>{scenario.module || '—'}</dd>
              <dt>Feature</dt><dd>{feature ? `${feature.code} · ${feature.name}` : '—'}</dd>
              <dt>Durée</dt><dd>{scenario.estimated_minutes ? <><Clock size={11} /> ~{scenario.estimated_minutes} min</> : '—'}</dd>
              <dt>Créé</dt><dd>{formatDateTime(scenario.created_at)}</dd>
              <dt>Modifié</dt><dd>{formatDateTime(scenario.updated_at)}</dd>
            </dl>
            {scenario.tags?.length > 0 && (
              <div className={styles.tagList} style={{ marginTop: 12 }}>
                {scenario.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>Résultats cumulés</h2>
            {runStats.total === 0 ? <p className={styles.muted}>Jamais exécuté.</p> : (<>
              <ProgressBar segments={[
                { value: runStats.passed, color: 'green', label: 'réussis' },
                { value: runStats.failed, color: 'red', label: 'échecs' },
                { value: runStats.blocked, color: 'orange', label: 'bloqués' },
                { value: runStats.total - runStats.passed - runStats.failed - runStats.blocked, color: 'gray', label: 'autres' },
              ]} />
              <p className={styles.hint} style={{ marginTop: 8 }}>
                {runStats.passed} réussi(s) · {runStats.failed} échec(s) · {runStats.blocked} bloqué(s) sur {runStats.total}
              </p>
            </>)}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>Campagnes ({campaigns.length})</h2>
            {campaigns.length === 0 ? <p className={styles.muted}>Utilisé dans aucune campagne.</p> : (
              <div className={styles.stack} style={{ gap: 8 }}>
                {campaigns.map((c) => (
                  <Link key={c.id_campaign} to={`/tests/campaigns/${c.code}`} className={styles.titleCell}>
                    <span className={styles.titlePrimary}>{c.name}</span>
                    <span className={styles.titleMeta}>
                      {c.code} · <StatusBadge map={CAMPAIGN_STATUS} value={c.status} showIcon={false} />{c.isRequired ? ' · requis' : ''}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      <ScenarioAssistantModal isOpen={aiOpen} onClose={() => setAiOpen(false)} mutations={mutations} initialText={`${scenario?.code} : `} />
      <ScenarioDrawer isOpen={editOpen} onClose={() => setEditOpen(false)} scenario={scenario} steps={steps} mutations={mutations} />
      <ConfirmDialog
        isOpen={confirmArchive} onClose={() => setConfirmArchive(false)} onConfirm={doArchive}
        loading={mutations.update.isPending} variant={archived ? 'default' : 'warning'}
        title={archived ? 'Restaurer ce scénario ?' : 'Archiver ce scénario ?'}
        description={archived ? 'Il repasse en brouillon.' : 'Il ne pourra plus être ajouté à une campagne. Refusé s\'il est utilisé par une campagne en cours.'}
        confirmLabel={archived ? 'Restaurer' : 'Archiver'}
      />
    </div>
  )
}

export default ScenarioDetailPage
