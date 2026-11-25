import { useState, useEffect, useMemo } from 'react'
import { Save, X, AlertCircle } from 'lucide-react'
import { Input, Select } from '../../../components/ui'
import { DocsDrawer } from '../../../components/docs'
import {
  FEATURE_STATUS, FEATURE_PRIORITY, FEATURE_COMPLEXITY,
  MODULE_SUGGESTIONS, toSelectOptions,
} from '../../../hooks/docs'
import styles from './FeatureDrawer.module.css'

const CODE_PATTERN = /^FEAT-[A-Z0-9][A-Z0-9-]*$/

const EMPTY_FORM = {
  code: '',
  name: '',
  module: '',
  summary: '',
  descriptionMd: '',
  status: 'PLANNED',
  priority: '',
  complexity: '',
}

const validate = (form, isEdit) => {
  const errors = {}
  if (!isEdit) {
    if (!form.code.trim()) errors.code = 'Le code est requis'
    else if (!CODE_PATTERN.test(form.code.trim()))
      errors.code = 'Format attendu : FEAT-XXX-001'
  }
  if (!form.name.trim()) errors.name = 'Le nom est requis'
  if (!form.module.trim()) errors.module = 'Le module est requis'
  return errors
}

export const FeatureDrawer = ({
  isOpen,
  onClose,
  feature,
  onSave,
  saving = false,
  existingModules = [],
}) => {
  const isEdit = !!feature

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Reset à l'ouverture
  useEffect(() => {
    if (!isOpen) return
    if (feature) {
      setForm({
        code: feature.code || '',
        name: feature.name || '',
        module: feature.module || '',
        summary: feature.summary || '',
        descriptionMd: feature.description_md || '',
        status: feature.status || 'PLANNED',
        priority: feature.priority || '',
        complexity: feature.complexity || '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
    setTouched({})
  }, [isOpen, feature])

  const setField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }))
    if (touched[key]) {
      const errs = validate({ ...form, [key]: value }, isEdit)
      setErrors((p) => ({ ...p, [key]: errs[key] }))
    }
  }

  const handleBlur = (key) => {
    setTouched((p) => ({ ...p, [key]: true }))
    const errs = validate(form, isEdit)
    setErrors((p) => ({ ...p, [key]: errs[key] }))
  }

  const handleSave = () => {
    const errs = validate(form, isEdit)
    setErrors(errs)
    setTouched({ code: true, name: true, module: true })
    if (Object.keys(errs).length > 0) return

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      module: form.module.trim(),
      summary: form.summary.trim() || null,
      descriptionMd: form.descriptionMd.trim() || null,
      status: form.status,
      priority: form.priority || null,
      complexity: form.complexity || null,
    }
    onSave(payload)
  }

  const moduleOptions = useMemo(() => {
    const set = new Set([
      ...MODULE_SUGGESTIONS,
      ...existingModules,
    ])
    return Array.from(set).sort().map((m) => ({ value: m, label: m }))
  }, [existingModules])

  const statusOptions = toSelectOptions(FEATURE_STATUS)
  const priorityOptions = [
    { value: '', label: '—' },
    ...toSelectOptions(FEATURE_PRIORITY),
  ]
  const complexityOptions = [
    { value: '', label: '—' },
    ...toSelectOptions(FEATURE_COMPLEXITY),
  ]

  return (
    <DocsDrawer
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={isEdit ? 'Édition' : 'Création'}
      title={isEdit ? 'Modifier la feature' : 'Nouvelle feature'}
      keyBadge={feature?.code ? { icon: null, label: feature.code } : null}
      saveLabel={isEdit ? 'Enregistrer' : 'Créer'}
      saving={saving}
      onSave={handleSave}
      width="lg"
    >
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Identité</span>

        <div className={styles.row}>
          <Input
            label="Code"
            required
            placeholder="FEAT-MISSIONS-001"
            value={form.code}
            onChange={(e) => setField('code', e.target.value)}
            onBlur={() => handleBlur('code')}
            error={errors.code}
            hint={!isEdit ? 'Format : FEAT-<MODULE>-<NNN> · non modifiable après création' : undefined}
            disabled={isEdit || saving}
            className={styles.mono}
          />
          <Input
            label="Module"
            required
            placeholder="MISSIONS"
            value={form.module}
            onChange={(e) => setField('module', e.target.value.toUpperCase())}
            onBlur={() => handleBlur('module')}
            error={errors.module}
            disabled={saving}
            list="module-suggestions"
          />
          <datalist id="module-suggestions">
            {moduleOptions.map((m) => (
              <option key={m.value} value={m.value} />
            ))}
          </datalist>
        </div>

        <Input
          label="Nom"
          required
          placeholder="Cycle de vie des missions"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          error={errors.name}
          disabled={saving}
        />

        <Input
          label="Résumé court"
          placeholder="Une phrase qui résume la feature"
          value={form.summary}
          onChange={(e) => setField('summary', e.target.value)}
          disabled={saving}
          hint="Affiché dans les listes et recherches"
        />
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Classification</span>

        <div className={styles.grid3}>
          <Select
            label="Statut"
            options={statusOptions}
            value={form.status}
            onChange={(v) => setField('status', v)}
            disabled={saving}
          />
          <Select
            label="Priorité"
            options={priorityOptions}
            value={form.priority}
            onChange={(v) => setField('priority', v)}
            disabled={saving}
          />
          <Select
            label="Complexité"
            options={complexityOptions}
            value={form.complexity}
            onChange={(v) => setField('complexity', v)}
            disabled={saving}
          />
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Description</span>
        <label className={styles.label}>Description détaillée (Markdown)</label>
        <textarea
          className={styles.textarea}
          value={form.descriptionMd}
          onChange={(e) => setField('descriptionMd', e.target.value)}
          placeholder="Décrivez la feature en Markdown…"
          rows={10}
          disabled={saving}
        />
      </section>

      {isEdit && (
        <div className={styles.editNote}>
          <AlertCircle size={14} />
          <span>
            Chaque modification est enregistrée dans le journal d'activité.
          </span>
        </div>
      )}
    </DocsDrawer>
  )
}