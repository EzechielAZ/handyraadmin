import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal, Button } from '../../../components/ui'
import { supabase } from '../../../lib/supabase'
import { adminRpc } from '../../../lib/adminRpc'
import { getAdminId } from '../../../lib/admin'
import styles from '../Tests.module.css'

const HELLO = `Décrivez les parcours à tester, ou citez un scénario à modifier (ex. « TS-0003 : ajoute une étape de confirmation »). J'utilise vos modules et features existants et je pose des questions si un détail manque.`

export const ScenarioAssistantModal = ({ isOpen, onClose, mutations, initialText = '' }) => {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState(initialText)
  const [newMods, setNewMods] = useState([])
  const [busy, setBusy] = useState(false)
  const [proposal, setProposal] = useState([])
  const endRef = useRef(null)
  const { importItems, update } = mutations
  useEffect(() => { if (isOpen && initialText) setInput(initialText) }, [isOpen, initialText])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  const close = () => { setMsgs([]); setInput(''); setProposal([]); setNewMods([]); onClose() }

  const send = async () => {
    const text = input.trim(); if (!text || busy) return
    const next = [...msgs, { role: 'user', content: text }]
    setMsgs(next); setInput(''); setBusy(true)
    try {
      const adminId = await getAdminId()
      const { data, error } = await supabase.functions.invoke('scenario-assistant', { body: { messages: next, adminId } })
      let err = data?.error
      if (!err && error) { try { err = (await error.context.json())?.error } catch { err = error.message } }
      if (err) throw new Error(err)
      setMsgs([...next, { role: 'assistant', content: data.message || '…' }])
      if (data.scenarios?.length) { setProposal(data.scenarios); setNewMods(data.newModules || []) }
    } catch (e) {
      setMsgs([...next, { role: 'assistant', content: `⚠ ${e.message}`, error: true }])
    } finally { setBusy(false) }
  }

  const create = async () => {
    try {
      for (const m of newMods) await adminRpc('docs_module_create', { p_code: m })
      const edits = proposal.filter((p) => p.editId)
      const news = proposal.filter((p) => !p.editId)
      for (const { editId, editCode: _c, ...payload } of edits) await update.mutateAsync({ id: editId, payload })
      if (news.length) {
        const r = await importItems.mutateAsync({ items: news, dryRun: false })
        if (r.errors?.length) { toast.error(`${r.errors.length} scénario(s) refusé(s) : ${r.errors[0].error}`); return }
      }
      close()
    } catch { /* toast */ }
  }
  const nEdit = proposal.filter((p) => p.editId).length

  return (
    <Modal isOpen={isOpen} onClose={close} title="Assistant scénarios (IA)" size="lg"
      footer={<>
        <Button variant="outline" onClick={close}>Fermer</Button>
        <Button variant="primary" onClick={create} disabled={!proposal.length || busy} isLoading={importItems.isPending || update.isPending}>
          {!proposal.length ? 'Appliquer' : nEdit === proposal.length ? `Modifier ${nEdit} scénario(s)` : nEdit ? `Appliquer (${proposal.length})` : `Créer ${proposal.length} scénario(s)`}
        </Button>
      </>}>
      <div className={styles.formSection}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '38vh', overflowY: 'auto' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)' }}><Sparkles size={14} style={{ verticalAlign: -2 }} /> {HELLO}</div>
          {msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', whiteSpace: 'pre-wrap', fontSize: 14,
              padding: '9px 13px', borderRadius: 14, background: m.role === 'user' ? '#1e3a5f' : m.error ? '#fef2f2' : '#f1f5f9', color: m.role === 'user' ? '#fff' : 'inherit' }}>
              {m.content}
            </div>
          ))}
          {busy && <div style={{ fontSize: 13, opacity: 0.6 }}>Rédaction en cours…</div>}
          <div ref={endRef} />
        </div>

        {newMods.length > 0 && (
          <div style={{ fontSize: 13, color: '#92400e', background: '#fffbeb', borderRadius: 10, padding: '8px 12px' }}>
            Nouveau module proposé : <b>{newMods.join(', ')}</b> — il sera ajouté au référentiel des modules à l'enregistrement. Demandez un module existant si ce n'est pas voulu.
          </div>
        )}
        {proposal.length > 0 && (
          <div style={{ border: '1px solid #e3e8ef', borderRadius: 12, padding: 10, maxHeight: '24vh', overflowY: 'auto' }}>
            <strong style={{ fontSize: 13 }}><CheckCircle2 size={14} style={{ verticalAlign: -2 }} /> Proposition ({proposal.length}) — demandez des changements ou créez-les</strong>
            {proposal.map((p, i) => (
              <div key={i} style={{ fontSize: 13, padding: '6px 0', borderTop: i ? '1px solid #eef2f6' : 'none' }}>
                <b>{p.title}</b> <span style={{ opacity: 0.6 }}>· {p.editId ? `modifie ${p.editCode}` : 'nouveau'} · {p.module || 'sans module'} · {p.priority || 'P2'} · {p.profile || 'ANY'} · {p.steps?.length || 0} étapes</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <textarea className={styles.textarea} rows={2} value={input} placeholder="Décrivez un parcours, répondez à une question ou demandez une modification…"
            onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }} style={{ flex: 1 }} />
          <Button variant="primary" icon={Send} onClick={send} disabled={!input.trim() || busy} aria-label="Envoyer" />
        </div>
      </div>
    </Modal>
  )
}

export default ScenarioAssistantModal
