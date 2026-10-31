import React from 'react'
import { Inbox } from 'lucide-react'
import Button from '../Button/Button'
import styles from './EmptyState.module.css'

const EmptyState = ({
  title = 'Aucune donnée',
  description = 'Il n’y a rien à afficher pour le moment.',
  icon: Icon = Inbox,
  action,
  secondaryAction,
  actionLabel,
  onAction,
  className = '',
}) => {
  // réconcilier les deux API
  const primary = action || (actionLabel && onAction ? { label: actionLabel, onClick: onAction } : null)

  return (
    <div className={[styles.empty, className].filter(Boolean).join(' ')}>
      <div className={styles.icon}><Icon size={22} strokeWidth={1.6} /></div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.desc}>{description}</p>}
      {(primary || secondaryAction) && (
        <div className={styles.actions}>
          {secondaryAction && (
            <Button variant="outline" size="md" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {primary && (
            <Button variant="primary" size="md" onClick={primary.onClick}>
              {primary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState