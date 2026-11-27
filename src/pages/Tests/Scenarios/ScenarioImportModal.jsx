import { useState, useRef } from 'react'
import { Upload, Download, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Modal, Button } from '../../../components/ui'
import { STARTER_PACK } from './starterPack'
import styles from '../Tests.module.css'
import local from './Scenarios.module.css'

const TEMPLATE = [{
  code: 'MON-001', title: 'Titre du scénario', summary: 'Ce que le scénario valide', module: 'AUTH',
  profile: 'CLIENT', priority: 'P1', scenarioType: 'FUNCTIONAL', status: 'READY', estimatedMinutes: 5,
  tags: ['exemple'], preconditionsMd: 'Pré-requis éventuels', testDataMd: '',
  steps: [{ actionMd: 'Première action', expectedMd: 'Résultat attendu' }],
}]

const download = (name, data) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

export const ScenarioImportModal = ({ isOpen, onClose, mutations }) => {
  const [text, setText] = useState('')
  const [parseError, setParseError] = useState('')
  const [report, setReport] = useState(null) // résultat du dry-run
  const fileRef = useRef(null)
  const { importItems } = mutations

  const reset = () => { setText(''); setParseError(''); setReport(null) }
  const close = () => { reset(); onClose() }

  const parse = () => {
    try {
      const v = JSON.parse(text)
      const items = Array.isArray(v) ? v : v?.scenarios
      if (!Array.isArray(items)) throw new Error('Le JSON doit être une liste de scénarios')
      if (items.length === 0) throw new Error('La liste est vide')
      if (items.length > 300) throw new Error('Maximum 300 scénarios par import')
      setParseError('')
      return items
    } catch (e) { setParseError(e.message); return null }
  }

  const verify = async () => {
    const items = parse(); if (!items) return
    try { setReport(await importItems.mutateAsync({ items, dryRun: true })) } catch { /* toast */ }
  }
  const doImport = async () => {
    const items = parse(); if (!items) return
    try { await importItems.mutateAsync({ items, dryRun: false }); close() } catch { /* toast */ }
  }
  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setText(await f.text()); setReport(null); e.target.value = ''
  }
  const loadStarter = () => { setText(JSON.stringify(STARTER_PACK, null, 2)); setReport(null); setParseError('') }

  const busy = importItems.isPending
  return (
    <Modal isOpen={isOpen} onClose={close} title="Importer des scénarios" size="lg"
      footer={<>
        <Button variant="outline" onClick={close} disabled={busy}>Fermer</Button>
        <Button variant="outline" onClick={verify} disabled={!text.trim() || busy} isLoading={busy}>Vérifier</Button>
        <Button variant="primary" onClick={doImport} disabled={!text.trim() || busy || (report && report.created === 0)}>Importer</Button>
      </>}>
      <div className={styles.formSection}>
        <p className={styles.hint} style={{ margin: 0 }}>
          Collez une liste JSON de scénarios ou chargez un fichier. Un scénario dont le <code>code</code> existe déjà est ignoré :
          vous pouvez rejouer le même import sans risque. Les lignes en erreur n'empêchent pas l'import des autres.
        </p>
        <div className={local.actionsRow}>
          <Button variant="outline" size="sm" icon={Upload} onClick={() => fileRef.current?.click()}>Choisir un fichier .json</Button>
          <Button variant="outline" size="sm" icon={Sparkles} onClick={loadStarter}>Pack de démarrage ({STARTER_PACK.length})</Button>
          <Button variant="outline" size="sm" icon={Download} onClick={() => download('modele-scenarios.json', TEMPLATE)}>Télécharger un modèle</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>
        <textarea className={`${styles.textarea} ${local.codeArea}`} value={text} spellCheck={false}
          aria-label="JSON des scénarios" placeholder='[ { "title": "…", "steps": [ { "actionMd": "…", "expectedMd": "…" } ] } ]'
          onChange={(e) => { setText(e.target.value); setReport(null); setParseError('') }} />
        {parseError && <span className={styles.fieldError} role="alert">JSON invalide : {parseError}</span>}

        {report && (
          <div className={`${styles.banner} ${report.errors.length ? styles.bannerWarn : styles.bannerInfo}`} style={{ marginBottom: 0 }} role="status">
            {report.errors.length ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <div className={local.result}>
              <strong>{report.created} à créer · {report.skipped} déjà présent(s) · {report.errors.length} erreur(s)</strong>
              {report.errors.slice(0, 15).map((er) => (
                <span key={er.index} className={local.resultErr}>Ligne {er.index} « {er.title || '—'} » : {er.error}</span>
              ))}
              {report.errors.length > 15 && <span className={styles.hint}>… et {report.errors.length - 15} autres</span>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ScenarioImportModal
