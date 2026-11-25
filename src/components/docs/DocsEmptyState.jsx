import {
  Plus, RotateCcw, Book, FileSignature, FileText, Rocket,
  Calendar, Inbox, AlertCircle, Archive,
} from 'lucide-react'
import styles from './DocsEmptyState.module.css'

const ICONS = {
  Plus, RotateCcw, Book, FileSignature, FileText, Rocket,
  Calendar, Inbox, AlertCircle, Archive,
}

export const DocsEmptyState = ({ icon = 'Inbox', title, description, action }) => {
  const Icon = typeof icon === 'string' ? (ICONS[icon] || Inbox) : icon
  const ActionIcon = action?.icon && typeof action.icon === 'string'
    ? (ICONS[action.icon] || Plus)
    : action?.icon

  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>
        <Icon size={24} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <button type="button" className={styles.action} onClick={action.onClick}>
          {ActionIcon && <ActionIcon size={13} />}
          {action.label}
        </button>
      )}
    </div>
  )
}

export default DocsEmptyState