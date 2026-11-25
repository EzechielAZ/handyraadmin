/**
 * Badge de statut avec icon-disc (mirror du Dashboard admin).
 * - `map`  : objet de constants (FEATURE_STATUS, ISSUE_STATUS, …)
 * - `value`: la valeur brute (ex: 'IN_DEV')
 * - `iconDisc`: bool (default true) — affiche le disque coloré + icône blanche
 *
 * Usage :
 *   <StatusBadge map={FEATURE_STATUS} value={feature.status} />
 */

import { Icon } from './Icon'
import styles from './StatusBadge.module.css'

const VALID_COLORS = new Set([
  'gray', 'blue', 'green', 'yellow', 'orange', 'red', 'purple', 'navy',
])

export const StatusBadge = ({
  map,
  value,
  size = 'sm',
  showIcon = true,
  showLabel = true,
  className,
  title,
  ...rest
}) => {
  if (value === null || value === undefined) return null

  const cfg = map?.[value]
  const label = cfg?.label ?? String(value)
  const color = VALID_COLORS.has(cfg?.color) ? cfg.color : 'gray'
  const iconName = cfg?.icon

  const cls = [
    styles.badge,
    styles[size],
    styles[color],
    !showIcon && styles.noIcon,
    className,
  ].filter(Boolean).join(' ')

  return (
    <span className={cls} title={title ?? label} {...rest}>
      {showIcon && (
        <span className={styles.disc} aria-hidden="true">
          {iconName ? <Icon name={iconName} size={10} strokeWidth={3} /> : null}
        </span>
      )}
      {showLabel && <span className={styles.label}>{label}</span>}
    </span>
  )
}

export default StatusBadge