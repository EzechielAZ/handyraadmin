import { useState, useMemo } from 'react'
import { Table } from '../../../../components/ui'
import { StatusBadge, DocsEmptyState, DocsErrorState } from '../../../../components/docs'
import { Spinner } from '../../../../components/ui'
import { useTestRunMatrix, useTestRuns, RUN_STATUS, SCENARIO_PRIORITY, toSelectOptions } from '../../../../hooks/tests'
import { RunStatusPill } from '../../Runs/RunStatusPill'
import { RunDrawer } from '../../Runs/RunDrawer'
import { FindingDrawer } from '../../Findings/FindingDrawer'
import styles from '../../Tests.module.css'
import rs from '../../Runs/Runs.module.css'

const initials = (t) => (t.fullName || t.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('')

const Matrix = ({ campaignId, onOpen }) => {
  const { scenarios, testers, cells, isLoading, isError, error, refetch } = useTestRunMatrix(campaignId)
  const map = useMemo(() => new Map(cells.map((c) => [`${c.scenarioId}|${c.testerId}`, c])), [cells])
  if (isLoading) return <Spinner />
  if (isError) return <DocsErrorState error={error} onRetry={refetch} title="Impossible de charger la matrice" />
  if (!scenarios.length || !testers.length) {
    return <DocsEmptyState icon="Grid3x3" title="La matrice apparaîtra ici"
      description={!scenarios.length ? 'Ajoutez des scénarios à la campagne.' : 'Invitez au moins un testeur.'} />
  }
  return (
    <>
      <div className={rs.matrixWrap}>
        <table className={rs.matrix}>
          <thead>
            <tr>
              <th className={rs.corner} scope="col">Scénario</th>
              {testers.map((t) => <th key={t.id_tester} scope="col" title={t.email}>{initials(t)}<br /><span style={{ fontWeight: 400, color: 'var(--text-3)' }}>{t.platform || ''}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.id_scenario}>
                <th scope="row">
                  <div className={rs.rowTitle}>
                    <b title={s.title}>{s.title}</b>
                    <span>{s.code} · {s.priority}{s.isRequired ? ' · requis' : ''}</span>
                  </div>
                </th>
                {testers.map((t) => {
                  const c = map.get(`${s.id_scenario}|${t.id_tester}`)
                  return (
                    <td key={t.id_tester}>
                      {c ? (
                        <button type="button" className={rs.cell} onClick={() => onOpen(c.runId)}
                          aria-label={`${s.title} × ${t.fullName || t.email} : ${RUN_STATUS[c.status]?.label}`}>
                          <RunStatusPill status={c.status} attempt={c.attempt} />
                        </button>
                      ) : <span className={rs.cellNone} aria-label="Non applicable" />}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={rs.legend}>
        {Object.entries(RUN_STATUS).map(([k, v]) => <span key={k} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><RunStatusPill status={k} />{v.label}</span>)}
        <span>Zone hachurée : scénario non applicable au profil du testeur · #n : n-ième tentative</span>
      </div>
    </>
  )
}

const RunList = ({ campaignId, onOpen }) => {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const { runs, total, isLoading, isError, error, refetch } = useTestRuns(campaignId, { status: status || null, page, pageSize: 50 })
  if (isError) return <DocsErrorState error={error} onRetry={refetch} title="Impossible de charger les exécutions" />
  const columns = [
    { id: 'scenario', header: 'Scénario', accessor: 'scenarioTitle', cell: ({ value, row }) => (
      <div className={styles.titleCell}><span className={styles.titlePrimary}>{value}</span><span className={styles.titleMeta}>{row.scenarioCode}</span></div>) },
    { id: 'prio', header: 'Prio.', accessor: 'scenarioPriority', width: '80px', cell: ({ value }) => <StatusBadge map={SCENARIO_PRIORITY} value={value} showIcon={false} label={value} /> },
    { id: 'tester', header: 'Testeur', accessor: 'testerEmail', cell: ({ row }) => row.testerName || row.testerEmail },
    { id: 'attempt', header: 'Tent.', accessor: 'attempt', width: '70px' },
    { id: 'status', header: 'Statut', accessor: 'status', width: '120px', cell: ({ value }) => <StatusBadge map={RUN_STATUS} value={value} /> },
    { id: 'steps', header: 'Étapes', width: '90px', cell: ({ row }) => `${row.stepsDone}/${row.stepsTotal}` },
    { id: 'findings', header: 'Retours', accessor: 'findings', width: '80px' },
  ]
  return (
    <>
      <div className={rs.toolbar}>
        <select className={styles.textarea} style={{ minHeight: 0, height: 34, width: 180 }} aria-label="Filtrer par statut" value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Tous statuts</option>
          {toSelectOptions(RUN_STATUS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <Table columns={columns} data={runs} rowKey="id_run" loading={isLoading} onRowClick={(r) => onOpen(r.id_run)}
        pagination={{ currentPage: page, totalPages: Math.max(1, Math.ceil(total / 50)), pageSize: 50, total, onPageChange: setPage }}
        emptyMessage="Aucune exécution." />
    </>
  )
}

export const RunsTab = ({ campaign, readOnly }) => {
  const [view, setView] = useState('matrix')
  const [runId, setRunId] = useState(null)
  const [report, setReport] = useState(null)
  return (
    <div>
      <div className={rs.toolbar}>
        <div className={rs.seg} role="group" aria-label="Affichage">
          <button type="button" aria-pressed={view === 'matrix'} onClick={() => setView('matrix')}>Matrice</button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>Liste</button>
        </div>
      </div>
      {view === 'matrix' ? <Matrix campaignId={campaign.id_campaign} onOpen={setRunId} /> : <RunList campaignId={campaign.id_campaign} onOpen={setRunId} />}
      {runId && <RunDrawer runId={runId} onClose={() => setRunId(null)} readOnly={readOnly} onReport={(run) => setReport(run)} />}
      <FindingDrawer isOpen={!!report} onClose={() => setReport(null)} campaignId={campaign.id_campaign} runId={report?.id_run} />
    </div>
  )
}

export default RunsTab
