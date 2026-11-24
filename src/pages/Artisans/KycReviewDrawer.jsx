import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import {
  X, Shield, CheckCircle, XCircle, FileCheck, FileText, Camera, Eye, Download,
  AlertTriangle, Calendar, Lock, Info, ChevronDown,
} from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import { DOC_TYPE_LABEL, ID_DOC_LABEL, REJECTION_LABEL } from './kycLabels'
import styles from './KycReviewDrawer.module.css'

/* Pièces attendues pour pouvoir valider un dossier (le verso reste facultatif : passeport) */
const REQUIRED_DOCS = ['IDENTITY_FRONT', 'SELFIE_WITH_ID', 'IFU_DOCUMENT']

const CHECKLIST = [
  { id: 'identity', label: "Pièce d'identité lisible, en cours de validité et au nom de l'artisan" },
  { id: 'selfie', label: "Le selfie correspond à la photo de la pièce d'identité" },
  { id: 'ifu', label: "L'IFU saisi correspond au document fourni" },
]

const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const day = (v) => (v ? formatDate(v) : '—')

const docIcon = (type) => {
  if (String(type).startsWith('IDENTITY')) return FileCheck
  if (type === 'SELFIE_WITH_ID') return Camera
  return FileText
}

const openUrl = (url) => { if (url) window.open(url, '_blank', 'noopener,noreferrer') }
const downloadUrl = (url, name) => {
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = name || ''
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/* ─────────────────────────────────────────────
   Briques
───────────────────────────────────────────── */
const DocThumb = ({ doc }) => {
  const [failed, setFailed] = useState(false)
  const Icon = docIcon(doc.doc_type)
  const isImage = IMAGE_RE.test(doc.file_name || '') || IMAGE_RE.test(doc.file_url || '')

  if (isImage && doc.file_url && !failed) {
    return (
      <button
        type="button"
        className={styles.docThumbBtn}
        onClick={() => openUrl(doc.file_url)}
        aria-label="Agrandir le document"
        title="Ouvrir dans un nouvel onglet"
      >
        <img
          className={styles.docThumb}
          src={doc.file_url}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </button>
    )
  }
  return <span className={styles.docThumbIcon}><Icon size={18} /></span>
}

const DocRow = ({ doc, renderStatus }) => {
  const label = DOC_TYPE_LABEL[doc.doc_type] || doc.doc_type || 'Document'
  return (
    <li className={styles.docRow}>
      <DocThumb doc={doc} />
      <div className={styles.docInfo}>
        <span className={styles.docName} title={doc.file_name || label}>{label}</span>
        <span className={styles.docMeta}>
          {doc.file_name ? `${doc.file_name} · ` : ''}{day(doc.uploaded_at)}
        </span>
        {renderStatus && <span className={styles.docStatus}>{renderStatus(doc.review_status)}</span>}
        {doc.review_note && <span className={styles.docNote}>{doc.review_note}</span>}
      </div>
      <div className={styles.docActions}>
        <button
          type="button"
          className={styles.iconBtn}
          disabled={!doc.file_url}
          onClick={() => openUrl(doc.file_url)}
          aria-label="Ouvrir" title="Ouvrir"
        >
          <Eye size={15} />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          disabled={!doc.file_url}
          onClick={() => downloadUrl(doc.file_url, doc.file_name)}
          aria-label="Télécharger" title="Télécharger"
        >
          <Download size={15} />
        </button>
      </div>
    </li>
  )
}

const Fact = ({ label, children }) => (
  <div className={styles.fact}>
    <span className={styles.factLabel}>{label}</span>
    <span className={styles.factValue}>{children}</span>
  </div>
)

/* ─────────────────────────────────────────────
   Drawer de décision KYC

   Props
   - isOpen / onClose
   - artisan      : objet renvoyé par admin.artisan_detail (kyc_submission, kyc_documents, kyc_status, user…)
   - submitting   : état de chargement de la mutation
   - onSubmit     : ({ status, notes, rejectionCode, rejectionReason, internalNote }) => void
   - renderStatus : (status) => ReactNode — pastille de statut des documents (StatusPill de la page)
   - statusBadge  : ReactNode — pastille d'étape KYC de l'en-tête (repli : renderStatus(kyc_status))
───────────────────────────────────────────── */
const KycReviewDrawer = ({ isOpen, onClose, artisan, submitting = false, onSubmit, renderStatus, statusBadge }) => {
  const [decision, setDecision] = useState(null) // 'VALIDATED' | 'REJECTED' — aucun choix par défaut
  const [checks, setChecks] = useState({})
  const [rejectionCode, setRejectionCode] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [touched, setTouched] = useState(false)

  /* Formulaire vierge à chaque ouverture */
  useEffect(() => {
    if (!isOpen) return
    setDecision(null)
    setChecks({})
    setRejectionCode('')
    setRejectionReason('')
    setInternalNote('')
    setTouched(false)
  }, [isOpen])

  const sub = artisan?.kyc_submission || null
  const name = artisan?.user?.full_name || 'Artisan'
  const currentStatus = String(artisan?.kyc_status || '').toUpperCase()
  const alreadyValidated = currentStatus === 'VALIDATED'
  const attempt = num(sub?.attempt_number)

  /* Documents du dossier courant ; les anciennes tentatives sont repliées */
  const { currentDocs, previousDocs } = useMemo(() => {
    const all = artisan?.kyc_documents || []
    if (!attempt) return { currentDocs: all, previousDocs: [] }
    const isCurrent = (d) => d.attempt_number == null || Number(d.attempt_number) === attempt
    return { currentDocs: all.filter(isCurrent), previousDocs: all.filter((d) => !isCurrent(d)) }
  }, [artisan?.kyc_documents, attempt])

  const missingDocs = useMemo(
    () => REQUIRED_DOCS.filter((t) => !currentDocs.some((d) => d.doc_type === t)),
    [currentDocs]
  )

  /* Aucun document dans le dossier courant : aucune décision possible */
  const noDocs = currentDocs.length === 0
  /* Dossier jamais soumis par l'artisan (brouillon) : aucune décision possible */
  const isDraft = String(sub?.status || '').toUpperCase() === 'DRAFT'
  const blocked = noDocs || isDraft
  const allChecked = CHECKLIST.every((c) => checks[c.id])
  const needsReason = decision === 'REJECTED' && rejectionCode === 'OTHER'

  const errors = {}
  if (decision === 'VALIDATED' && !allChecked) errors.checks = 'Confirmez les trois points avant de valider'
  if (decision === 'REJECTED' && !rejectionCode) errors.code = 'Choisissez la cause du rejet'
  if (needsReason && !rejectionReason.trim()) errors.reason = 'Précisez le motif pour la cause « Autre »'

  const canSubmit = !blocked && !!decision && Object.keys(errors).length === 0 && !submitting

  const submit = () => {
    if (blocked) return
    setTouched(true)
    if (!canSubmit) return
    const reason = rejectionReason.trim()
    const note = internalNote.trim()
    onSubmit({
      status: decision,
      /* `notes` : champ historique du hook (motif si rejet, note interne sinon) */
      notes: (decision === 'REJECTED' ? reason || REJECTION_LABEL[rejectionCode] : note) || null,
      rejectionCode: decision === 'REJECTED' ? rejectionCode : null,
      rejectionReason: decision === 'REJECTED' ? reason || null : null,
      internalNote: note || null,
    })
  }

  const showErr = (key) => touched && errors[key]

  return (
    <Dialog
      open={isOpen}
      onClose={submitting ? () => {} : onClose}
      className={styles.drawerRoot}
      transition
    >
      <DialogBackdrop className={styles.drawerBackdrop} transition />

      <DialogPanel className={styles.drawerPanel} transition>
        {/* ── En-tête ── */}
        <header className={styles.drawerHeader}>
          <div className={styles.drawerHeaderContent}>
            <span className={styles.drawerEyebrow}>Vérification KYC</span>
            <DialogTitle className={styles.drawerTitle}>{name}</DialogTitle>
            <div className={styles.headerBadges}>
              {statusBadge ?? (renderStatus ? renderStatus(artisan?.kyc_status) : null)}
              {attempt && <span className={styles.attemptChip}>Tentative {attempt}</span>}
            </div>
          </div>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            disabled={submitting}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </header>

        {/* ── Corps ── */}
        <div className={styles.drawerBody}>
          {/* Alertes de contexte */}
          {isDraft && (
            <div className={`${styles.callout} ${styles.calloutDanger}`} role="alert">
              <AlertTriangle size={14} />
              <span>
                <strong>Dossier non soumis (brouillon).</strong> Impossible de valider ou de
                rejeter ce KYC tant que l'artisan ne l'a pas soumis.
              </span>
            </div>
          )}
          {noDocs && !isDraft && (
            <div className={`${styles.callout} ${styles.calloutDanger}`} role="alert">
              <AlertTriangle size={14} />
              <span>
                <strong>Aucun document fourni.</strong> Impossible de valider ou de rejeter
                ce KYC tant que l'artisan n'a pas déposé ses pièces.
              </span>
            </div>
          )}
          {!sub && !noDocs && (
            <div className={`${styles.callout} ${styles.calloutWarn}`}>
              <AlertTriangle size={14} />
              <span>Aucun dossier KYC n'a été soumis par cet artisan.</span>
            </div>
          )}
          {alreadyValidated && (
            <div className={styles.callout}>
              <Info size={14} />
              <span>Le KYC est déjà validé. Votre décision remplacera le statut actuel.</span>
            </div>
          )}

          {/* Résumé du dossier */}
          {sub && (
            <section className={styles.drawerSection}>
              <span className={styles.drawerSectionLabel}>Dossier</span>
              <div className={styles.factsGrid}>
                <Fact label="Pièce d'identité">
                  {ID_DOC_LABEL[sub.identity_doc_type] || sub.identity_doc_type || '—'}
                </Fact>
                <Fact label="IFU">
                  {sub.ifu_verified ? 'Vérifié' : 'Non vérifié'}
                </Fact>
                <Fact label="Soumis le"><Calendar size={11} /> {day(sub.submitted_at)}</Fact>
                <Fact label="Examiné le"><Calendar size={11} /> {day(sub.reviewed_at)}</Fact>
              </div>
              {sub.rejection_code && (
                <div className={styles.prevRejection}>
                  <span className={styles.factLabel}>Dernier rejet</span>
                  <span className={styles.prevRejectionText}>
                    {REJECTION_LABEL[sub.rejection_code] || sub.rejection_code}
                    {sub.rejection_reason ? ` — ${sub.rejection_reason}` : ''}
                  </span>
                </div>
              )}
              {sub.admin_internal_note && (
                <div className={styles.prevRejection}>
                  <span className={styles.factLabel}>Note interne existante</span>
                  <span className={styles.prevRejectionText}>{sub.admin_internal_note}</span>
                </div>
              )}
            </section>
          )}

          {/* Documents */}
          <section className={styles.drawerSection}>
            <span className={styles.drawerSectionLabel}>
              Documents <span className={styles.sectionCount}>{currentDocs.length}</span>
            </span>

            {!noDocs && missingDocs.length > 0 && (
              <div className={`${styles.callout} ${styles.calloutWarn}`}>
                <AlertTriangle size={14} />
                <span>
                  Pièces manquantes : {missingDocs.map((t) => DOC_TYPE_LABEL[t] || t).join(', ')}.
                </span>
              </div>
            )}

            {currentDocs.length === 0 ? (
              <div className={styles.emptyDocs}>Aucun document fourni</div>
            ) : (
              <ul className={styles.docList}>
                {currentDocs.map((d) => <DocRow key={d.id} doc={d} renderStatus={renderStatus} />)}
              </ul>
            )}

            {previousDocs.length > 0 && (
              <details className={styles.previous}>
                <summary>
                  <ChevronDown size={13} />
                  Tentatives précédentes ({previousDocs.length})
                </summary>
                <ul className={styles.docList}>
                  {previousDocs.map((d) => <DocRow key={d.id} doc={d} renderStatus={renderStatus} />)}
                </ul>
              </details>
            )}
          </section>

          {/* Décision */}
          <section className={styles.drawerSection}>
            <span className={styles.drawerSectionLabel}>
              Décision <span className={styles.drawerRequired}>*</span>
            </span>

            <div className={styles.decisionGrid} role="radiogroup" aria-label="Décision KYC">
              <button
                type="button"
                role="radio"
                aria-checked={decision === 'VALIDATED'}
                disabled={blocked}
                className={styles.decisionCard}
                data-tone="success"
                data-active={decision === 'VALIDATED'}
                onClick={() => setDecision('VALIDATED')}
              >
                <CheckCircle size={18} />
                <span className={styles.decisionTitle}>Valider</span>
                <span className={styles.decisionHint}>Le dossier est conforme</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={decision === 'REJECTED'}
                disabled={blocked}
                className={styles.decisionCard}
                data-tone="danger"
                data-active={decision === 'REJECTED'}
                onClick={() => setDecision('REJECTED')}
              >
                <XCircle size={18} />
                <span className={styles.decisionTitle}>Rejeter</span>
                <span className={styles.decisionHint}>L'artisan devra corriger</span>
              </button>
            </div>

            {touched && !decision && !blocked && (
              <span className={styles.drawerFieldError}>Choisissez une décision</span>
            )}
          </section>

          {/* Validation : checklist */}
          {decision === 'VALIDATED' && (
            <section className={styles.drawerSection}>
              <span className={styles.drawerSectionLabel}>Points de contrôle</span>
              <div className={styles.checkList}>
                {CHECKLIST.map((c) => (
                  <label key={c.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={!!checks[c.id]}
                      onChange={(e) => setChecks((p) => ({ ...p, [c.id]: e.target.checked }))}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
              {showErr('checks') && <span className={styles.drawerFieldError}>{errors.checks}</span>}
              {missingDocs.length > 0 && (
                <span className={styles.drawerFieldHint}>
                  Des pièces attendues manquent : vérifiez que la validation est bien justifiée.
                </span>
              )}
            </section>
          )}

          {/* Rejet : cause + motif */}
          {decision === 'REJECTED' && (
            <section className={styles.drawerSection}>
              <span className={styles.drawerSectionLabel}>
                Cause du rejet <span className={styles.drawerRequired}>*</span>
              </span>
              <div className={styles.reasonGrid}>
                {Object.entries(REJECTION_LABEL).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    className={styles.reasonChip}
                    data-active={rejectionCode === code}
                    onClick={() => setRejectionCode(code)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {showErr('code') && <span className={styles.drawerFieldError}>{errors.code}</span>}

              <div className={styles.drawerField}>
                <label className={styles.drawerFieldLabel} htmlFor="kyc-reason">
                  Message à l'artisan
                  {needsReason
                    ? <span className={styles.drawerRequired}>*</span>
                    : <span className={styles.drawerOptional}>optionnel</span>}
                </label>
                <textarea
                  id="kyc-reason"
                  className={[
                    styles.drawerTextarea,
                    showErr('reason') && styles.drawerInputError,
                  ].filter(Boolean).join(' ')}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ex : la photo de la CNI est floue, merci de la reprendre en pleine lumière"
                  rows={3}
                />
                {showErr('reason') && <span className={styles.drawerFieldError}>{errors.reason}</span>}
              </div>
            </section>
          )}

          {/* Note interne (visible des admins uniquement) */}
          {decision && (
            <section className={styles.drawerSection}>
              <div className={styles.drawerField}>
                <label className={styles.drawerFieldLabel} htmlFor="kyc-note">
                  <Lock size={12} />
                  Note interne
                  <span className={styles.drawerOptional}>optionnel</span>
                </label>
                <textarea
                  id="kyc-note"
                  className={styles.drawerTextarea}
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Visible par l'équipe uniquement"
                  rows={2}
                />
              </div>
            </section>
          )}

          <div className={styles.drawerNotice}>
            <Shield size={14} />
            <span>
              {decision === 'REJECTED'
                ? "L'artisan sera notifié du rejet et pourra soumettre un nouveau dossier, dans la limite des tentatives autorisées."
                : decision === 'VALIDATED'
                  ? "L'artisan sera notifié et pourra recevoir des missions dès la validation."
                  : "La décision est enregistrée dans l'historique du dossier et ne peut pas passer inaperçue."}
            </span>
          </div>
        </div>

        {/* ── Pied ── */}
        <footer className={styles.drawerFooter}>
          <span className={styles.drawerFooterHint}><kbd>Échap</kbd> pour annuler</span>
          <div className={styles.drawerFooterActions}>
            <button type="button" className={styles.drawerBtnSecondary} onClick={onClose} disabled={submitting}>
              Annuler
            </button>
            <button
              type="button"
              className={styles.drawerBtnPrimary}
              data-tone={decision === 'REJECTED' ? 'danger' : decision === 'VALIDATED' ? 'success' : 'neutral'}
              onClick={submit}
              disabled={submitting || !decision || blocked}
              title={isDraft ? 'Dossier non soumis' : noDocs ? 'Aucun document fourni' : undefined}
            >
              {submitting ? (
                <>
                  <span className={styles.drawerSpinner} />
                  Enregistrement…
                </>
              ) : decision === 'REJECTED' ? (
                <><XCircle size={14} />Rejeter le KYC</>
              ) : decision === 'VALIDATED' ? (
                <><CheckCircle size={14} />Valider le KYC</>
              ) : (
                <><Shield size={14} />Confirmer</>
              )}
            </button>
          </div>
        </footer>
      </DialogPanel>
    </Dialog>
  )
}

export default KycReviewDrawer