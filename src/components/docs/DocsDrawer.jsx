/**
 * Drawer générique pour les formulaires docs.
 * - Headless UI Dialog (focus trap, esc, aria)
 * - Header : eyebrow + title + keyBadge optionnel + close
 * - Body   : children scrollable
 * - Footer : hint Esc + boutons Annuler/Sauvegarder
 *
 * Le contenu (children) est responsable des fields.
 * Le drawer ne valide rien — la validation est côté formulaire.
 */

import {
  Dialog, DialogBackdrop, DialogPanel, DialogTitle,
} from '@headlessui/react'
import { X, Save } from 'lucide-react'
import styles from './DocsDrawer.module.css'

export const DocsDrawer = ({
  isOpen,
  onClose,
  eyebrow,
  title,
  keyBadge,           // { icon: ReactNode, label: string }
  footerHint,         // string — default: 'Échap pour annuler'
  saveLabel,
  cancelLabel = 'Annuler',
  saving = false,
  saveDisabled = false,
  onSave,
  children,
  width = 'md',       // 'md' | 'lg' | 'xl'
  footerExtra,        // ReactNode — bouton à gauche des actions
}) => {
  const close = () => {
    if (!saving) onClose?.()
  }

  const label = saveLabel ?? 'Enregistrer'

  return (
    <Dialog
      open={isOpen}
      onClose={saving ? () => {} : onClose}
      className={styles.root}
      transition
    >
      <DialogBackdrop className={styles.backdrop} transition />

      <DialogPanel
        className={`${styles.panel} ${styles[`w_${width}`] || styles.w_md}`}
        transition
      >
        <header className={styles.header}>
          <div className={styles.headerContent}>
            {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
            <DialogTitle className={styles.title}>{title}</DialogTitle>
            {keyBadge?.label && (
              <span className={styles.keyBadge} title={keyBadge.label}>
                {keyBadge.icon}
                {keyBadge.label}
              </span>
            )}
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={close}
            disabled={saving}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </header>

        <div className={styles.body}>{children}</div>

        {onSave && (
          <footer className={styles.footer}>
            <span className={styles.hint}>
              <kbd>Échap</kbd>
              {footerHint || 'pour annuler'}
            </span>
            <div className={styles.actions}>
              {footerExtra}
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={close}
                disabled={saving}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={onSave}
                disabled={saving || saveDisabled}
              >
                {saving ? (
                  <>
                    <span className={styles.spinner} />
                    Enregistrement…
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    {label}
                  </>
                )}
              </button>
            </div>
          </footer>
        )}
      </DialogPanel>
    </Dialog>
  )
}

export default DocsDrawer