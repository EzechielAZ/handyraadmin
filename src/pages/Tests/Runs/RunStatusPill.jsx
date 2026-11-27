import { RUN_STATUS } from '../../../hooks/tests'
import { Icon } from '../../../components/docs'
import styles from './Runs.module.css'

export const RunStatusPill = ({ status, attempt }) => {
  const cfg = RUN_STATUS[status] || RUN_STATUS.ASSIGNED
  return (
    <span className={`${styles.pill} ${styles[`p_${status}`] || ''}`} title={cfg.label}>
      <Icon name={cfg.icon} size={12} />
      {attempt > 1 && <span>#{attempt}</span>}
    </span>
  )
}
export default RunStatusPill
