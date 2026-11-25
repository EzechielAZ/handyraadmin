import { AlertTriangle } from 'lucide-react'
import { Modal, Button } from '../ui'
import styles from './ConfirmDialog.module.css'

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmer l'action",
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  loading = false,
  variant = 'danger', // 'danger' | 'warning' | 'default'
}) => {
  const safeClose = loading ? () => {} : onClose

  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button
        variant={variant === 'danger' ? 'danger' : 'primary'}
        onClick={onConfirm}
        isLoading={loading}
      >
        {confirmLabel}
      </Button>
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={safeClose}
      title={title}
      size="sm"
      footer={footer}
    >
      <div className={styles.body}>
        <div
          className={`${styles.iconDisc} ${styles[`icon_${variant}`]}`}
          aria-hidden="true"
        >
          <AlertTriangle size={18} strokeWidth={2} />
        </div>
        <div className={styles.text}>
          {typeof description === 'string' ? <p>{description}</p> : description}
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmDialog