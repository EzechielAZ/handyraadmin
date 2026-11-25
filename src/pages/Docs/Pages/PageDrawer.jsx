import { useState, useEffect, useMemo } from 'react'
import { Input, Select } from '../../../components/ui'
import { DocsDrawer } from '../../../components/docs'
import {
  PAGE_CATEGORY, PAGE_STATUS, PAGE_VISIBILITY, toSelectOptions,
} from '../../../hooks/docs'
import styles from './PageDrawer.module.css'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9/-]*$/

const EMPTY_FORM = {
  slug: '',
  title: '',
  category: 'PRD',
  visibility: 'INTERNAL',
  status: 'DRAFT',
  summary: '',
  contentMd: '',
  featureId: '',
  tags: '',
}

const validate = (form, isEdit) => {
  const errors = {}
  if (!isEdit) {
    if (!form.slug.trim()) errors.slug = 'Le slug est requis'
    else if (!SLUG_PATTERN.test(form.slug.trim()))
      errors.slug = 'Lettres minuscules, chiffres, / et - uniquement'
  }
  if (!form.title.trim()) errors.title = 'Le titre est requis'
  if (!form.contentMd.trim()) errors.contentMd = 'Le contenu est requis'
  return errors
}

export const PageDrawer = ({ isOpen, onClose, page, features, mutations }) => {
  const isEdit = !!page
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [changeSummary, setChangeSummary] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (page) {
      setForm({
        slug: page.slug || '',
        title: page.title || '',
        category: page.category || 'PRD',
        visibility: page.visibility || 'INTERNAL',
        status: page.status || 'DRAFT',
        summary: page.summary || '',
        contentMd: page.content_md || '',
        featureId: page.feature_id || '',
        tags: (page.tags || []).join(', '),
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
    setChangeSummary('')
    setShowPreview(false)
  }, [isOpen, page])

  const setField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const handleSave = async () => {
    const errs = validate(form, isEdit)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean)

    try {
      if (isEdit) {
        const payload = {
          title: form.title.trim(),
          content_md: form.contentMd,
          summary: form.summary.trim() || null,
          category: form.category,
          visibility: form.visibility,
          feature_id: form.featureId || null,
          tags,
        }
        await mutations.update.mutateAsync({
          id: page.id_page,
          payload,
          changeSummary: changeSummary.trim() || null,
        })
      } else {
        await mutations.create.mutateAsync({
          slug: form.slug.trim(),
          title: form.title.trim(),
          category: form.category,
          contentMd: form.contentMd,
          summary: form.summary.trim() || null,
          visibility: form.visibility,
          featureId: form.featureId || null,
          tags,
        })
      }
      onClose()
    } catch { /* toast */ }
  }

  const categoryOptions = toSelectOptions(PAGE_CATEGORY)
  const visibilityOptions = toSelectOptions(PAGE_VISIBILITY)

  const featureOptions = useMemo(() => [
    { value: '', label: '— Aucune —' },
    ...(features || []).map((f) => ({ value: f.id_feature, label: `${f.code} · ${f.name}` })),
  ], [features])

  const saving = mutations.create.isPending || mutations.update.isPending

  return (
    <DocsDrawer
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={isEdit ? `Édition · v${page.version_number}` : 'Création'}
      title={isEdit ? page.title : 'Nouvelle page'}
      keyBadge={isEdit ? { icon: null, label: page.slug } : null}
      saveLabel={isEdit ? 'Enregistrer' : 'Créer'}
      saving={saving}
      onSave={handleSave}
      width="xl"
    >
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Identité</span>

        <div className={styles.row}>
          <Input
            label="Slug"
            required
            placeholder="missions/cycle-de-vie"
            value={form.slug}
            onChange={(e) => setField('slug', e.target.value.toLowerCase())}
            error={errors.slug}
            disabled={isEdit || saving}
            hint={!isEdit ? 'URL-friendly · minuscules, / et -' : 'Immuable après création'}
            className={styles.mono}
          />
          <Input
            label="Titre"
            required
            placeholder="Cycle de vie d'une mission"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            error={errors.title}
            disabled={saving}
          />
        </div>

        <Input
          label="Résumé"
          placeholder="Une phrase qui résume le contenu"
          value={form.summary}
          onChange={(e) => setField('summary', e.target.value)}
          disabled={saving}
        />
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Classification</span>

        <div className={styles.row}>
          <Select
            label="Catégorie"
            required
            options={categoryOptions}
            value={form.category}
            onChange={(v) => setField('category', v)}
            disabled={saving}
            searchable
          />
          <Select
            label="Visibilité"
            options={visibilityOptions}
            value={form.visibility}
            onChange={(v) => setField('visibility', v)}
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

        <Input
          label="Tags"
          placeholder="onboarding, reference (séparés par virgule)"
          value={form.tags}
          onChange={(e) => setField('tags', e.target.value)}
          disabled={saving}
        />
      </section>

      <section className={styles.section}>
        <div className={styles.contentHeader}>
          <label className={styles.label}>
            Contenu (Markdown)
            <span className={styles.required}>*</span>
          </label>
          <button
            type="button"
            className={styles.previewToggle}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? 'Éditer' : 'Aperçu'}
          </button>
        </div>

        {showPreview ? (
          <pre className={styles.preview}>{form.contentMd || 'Rien à prévisualiser.'}</pre>
        ) : (
          <textarea
            className={`${styles.textarea} ${errors.contentMd ? styles.textareaError : ''}`}
            value={form.contentMd}
            onChange={(e) => setField('contentMd', e.target.value)}
            placeholder={'# Titre\n\nParagraphe…\n\n- Point 1\n- Point 2'}
            rows={18}
            disabled={saving}
          />
        )}
        {errors.contentMd && <span className={styles.fieldError}>{errors.contentMd}</span>}
      </section>

      {isEdit && (
        <section className={styles.section}>
          <Input
            label="Résumé du changement (optionnel)"
            placeholder="Ex : Ajout de la section sur les missions urgentes"
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            disabled={saving}
            hint="Sera enregistré dans l'historique des versions"
          />
        </section>
      )}
    </DocsDrawer>
  )
}