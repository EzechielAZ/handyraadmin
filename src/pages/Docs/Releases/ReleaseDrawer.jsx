import { useState, useEffect } from 'react'
import { Input, Select } from '../../../components/ui'
import { DocsDrawer } from '../../../components/docs'
import {
  RELEASE_TYPE, toSelectOptions,
} from '../../../hooks/docs'
import {
  useReleaseMutations, useReleases,
} from '../../../hooks/docs'
import styles from './ReleaseDrawer.module.css'

const SEMVER = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/

const EMPTY_FORM = {
  version: '',
  codename: '',
  releaseType: 'MINOR',
  targetDate: '',
  summary: '',
  objectivesMd: '',
  previousReleaseId: '',
}

const validate = (form) => {
  const errors = {}
  if (!form.version.trim()) errors.version = 'La version est requise'
  else if (!SEMVER.test(form.version.trim()))
    errors.version = 'Format semver requis (ex : 1.5.0 ou 2.0.0-rc1)'
  if (!form.releaseType) errors.releaseType = 'Le type est requis'
  return errors
}

export const ReleaseDrawer = ({ isOpen, onClose, release }) => {
  const isEdit = !!release
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const mutations = useReleaseMutations()

  // Liste des releases passées pour "previous_release"
  const { releases: allReleases } = useReleases({ pageSize: 100 })

  useEffect(() => {
    if (!isOpen) return
    if (release) {
      setForm({
        version: release.version || '',
        codename: release.codename || '',
        releaseType: release.release_type || 'MINOR',
        targetDate: release.target_date?.slice(0, 10) || '',
        summary: release.summary || '',
        objectivesMd: release.objectives_md || '',
        previousReleaseId: release.previous_release_id || '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
  }, [isOpen, release])

  const setField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const handleSave = async () => {
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      if (isEdit) {
        const payload = {
          codename: form.codename.trim() || null,
          summary: form.summary.trim() || null,
          objectives_md: form.objectivesMd.trim() || null,
          target_date: form.targetDate || null,
        }
        await mutations.update.mutateAsync({ id: release.id_release, payload })
      } else {
        await mutations.create.mutateAsync({
          version: form.version.trim(),
          releaseType: form.releaseType,
          codename: form.codename.trim() || null,
          targetDate: form.targetDate || null,
          summary: form.summary.trim() || null,
          objectivesMd: form.objectivesMd.trim() || null,
          previousReleaseId: form.previousReleaseId || null,
        })
      }
      onClose()
    } catch { /* toast géré */ }
  }

  const typeOptions = toSelectOptions(RELEASE_TYPE)
  const previousOptions = [
    { value: '', label: '— Aucune —' },
    ...(allReleases || [])
      .filter((r) => !release || r.id_release !== release.id_release)
      .map((r) => ({ value: r.id_release, label: `v${r.version}${r.codename ? ` · ${r.codename}` : ''}` })),
  ]

  const saving = mutations.create.isPending || mutations.update.isPending

  return (
    <DocsDrawer
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={isEdit ? 'Édition' : 'Création'}
      title={isEdit ? `Modifier v${release.version}` : 'Nouvelle release'}
      keyBadge={isEdit ? { icon: null, label: `v${release.version}` } : null}
      saveLabel={isEdit ? 'Enregistrer' : 'Créer'}
      saving={saving}
      onSave={handleSave}
      width="lg"
    >
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Identité</span>

        <div className={styles.row}>
          <Input
            label="Version"
            required
            placeholder="1.5.0"
            value={form.version}
            onChange={(e) => setField('version', e.target.value)}
            error={errors.version}
            disabled={isEdit || saving}
            hint={!isEdit ? 'Semver (major.minor.patch)' : 'Non modifiable après création'}
            className={styles.mono}
          />
          <Select
            label="Type"
            required
            options={typeOptions}
            value={form.releaseType}
            onChange={(v) => setField('releaseType', v)}
            error={errors.releaseType}
            disabled={isEdit || saving}
          />
        </div>

        <Input
          label="Codename"
          placeholder="Ex : Vague du Fleuve"
          value={form.codename}
          onChange={(e) => setField('codename', e.target.value)}
          disabled={saving}
          hint="Optionnel — un nom pour identifier la release"
        />

        <div className={styles.row}>
          <Input
            label="Date cible"
            type="date"
            value={form.targetDate}
            onChange={(e) => setField('targetDate', e.target.value)}
            disabled={saving}
          />
          {!isEdit && (
            <Select
              label="Release précédente"
              options={previousOptions}
              value={form.previousReleaseId}
              onChange={(v) => setField('previousReleaseId', v)}
              disabled={saving}
              hint="Optionnel"
            />
          )}
        </div>

        <Input
          label="Résumé"
          placeholder="Une phrase qui résume l'objectif de la release"
          value={form.summary}
          onChange={(e) => setField('summary', e.target.value)}
          disabled={saving}
        />
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Objectifs (Markdown)</span>
        <label className={styles.label}>Narratif global</label>
        <textarea
          className={styles.textarea}
          value={form.objectivesMd}
          onChange={(e) => setField('objectivesMd', e.target.value)}
          placeholder="Expliquez la vision de cette release. Les objectifs structurés se gèrent dans l'onglet Objectifs de la release."
          rows={6}
          disabled={saving}
        />
      </section>
    </DocsDrawer>
  )
}