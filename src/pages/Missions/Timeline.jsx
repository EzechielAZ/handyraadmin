import React from 'react'
import { formatDateTime, formatCurrency } from '../../utils/formatters'
import { num, TIMELINE_TONE } from './missionsConfig'
import styles from './Missions.module.css'

/* Chronologie : une ligne par événement (création, affectations, paiements, annulation, notes admin…) */
const Timeline = ({ events = [], compact = false }) => {
  if (!events.length) return <div className={styles.okState}>Aucun événement enregistré.</div>
  return (
    <ol className={`${styles.timeline} ${compact ? styles.timelineCompact : ''}`}>
      {events.map((e, i) => (
        <li key={`${e.kind}-${e.at}-${i}`} className={styles.tlItem}>
          <i className={styles.tlDot} style={{ background: TIMELINE_TONE[e.tone] || TIMELINE_TONE.neutral }} />
          <div className={styles.tlBody}>
            <div className={styles.tlHead}>
              <span className={styles.tlTitle}>{e.title}</span>
              {e.amount != null && <b className={styles.tlAmount}>{formatCurrency(num(e.amount))}</b>}
            </div>
            {e.detail && <span className={styles.tlDetail}>{e.detail}</span>}
            <time className={styles.tlTime}>{formatDateTime(e.at)}</time>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default Timeline