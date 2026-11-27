import { useState, useEffect } from 'react'
import { Routes, Route, useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, MessageSquare, Plus, ChevronRight, ChevronLeft, Check, X, Ban, Play, AlertTriangle, Loader, Bug, Palette, Lightbulb, HelpCircle, Link2Off, Send, Flag } from 'lucide-react'
import Markdown from '../../components/docs/Markdown/Markdown'
import { portal, detectDevice } from './api'
import s from './Portal.module.css'

const ST = { ASSIGNED: 'À faire', IN_PROGRESS: 'En cours', PASSED: 'Réussi', FAILED: 'Échec', BLOCKED: 'Bloqué', SKIPPED: 'Ignoré',
  NEW: 'Reçu', NEED_INFO: 'Précisions demandées', CONFIRMED: 'Confirmé', REJECTED: 'Non retenu' }
const TYPES = [['BUG', 'Bug', Bug], ['UX', 'Confort', Palette], ['SUGGESTION', 'Idée', Lightbulb], ['QUESTION', 'Question', HelpCircle]]
const SEVS = [['MINOR', 'Mineur'], ['MAJOR', 'Gênant'], ['CRITICAL', 'Bloquant']]
const done = (st) => ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'].includes(st)
const RUN_ICON = { PASSED: Check, FAILED: X, BLOCKED: Ban, IN_PROGRESS: Loader, SKIPPED: Check }
const Ring = ({ pct }) => (
  <svg className={s.ring} viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" fill="none" stroke="#ffffff33" strokeWidth="8" />
    <circle cx="40" cy="40" r="34" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${pct * 2.136} 999`} transform="rotate(-90 40 40)" />
    <text x="40" y="46" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff">{pct}%</text></svg>
)
const Pill = ({ v }) => <span className={`${s.pill} ${s[v] || ''}`}>{ST[v] || v}</span>

const Sk = ({ w = '100%', h = 14, r }) => <span className={s.sk} style={{ width: w, height: h, borderRadius: r }} />
const SkRow = () => (
  <div className={s.card}><div className={s.row}><span className={s.sk} style={{ width: 40, height: 40, borderRadius: 12, flex: '0 0 40px' }} />
    <div className={s.grow}><Sk w="70%" h={16} /><div style={{ height: 8 }} /><Sk w="45%" h={12} /></div></div></div>
)
const SkList = ({ hero }) => (<>{hero && <span className={`${s.sk} ${s.heroSk}`} />}<SkRow /><SkRow /><SkRow /></>)
const SkRun = () => (<>
  <div className={s.card}><Sk w="55%" h={16} /><div style={{ height: 10 }} /><Sk h={12} /><div style={{ height: 6 }} /><Sk w="80%" h={12} /></div>
  {[1, 2].map((i) => <div key={i} className={s.step}><span className={s.sk} style={{ width: 28, height: 28, borderRadius: 14, flex: '0 0 28px' }} />
    <div className={s.grow}><Sk w="85%" h={16} /><div style={{ height: 12 }} /><Sk h={44} r={10} /><div style={{ height: 12 }} /><Sk h={56} r={14} /></div></div>)}
</>)
const haptic = () => { try { navigator.vibrate?.(8) } catch { /* ignore */ } }
const Err = ({ e }) => (e ? <p className={s.err}>{e.message}</p> : null)

function Shell({ token, children, title, eyebrow, back, dock }) {
  const nav = useNavigate(); const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const base = `/join/${token}`
  const tab = pathname.includes('/retours') ? 'r' : pathname.includes('/signaler') ? 's' : 'h'
  return (
    <div className={`${s.root} ${dock ? s.hasDock : ''}`} onScroll={(e) => { const v = e.currentTarget.scrollTop > 48; if (v !== scrolled) setScrolled(v) }}>
      <header className={`${s.hdr} ${scrolled ? s.hdrOn : ''}`}>
        <div className={s.hdrIn}>
          {back ? <button className={s.back} onClick={() => nav(back)} aria-label="Retour"><ChevronLeft size={22} />Retour</button> : <span className={s.backSp} />}
          <span className={s.hdrTitle}>{typeof title === 'string' ? title : ''}</span>
          <span className={s.backSp} />
        </div>
      </header>
      <div className={s.top}>
        <div className={s.eyebrow}>{eyebrow}</div>
        <h1 className={s.h1}>{title}</h1>
      </div>
      <div className={s.wrap}>{children}</div>
      {dock ? <div className={s.dock}><div className={s.dockIn}>{dock}</div></div> : (
        <nav className={s.nav}><div className={s.navIn}>
          <button className={tab === 'h' ? s.on : ''} onClick={() => nav(base)}><ClipboardList size={22} />Mes tests</button>
          <button className={s.fab} aria-label="Signaler un problème" onClick={() => nav(`${base}/signaler`)}><Plus size={28} /></button>
          <button className={tab === 'r' ? s.on : ''} onClick={() => nav(`${base}/retours`)}><MessageSquare size={22} />Mes retours</button>
        </div></nav>
      )}
    </div>
  )
}

function Toast({ msg }) { return msg ? <div className={s.toast} role="alert"><AlertTriangle size={18} />{msg}</div> : null }
const useToast = () => {
  const [msg, setMsg] = useState('')
  const show = (e) => { setMsg(e?.message || String(e)); setTimeout(() => setMsg(''), 3500) }
  return [msg, show]
}

const useHome = (token) => useQuery({
  queryKey: ['portal', token], queryFn: () => portal.open(token, detectDevice()), retry: false, refetchOnWindowFocus: true,
})

function Gate({ token, q, skeleton, children }) {
  if (q.isLoading) return <Shell token={token} eyebrow={<Sk w={120} h={12} />} title={<Sk w={220} h={28} />}>{skeleton}</Shell>
  if (q.isError) return (
    <div className={s.root}><div className={s.wrap}><div className={s.empty}><Link2Off size={40} />
      <h2>Lien invalide</h2><p>Ce lien n'est plus valide. Demandez-en un nouveau à l'équipe Handyra.</p></div></div></div>
  )
  return children(q.data)
}

function Profile({ token, data }) {
  const qc = useQueryClient(); const d = detectDevice()
  const [name, setName] = useState(data.tester.fullName || '')
  const [model, setModel] = useState(data.tester.deviceModel || d.deviceModel || '')
  const m = useMutation({
    mutationFn: () => portal.open(token, { ...d, fullName: name, deviceModel: model || null }),
    onSuccess: (r) => qc.setQueryData(['portal', token], r),
  })
  return (
    <div className={s.card}>
      <div className={s.title}>Bienvenue 👋</div>
      <p className={s.meta}>Dites-nous qui vous êtes et sur quel téléphone vous testez : ça nous aide à reproduire les bugs.</p>
      <label className={s.field}><span>Votre nom</span><input className={s.input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
      <label className={s.field}><span>Modèle du téléphone</span><input className={s.input} value={model} placeholder="ex. Tecno Spark 10" onChange={(e) => setModel(e.target.value)} /></label>
      <button className={s.btn} disabled={!name.trim() || m.isPending} onClick={() => m.mutate()}>Continuer</button>
      <Err e={m.error} />
    </div>
  )
}

function RunCard({ r, onClick }) {
  const I = RUN_ICON[r.status] || ClipboardList
  return (
    <div className={`${s.card} ${s.tap}`} onClick={onClick}>
      <div className={s.row}>
        <div className={`${s.ico} ${s[r.status] || ''}`}><I size={20} /></div>
        <div className={s.grow}><div className={s.title}>{r.title}</div>
          <div className={s.meta}>{r.module || r.code}{r.minutes ? ` · ~${r.minutes} min` : ''}{r.stepsTotal ? ` · ${r.stepsDone}/${r.stepsTotal} étapes` : ''}</div></div>
        {done(r.status) || r.status === 'IN_PROGRESS' ? <Pill v={r.status} /> : <ChevronRight size={20} className={s.chev} />}
      </div>
    </div>
  )
}

function Home({ token }) {
  const nav = useNavigate(); const q = useHome(token)
  return (
    <Gate token={token} q={q} skeleton={<SkList hero />}>{(d) => {
      const total = d.runs.length; const fin = d.runs.filter((r) => done(r.status)).length
      const pct = total ? Math.round((fin / total) * 100) : 0
      const next = d.runs.find((r) => !done(r.status)); const active = d.campaign.status === 'ACTIVE'
      const need = d.findings.filter((f) => f.needsReply).length
      const todo = d.runs.filter((r) => !done(r.status)); const finished = d.runs.filter((r) => done(r.status))
      const go = (id) => nav(`/join/${token}/test/${id}`)
      return (
        <Shell token={token} eyebrow={d.campaign.name} title={d.tester.fullName ? `Bonjour ${d.tester.fullName.split(' ')[0]}` : 'Mes tests'}>
          {(!d.tester.fullName || !d.tester.deviceModel) && <Profile token={token} data={d} />}
          {!active && <div className={s.banner}><AlertTriangle size={18} />{d.campaign.status === 'DRAFT' ? 'La campagne n\'a pas encore démarré.' : d.campaign.status === 'PAUSED' ? 'La campagne est en pause.' : 'La campagne est terminée. Merci pour votre aide !'}</div>}
          {need > 0 && <div className={`${s.banner} ${s.tap}`} onClick={() => nav(`/join/${token}/retours`)}><MessageSquare size={18} />{need} signalement{need > 1 ? 's' : ''} attend{need > 1 ? 'ent' : ''} votre réponse</div>}
          <div className={s.hero}>
            <div className={s.row}>
              <div className={s.grow}><div className={s.meta}>Votre progression</div>
                <div className={s.big}>{fin} / {total}</div><div className={s.meta}>tests terminés{d.campaign.appBuild ? ` · v${d.campaign.appBuild}` : ''}</div></div>
              <Ring pct={pct} />
            </div>
            {next && active && <button className={s.heroBtn} onClick={() => go(next.id)}><Play size={18} />{fin ? 'Continuer' : 'Commencer les tests'}</button>}
          </div>
          {total === 0 && <div className={s.empty}><ClipboardList size={40} /><h2>Aucun test pour le moment</h2><p>Vos tests apparaîtront ici dès leur attribution.</p></div>}
          {todo.length > 0 && <div className={s.section}>À faire · {todo.length}</div>}
          {todo.map((r) => <RunCard key={r.id} r={r} onClick={() => go(r.id)} />)}
          {finished.length > 0 && <div className={s.section}>Terminés · {finished.length}</div>}
          {finished.map((r) => <RunCard key={r.id} r={r} onClick={() => go(r.id)} />)}
        </Shell>
      )
    }}</Gate>
  )
}

function Run({ token }) {
  const { runId } = useParams(); const nav = useNavigate(); const qc = useQueryClient()
  const q = useQuery({ queryKey: ['portal', token, 'run', runId], queryFn: () => portal.runGet(token, runId), retry: false })
  const [steps, setSteps] = useState(null); const [note, setNote] = useState('')
  const [busy, setBusy] = useState({}); const [finishing, setFinishing] = useState(false)
  const [toast, showToast] = useToast()
   
  useEffect(() => { if (q.data) { setSteps(q.data.steps); setNote(q.data.run.note || '') } }, [q.data])
  if (q.isError) return <Shell token={token} title="Test introuvable" back={`/join/${token}`}><Err e={q.error} /></Shell>
  if (!q.data || !steps) return <Shell token={token} eyebrow={<Sk w={110} h={12} />} title={<Sk w={240} h={28} />} back={`/join/${token}`} dock={<Sk h={52} r={14} />}><SkRun /></Shell>
  const { scenario: sc, canEdit } = q.data
  const patchStep = (pos, patch) => setSteps((cur) => cur.map((x) => (x.position === pos ? { ...x, ...patch } : x)))
  // Enregistre UNE étape : mise à jour optimiste, annulée si le serveur refuse.
  const saveStep = async (pos, patch) => {
    if (busy[pos]) return
    const prev = steps.find((x) => x.position === pos); const merged = { ...prev, ...patch }
    haptic(); patchStep(pos, patch); setBusy((b) => ({ ...b, [pos]: true }))
    try {
      await portal.runRecord(token, runId, 'IN_PROGRESS', null, [{ position: pos, status: merged.status, comment: merged.comment }])
      qc.invalidateQueries({ queryKey: ['portal', token], exact: true })
    } catch (e) {
      patchStep(pos, { status: prev.status, comment: prev.comment }); showToast(e)
    } finally { setBusy((b) => ({ ...b, [pos]: false })) }
  }
  const finish = async (status) => {
    setFinishing(true)
    try { await portal.runRecord(token, runId, status, note, null); await qc.invalidateQueries({ queryKey: ['portal', token], exact: true }); nav(`/join/${token}`) }
    catch (e) { showToast(e); setFinishing(false) }
  }
  const total = steps.length; const pending = steps.filter((x) => x.status === 'PENDING'); const doneN = total - pending.length
  const hasIssue = steps.some((x) => ['FAILED', 'BLOCKED'].includes(x.status))
  const final = steps.some((x) => x.status === 'FAILED') ? 'FAILED' : steps.some((x) => x.status === 'BLOCKED') ? 'BLOCKED' : steps.every((x) => x.status === 'SKIPPED') ? 'SKIPPED' : 'PASSED'
  const goPending = () => document.getElementById(`step-${pending[0].position}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const dock = !canEdit ? null : (<>
    <div className={s.dockMeta}><span>{doneN} sur {total} étape{total > 1 ? 's' : ''} validée{doneN > 1 ? 's' : ''}</span><span>{total ? Math.round((doneN / total) * 100) : 0}%</span></div>
    <div className={s.dockBar}><i style={{ width: `${total ? (doneN / total) * 100 : 0}%` }} /></div>
    {pending.length > 0
      ? <button className={`${s.btn} ${s.ghost}`} onClick={goPending}><ChevronRight size={18} style={{ transform: 'rotate(90deg)' }} />Aller à l'étape {pending[0].position}</button>
      : <button className={s.btn} disabled={finishing} onClick={() => finish(final)}>{finishing ? <Loader size={18} className={s.spin} /> : <Flag size={18} />}{final === 'PASSED' ? 'Terminer le test' : 'Terminer avec problème'}</button>}
  </>)
  return (
    <Shell token={token} eyebrow={`${sc.code} · ${sc.priority}${sc.minutes ? ` · ~${sc.minutes} min` : ''}`} title={sc.title} back={`/join/${token}`} dock={dock}>
      {!canEdit && <div className={s.banner}><AlertTriangle size={18} />La campagne n'est pas en cours : lecture seule.</div>}
      {done(q.data.run.status) && canEdit && <div className={s.banner}><Check size={18} />Résultat enregistré : {ST[q.data.run.status]}. Modifiez une étape pour le refaire.</div>}
      {sc.summary && <p className={s.lead}>{sc.summary}</p>}
      {(sc.preconditionsMd || sc.testDataMd) && (
        <div className={s.card}>
          {sc.preconditionsMd && <><div className={s.label}>Avant de commencer</div><div className={s.md}><Markdown>{sc.preconditionsMd}</Markdown></div></>}
          {sc.testDataMd && <><div className={s.label} style={{ marginTop: 14 }}>Données à utiliser</div><div className={s.md}><Markdown>{sc.testDataMd}</Markdown></div></>}
        </div>
      )}
      <div className={s.section}>Étapes</div>
      {steps.map((st) => {
        const b = !!busy[st.position]
        const btn = (v, cls, icon, label) => (
          <button key={v} className={st.status === v ? s[cls] : ''} disabled={b} aria-pressed={st.status === v} onClick={() => st.status !== v && saveStep(st.position, { status: v })}>
            {b && st.status === v ? <Loader size={20} className={s.spin} /> : icon}{label}
          </button>
        )
        return (
          <div id={`step-${st.position}`} key={st.position} className={`${s.step} ${s[st.status] || ''}`}>
            <div className={s.num}>{st.status === 'PASSED' ? <Check size={16} /> : st.status === 'FAILED' ? <X size={16} /> : st.status === 'BLOCKED' ? <Ban size={14} /> : st.position}</div>
            <div className={s.grow}>
              <div className={`${s.md} ${s.title}`}><Markdown>{st.actionMd}</Markdown></div>
              <div className={s.exp}><div className={s.label}>Résultat attendu</div><div className={s.md}><Markdown>{st.expectedMd}</Markdown></div></div>
              {canEdit && (
                <div className={s.seg} style={{ marginBottom: 0 }}>
                  {btn('PASSED', 'okOn', <Check size={20} />, 'OK')}
                  {btn('FAILED', 'koOn', <X size={20} />, 'Échec')}
                  {btn('BLOCKED', 'wnOn', <Ban size={20} />, 'Bloqué')}
                </div>
              )}
              {canEdit && ['FAILED', 'BLOCKED'].includes(st.status) && (
                <textarea className={s.input} style={{ marginTop: 12, minHeight: 80 }} placeholder="Que s'est-il passé ? (facultatif)" value={st.comment || ''}
                  onChange={(e) => patchStep(st.position, { comment: e.target.value })}
                  onBlur={() => saveStep(st.position, {})} />
              )}
            </div>
          </div>
        )
      })}
      {canEdit && hasIssue && pending.length === 0 && (
        <button className={`${s.btn} ${s.ghost}`} style={{ marginBottom: 12 }} onClick={() => nav(`/join/${token}/signaler?run=${runId}`)}><Bug size={18} />Signaler le problème</button>
      )}
      {q.data.findings.length > 0 && <p className={s.meta}>Signalements liés : {q.data.findings.map((f) => f.code).join(', ')}</p>}
      {canEdit && <label className={s.field} style={{ marginTop: 16 }}><span>Remarque générale (facultatif)</span><textarea className={s.input} value={note} onChange={(e) => setNote(e.target.value)} /></label>}
      <Toast msg={toast} />
    </Shell>
  )
}

function Report({ token }) {
  const [sp] = useSearchParams(); const nav = useNavigate(); const qc = useQueryClient()
  const [f, setF] = useState({ type: 'BUG', severity: 'MAJOR', title: '', description: '', reproductionSteps: '' })
  const m = useMutation({
    mutationFn: () => portal.findingCreate(token, { ...f, runId: sp.get('run') || null, severity: f.type === 'BUG' ? f.severity : null }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['portal', token] }); nav(`/join/${token}/retours/${r.code}`, { replace: true }) },
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <Shell token={token} eyebrow="Nouveau signalement" title="Qu'avez-vous remarqué ?" back={`/join/${token}`}
      dock={<><button className={s.btn} disabled={!f.title.trim() || !f.description.trim() || m.isPending} onClick={() => m.mutate()}>{m.isPending ? <Loader size={18} className={s.spin} /> : <Send size={18} />}Envoyer le signalement</button>{m.error && <Err e={m.error} />}</>}>
      {/* eslint-disable-next-line no-unused-vars */}
      <div className={s.seg}>{TYPES.map(([k, l, I]) => <button key={k} className={f.type === k ? s.on : ''} onClick={() => setF({ ...f, type: k })}><I size={20} />{l}</button>)}</div>
      {f.type === 'BUG' && (<><div className={s.field}><span>Gravité</span></div>
        <div className={s.seg} style={{ marginTop: -8 }}>{SEVS.map(([k, l]) => <button key={k} className={f.severity === k ? s.on : ''} style={{ minHeight: 46 }} onClick={() => setF({ ...f, severity: k })}>{l}</button>)}</div></>)}
      <label className={s.field}><span>Titre court</span><input className={s.input} value={f.title} maxLength={200} onChange={set('title')} placeholder="ex. L'app se ferme à la publication" /></label>
      <label className={s.field}><span>Description</span><textarea className={s.input} value={f.description} onChange={set('description')} placeholder="Ce qui s'est passé, sur quel écran…" /></label>
      {f.type === 'BUG' && <label className={s.field}><span>Comment le reproduire ? (facultatif)</span><textarea className={s.input} value={f.reproductionSteps} onChange={set('reproductionSteps')} placeholder={'1. …\n2. …\n3. …'} /></label>}
    </Shell>
  )
}

function Findings({ token }) {
  const nav = useNavigate(); const q = useHome(token)
  return (
    <Gate token={token} q={q} skeleton={<SkList />}>{(d) => (
      <Shell token={token} eyebrow="Historique" title="Mes retours">
        {d.findings.length === 0 && <div className={s.empty}><MessageSquare size={40} /><h2>Rien signalé</h2><p>Appuyez sur + dès que vous voyez quelque chose d'anormal.</p></div>}
        {d.findings.map((f) => (
          <div key={f.code} className={`${s.card} ${s.tap}`} onClick={() => nav(`/join/${token}/retours/${f.code}`)}>
            <div className={s.row}><div className={s.grow}><div className={s.title}>{f.title}</div><div className={s.meta}>{f.code}</div></div><Pill v={f.status} /><ChevronRight size={20} className={s.chev} /></div>
          </div>
        ))}
      </Shell>
    )}</Gate>
  )
}

function Finding({ token }) {
  const { code } = useParams(); const qc = useQueryClient(); const [txt, setTxt] = useState('')
  const q = useQuery({ queryKey: ['portal', token, 'f', code], queryFn: () => portal.findingGet(token, code), retry: false })
  const m = useMutation({
    mutationFn: () => portal.findingComment(token, code, txt),
    onSuccess: (r) => { setTxt(''); qc.setQueryData(['portal', token, 'f', code], r); qc.invalidateQueries({ queryKey: ['portal', token], exact: true }) },
  })
  if (q.isError) return <Shell token={token} title="Introuvable" back={`/join/${token}/retours`}><Err e={q.error} /></Shell>
  const f = q.data; if (!f) return <Shell token={token} eyebrow={<Sk w={90} h={12} />} title={<Sk w={220} h={28} />} back={`/join/${token}/retours`}><SkRow /><SkRow /></Shell>
  return (
    <Shell token={token} eyebrow={f.code} title={f.title} back={`/join/${token}/retours`}>
      <div className={s.card}><Pill v={f.status} /><div className={s.md} style={{ marginTop: 10 }}><Markdown>{f.description}</Markdown></div></div>
      {f.note && <div className={s.banner}><MessageSquare size={18} />Équipe Handyra : {f.note}</div>}
      {f.comments.map((c, i) => <div key={i} className={`${s.msg} ${c.fromTeam ? s.team : ''}`}><div className={s.meta}>{c.fromTeam ? 'Équipe Handyra' : 'Vous'}</div>{c.content}</div>)}
      {f.canReply && (<div style={{ marginTop: 14 }}>
        <textarea className={s.input} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Ajouter une précision…" />
        <button className={s.btn} style={{ marginTop: 10 }} disabled={!txt.trim() || m.isPending} onClick={() => m.mutate()}><Send size={18} />Envoyer</button>
        <Err e={m.error} />
      </div>)}
    </Shell>
  )
}

export default function Portal() {
  const { token } = useParams()
  useEffect(() => {
    const m = document.querySelector('meta[name=theme-color]') || Object.assign(document.createElement('meta'), { name: 'theme-color' })
    const old = m.content; m.content = '#1e3a5f'; document.head.appendChild(m)
    const t = document.title; document.title = 'Handyra · Tests'
    return () => { m.content = old; document.title = t }
  }, [])
  return (
    <Routes>
      <Route index element={<Home token={token} />} />
      <Route path="test/:runId" element={<Run token={token} />} />
      <Route path="signaler" element={<Report token={token} />} />
      <Route path="retours" element={<Findings token={token} />} />
      <Route path="retours/:code" element={<Finding token={token} />} />
    </Routes>
  )
}
