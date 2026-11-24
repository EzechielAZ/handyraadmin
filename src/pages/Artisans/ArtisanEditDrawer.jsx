import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog, DialogBackdrop, DialogPanel, DialogTitle,
} from '@headlessui/react'
import {
  X, Save, AlertTriangle, ShieldCheck, UserCircle, User, Briefcase,
  FileText,
} from 'lucide-react'
import { Input, Select, Spinner } from '../../components/ui'
import styles from './ArtisanEditDrawer.module.css'

const NONE = '__none__'

const LANG_OPTIONS = [
  { value: 'FR', label: 'Français' },
  { value: 'EN', label: 'Anglais' },
  { value: 'EN,FR', label: 'Français · Anglais' },
]
const GENDER_OPTIONS = [
  { value: 'M', label: 'Homme' },
  { value: 'F', label: 'Femme' },
]

const t = (s) => String(s ?? '').trim()

/* Un IFU « PENDING… » (PENDING, PENDING_, PENDING_xxx, pending-foo…) est un placeholder :
   il n'est pas soumis au format 14 chiffres et n'a pas de sens à « re-vérifier ». */
const isPendingIfu = (v) => /^PENDING/i.test(t(v))

const toForm = (a) => ({
  full_name: a.user?.full_name ?? '',
  phone_number: a.user?.phone_number ?? '',
  removeAvatar: false,
  bio: a.bio ?? '',
  experience_years: String(a.experience_years ?? 0),
  language_spoken: a.language_spoken ?? '',
  gender: a.gender ?? '',
  category_id: a.category?.id_category ?? '',
  ifu_number: a.ifu_number ?? '',
  badge_id: a.badge?.id_badge ?? NONE,
  is_pro_member: !!a.is_pro_member,
})

/* Ne renvoie que les champs réellement modifiés */
const buildPayload = (f, i) => {
  const p = {}
  if (t(f.full_name) !== t(i.full_name)) p.full_name = t(f.full_name)
  if (t(f.phone_number) !== t(i.phone_number)) p.phone_number = t(f.phone_number)
  if (f.removeAvatar) p.avatar_url = null
  if (t(f.bio) !== t(i.bio)) p.bio = t(f.bio) || null
  if (Number(f.experience_years) !== Number(i.experience_years)) p.experience_years = Number(f.experience_years)
  if (f.language_spoken !== i.language_spoken && f.language_spoken) p.language_spoken = f.language_spoken
  if (f.gender !== i.gender && f.gender) p.gender = f.gender
  if (f.category_id !== i.category_id && f.category_id) p.category_id = f.category_id
  if (t(f.ifu_number) !== t(i.ifu_number)) p.ifu_number = t(f.ifu_number)
  if (f.badge_id !== i.badge_id) p.current_badge_id = f.badge_id === NONE ? null : f.badge_id
  if (f.is_pro_member !== i.is_pro_member) p.is_pro_member = f.is_pro_member
  return p
}

const validate = (f) => {
  const e = {}
  if (!t(f.full_name)) e.full_name = 'Nom obligatoire'
  if (!t(f.phone_number)) e.phone_number = 'Téléphone obligatoire'
  const exp = Number(f.experience_years)
  if (f.experience_years === '' || !Number.isInteger(exp) || exp < 0 || exp > 70) {
    e.experience_years = 'Entier entre 0 et 70'
  }
  const ifu = t(f.ifu_number)
  if (!isPendingIfu(ifu) && !/^[0-9]{14}$/.test(ifu)) {
    e.ifu_number = "L'IFU doit contenir 14 chiffres (ou être un placeholder PENDING_…)"
  }
  return e
}

const ArtisanEditDrawer = ({ isOpen, onClose, artisan, options, loadingOptions, saving, onSubmit }) => {
  const initial = useMemo(() => (artisan ? toForm(artisan) : null), [artisan])
  const [form, setForm] = useState(initial)
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  /* Réinitialise à l'ouverture seulement (un refetch ne doit pas écraser la saisie) */
  useEffect(() => {
    if (isOpen && initial) {
      setForm(initial)
      setReason('')
      setTouched(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const categoryOptions = useMemo(() => {
    const list = (options?.categories || []).map((c) => ({
      value: c.id,
      label: c.parent_name ? `${c.parent_name} › ${c.name}` : c.name,
    }))
    const cur = artisan?.category
    if (cur?.id_category && !list.some((o) => o.value === cur.id_category)) {
      list.unshift({ value: cur.id_category, label: cur.parent?.name ? `${cur.parent.name} › ${cur.name}` : cur.name })
    }
    return list
  }, [options, artisan])

  const badgeOptions = useMemo(() => {
    const list = [{ value: NONE, label: 'Aucun badge' }, ...(options?.badges || []).map((b) => ({ value: b.id, label: b.name }))]
    const cur = artisan?.badge
    if (cur?.id_badge && !list.some((o) => o.value === cur.id_badge)) list.push({ value: cur.id_badge, label: cur.name })
    return list
  }, [options, artisan])

  if (!initial) return null

  const payload = form ? buildPayload(form, initial) : {}
  const dirty = Object.keys(payload).length > 0
  const errors = form ? validate(form) : {}
  const hasErrors = Object.keys(errors).length > 0

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const setInput = (k) => (e) => set(k)(e.target.value)
  const err = (k) => (touched && errors[k] ? <span className={styles.drawerFieldError}>{errors[k]}</span> : null)

  const withEmpty = (opts, value) => (value === '' ? [{ value: '', label: 'Non renseigné' }, ...opts] : opts)

  const submit = () => {
    setTouched(true)
    if (hasErrors || !dirty) return
    onSubmit(payload, reason.trim())
  }

  return (
    <Dialog
      open={isOpen}
      onClose={saving ? () => {} : onClose}
      className={styles.drawerRoot}
      transition
    >
      <DialogBackdrop className={styles.drawerBackdrop} transition />

      <DialogPanel className={styles.drawerPanel} transition>
        <header className={styles.drawerHeader}>
          <div className={styles.drawerHeaderContent}>
            <span className={styles.drawerEyebrow}>Édition du profil</span>
            <DialogTitle className={styles.drawerTitle}>Modifier l'artisan</DialogTitle>
            <span className={styles.drawerKeyBadge} title={artisan?.user?.full_name}>
              <UserCircle size={10} />
              {artisan?.user?.full_name || 'Artisan'}
            </span>
          </div>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            disabled={saving}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </header>

        {form && (
          <>
            <div className={styles.drawerBody}>
              <section className={styles.drawerSection}>
                <span className={styles.drawerSectionLabel}>
                  <User size={11} /> Identité
                </span>
                <Input label="Nom complet" value={form.full_name} onChange={setInput('full_name')} />
                {err('full_name')}
                <Input label="Téléphone" value={form.phone_number} onChange={setInput('phone_number')} />
                {err('phone_number')}
                {artisan.user?.avatar_url && (
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={form.removeAvatar}
                      onChange={(e) => set('removeAvatar')(e.target.checked)}
                    />
                    <span>Supprimer la photo de profil</span>
                  </label>
                )}
              </section>

              <section className={styles.drawerSection}>
                <span className={styles.drawerSectionLabel}>
                  <Briefcase size={11} /> Profil professionnel
                </span>
                <Select
                  label="Métier (catégorie)"
                  searchable
                  options={withEmpty(categoryOptions, form.category_id)}
                  value={form.category_id}
                  onChange={set('category_id')}
                  disabled={loadingOptions && categoryOptions.length === 0}
                />
                {form.category_id !== initial.category_id && (
                  <span className={styles.warn}>
                    <AlertTriangle size={12} /> Changer de métier peut affecter l'intitulé et le calcul HPRE.
                  </span>
                )}
                <div className={styles.row}>
                  <Select
                    label="Genre"
                    options={withEmpty(GENDER_OPTIONS, form.gender)}
                    value={form.gender}
                    onChange={set('gender')}
                  />
                  <Select
                    label="Langues"
                    options={withEmpty(LANG_OPTIONS, form.language_spoken)}
                    value={form.language_spoken}
                    onChange={set('language_spoken')}
                  />
                </div>
                <Input
                  label="Années d'expérience"
                  type="number"
                  value={form.experience_years}
                  onChange={setInput('experience_years')}
                />
                {err('experience_years')}
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="edit-bio">Bio</label>
                  <textarea
                    id="edit-bio"
                    className={styles.textarea}
                    rows={4}
                    value={form.bio}
                    onChange={setInput('bio')}
                    placeholder="Présentation de l'artisan"
                  />
                </div>
              </section>

              <section className={styles.drawerSection}>
                <span className={styles.drawerSectionLabel}>
                  <ShieldCheck size={11} /> Fiscalité & statut
                </span>
                <Input label="IFU" value={form.ifu_number} onChange={setInput('ifu_number')} />
                {err('ifu_number')}
                <span className={styles.hint}>
                  14 chiffres requis · un placeholder <code>PENDING_…</code> est accepté tant que l'IFU n'est pas définitif.
                </span>
                {t(form.ifu_number) !== t(initial.ifu_number) && !isPendingIfu(form.ifu_number) && (
                  <span className={styles.warn}>
                    <AlertTriangle size={12} /> L'IFU ne repasse pas en vérification : contrôle le dossier KYC.
                  </span>
                )}
                <Select
                  label="Badge"
                  options={badgeOptions}
                  value={form.badge_id}
                  onChange={set('badge_id')}
                  disabled={loadingOptions && badgeOptions.length <= 1}
                />
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.is_pro_member}
                    onChange={(e) => set('is_pro_member')(e.target.checked)}
                  />
                  <span>Membre PRO</span>
                </label>
              </section>

              <section className={styles.drawerSection}>
                <span className={styles.drawerSectionLabel}>
                  <FileText size={11} /> Traçabilité
                </span>
                <Input
                  label="Motif (enregistré dans l'historique)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex : correction demandée par l'artisan"
                />
              </section>

              {loadingOptions && (
                <div className={styles.loadingOpts}>
                  <Spinner size="sm" /> Chargement des listes…
                </div>
              )}

              {dirty && (
                <div className={styles.drawerMeta}>
                  <AlertTriangle size={12} />
                  <span>
                    {Object.keys(payload).length} modification{Object.keys(payload).length > 1 ? 's' : ''} en attente
                  </span>
                </div>
              )}

              <div className={styles.drawerNotice}>
                <ShieldCheck size={14} />
                <span>
                  Les modifications sont appliquées immédiatement et consignées dans l'historique d'audit.
                </span>
              </div>
            </div>

            <footer className={styles.drawerFooter}>
              <span className={styles.drawerFooterHint}>
                <kbd>Échap</kbd> pour annuler
              </span>
              <div className={styles.drawerFooterActions}>
                <button
                  type="button"
                  className={styles.drawerBtnSecondary}
                  onClick={onClose}
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className={styles.drawerBtnPrimary}
                  onClick={submit}
                  disabled={saving || !dirty}
                >
                  {saving ? (
                    <>
                      <span className={styles.drawerSpinner} />
                      Enregistrement…
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Enregistrer
                    </>
                  )}
                </button>
              </div>
            </footer>
          </>
        )}
      </DialogPanel>
    </Dialog>
  )
}

export default ArtisanEditDrawer