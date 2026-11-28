import React, { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { usePaymentSection } from '../../hooks/usePayments'
import styles from './Payments.module.css'

/* ───────────── Visible à l'écran ? (déclenche le chargement d'un panneau) ───────────── */
export const useInView = (rootMargin = '240px') => {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return undefined
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect() }
    }, { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [seen, rootMargin])
  return [ref, seen]
}

/* ───────────── Squelettes ───────────── */
export const Skeleton = ({ lines = 4, height = 12 }) => (
  <div className={styles.skel} aria-hidden="true">
    {Array.from({ length: lines }, (_, i) => (
      <span key={i} className={styles.skelLine} style={{ height, width: `${100 - (i % 3) * 14}%` }} />
    ))}
  </div>
)

export const SkeletonChart = ({ height = 200 }) => (
  <div className={styles.skelBlock} style={{ height }} aria-hidden="true" />
)

/* ───────────── Ligne clé / valeur ───────────── */
export const Row = ({ label, value, strong, tone }) => (
  <li className={styles.row}>
    <span>{label}</span>
    <b className={`${strong ? styles.rowStrong : ''} ${tone ? styles[tone] : ''}`}>{value}</b>
  </li>
)

/* ───────────── Panneau autonome : charge SA section, uniquement quand il est visible ───────────── */
export const SectionPanel = ({
  section, title, hint, span = 2, center = false, eager = false, skeleton, children,
}) => {
  const [ref, seen] = useInView()
  const q = usePaymentSection(section, { enabled: eager || seen })
  const refreshing = q.isFetching && !q.isLoading

  return (
    <section ref={ref} className={`${styles.panel} ${styles[`s${span}`]}`} aria-busy={q.isFetching}>
      <div className={styles.panelHead}>
        <span className={styles.panelLabel}>{title}</span>
        <span className={styles.panelHint}>
          {refreshing && <i className={styles.pulse} aria-label="Mise à jour" />}
          {hint}
        </span>
      </div>

      {q.isError ? (
        <div className={styles.inlineError}>
          <span>{q.error?.message || 'Chargement impossible'}</span>
          <button type="button" onClick={() => q.refetch()}><RefreshCw size={11} /> Réessayer</button>
        </div>
      ) : q.data === undefined ? (
        <div className={styles.panelBody}>{skeleton || <Skeleton />}</div>
      ) : (
        <div className={`${styles.panelBody} ${center ? styles.panelCenter : ''} ${refreshing ? styles.dim : ''}`}>{children(q.data)}</div>
      )}
    </section>
  )
}

/* ───────────── Cartes KPI : UN appel (« kpis ») pour les 8 cartes ───────────── */
export const KpiGrid = ({ render }) => {
  const q = usePaymentSection('kpis')
  const refreshing = q.isFetching && !q.isLoading

  if (q.isError) {
    return (
      <div className={styles.errorBox}>
        <strong>Erreur :</strong> {q.error?.message || 'Impossible de charger les indicateurs'}
        <div><button type="button" className={styles.clearBtn} onClick={() => q.refetch()}>Réessayer</button></div>
      </div>
    )
  }
  if (q.data === undefined) {
    return (
      <div className={styles.stats} aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={styles.stat}>
            <div className={styles.statHead}>
              <span className={styles.skelLine} style={{ height: 10, width: '55%' }} />
              <span className={styles.skelDot} />
            </div>
            <span className={styles.skelLine} style={{ height: 24, width: '65%' }} />
            <div className={styles.statFoot}>
              <span className={styles.skelLine} style={{ height: 10, width: '30%' }} />
              <span className={styles.skelLine} style={{ height: 10, width: '90%' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return <div className={`${styles.stats} ${refreshing ? styles.dim : ''}`}>{render(q.data.kpis || {}, q.data.compare ? q.data.kpis_prev || {} : null)}</div>
}

export const Kpi = ({ icon: Icon, tone, label, value, sub, delta }) => (
  <div className={styles.stat}>
    <div className={styles.statHead}>
      <span className={styles.statLabel}>{label}</span>
      <Icon size={16} className={`${styles.statIcon} ${tone ? styles[tone] : ''}`} />
    </div>
    <span className={styles.statValue}>{value}</span>
    <div className={styles.statFoot}>
      <span className={styles.statDelta}>{delta}</span>
      <span className={styles.statSub} title={sub}>{sub}</span>
    </div>
  </div>
)