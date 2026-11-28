import { useState, useRef, useEffect } from 'react'
import { Sparkles, ArrowUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { DocsDrawer } from '../../../components/docs'
import { supabase } from '../../../lib/supabase'
import { adminRpc } from '../../../lib/adminRpc'
import { getAdminId } from '../../../lib/admin'
import c from './ScenarioAssistant.module.css'

const SUGGESTIONS = [
  'Un client recharge son portefeuille par Mobile Money',
  'Un artisan accepte une mission et la termine',
  'Inscription et connexion d\'un nouveau client',
]

function ProposalCard({ p }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={c.card}>
      <button type="button" className={c.cardBtn} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className={c.cardMain}>
          <div className={c.cardTitle}>{p.title}</div>
          <div className={c.cardMeta}>
            <span className={`${c.tag} ${p.editId ? c.tagEdit : ''}`}>{p.editId ? `Modifie ${p.editCode}` : 'Nouveau'}</span>
            <span>{p.module || 'Sans module'}</span><span>{p.priority || 'P2'}</span><span>{p.profile || 'ANY'}</span>
            <span>{p.steps?.length || 0} étapes</span>
          </div>
        </div>
        <ChevronDown size={16} className={`${c.chev} ${open ? c.chevOpen : ''}`} />
      </button>
      {open && (
        <ol className={c.steps}>
          {(p.steps || []).map((st, i) => <li key={i}>{st.actionMd}<small>→ {st.expectedMd}</small></li>)}
        </ol>
      )}
    </div>
  )
}

export const ScenarioAssistantModal = ({ isOpen, onClose, mutations, initialText = '' }) => {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState(initialText)
  const [busy, setBusy] = useState(false)
  const [proposal, setProposal] = useState([])
  const [newMods, setNewMods] = useState([])
  const endRef = useRef(null)
  const taRef = useRef(null)
  const { importItems, update } = mutations
  useEffect(() => { if (isOpen && initialText) setInput(initialText) }, [isOpen, initialText])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, busy, proposal])
  useEffect(() => {
    const t = taRef.current; if (!t) return
    t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 140)}px`
  }, [input, isOpen])

  const close = () => { setMsgs([]); setInput(''); setProposal([]); setNewMods([]); onClose() }

  const send = async (override) => {
    const text = (override ?? input).trim(); if (!text || busy) return
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
      setMsgs([...next, { role: 'assistant', content: e.message, error: true }])
    } finally { setBusy(false) }
  }

  const apply = async () => {
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
  const label = !proposal.length ? 'Appliquer' : nEdit === proposal.length ? `Modifier ${nEdit} scénario(s)` : nEdit ? `Appliquer (${proposal.length})` : `Créer ${proposal.length} scénario(s)`
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <DocsDrawer isOpen={isOpen} onClose={close} eyebrow="Tests de validation" title="Assistant scénarios" width="lg"
      saveLabel={label} onSave={apply} saveDisabled={!proposal.length || busy} saving={importItems.isPending || update.isPending}>
      <div className={c.wrap}>
        {msgs.length === 0 && (
          <div className={c.intro}>
            <div className={c.introIco}><Sparkles size={22} /></div>
            <h3 className={c.introTitle}>Décrivez, je rédige</h3>
            <p className={c.introText}>Décrivez un parcours à tester, ou citez un scénario à modifier (ex. « TS-0003 : ajoute une étape de confirmation »). J'utilise vos modules et features, et je pose des questions si un détail manque.</p>
            <div className={c.chips}>{SUGGESTIONS.map((s) => <button key={s} type="button" className={c.chip} onClick={() => send(s)}>{s}</button>)}</div>
          </div>
        )}

        <div className={c.thread}>
          {msgs.map((m, i) => (
            <div key={i} className={`${c.row} ${m.role === 'user' ? c.rowUser : ''}`}>
              {m.role !== 'user' && <div className={c.avatar}><Sparkles size={14} /></div>}
              <div className={`${c.bubble} ${m.role === 'user' ? c.bubbleUser : m.error ? c.bubbleErr : c.bubbleAi}`}>{m.content}</div>
            </div>
          ))}
          {busy && <div className={c.row}><div className={c.avatar}><Sparkles size={14} /></div><div className={`${c.bubble} ${c.bubbleAi}`}><span className={c.typing}><i /><i /><i /></span></div></div>}
        </div>

        {newMods.length > 0 && (
          <div className={c.warn}>Nouveau module proposé : <b>{newMods.join(', ')}</b>. Il sera ajouté au référentiel à l'enregistrement. Demandez un module existant si ce n'est pas voulu.</div>
        )}
        {proposal.length > 0 && (
          <div className={c.proposal}>
            <div className={c.propHead}>Proposition · {proposal.length}</div>
            {proposal.map((p, i) => <ProposalCard key={i} p={p} />)}
          </div>
        )}
        <div ref={endRef} />

        <div className={c.composer}>
          <div className={c.box}>
            <textarea ref={taRef} className={c.input} rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
              placeholder={msgs.length ? 'Répondre, ou demander un changement…' : 'Décrivez un parcours à tester…'} aria-label="Message" />
            <button type="button" className={c.send} onClick={() => send()} disabled={!input.trim() || busy} aria-label="Envoyer"><ArrowUp size={18} /></button>
          </div>
          <div className={c.hint}>Entrée pour envoyer · Maj+Entrée pour un retour à la ligne</div>
        </div>
      </div>
    </DocsDrawer>
  )
}

export default ScenarioAssistantModal
