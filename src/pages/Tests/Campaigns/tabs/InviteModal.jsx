import { useState, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal, Button, Select } from '../../../../components/ui'
import { notifyTester, TESTER_PROFILE, PLATFORM, buildInviteLink, toSelectOptions } from '../../../../hooks/tests'
import styles from '../../Tests.module.css'
import local from '../Campaigns.module.css'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PROFILE_WORDS = { client: 'CLIENT', artisan: 'ARTISAN', both: 'BOTH', les2: 'BOTH', 'les deux': 'BOTH' }
const PLATFORM_WORDS = { android: 'ANDROID', ios: 'IOS', iphone: 'IOS' }

/** « email, nom, profil, plateforme » — profil/plateforme reconnus où qu'ils soient dans la ligne. */
const parseInviteLines = (text, defaults) =>
  text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean)
    const email = parts.find((p) => p.includes('@')) || parts[0] || ''
    let profile = defaults.profile; let platform = defaults.platform; let fullName = ''
    parts.forEach((p) => {
      const k = p.toLowerCase()
      if (p === email) return
      if (PROFILE_WORDS[k]) profile = PROFILE_WORDS[k]
      else if (PLATFORM_WORDS[k]) platform = PLATFORM_WORDS[k]
      else if (!fullName) fullName = p
    })
    return { email: email.toLowerCase(), fullName, profile, platform: platform || undefined, valid: EMAIL_RE.test(email) }
  })

export const InviteModal = ({ isOpen, onClose, campaign, invite }) => {
  const [text, setText] = useState('')
  const [profile, setProfile] = useState('BOTH')
  const [platform, setPlatform] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState('')
  const [mail, setMail] = useState(true)

  const rows = useMemo(() => parseInviteLines(text, { profile, platform }), [text, profile, platform])
  const invalid = rows.filter((r) => !r.valid)
  const reset = () => { setText(''); setResult(null); setCopied('') }
  const close = () => { reset(); onClose() }

  const send = async () => {
    try {
      const res = await invite.mutateAsync({
        campaignId: campaign.id_campaign,
        items: rows.filter((r) => r.valid).map((r) => ({ email: r.email, fullName: r.fullName, profile: r.profile, platform: r.platform })),
      })
      setResult(res)
      if (mail && res.created?.length) {
        const out = await Promise.all(res.created.map((t) => notifyTester({ kind: 'INVITE', ref: t.id_tester, silent: true })))
        const ok = out.filter((o) => o.sent).length
        if (ok === out.length) toast.success(`${ok} e-mail(s) d'invitation envoyé(s)`)
        else toast.error(`${out.length - ok} e-mail(s) non envoyé(s) — copiez les liens ci-dessous`)
      }
    } catch { /* toast */ }
  }
  const copy = async (token, email) => {
    await navigator.clipboard.writeText(buildInviteLink(token))
    setCopied(email); toast.success('Lien copié'); setTimeout(() => setCopied(''), 1500)
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Inviter des testeurs" size="lg"
      footer={result
        ? <Button variant="primary" onClick={close}>Terminé</Button>
        : <>
            <Button variant="outline" onClick={close}>Annuler</Button>
            <Button variant="primary" onClick={send} isLoading={invite.isPending} disabled={rows.length === 0 || invalid.length > 0}>
              Inviter {rows.length > 0 ? `(${rows.length})` : ''}
            </Button>
          </>}>
      {!result ? (
        <div className={styles.formSection}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="inv-text">Un testeur par ligne</label>
            <textarea id="inv-text" className={styles.textarea} rows={7} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={'awa@exemple.com, Awa Dossou, client, android\nkoffi@exemple.com, Koffi, artisan, ios\nmarie@exemple.com'} />
            <span className={styles.hint}>Format : e-mail, nom, profil (client / artisan / both), plateforme (android / ios). Seul l'e-mail est obligatoire.</span>
          </div>
          <div className={styles.row}>
            <Select label="Profil par défaut" options={toSelectOptions(TESTER_PROFILE)} value={profile} onChange={setProfile} />
            <Select label="Plateforme par défaut" value={platform} onChange={setPlatform}
              options={[{ value: '', label: 'Non précisée' }, ...toSelectOptions(PLATFORM)]} />
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={mail} onChange={(e) => setMail(e.target.checked)} />
            Envoyer l'invitation par e-mail
          </label>
          {invalid.length > 0 && (
            <span className={styles.fieldError} role="alert">
              {invalid.length} ligne(s) sans e-mail valide : {invalid.slice(0, 3).map((r) => r.email || '(vide)').join(', ')}
            </span>
          )}
          {campaign.status === 'DRAFT' && (
            <p className={styles.hint}>La campagne n'est pas encore lancée : les exécutions seront distribuées au lancement.</p>
          )}
        </div>
      ) : (
        <div className={styles.stack} style={{ gap: 10 }}>
          <strong>{result.created.length} invité(s){result.runsCreated ? ` · ${result.runsCreated} exécution(s) distribuée(s)` : ''}</strong>
          {result.created.map((t) => (
            <div key={t.id_tester} className={local.invRow}>
              <div className={styles.titleCell}>
                <span className={styles.titlePrimary}>{t.email}</span>
                <span className={local.link}>{buildInviteLink(t.invite_token)}</span>
              </div>
              <Button variant="outline" size="sm" icon={copied === t.email ? Check : Copy} onClick={() => copy(t.invite_token, t.email)}>Copier</Button>
            </div>
          ))}
          {result.skipped.length > 0 && <span className={styles.hint}>Déjà invités (ignorés) : {result.skipped.map((s) => s.email).join(', ')}</span>}
          {result.errors.map((e) => <span key={e.index} className={styles.fieldError}>Ligne {e.index} ({e.email}) : {e.error}</span>)}
          <span className={styles.hint}>Vous pourrez retrouver ces liens dans la liste des testeurs.</span>
        </div>
      )}
    </Modal>
  )
}

export default InviteModal
