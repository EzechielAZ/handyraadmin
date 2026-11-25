import { useState, useEffect } from 'react'
import { Input, Select } from '../../../components/ui'
import { DocsDrawer } from '../../../components/docs'
import { useAdrMutations, ADR_STATUS, toSelectOptions } from '../../../hooks/docs'
import styles from './AdrDrawer.module.css'

const EMPTY_FORM = {
  title: '',
  status: 'PROPOSED',
  contextMd: '',
  decisionMd: '',
  consequencesMd: '',
  alternativesMd: '',
}

const validate = (form) => {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Le titre est requis'
  if (!form.contextMd.trim()) errors.contextMd = 'Le contexte est requis'
  if (!form.decisionMd.trim()) errors.decisionMd = 'La décision est requise'
  return errors
}

export const AdrDrawer = ({ isOpen, onClose, adr }) => {
  const isEdit = !!adr
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const mutations = useAdrMutations()

  useEffect(() => {
    if (!isOpen) return
    if (adr) {
      setForm({
        title: adr.title || '',
        status: adr.status || 'PROPOSED',
        contextMd: adr.context_md || '',
        decisionMd: adr.decision_md || '',
        consequencesMd: adr.consequences_md || '',
        alternativesMd: adr.alternatives_considered_md || '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
  }, [isOpen, adr])

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
          title: form.title.trim(),
          status: form.status,
          context_md: form.contextMd.trim(),
          decision_md: form.decisionMd.trim(),
          consequences_md: form.consequencesMd.trim() || null,
          alternatives_considered_md: form.alternativesMd.trim() || null,
        }
        await mutations.update.mutateAsync({ id: adr.id_adr, payload })
      } else {
        await mutations.create.mutateAsync({
          title: form.title.trim(),
          contextMd: form.contextMd.trim(),
          decisionMd: form.decisionMd.trim(),
          consequencesMd: form.consequencesMd.trim() || null,
          alternativesMd: form.alternativesMd.trim() || null,
        })
      }
      onClose()
    } catch { /* toast */ }
  }

  const statusOptions = toSelectOptions(ADR_STATUS)
  const saving = mutations.create.isPending || mutations.update.isPending

  return (
    <DocsDrawer
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={isEdit ? 'Édition' : 'Création'}
      title={isEdit ? `ADR-${String(adr.number).padStart(3, '0')} · ${adr.title}` : 'Nouvel ADR'}
      keyBadge={isEdit ? { icon: null, label: `ADR-${String(adr.number).padStart(3, '0')}` } : null}
      saveLabel={isEdit ? 'Enregistrer' : 'Créer'}
      saving={saving}
      onSave={handleSave}
      width="xl"
    >
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Identité</span>

        <Input
          label="Titre"
          required
          placeholder="Ex : Adoption de Supabase pour l'authentification"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          error={errors.title}
          disabled={saving}
        />

        {isEdit && (
          <Select
            label="Statut"
            options={statusOptions}
            value={form.status}
            onChange={(v) => setField('status', v)}
            disabled={saving}
          />
        )}
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Contenu (Markdown)</span>

        <label className={styles.label}>
          Contexte
          <span className={styles.required}>*</span>
        </label>
        <textarea
          className={`${styles.textarea} ${errors.contextMd ? styles.textareaError : ''}`}
          value={form.contextMd}
          onChange={(e) => setField('contextMd', e.target.value)}
          placeholder="Situation, contraintes, forces en présence…"
          rows={5}
          disabled={saving}
        />
        {errors.contextMd && <span className={styles.fieldError}>{errors.contextMd}</span>}

        <label className={styles.label}>
          Décision
          <span className={styles.required}>*</span>
        </label>
        <textarea
          className={`${styles.textarea} ${errors.decisionMd ? styles.textareaError : ''}`}
          value={form.decisionMd}
          onChange={(e) => setField('decisionMd', e.target.value)}
          placeholder="La décision prise, formulée clairement."
          rows={5}
          disabled={saving}
        />
        {errors.decisionMd && <span className={styles.fieldError}>{errors.decisionMd}</span>}

        <label className={styles.label}>
          Conséquences
          <span className={styles.optional}>optionnel</span>
        </label>
        <textarea
          className={styles.textarea}
          value={form.consequencesMd}
          onChange={(e) => setField('consequencesMd', e.target.value)}
          placeholder="Impacts positifs et négatifs, actions à prendre…"
          rows={4}
          disabled={saving}
        />

        <label className={styles.label}>
          Alternatives considérées
          <span className={styles.optional}>optionnel</span>
        </label>
        <textarea
          className={styles.textarea}
          value={form.alternativesMd}
          onChange={(e) => setField('alternativesMd', e.target.value)}
          placeholder="Options rejetées et pourquoi."
          rows={4}
          disabled={saving}
        />
      </section>
    </DocsDrawer>
  )
}