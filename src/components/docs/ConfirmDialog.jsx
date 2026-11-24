/**
 * Modale de confirmation destructive / importante.
 * Mirror du pattern Dialog de Headless UI.
 */

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { AlertTriangle, X } from 'lucide-react'
import styles from './ConfirmDialog.module.css'

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmer l\'action',
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  loading = false,
  variant = 'danger', // 'danger' | 'warning' | 'default'
}) => (
  <Dialog
    open={isOpen}
    onClose={loading ? () => {} : onClose}
    className={styles.root}
    transition
  >
    <DialogBackdrop className={styles.backdrop} transition />
    <div className={styles.center}>
      <DialogPanel className={styles.panel} transition>
        <div className={`${styles.iconDisc} ${styles[`icon_${variant}`]}`} aria-hidden="true">
          <AlertTriangle size={18} strokeWidth={2} />
        </div>

        <DialogTitle className={styles.title}>{title}</DialogTitle>

        {description && (
          <div className={styles.description}>
            {typeof description === 'string' ? <p>{description}</p> : description}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.btnPrimary} ${styles[`btn_${variant}`]}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'En cours…' : confirmLabel}
          </button>
        </div>

        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          disabled={loading}
          aria-label="Fermer"
        >
          <X size={14} />
        </button>
      </DialogPanel>
    </div>
  </Dialog>
)

export default ConfirmDialog