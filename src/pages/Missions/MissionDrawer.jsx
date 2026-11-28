import React, { useEffect, useRef } from 'react'
import { X, Copy, ExternalLink, Ban, CheckCircle, AlertTriangle } from 'lucide-react'
import { Badge, Button } from '../../components/ui'
import { formatDateTime, formatCurrency } from '../../utils/formatters'
import { useMissionDetail } from '../../hooks/useMissionsAdmin'
import { Row, Skeleton } from './missionsShared'
import Timeline from './Timeline'
import {
  num, ATTENTION, CANCEL_ACTOR, ESCROW, TYPE_LABEL, PRICING_LABEL, statusBadge, shortId, missionLabel, fmtMinutes, isTerminal,
} from './missionsConfig'
import styles from './Missions.module.css'

const dt = (v) => (v ? formatDateTime(v) : '—')
const CAN_COMPLETE = new Set(['IN_PROGRESS', 'PENDING_VALIDATION'])

/* La ligne de la liste suffit à afficher l'en-tête INSTANTANÉMENT ; seule la chronologie est chargée à l'ouverture
   (et, si le tiroir vient d'une alerte, la fiche complète). */
const MissionDrawer = ({ seed, onClose, onCopy, onOpenPage, onAction }) => {
  const ref = useRef(null)
  const needCore = seed.paid_amount === undefined
  const core = useMissionDetail(seed.id_mission, 'core', { enabled: needCore })
  const timeline = useMissionDetail(seed.id_mission, 'timeline')
  const row = needCore ? { ...seed, ...(core.data?.mission || {}) } : seed

  useEffect(() => {
    const prevFocus = document.activeElement
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [onClose])

  const s = statusBadge(row.status)
  const esc = row.escrow_state ? ESCROW[row.escrow_state] : null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Aperçu de la mission"
        className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHead}>
          <div>
            <span className={styles.drawerTitle}>{missionLabel(row)}</span>
            <span className={styles.txRef}>#{shortId(row.id_mission)}</span>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>

        <div className={styles.drawerAmount}>
          <span className={styles.amountIn}>{formatCurrency(num(row.amount))}</span>
          <Badge variant={s.color} size="sm" dot>{s.label}</Badge>
        </div>

        {row.attention_reason && (
          <p className={styles.modalWarn}><AlertTriangle size={14} /><span>{ATTENTION[row.attention_reason] || row.attention_reason}</span></p>
        )}

        <div className={styles.drawerActions}>
          <Button size="sm" variant="primary" icon={ExternalLink} onClick={() => onOpenPage(row)}>Ouvrir la page</Button>
          <Button size="sm" variant="outline" icon={Copy} onClick={() => onCopy(row.id_mission)}>Copier l'ID</Button>
          {CAN_COMPLETE.has(row.status) && <Button size="sm" variant="outline" icon={CheckCircle} onClick={() => onAction('complete', row)}>Terminer</Button>}
          {!isTerminal(row.status) && <Button size="sm" variant="danger" icon={Ban} onClick={() => onAction('cancel', row)}>Annuler</Button>}
        </div>

        <ul className={styles.rows}>
          <Row label="Client" value={row.client_name || '—'} />
          <Row label="Artisan" value={row.artisan_name ? `${row.artisan_name}${row.artisan_is_last ? ' (dernier proposé)' : ''}` : 'Non assigné'} />
          {row.category_name && <Row label="Catégorie" value={row.category_name} />}
          {row.location_address && <Row label="Adresse" value={row.location_address} />}
          <Row label="Type" value={`${TYPE_LABEL[row.mission_type] || row.mission_type || '—'}${row.pricing_type ? ` · ${PRICING_LABEL[row.pricing_type] || row.pricing_type}` : ''}`} />
          <Row label="Créée le" value={dt(row.created_at)} />
          {row.scheduled_at && <Row label="Planifiée le" value={dt(row.scheduled_at)} />}
          {row.status === 'CANCELLED' && (
            <>
              <Row label="Annulée par" value={CANCEL_ACTOR[row.cancelled_by] || '—'} />
              <Row label="Motif" value={row.cancellation_label || row.cancellation_reason || '—'} />
            </>
          )}
          <Row label="Tentatives d'affectation" value={num(row.attempts)} />
          {row.accept_delay_min != null && <Row label="Délai d'acceptation" value={fmtMinutes(row.accept_delay_min)} />}
          {row.duration_min != null && <Row label="Durée d'intervention" value={fmtMinutes(row.duration_min)} />}
          <Row label="Commission Handyra" value={formatCurrency(num(row.handyra_fee))} />
          <Row label="Encaissé" value={formatCurrency(num(row.paid_amount))} />
          {esc && <Row label="Séquestre" value={esc.label} tone={row.escrow_state === 'HELD' && isTerminal(row.status) ? 'warn' : undefined} />}
          {num(row.refunded_amount) > 0 && <Row label="Remboursé" value={formatCurrency(num(row.refunded_amount))} />}
          {row.rating != null && <Row label="Note du client" value={`${row.rating} / 5`} />}
        </ul>

        <div className={styles.drawerSection}>
          <span className={styles.panelLabel}>Chronologie</span>
          {timeline.isLoading && <Skeleton lines={5} />}
          {timeline.isError && (
            <div className={styles.inlineError}>
              <span>{timeline.error?.message || 'Chronologie indisponible'}</span>
              <button type="button" onClick={() => timeline.refetch()}>Réessayer</button>
            </div>
          )}
          {timeline.data && <Timeline events={timeline.data} compact />}
        </div>
      </aside>
    </div>
  )
}

export default MissionDrawer