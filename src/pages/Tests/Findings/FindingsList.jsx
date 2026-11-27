import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Paperclip, MessageSquare } from 'lucide-react'
import { Table, Tabs } from '../../../components/ui'
import { StatusBadge, DocsErrorState, Tooltip } from '../../../components/docs'
import {
  useTestFindings, FINDING_STATUS, FINDING_SEVERITY, FINDING_TYPE, toSelectOptions,
} from '../../../hooks/tests'
import { useDebounce } from '../../../hooks/useDebounce'
import { formatDateTime, formatRelative } from '../../../utils/docsFormatters'
import styles from '../Tests.module.css'

const PAGE_SIZE = 30

export const FindingsList = ({ campaignId = null, campaigns = null }) => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('NEW')
  const [severity, setSeverity] = useState('')
  const [type, setType] = useState('')
  const [campaign, setCampaign] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounce(searchInput, 300)

  const { findings, total, stats, isLoading, isError, error, refetch } = useTestFindings({
    campaignId: campaignId || campaign || null, search, status: status || null,
    severity: severity || null, type: type || null, page, pageSize: PAGE_SIZE,
  })
  const bs = stats.byStatus || {}
  const all = Object.values(bs).reduce((s, n) => s + n, 0)
  const tabs = [
    { id: 'NEW', label: 'À trier', count: bs.NEW || 0 },
    { id: 'NEED_INFO', label: 'Précisions', count: bs.NEED_INFO || 0 },
    { id: 'CONFIRMED', label: 'Confirmés', count: bs.CONFIRMED || 0 },
    { id: 'REJECTED', label: 'Rejetés', count: bs.REJECTED || 0 },
    { id: '', label: 'Tous', count: all },
  ]
  const reset = (fn) => (e) => { fn(e.target.value); setPage(1) }

  const columns = [
    { id: 'code', header: 'Code', accessor: 'code', width: '130px', cell: ({ value }) => <span className={styles.codeCell}>{value}</span> },
    { id: 'title', header: 'Retour', accessor: 'title', cell: ({ value, row }) => (
      <div className={styles.titleCell}>
        <span className={styles.titlePrimary}>{value}</span>
        <span className={styles.titleMeta}>
          {row.testerName || row.testerEmail || 'Équipe'}{row.scenarioCode ? ` · ${row.scenarioCode}` : ''}{row.campaignCode && !campaignId ? ` · ${row.campaignCode}` : ''}
          {row.attachmentCount > 0 && <><Paperclip size={10} /> {row.attachmentCount}</>}
          {row.commentCount > 0 && <><MessageSquare size={10} /> {row.commentCount}</>}
        </span>
      </div>) },
    { id: 'type', header: 'Type', accessor: 'finding_type', width: '120px', cell: ({ value }) => <StatusBadge map={FINDING_TYPE} value={value} /> },
    { id: 'severity', header: 'Gravité', accessor: 'severity', width: '110px', cell: ({ value }) => value ? <StatusBadge map={FINDING_SEVERITY} value={value} /> : <span className={styles.muted}>—</span> },
    { id: 'status', header: 'Statut', accessor: 'status', width: '150px', cell: ({ value }) => <StatusBadge map={FINDING_STATUS} value={value} /> },
    { id: 'issue', header: 'Issue', accessor: 'issueCode', width: '130px', cell: ({ value }) => value ? <span className={styles.codeCell}>{value}</span> : <span className={styles.muted}>—</span> },
    { id: 'created', header: 'Reçu', accessor: 'created_at', width: '110px', cell: ({ value }) => (
      <Tooltip content={formatDateTime(value)}><span className={styles.timeCell}>{formatRelative(value)}</span></Tooltip>) },
  ]

  if (isError) return <DocsErrorState error={error} onRetry={refetch} title="Impossible de charger les retours" />
  const sel = { minHeight: 0, height: 34 }
  return (
    <div>
      <Tabs tabs={tabs} activeTab={status} onChange={(id) => { setStatus(id); setPage(1) }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <input className={styles.textarea} style={{ ...sel, width: 240 }} placeholder="Rechercher…" aria-label="Rechercher un retour"
          value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1) }} />
        <select className={styles.textarea} style={{ ...sel, width: 150 }} aria-label="Gravité" value={severity} onChange={reset(setSeverity)}>
          <option value="">Toutes gravités</option>
          {toSelectOptions(FINDING_SEVERITY).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className={styles.textarea} style={{ ...sel, width: 150 }} aria-label="Type" value={type} onChange={reset(setType)}>
          <option value="">Tous types</option>
          {toSelectOptions(FINDING_TYPE).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {campaigns && (
          <select className={styles.textarea} style={{ ...sel, width: 220 }} aria-label="Campagne" value={campaign} onChange={reset(setCampaign)}>
            <option value="">Toutes campagnes</option>
            {campaigns.map((c) => <option key={c.id_campaign} value={c.id_campaign}>{c.code} · {c.name}</option>)}
          </select>
        )}
      </div>
      <Table columns={columns} data={findings} rowKey="id_finding" loading={isLoading}
        onRowClick={(r) => navigate(`/tests/findings/${r.code}`)}
        pagination={{ currentPage: page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), pageSize: PAGE_SIZE, total, onPageChange: setPage }}
        emptyMessage={status === 'NEW' ? 'Aucun retour à trier. 🎉' : 'Aucun retour ne correspond.'} />
    </div>
  )
}

export default FindingsList
