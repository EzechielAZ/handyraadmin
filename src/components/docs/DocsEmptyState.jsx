/**
 * Empty state générique.
 * Mirror du pattern existant : icône en disque, titre, description, CTA.
 */

import { Icon } from './Icon'
import styles from './DocsEmptyState.module.css'

export const DocsEmptyState = ({
  icon = 'Package',
  title = 'Aucun résultat',
  description,
  action,           // { label, icon, onClick, variant }
  variant = 'default', // 'default' | 'error' | 'search'
}) => {
  const iconBg = variant === 'error'
    ? 'var(--danger, #dc2626)'
    : variant === 'search'
      ? '#94a3b8'
      : 'var(--accent, #14213d)'

  return (
    <div className={styles.wrap}>
      <div className={styles.iconDisc} style={{ background: iconBg }} aria-hidden="true">
        <Icon name={icon} size={22} strokeWidth={2} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <button
          type="button"
          className={`${styles.action} ${variant === 'error' ? styles.actionDanger : ''}`}
          onClick={action.onClick}
        >
          {action.icon && <Icon name={action.icon} size={13} />}
          {action.label}
        </button>
      )}
    </div>
  )
}

export default DocsEmptyState