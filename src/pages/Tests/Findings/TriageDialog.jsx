import { useState, useMemo, useEffect } from 'react'
import { Modal, Button, Select } from '../../../components/ui'
import { useIssues } from '../../../hooks/docs'
import { useDebounce } from '../../../hooks/useDebounce'
import { TRIAGE_DECISION, FINDING_SEVERITY, toSelectOptions } from '../../../hooks/tests'
import styles from '../Tests.module.css'

const PRIO = { BLOCKER: 'P0', CRITICAL: 'P1', MAJOR: 'P2', MINOR: 'P3', TRIVIAL: 'P4' }
const NOTE_REQUIRED = ['REJECT', 'NEED_INFO']

/** decision ∈ CONFIRM | REJECT | NEED_INFO ; onSubmit(payload) → Promise */
export const TriageDialog = ({ isOpen, onClose, decision, finding, onSubmit, loading }) => {
  const [severity, setSeverity] = useState('')
  const [note, setNote] = useState('')
  const [mode, setMode] = useState('CREATE')
  const [issueSearch, setIssueSearch] = useState('')
  const [issueId, setIssueId] = useState('')
  const [error, setError] = useState('')
  const dq = useDebounce(issueSearch, 250)
  const { issues } = useIssues({ search: dq, pageSize: 20 })

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- réinitialisation à l'ouverture */
    if (isOpen) { setSeverity(finding?.severity || ''); setNote(''); setMode(finding?.issue_id ? 'NONE' : 'CREATE'); setIssueId(''); setIssueSearch(''); setError('') }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, finding])

  const issueOptions = useMemo(() => issues.map((i) => ({ value: i.id_issue, label: `${i.code} · ${i.title}` })), [issues])
  if (!decision) return null
  const cfg = TRIAGE_DECISION[decision]
  const isBug = finding?.finding_type === 'BUG'

  const submit = async () => {
    if (NOTE_REQUIRED.includes(decision) && !note.trim()) { setError(decision === 'REJECT' ? 'Un motif est requis' : 'Précisez ce qu\'il manque'); return }
    if (decision === 'CONFIRM' && isBug && !severity) { setError('La gravité est requise pour confirmer un bug'); return }
    if (decision === 'CONFIRM' && mode === 'LINK' && !issueId) { setError('Choisissez l\'issue à rattacher'); return }
    const payload = { note: note.trim() || undefined }
    if (decision === 'CONFIRM') {
      payload.severity = severity || undefined
      payload.issueMode = mode
      if (mode === 'LINK') payload.issueId = issueId
      if (mode === 'CREATE' && severity) payload.issuePriority = PRIO[severity]
    }
    try { await onSubmit(payload) } catch { /* toast */ }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={cfg.label} size="md"
      footer={<><Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
        <Button variant={decision === 'REJECT' ? 'danger' : 'primary'} onClick={submit} isLoading={loading}>{cfg.label}</Button></>}>
      <div className={styles.formSection}>
        {decision === 'CONFIRM' && (<>
          {isBug && <Select label="Gravité" required value={severity} onChange={(v) => { setSeverity(v); setError('') }}
            options={[{ value: '', label: 'Choisir…' }, ...toSelectOptions(FINDING_SEVERITY)]} />}
          <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <legend className={styles.label}>Issue (suivi des correctifs)</legend>
            {[['CREATE', `Créer une issue${severity ? ` (priorité ${PRIO[severity]})` : ''}`], ['LINK', 'Rattacher à une issue existante'], ['NONE', 'Ne pas créer d\'issue']].map(([v, l]) => (
              <label key={v} style={{ display: 'flex', gap: 8, fontSize: 'var(--fs-sm)', alignItems: 'center' }}>
                <input type="radio" name="issue-mode" checked={mode === v} onChange={() => setMode(v)} /> {l}
              </label>
            ))}
          </fieldset>
          {mode === 'LINK' && (<>
            <input className={styles.textarea} style={{ minHeight: 0, height: 34 }} placeholder="Chercher une issue…" aria-label="Chercher une issue"
              value={issueSearch} onChange={(e) => setIssueSearch(e.target.value)} />
            <Select label="Issue" value={issueId} onChange={setIssueId} options={issueOptions} searchable placeholder="Sélectionner" />
          </>)}
        </>)}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="tri-note">
            {decision === 'REJECT' ? 'Motif du rejet' : decision === 'NEED_INFO' ? 'Précisions demandées (visibles du testeur)' : 'Note interne'}
            {!NOTE_REQUIRED.includes(decision) && <span className={styles.optional}>optionnel</span>}
          </label>
          <textarea id="tri-note" className={styles.textarea} rows={3} value={note} onChange={(e) => { setNote(e.target.value); setError('') }} />
        </div>
        {error && <span className={styles.fieldError} role="alert">{error}</span>}
      </div>
    </Modal>
  )
}

export default TriageDialog
