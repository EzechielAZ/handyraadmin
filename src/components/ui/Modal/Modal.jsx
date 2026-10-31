import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { X } from 'lucide-react'
import styles from './Modal.module.css'

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnClickOutside = true,
  closeOnEsc = true,
  showCloseButton = true,
  footer,
  className = '',
}) => {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (closeOnEsc && e.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, closeOnEsc, onClose])

  if (!isOpen) return null

  return ReactDOM.createPortal(
    <div
      ref={overlayRef}
      className={styles.overlay}
      onClick={(e) => closeOnClickOutside && e.target === overlayRef.current && onClose()}
    >
      <div className={[styles.modal, styles[size], className].filter(Boolean).join(' ')} role="dialog" aria-modal="true">
        {(title || showCloseButton) && (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            {showCloseButton && (
              <button className={styles.close} onClick={onClose} aria-label="Fermer">
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

export default Modal