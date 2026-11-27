import { useState, useEffect, useMemo } from 'react'
import { Input, Select } from '../../../components/ui'
import { DocsDrawer } from '../../../components/docs'
import { useFeatures, MODULE_SUGGESTIONS } from '../../../hooks/docs'
import {
  SCENARIO_PROFILE, SCENARIO_PRIORITY, SCENARIO_TYPE, toSelectOptions,
} from '../../../hooks/tests'
import { StepsEditor } from './StepsEditor'
import styles from '../Tests.module.css'

const EMPTY = {
  title: '', summary: '', module: '', featureId: '', profile: 'ANY', priority: 'P2',
  scenarioType: 'FUNCTIONAL', estimatedMinutes: '', tags: '', preconditionsMd: '', testDataMd: '',
  status: 'DRAFT', steps: [{ actionMd: '', expectedMd: '' }],
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Brouillon — non distribuable' },
  { value: 'READY', label: 'Prêt — peut être ajouté à une campagne' },
]

export const ScenarioDrawer = ({ isOpen, onClose, scenario, steps, mutations, onSaved }) => {
  const isEdit = !!scenario
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [stepErrors, setStepErrors] = useState({})
  const { features } = useFeatures({ pageSize: 300 })

  useEffect(() => {
    if (!isOpen) return
    if (scenario) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initialisation du formulaire à l'ouverture
      setForm({
        title: scenario.title || '', summary: scenario.summary || '', module: scenario.module || '',
        featureId: scenario.feature_id || '', profile: scenario.profile, priority: scenario.priority,
        scenarioType: scenario.scenario_type, estimatedMinutes: scenario.estimated_minutes ?? '',
        tags: (scenario.tags || []).join(', '), preconditionsMd: scenario.preconditions_md || '',
        testDataMd: scenario.test_data_md || '', status: scenario.status === 'ARCHIVED' ? 'DRAFT' : scenario.status,
        steps: (steps || []).map((s) => ({ actionMd: s.action_md, expectedMd: s.expected_md })),
      })
    } else {
      setForm({ ...EMPTY, steps: [{ actionMd: '', expectedMd: '' }] })
    }
    setErrors({}); setStepErrors({})
  }, [isOpen, scenario, steps])

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }))
  }

  const validate = () => {
    const e = {}; const se = {}
    if (!form.title.trim()) e.title = 'Le titre est requis'
    if (form.estimatedMinutes !== '' && (!Number.isInteger(Number(form.estimatedMinutes)) || Number(form.estimatedMinutes) < 1)) {
      e.estimatedMinutes = 'Entier ≥ 1'
    }
    form.steps.forEach((s, i) => {
      if (!s.actionMd.trim() || !s.expectedMd.trim()) se[i] = 'Action et résultat attendu requis'
    })
    if (form.status === 'READY' && form.steps.length === 0) e.steps = 'Un scénario prêt doit avoir au moins une étape'
    setStepErrors(se)
    return { ...e, ...(Object.keys(se).length ? { steps: 'Complétez les étapes signalées' } : {}) }
  }

  const handleSave = async () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    const payload = {
      title: form.title.trim(), summary: form.summary.trim(), module: form.module.trim(),
      featureId: form.featureId || null, profile: form.profile, priority: form.priority,
      scenarioType: form.scenarioType,
      estimatedMinutes: form.estimatedMinutes === '' ? null : Number(form.estimatedMinutes),
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      preconditionsMd: form.preconditionsMd, testDataMd: form.testDataMd, status: form.status,
      steps: form.steps.map((s) => ({ actionMd: s.actionMd.trim(), expectedMd: s.expectedMd.trim() })),
    }
    try {
      const res = isEdit
        ? await mutations.update.mutateAsync({ id: scenario.id_scenario, payload })
        : await mutations.create.mutateAsync(payload)
      onSaved?.(res)
      onClose()
    } catch { /* toast géré par la mutation */ }
  }

  const featureOptions = useMemo(() => [
    { value: '', label: '— Aucune —' },
    ...(features || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .map((f) => ({ value: f.id_feature, label: `${f.code} · ${f.name}` })),
  ], [features])
  const moduleOptions = useMemo(() => {
    const set = new Set(MODULE_SUGGESTIONS)
    if (form.module) set.add(form.module.toUpperCase())
    return [{ value: '', label: '— Aucun —' }, ...[...set].sort().map((m) => ({ value: m, label: m }))]
  }, [form.module])

  const saving = mutations.create.isPending || mutations.update.isPending

  return (
    <DocsDrawer
      isOpen={isOpen} onClose={onClose} eyebrow="Tests de validation"
      title={isEdit ? 'Modifier le scénario' : 'Nouveau scénario'}
      keyBadge={isEdit ? { label: scenario.code } : undefined}
      saveLabel={isEdit ? 'Enregistrer' : 'Créer le scénario'} saving={saving} onSave={handleSave} width="xl"
    >
      <div className={styles.formSection} style={{ gap: 28 }}>
        {isEdit && (
          <div className={`${styles.banner} ${styles.bannerInfo}`} style={{ marginBottom: 0 }}>
            Modifier les étapes, les préconditions ou les données de test crée une nouvelle révision
            (actuellement r{scenario.revision}). Les exécutions déjà faites gardent la version qu'elles ont testée.
          </div>
        )}

        <section className={styles.formSection}>
          <span className={styles.formLabel}>Général</span>
          <Input label="Titre" required value={form.title} error={errors.title}
            placeholder="Publier une mission avec photos" onChange={(e) => setField('title', e.target.value)} />
          <div className={styles.field}>
            <label className={styles.label} htmlFor="scn-summary">Objectif <span className={styles.optional}>optionnel</span></label>
            <textarea id="scn-summary" className={styles.textarea} rows={2} value={form.summary}
              onChange={(e) => setField('summary', e.target.value)} placeholder="Ce que ce scénario valide, en une phrase." />
          </div>
          <div className={styles.row}>
            <Select label="Profil testeur" options={toSelectOptions(SCENARIO_PROFILE)} value={form.profile} onChange={(v) => setField('profile', v)} />
            <Select label="Priorité" options={toSelectOptions(SCENARIO_PRIORITY)} value={form.priority} onChange={(v) => setField('priority', v)} />
            <Select label="Type" options={toSelectOptions(SCENARIO_TYPE)} value={form.scenarioType} onChange={(v) => setField('scenarioType', v)} />
          </div>
          <div className={styles.row}>
            <Select label="Module" options={moduleOptions} value={form.module} onChange={(v) => setField('module', v)} searchable />
            <Select label="Feature liée" options={featureOptions} value={form.featureId} onChange={(v) => setField('featureId', v)} searchable />
            <Input label="Durée estimée (min)" type="number" min={1} value={form.estimatedMinutes}
              error={errors.estimatedMinutes} onChange={(e) => setField('estimatedMinutes', e.target.value)} />
          </div>
          <Input label="Tags" hint="Séparés par des virgules" value={form.tags} onChange={(e) => setField('tags', e.target.value)} />
        </section>

        <section className={styles.formSection}>
          <span className={styles.formLabel}>Contexte du test</span>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="scn-pre">Préconditions <span className={styles.optional}>Markdown</span></label>
            <textarea id="scn-pre" className={styles.textarea} rows={3} value={form.preconditionsMd}
              onChange={(e) => setField('preconditionsMd', e.target.value)}
              placeholder="Être connecté en tant que client, avoir une connexion data active…" />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="scn-data">Données de test <span className={styles.optional}>Markdown</span></label>
            <textarea id="scn-data" className={styles.textarea} rows={3} value={form.testDataMd}
              onChange={(e) => setField('testDataMd', e.target.value)}
              placeholder="Compte de test, numéro Mobile Money de test, photos à utiliser…" />
          </div>
        </section>

        <section className={styles.formSection}>
          <span className={styles.formLabel}>Étapes ({form.steps.length})</span>
          {errors.steps && <span className={styles.fieldError}>{errors.steps}</span>}
          <StepsEditor value={form.steps} errors={stepErrors}
            onChange={(steps) => { setForm((p) => ({ ...p, steps })); if (errors.steps) setErrors((p) => ({ ...p, steps: '' })) }} />
        </section>

        <section className={styles.formSection}>
          <span className={styles.formLabel}>Publication</span>
          <Select label="Statut" options={STATUS_OPTIONS} value={form.status} onChange={(v) => setField('status', v)} />
        </section>
      </div>
    </DocsDrawer>
  )
}

export default ScenarioDrawer
