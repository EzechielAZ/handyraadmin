import { useState, useEffect, useMemo } from 'react'
import { Input, Select } from '../../../components/ui'
import { DocsDrawer } from '../../../components/docs'
import { useReleases } from '../../../hooks/docs'
import { PLATFORM, DEFAULT_EXIT_CRITERIA } from '../../../hooks/tests'
import styles from './CampaignDrawer.module.css'

const EMPTY = {
  name: '', descriptionMd: '', instructionsMd: '', releaseId: '', platforms: ['ANDROID', 'IOS'],
  appBuild: '', startsAt: '', endsAt: '', autoAssign: true,
  exitCriteria: { ...DEFAULT_EXIT_CRITERIA },
}

const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (v) => {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null)

const CRITERIA = [
  { key: 'minCoverage', label: 'Couverture minimale (%)', unit: '%',
    desc: 'Part des scénarios « requis » exécutés au moins une fois (réussis, échoués ou bloqués).' },
  { key: 'minPassRate', label: 'Taux de réussite minimal (%)', unit: '%',
    desc: 'Exécutions réussies ÷ (réussies + échecs + bloquées), sur la dernière tentative de chaque testeur.' },
  { key: 'maxOpenBlocker', label: 'Bugs bloquants ouverts (max)', unit: '',
    desc: 'Nombre maximum de bugs de gravité « Bloquant » encore non corrigés.' },
  { key: 'maxOpenCritical', label: 'Bugs critiques ouverts (max)', unit: '',
    desc: 'Nombre maximum de bugs de gravité « Critique » encore non corrigés.' },
]

export const CampaignDrawer = ({ isOpen, onClose, campaign, mutations, onSaved }) => {
  const isEdit = !!campaign
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const { releases } = useReleases({ pageSize: 100, sortBy: 'target_date' })

  useEffect(() => {
    if (!isOpen) return
    if (campaign) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initialisation du formulaire à l'ouverture
      setForm({
        name: campaign.name || '',
        descriptionMd: campaign.description_md || '',
        instructionsMd: campaign.instructions_md || '',
        releaseId: campaign.release_id || '',
        platforms: campaign.platforms || [],
        appBuild: campaign.app_build || '',
        startsAt: toLocalInput(campaign.starts_at),
        endsAt: toLocalInput(campaign.ends_at),
        autoAssign: campaign.auto_assign ?? true,
        exitCriteria: { ...DEFAULT_EXIT_CRITERIA, ...(campaign.exit_criteria || {}) },
      })
    } else {
      setForm({ ...EMPTY, exitCriteria: { ...DEFAULT_EXIT_CRITERIA } })
    }
    setErrors({})
  }, [isOpen, campaign])

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }))
  }
  const setCriterion = (k, v) => setForm((p) => ({ ...p, exitCriteria: { ...p.exitCriteria, [k]: v } }))
  const togglePlatform = (p) =>
    setField('platforms', form.platforms.includes(p) ? form.platforms.filter((x) => x !== p) : [...form.platforms, p])

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Le nom est requis'
    if (form.startsAt && form.endsAt && new Date(form.endsAt) < new Date(form.startsAt)) {
      e.endsAt = 'La fin doit suivre le début'
    }
    for (const k of ['minCoverage', 'minPassRate']) {
      const v = Number(form.exitCriteria[k])
      if (!Number.isFinite(v) || v < 0 || v > 100) e[k] = 'Entre 0 et 100'
    }
    for (const k of ['maxOpenBlocker', 'maxOpenCritical']) {
      const v = Number(form.exitCriteria[k])
      if (!Number.isInteger(v) || v < 0) e[k] = 'Entier ≥ 0'
    }
    return e
  }

  const handleSave = async () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    const payload = {
      name: form.name.trim(),
      descriptionMd: form.descriptionMd.trim(),
      instructionsMd: form.instructionsMd.trim(),
      releaseId: form.releaseId || null,
      platforms: form.platforms,
      appBuild: form.appBuild.trim(),
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      autoAssign: form.autoAssign,
      exitCriteria: {
        minCoverage: Number(form.exitCriteria.minCoverage),
        minPassRate: Number(form.exitCriteria.minPassRate),
        requireP0Passed: !!form.exitCriteria.requireP0Passed,
        maxOpenBlocker: Number(form.exitCriteria.maxOpenBlocker),
        maxOpenCritical: Number(form.exitCriteria.maxOpenCritical),
      },
    }
    try {
      const res = isEdit
        ? await mutations.update.mutateAsync({ id: campaign.id_campaign, payload })
        : await mutations.create.mutateAsync(payload)
      onSaved?.(res)
      onClose()
    } catch { /* toast géré par la mutation */ }
  }

  const releaseOptions = useMemo(() => [
    { value: '', label: '— Aucune release —' },
    ...(releases || []).map((r) => ({ value: r.id_release, label: `v${r.version}${r.name ? ` · ${r.name}` : ''}` })),
  ], [releases])

  const saving = mutations.create.isPending || mutations.update.isPending

  return (
    <DocsDrawer
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Tests de validation"
      title={isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'}
      keyBadge={isEdit ? { label: campaign.code } : undefined}
      saveLabel={isEdit ? 'Enregistrer' : 'Créer la campagne'}
      saving={saving}
      onSave={handleSave}
      width="xl"
    >
      <div className={styles.form}>
        <section className={styles.section}>
          <span className={styles.sectionLabel}>Général</span>
          <Input
            label="Nom de la campagne" required placeholder="Validation v1.0.0 — bêta fermée"
            value={form.name} onChange={(e) => setField('name', e.target.value)} error={errors.name}
          />
          <div className={styles.row}>
            <Select label="Release validée" options={releaseOptions} value={form.releaseId}
              onChange={(v) => setField('releaseId', v)} searchable />
            <Input label="Build de l'app" placeholder="1.0.0 (build 42)"
              value={form.appBuild} onChange={(e) => setField('appBuild', e.target.value)} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Plateformes testées</span>
            <div className={styles.platforms}>
              {Object.entries(PLATFORM).map(([k, cfg]) => (
                <label key={k} className={`${styles.chip} ${form.platforms.includes(k) ? styles.chipOn : ''}`}>
                  <input type="checkbox" checked={form.platforms.includes(k)} onChange={() => togglePlatform(k)} />
                  {cfg.label}
                </label>
              ))}
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="camp-start">Début <span className={styles.optional}>optionnel</span></label>
              <input id="camp-start" type="datetime-local" className={styles.dateInput}
                value={form.startsAt} onChange={(e) => setField('startsAt', e.target.value)} />
              <span className={styles.hint}>Renseigné automatiquement au lancement s'il est vide.</span>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="camp-end">Fin prévue <span className={styles.optional}>optionnel</span></label>
              <input id="camp-end" type="datetime-local" className={styles.dateInput}
                value={form.endsAt} onChange={(e) => setField('endsAt', e.target.value)} />
              {errors.endsAt && <span className={styles.fieldError}>{errors.endsAt}</span>}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="camp-desc">Description interne <span className={styles.optional}>Markdown</span></label>
            <textarea id="camp-desc" className={styles.textarea} value={form.descriptionMd}
              onChange={(e) => setField('descriptionMd', e.target.value)}
              placeholder="Objectifs, périmètre, ce qui est hors champ…" />
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionLabel}>Consignes aux testeurs</span>
          <p className={styles.sectionHint}>
            Affichées aux testeurs dans leur portail : comment installer l'app, quoi signaler, comment contacter l'équipe.
          </p>
          <textarea className={styles.textarea} rows={6} value={form.instructionsMd}
            onChange={(e) => setField('instructionsMd', e.target.value)}
            aria-label="Consignes aux testeurs"
            placeholder={'1. Installez le build depuis le lien reçu\n2. Suivez les scénarios dans l\'ordre\n3. Signalez tout comportement inattendu, même mineur'} />
        </section>

        <section className={styles.section}>
          <span className={styles.sectionLabel}>Distribution</span>
          <label className={styles.switchRow}>
            <input type="checkbox" checked={form.autoAssign} onChange={(e) => setField('autoAssign', e.target.checked)} />
            <span>
              <span className={styles.switchTitle}>Distribution automatique</span>
              <span className={styles.switchDesc} style={{ display: 'block' }}>
                À chaque nouveau testeur ou scénario ajouté pendant que la campagne est en cours, les exécutions
                correspondantes (selon le profil client/artisan) sont créées sans action de votre part.
              </span>
            </span>
          </label>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionLabel}>Critères de sortie (go / no-go)</span>
          <p className={styles.sectionHint}>
            Le verdict GO n'est donné que si tous les critères sont remplis. Il est recalculé en direct.
          </p>
          <div className={styles.criteria}>
            {CRITERIA.map((c) => (
              <div key={c.key} className={styles.criterion}>
                <div>
                  <div className={styles.criterionTitle}>{c.label}</div>
                  <div className={styles.criterionDesc}>{c.desc}</div>
                </div>
                <Input type="number" min={0} max={c.unit ? 100 : undefined} aria-label={c.label}
                  value={form.exitCriteria[c.key]} onChange={(e) => setCriterion(c.key, e.target.value)}
                  error={errors[c.key]} suffix={c.unit || undefined} />
              </div>
            ))}
            <label className={`${styles.criterion} ${styles.switchRow}`} style={{ border: 'none', borderTop: '1px solid var(--border)', borderRadius: 0, background: 'transparent' }}>
              <span>
                <span className={styles.criterionTitle}>Tous les scénarios P0 requis réussis</span>
                <span className={styles.criterionDesc} style={{ display: 'block' }}>
                  Un seul scénario critique en échec suffit à bloquer le GO, quel que soit le taux global.
                </span>
              </span>
              <input type="checkbox" checked={!!form.exitCriteria.requireP0Passed}
                onChange={(e) => setCriterion('requireP0Passed', e.target.checked)} />
            </label>
          </div>
          <button type="button" className={styles.reset}
            onClick={() => setForm((p) => ({ ...p, exitCriteria: { ...DEFAULT_EXIT_CRITERIA } }))}>
            Rétablir les valeurs par défaut
          </button>
        </section>
      </div>
    </DocsDrawer>
  )
}

export default CampaignDrawer
