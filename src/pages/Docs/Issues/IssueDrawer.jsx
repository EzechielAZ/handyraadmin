import { useState, useEffect, useMemo } from 'react'
import { Input, Select } from '../../../components/ui'
import { DocsDrawer } from '../../../components/docs'
import {
  ISSUE_TYPE, ISSUE_SEVERITY, ISSUE_PRIORITY, ISSUE_STATUS,
  ISSUE_TRANSITIONS, canTransition, useModuleCodes, toSelectOptions,
} from '../../../hooks/docs'
import styles from './IssueDrawer.module.css'

const EMPTY_FORM = {
  issueType: 'BUG',
  title: '',
  descriptionMd: '',
  severity: '',
  priority: '',
  featureId: '',
  module: '',
  reproductionSteps: '',
  expectedBehavior: '',
  actualBehavior: '',
  environmentText: '',
  labels: '',
}

const validate = (form, isEdit) => {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Le titre est requis'
  if (!form.descriptionMd.trim()) errors.descriptionMd = 'La description est requise'
  return errors
}

export const IssueDrawer = ({ isOpen, onClose, issue, features, mutations }) => {
  const moduleCodes = useModuleCodes()
  const isEdit = !!issue
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [newStatus, setNewStatus] = useState('')
  const [transitionReason, setTransitionReason] = useState('')

  useEffect(() => {
    if (!isOpen) return
    if (issue) {
      setForm({
        issueType: issue.issue_type || 'BUG',
        title: issue.title || '',
        descriptionMd: issue.description_md || '',
        severity: issue.severity || '',
        priority: issue.priority || '',
        featureId: issue.feature_id || '',
        module: issue.module || '',
        reproductionSteps: issue.reproduction_steps || '',
        expectedBehavior: issue.expected_behavior || '',
        actualBehavior: issue.actual_behavior || '',
        environmentText: issue.environment
          ? JSON.stringify(issue.environment, null, 2)
          : '',
        labels: (issue.labels || []).join(', '),
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
    setNewStatus('')
    setTransitionReason('')
  }, [isOpen, issue])

  const setField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const handleSave = async () => {
    const errs = validate(form, isEdit)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    // Parse environment JSON si fourni
    let environment = null
    if (form.environmentText.trim()) {
      try {
        environment = JSON.parse(form.environmentText)
      } catch {
        setErrors((p) => ({ ...p, environmentText: 'JSON invalide' }))
        return
      }
    }

    const labels = form.labels
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean)

    try {
      if (isEdit) {
        const payload = {
          title: form.title.trim(),
          description_md: form.descriptionMd.trim(),
          severity: form.severity || null,
          priority: form.priority || null,
          module: form.module.trim() || null,
          reproduction_steps: form.reproductionSteps.trim() || null,
          expected_behavior: form.expectedBehavior.trim() || null,
          actual_behavior: form.actualBehavior.trim() || null,
          environment,
          labels,
          feature_id: form.featureId || null,
        }
        await mutations.update.mutateAsync({ id: issue.id_issue, payload })

        // Transition séparée si un nouveau statut a été choisi
        if (newStatus && newStatus !== issue.status) {
          await mutations.transition.mutateAsync({
            id: issue.id_issue,
            newStatus,
            reason: transitionReason.trim() || null,
          })
        }
      } else {
        await mutations.create.mutateAsync({
          issueType: form.issueType,
          title: form.title.trim(),
          descriptionMd: form.descriptionMd.trim(),
          severity: form.severity || null,
          priority: form.priority || null,
          featureId: form.featureId || null,
          module: form.module.trim() || null,
          reproductionSteps: form.reproductionSteps.trim() || null,
          environment,
          labels,
        })
      }
      onClose()
    } catch { /* toast géré */ }
  }

  const typeOptions     = toSelectOptions(ISSUE_TYPE)
  const severityOptions = [{ value: '', label: '—' }, ...toSelectOptions(ISSUE_SEVERITY)]
  const priorityOptions = [{ value: '', label: '—' }, ...toSelectOptions(ISSUE_PRIORITY)]

  const featureOptions = useMemo(() => [
    { value: '', label: '— Aucune —' },
    ...(features || []).map((f) => ({ value: f.id_feature, label: `${f.code} · ${f.name}` })),
  ], [features])

  // Transitions disponibles (uniquement en édition)
  const allowedTransitions = isEdit ? (ISSUE_TRANSITIONS[issue.status] || []) : []
  const transitionOptions = [
    { value: '', label: '— Ne pas changer —' },
    ...allowedTransitions.map((s) => ({
      value: s,
      label: ISSUE_STATUS[s]?.label || s,
    })),
  ]

  const saving = mutations.create.isPending || mutations.update.isPending || mutations.transition.isPending

  return (
    <DocsDrawer
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={isEdit ? 'Édition' : 'Création'}
      title={isEdit ? `Modifier ${issue.code}` : 'Nouvelle issue'}
      keyBadge={isEdit ? { icon: null, label: issue.code } : null}
      saveLabel={isEdit ? 'Enregistrer' : 'Créer'}
      saving={saving}
      onSave={handleSave}
      width="xl"
    >
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Identité</span>

        <div className={styles.row}>
          <Select
            label="Type"
            required
            options={typeOptions}
            value={form.issueType}
            onChange={(v) => setField('issueType', v)}
            disabled={isEdit || saving}
            hint={isEdit ? 'Immuable après création' : undefined}
          />
          <Input
            label="Module"
            placeholder="MISSIONS"
            value={form.module}
            onChange={(e) => setField('module', e.target.value.toUpperCase())}
            disabled={saving}
            list="module-suggestions-issue"
          />
          <datalist id="module-suggestions-issue">
            {moduleCodes.map((m) => <option key={m} value={m} />)}
          </datalist>
        </div>

        <Input
          label="Titre"
          required
          placeholder="Résumé en une ligne du problème ou besoin"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          error={errors.title}
          disabled={saving}
        />

        <div className={styles.row}>
          <Select
            label="Sévérité"
            options={severityOptions}
            value={form.severity}
            onChange={(v) => setField('severity', v)}
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
            label="Feature liée"
            options={featureOptions}
            value={form.featureId}
            onChange={(v) => setField('featureId', v)}
            searchable
            disabled={saving}
          />
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Description</span>

        <label className={styles.label}>
          Description détaillée (Markdown)
          <span className={styles.required}>*</span>
        </label>
        <textarea
          className={`${styles.textarea} ${errors.descriptionMd ? styles.textareaError : ''}`}
          value={form.descriptionMd}
          onChange={(e) => setField('descriptionMd', e.target.value)}
          placeholder="Contexte, impact, détails techniques…"
          rows={8}
          disabled={saving}
        />
        {errors.descriptionMd && <span className={styles.fieldError}>{errors.descriptionMd}</span>}
      </section>

      {form.issueType === 'BUG' && (
        <section className={styles.section}>
          <span className={styles.sectionLabel}>Reproduction (bug)</span>

          <label className={styles.label}>Étapes de reproduction</label>
          <textarea
            className={styles.textarea}
            value={form.reproductionSteps}
            onChange={(e) => setField('reproductionSteps', e.target.value)}
            placeholder="1. Aller sur…&#10;2. Cliquer sur…&#10;3. Observer…"
            rows={4}
            disabled={saving}
          />

          <div className={styles.row}>
            <div>
              <label className={styles.label}>Comportement attendu</label>
              <textarea
                className={styles.textarea}
                value={form.expectedBehavior}
                onChange={(e) => setField('expectedBehavior', e.target.value)}
                rows={3}
                disabled={saving}
              />
            </div>
            <div>
              <label className={styles.label}>Comportement observé</label>
              <textarea
                className={styles.textarea}
                value={form.actualBehavior}
                onChange={(e) => setField('actualBehavior', e.target.value)}
                rows={3}
                disabled={saving}
              />
            </div>
          </div>

          <label className={styles.label}>
            Environnement (JSON)
            <span className={styles.optional}>optionnel</span>
          </label>
          <textarea
            className={`${styles.textarea} ${styles.mono} ${errors.environmentText ? styles.textareaError : ''}`}
            value={form.environmentText}
            onChange={(e) => setField('environmentText', e.target.value)}
            placeholder={'{\n  "os": "iOS 17",\n  "app_version": "1.4.2",\n  "device": "iPhone 14"\n}'}
            rows={4}
            disabled={saving}
          />
          {errors.environmentText && <span className={styles.fieldError}>{errors.environmentText}</span>}
        </section>
      )}

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Classification</span>
        <Input
          label="Labels"
          placeholder="bug, regression, urgent (séparés par virgule)"
          value={form.labels}
          onChange={(e) => setField('labels', e.target.value)}
          disabled={saving}
        />
      </section>

      {isEdit && allowedTransitions.length > 0 && (
        <section className={`${styles.section} ${styles.transitionSection}`}>
          <span className={styles.sectionLabel}>Changer le statut</span>

          <div className={styles.transitionBanner}>
            <span className={styles.transitionCurrent}>
              Statut actuel :
              <strong>{ISSUE_STATUS[issue.status]?.label || issue.status}</strong>
            </span>
          </div>

          <div className={styles.row}>
            <Select
              label="Nouveau statut"
              options={transitionOptions}
              value={newStatus}
              onChange={setNewStatus}
              disabled={saving}
            />
            {newStatus && (
              <Input
                label="Raison (optionnel)"
                placeholder="Contexte du changement"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                disabled={saving}
              />
            )}
          </div>
        </section>
      )}
    </DocsDrawer>
  )
}