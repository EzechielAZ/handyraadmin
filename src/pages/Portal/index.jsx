import { useState, useEffect } from 'react'
import { Routes, Route, useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Markdown from '../../components/docs/Markdown/Markdown'
import { portal, detectDevice } from './api'
import s from './Portal.module.css'

const ST = { ASSIGNED: 'À faire', IN_PROGRESS: 'En cours', PASSED: 'Réussi', FAILED: 'Échec', BLOCKED: 'Bloqué', SKIPPED: 'Ignoré',
  NEW: 'Reçu', NEED_INFO: 'Précisions demandées', CONFIRMED: 'Confirmé', REJECTED: 'Non retenu' }
const TYPES = [['BUG', '🐞 Bug'], ['UX', '🎨 Confort'], ['SUGGESTION', '💡 Idée'], ['QUESTION', '❓ Question']]
const SEVS = [['MINOR', 'Mineur'], ['MAJOR', 'Gênant'], ['CRITICAL', 'Bloquant']]
const done = (st) => ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'].includes(st)
const Pill = ({ v }) => <span className={`${s.pill} ${s[v] || ''}`}>{ST[v] || v}</span>

const Err = ({ e }) => (e ? <p className={s.err}>{e.message}</p> : null)

function Shell({ token, children, title, eyebrow, back }) {
  const nav = useNavigate(); const { pathname } = useLocation()
  const base = `/join/${token}`
  const tab = pathname.includes('/retours') ? 'r' : pathname.includes('/signaler') ? 's' : 'h'
  return (
    <div className={s.root}>
      <div className={s.top}>
        {back && <button className={s.back} onClick={() => nav(back)}>← Retour</button>}
        <div className={s.eyebrow}>{eyebrow}</div>
        <h1 className={s.h1}>{title}</h1>
      </div>
      <div className={s.wrap}>{children}</div>
      <nav className={s.nav}>
        <button className={tab === 'h' ? s.on : ''} onClick={() => nav(base)}>📋<br />Mes tests</button>
        <button className={s.fab} aria-label="Signaler" onClick={() => nav(`${base}/signaler`)}>＋</button>
        <button className={tab === 'r' ? s.on : ''} onClick={() => nav(`${base}/retours`)}>💬<br />Mes retours</button>
      </nav>
    </div>
  )
}

const useHome = (token) => useQuery({
  queryKey: ['portal', token], queryFn: () => portal.open(token, detectDevice()), retry: false, refetchOnWindowFocus: true,
})

function Gate({ q, children }) {
  if (q.isLoading) return <div className={s.root}><p className={s.empty}>Chargement…</p></div>
  if (q.isError) return (
    <div className={s.root}><div className={s.wrap}><div className={s.empty}>
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

function Home({ token }) {
  const nav = useNavigate(); const q = useHome(token)
  return (
    <Gate q={q}>{(d) => {
      const total = d.runs.length; const fin = d.runs.filter((r) => done(r.status)).length
      const next = d.runs.find((r) => !done(r.status))
      const need = d.findings.filter((f) => f.needsReply).length
      return (
        <Shell token={token} eyebrow={d.campaign.name} title={d.tester.fullName ? `Salut ${d.tester.fullName.split(' ')[0]}` : 'Mes tests'}>
          {(!d.tester.fullName || !d.tester.deviceModel) && <Profile token={token} data={d} />}
          {d.campaign.status !== 'ACTIVE' && (
            <div className={s.banner}>{d.campaign.status === 'DRAFT' ? 'La campagne n\'a pas encore démarré.' : d.campaign.status === 'PAUSED' ? 'La campagne est en pause.' : 'La campagne est terminée. Merci !'}</div>
          )}
          {need > 0 && <div className={s.banner} onClick={() => nav(`/join/${token}/retours`)}>💬 {need} signalement{need > 1 ? 's' : ''} attend{need > 1 ? 'ent' : ''} vos précisions</div>}
          <div className={s.card}>
            <div className={s.row}><div className={s.grow}><div className={s.title}>{fin} / {total} tests terminés</div>
              <div className={s.meta}>{d.campaign.appBuild ? `Version ${d.campaign.appBuild}` : 'Testez l\'app comme un vrai utilisateur'}</div></div></div>
            <div className={s.bar}><i style={{ width: total ? `${(fin / total) * 100}%` : 0 }} /></div>
            {next && d.campaign.status === 'ACTIVE' && <button className={s.btn} style={{ marginTop: 12 }} onClick={() => nav(`/join/${token}/test/${next.id}`)}>{fin ? 'Test suivant' : 'Commencer'}</button>}
          </div>
          {total === 0 && <p className={s.empty}>Aucun test ne vous est encore attribué.</p>}
          {d.runs.map((r) => (
            <div key={r.id} className={s.card} onClick={() => nav(`/join/${token}/test/${r.id}`)}>
              <div className={s.row}><div className={s.grow}><div className={s.title}>{r.title}</div>
                <div className={s.meta}>{r.code}{r.module ? ` · ${r.module}` : ''}{r.minutes ? ` · ~${r.minutes} min` : ''}{r.stepsTotal ? ` · ${r.stepsDone}/${r.stepsTotal} étapes` : ''}</div></div>
                <Pill v={r.status} /></div>
            </div>
          ))}
        </Shell>
      )
    }}</Gate>
  )
}

function Run({ token }) {
  const { runId } = useParams(); const nav = useNavigate(); const qc = useQueryClient()
  const q = useQuery({ queryKey: ['portal', token, 'run', runId], queryFn: () => portal.runGet(token, runId), retry: false })
  const [steps, setSteps] = useState(null); const [note, setNote] = useState('')
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (q.data) { setSteps(q.data.steps); setNote(q.data.run.note || '') } }, [q.data])
  const rec = useMutation({
    mutationFn: ({ status, st }) => portal.runRecord(token, runId, status, note, (st || steps).map((x) => ({ position: x.position, status: x.status, comment: x.comment }))),
    onSuccess: (r, v) => { qc.setQueryData(['portal', token, 'run', runId], r); qc.invalidateQueries({ queryKey: ['portal', token], exact: true }); if (done(v.status)) nav(`/join/${token}`) },
  })
  if (q.isError) return <Shell token={token} title="Test introuvable" back={`/join/${token}`}><Err e={q.error} /></Shell>
  if (!q.data || !steps) return <div className={s.root}><p className={s.empty}>Chargement…</p></div>
  const { scenario: sc, canEdit } = q.data
  const setStep = (pos, patch) => {
    const next = steps.map((x) => (x.position === pos ? { ...x, ...patch } : x)); setSteps(next)
    if (canEdit && patch.status) rec.mutate({ status: 'IN_PROGRESS', st: next })
  }
  const pending = steps.filter((x) => x.status === 'PENDING').length
  const final = steps.some((x) => x.status === 'FAILED') ? 'FAILED' : steps.some((x) => x.status === 'BLOCKED') ? 'BLOCKED' : steps.every((x) => x.status === 'SKIPPED') ? 'SKIPPED' : 'PASSED'
  return (
    <Shell token={token} eyebrow={`${sc.code} · ${sc.priority}`} title={sc.title} back={`/join/${token}`}>
      {!canEdit && <div className={s.banner}>La campagne n'est pas en cours : lecture seule.</div>}
      {done(q.data.run.status) && <div className={s.banner}>Résultat enregistré : {ST[q.data.run.status]}. Vous pouvez le refaire en modifiant les étapes.</div>}
      {sc.summary && <p className={s.meta}>{sc.summary}</p>}
      {(sc.preconditionsMd || sc.testDataMd) && (
        <div className={s.card}>
          {sc.preconditionsMd && <><div className={s.title}>Avant de commencer</div><div className={s.md}><Markdown>{sc.preconditionsMd}</Markdown></div></>}
          {sc.testDataMd && <><div className={s.title} style={{ marginTop: 8 }}>Données à utiliser</div><div className={s.md}><Markdown>{sc.testDataMd}</Markdown></div></>}
        </div>
      )}
      {steps.map((st) => (
        <div key={st.position} className={`${s.step} ${s[st.status] || ''}`}>
          <div className={s.meta}>Étape {st.position}</div>
          <div className={`${s.md} ${s.title}`}><Markdown>{st.actionMd}</Markdown></div>
          <div className={s.exp}>Attendu : <Markdown>{st.expectedMd}</Markdown></div>
          {canEdit && (
            <div className={s.seg}>
              <button className={st.status === 'PASSED' ? s.okOn : ''} onClick={() => setStep(st.position, { status: 'PASSED' })}>✓ OK</button>
              <button className={st.status === 'FAILED' ? s.koOn : ''} onClick={() => setStep(st.position, { status: 'FAILED' })}>✗ Échec</button>
              <button className={st.status === 'BLOCKED' ? s.on : ''} onClick={() => setStep(st.position, { status: 'BLOCKED' })}>⛔</button>
            </div>
          )}
          {canEdit && ['FAILED', 'BLOCKED'].includes(st.status) && (
            <textarea className={s.input} style={{ marginTop: 8, minHeight: 64 }} placeholder="Que s'est-il passé ?" value={st.comment || ''}
              onChange={(e) => setSteps(steps.map((x) => (x.position === st.position ? { ...x, comment: e.target.value } : x)))}
              onBlur={() => rec.mutate({ status: 'IN_PROGRESS' })} />
          )}
        </div>
      ))}
      {q.data.findings.length > 0 && <p className={s.meta}>Signalements liés : {q.data.findings.map((f) => f.code).join(', ')}</p>}
      {canEdit && (
        <>
          <label className={s.field}><span>Remarque générale (facultatif)</span><textarea className={s.input} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <button className={s.btn} disabled={pending > 0 || rec.isPending} onClick={() => rec.mutate({ status: final })}>
            {pending > 0 ? `Encore ${pending} étape${pending > 1 ? 's' : ''}` : final === 'PASSED' ? 'Terminer ✓' : 'Terminer avec problème'}
          </button>
          {final !== 'PASSED' && pending === 0 && (
            <button className={`${s.btn} ${s.ghost}`} style={{ marginTop: 8 }} onClick={() => nav(`/join/${token}/signaler?run=${runId}`)}>Signaler le problème</button>
          )}
          <Err e={rec.error} />
        </>
      )}
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
    <Shell token={token} eyebrow="Signalement" title="Qu'avez-vous remarqué ?" back={`/join/${token}`}>
      <div className={s.seg} style={{ marginBottom: 12 }}>{TYPES.map(([k, l]) => <button key={k} className={f.type === k ? s.on : ''} onClick={() => setF({ ...f, type: k })}>{l}</button>)}</div>
      {f.type === 'BUG' && <div className={s.seg} style={{ marginBottom: 12 }}>{SEVS.map(([k, l]) => <button key={k} className={f.severity === k ? s.on : ''} onClick={() => setF({ ...f, severity: k })}>{l}</button>)}</div>}
      <label className={s.field}><span>Titre court</span><input className={s.input} value={f.title} maxLength={200} onChange={set('title')} /></label>
      <label className={s.field}><span>Description</span><textarea className={s.input} value={f.description} onChange={set('description')} placeholder="Ce qui s'est passé, sur quel écran…" /></label>
      {f.type === 'BUG' && <label className={s.field}><span>Comment le reproduire ? (facultatif)</span><textarea className={s.input} value={f.reproductionSteps} onChange={set('reproductionSteps')} placeholder="1. … 2. … 3. …" /></label>}
      <button className={s.btn} disabled={!f.title.trim() || !f.description.trim() || m.isPending} onClick={() => m.mutate()}>Envoyer</button>
      <Err e={m.error} />
    </Shell>
  )
}

function Findings({ token }) {
  const nav = useNavigate(); const q = useHome(token)
  return (
    <Gate q={q}>{(d) => (
      <Shell token={token} eyebrow="Historique" title="Mes retours">
        {d.findings.length === 0 && <p className={s.empty}>Rien signalé pour l'instant.<br />Appuyez sur ＋ dès que vous voyez quelque chose d'anormal.</p>}
        {d.findings.map((f) => (
          <div key={f.code} className={s.card} onClick={() => nav(`/join/${token}/retours/${f.code}`)}>
            <div className={s.row}><div className={s.grow}><div className={s.title}>{f.title}</div><div className={s.meta}>{f.code}</div></div><Pill v={f.status} /></div>
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
  const f = q.data; if (!f) return <div className={s.root}><p className={s.empty}>Chargement…</p></div>
  return (
    <Shell token={token} eyebrow={f.code} title={f.title} back={`/join/${token}/retours`}>
      <div className={s.card}><Pill v={f.status} />
        <div className={s.md} style={{ marginTop: 8 }}><Markdown>{f.description}</Markdown></div></div>
      {f.note && <div className={s.banner}>Message de l'équipe : {f.note}</div>}
      {f.comments.map((c, i) => <div key={i} className={`${s.msg} ${c.fromTeam ? s.team : ''}`}><div className={s.meta}>{c.fromTeam ? 'Équipe Handyra' : 'Vous'}</div>{c.content}</div>)}
      {f.canReply && (<>
        <textarea className={s.input} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Ajouter une précision…" />
        <button className={s.btn} style={{ marginTop: 8 }} disabled={!txt.trim() || m.isPending} onClick={() => m.mutate()}>Envoyer</button>
        <Err e={m.error} />
      </>)}
    </Shell>
  )
}

export default function Portal() {
  const { token } = useParams()
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
