import { useState, useEffect } from 'react'
import { Input, Select } from '../../../components/ui'
import { DocsDrawer } from '../../../components/docs'
import { useTestFindingMutations, FINDING_TYPE, FINDING_SEVERITY, toSelectOptions } from '../../../hooks/tests'
import styles from '../Tests.module.css'

const EMPTY = { findingType: 'BUG', severity: '', title: '', descriptionMd: '', reproductionSteps: '', expectedBehavior: '', actualBehavior: '' }

/** Saisie d'un retour par un administrateur (observation directe, testeur hors portail). */
export const FindingDrawer = ({ isOpen, onClose, campaignId, runId }) => {
  const { create } = useTestFindingMutations()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- réinitialisation à l'ouverture
    if (isOpen) { setForm(EMPTY); setErrors({}) }
  }, [isOpen])

  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); if (errors[k]) setErrors((p) => ({ ...p, [k]: '' })) }

  const save = async () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Le titre est requis'
    if (!form.descriptionMd.trim()) e.descriptionMd = 'La description est requise'
    setErrors(e)
    if (Object.keys(e).length) return
    try {
      await create.mutateAsync({
        campaignId, runId: runId || null, findingType: form.findingType, severity: form.severity || null,
        title: form.title.trim(), descriptionMd: form.descriptionMd.trim(),
        reproductionSteps: form.reproductionSteps, expectedBehavior: form.expectedBehavior, actualBehavior: form.actualBehavior,
      })
      onClose()
    } catch { /* toast */ }
  }

  const area = (key, label, rows = 3, ph = '') => (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={`fd-${key}`}>{label}</label>
      <textarea id={`fd-${key}`} className={styles.textarea} rows={rows} value={form[key]} placeholder={ph} onChange={(e) => set(key, e.target.value)} />
      {errors[key] && <span className={styles.fieldError}>{errors[key]}</span>}
    </div>
  )

  return (
    <DocsDrawer isOpen={isOpen} onClose={onClose} width="lg" eyebrow="Tests de validation" title="Saisir un retour"
      saveLabel="Enregistrer" saving={create.isPending} onSave={save}>
      <div className={styles.formSection} style={{ gap: 16 }}>
        <div className={styles.row}>
          <Select label="Type" options={toSelectOptions(FINDING_TYPE)} value={form.findingType} onChange={(v) => set('findingType', v)} />
          <Select label="Gravité" value={form.severity} onChange={(v) => set('severity', v)}
            options={[{ value: '', label: 'À définir au triage' }, ...toSelectOptions(FINDING_SEVERITY)]} />
        </div>
        <Input label="Titre" required value={form.title} error={errors.title} onChange={(e) => set('title', e.target.value)}
          placeholder="L'app se ferme quand j'ajoute une 4e photo" />
        {area('descriptionMd', 'Description', 4, 'Ce qui s\'est passé, dans vos mots.')}
        {area('reproductionSteps', 'Étapes pour reproduire', 3)}
        {area('expectedBehavior', 'Comportement attendu', 2)}
        {area('actualBehavior', 'Comportement constaté', 2)}
        {runId && <p className={styles.hint}>Ce retour sera rattaché à l'exécution sélectionnée.</p>}
      </div>
    </DocsDrawer>
  )
}

export default FindingDrawer
