import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal, Button } from '../../../components/ui'
import { supabase } from '../../../lib/supabase'
import { getAdminId } from '../../../lib/admin'
import styles from '../Tests.module.css'

const HELLO = 'Décrivez en vos mots les parcours à tester (ex. « un client réserve un artisan et paie par Mobile Money »). Je rédige les scénarios et je vous pose des questions si un détail manque.'

export const ScenarioAssistantModal = ({ isOpen, onClose, mutations }) => {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [proposal, setProposal] = useState([])
  const endRef = useRef(null)
  const { importItems } = mutations
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  const close = () => { setMsgs([]); setInput(''); setProposal([]); onClose() }

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
      if (data.scenarios?.length) setProposal(data.scenarios)
    } catch (e) {
      setMsgs([...next, { role: 'assistant', content: `⚠ ${e.message}`, error: true }])
    } finally { setBusy(false) }
  }

  const create = async () => {
    try {
      const r = await importItems.mutateAsync({ items: proposal, dryRun: false })
      if (r.errors?.length) toast.error(`${r.errors.length} scénario(s) refusé(s) : ${r.errors[0].error}`)
      else close()
    } catch { /* toast */ }
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Assistant scénarios (IA)" size="lg"
      footer={<>
        <Button variant="outline" onClick={close}>Fermer</Button>
        <Button variant="primary" onClick={create} disabled={!proposal.length || busy} isLoading={importItems.isPending}>
          {proposal.length ? `Créer ${proposal.length} scénario(s)` : 'Créer'}
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

        {proposal.length > 0 && (
          <div style={{ border: '1px solid #e3e8ef', borderRadius: 12, padding: 10, maxHeight: '24vh', overflowY: 'auto' }}>
            <strong style={{ fontSize: 13 }}><CheckCircle2 size={14} style={{ verticalAlign: -2 }} /> Proposition ({proposal.length}) — demandez des changements ou créez-les</strong>
            {proposal.map((p, i) => (
              <div key={i} style={{ fontSize: 13, padding: '6px 0', borderTop: i ? '1px solid #eef2f6' : 'none' }}>
                <b>{p.title}</b> <span style={{ opacity: 0.6 }}>· {p.priority || 'P2'} · {p.profile || 'ANY'} · {p.steps?.length || 0} étapes</span>
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
