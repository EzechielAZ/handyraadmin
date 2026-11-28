import React, { useEffect, useRef } from 'react'
import { X, Copy, ExternalLink, ChevronRight } from 'lucide-react'
import { Badge, Button } from '../../components/ui'
import { formatDateTime, formatCurrency } from '../../utils/formatters'
import { usePaymentDetail } from '../../hooks/usePayments'
import { Row, Skeleton } from './paymentsShared'
import {
  num, FLOW_LABEL, ESCROW, BLOCK_REASON, methodLabel, subLabel, statusBadge,
} from './paymentsConfig'
import styles from './Payments.module.css'

const dt = (v) => (v ? formatDateTime(v) : '—')

/* La ligne de la liste suffit à afficher l'en-tête INSTANTANÉMENT ;
   seuls les éléments liés (mission, facture, abonnement…) sont chargés à l'ouverture. */
const PaymentDrawer = ({ seed, onClose, onCopy, onOpenRelated }) => {
  const ref = useRef(null)
  const detail = usePaymentDetail(seed.flow_type, seed.entry_id)
  const extra = detail.data?.extra
  /* Ouvert depuis la liste : toutes les infos de base sont déjà là. Ouvert depuis un lien : on attend la réponse. */
  const row = seed.amount !== undefined ? seed : detail.data?.row

  /* Échap, focus, blocage du scroll, restitution du focus */
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

  if (!row) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <aside ref={ref} tabIndex={-1} role="dialog" aria-modal="true" className={styles.drawer} onClick={(e) => e.stopPropagation()}>
          <div className={styles.drawerHead}><span className={styles.drawerTitle}>Chargement…</span>
            <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Fermer"><X size={16} /></button></div>
          {detail.isError ? <div className={styles.inlineError}><span>{detail.error?.message || 'Introuvable'}</span></div> : <Skeleton lines={8} />}
        </aside>
      </div>
    )
  }

  const s = statusBadge(row.status)
  const isOut = row.direction === 'OUT'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside
        ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Détail de l'opération"
        className={styles.drawer} onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.drawerHead}>
          <div>
            <span className={styles.drawerTitle}>
              {FLOW_LABEL[row.flow_type]}{subLabel(row.sub_type) ? ` · ${subLabel(row.sub_type)}` : ''}
            </span>
            <span className={styles.txRef}>#{row.reference}</span>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>

        <div className={styles.drawerAmount}>
          <span className={isOut ? styles.amountOut : styles.amountIn}>{isOut ? '−' : '+'}{formatCurrency(num(row.amount))}</span>
          <Badge variant={s.color} size="sm" dot>{s.label}</Badge>
        </div>

        <ul className={styles.rows}>
          <Row label="Date" value={dt(row.occurred_at)} />
          {row.completed_at && <Row label="Finalisé le" value={dt(row.completed_at)} />}
          <Row label={isOut ? 'Bénéficiaire' : 'Payeur'} value={row.party_name || '—'} />
          {row.artisan_name && <Row label="Artisan" value={row.artisan_name} />}
          {row.category_name && <Row label="Catégorie" value={row.category_name} />}
          {row.plan_name && <Row label="Offre" value={row.plan_name} />}
          <Row label="Méthode" value={`${methodLabel(row.method)}${row.network ? ` · ${row.network}` : ''}`} />
          {row.flow_type === 'MISSION_PAYMENT' && (
            <>
              <Row label="Part plateforme" value={formatCurrency(num(row.platform_amount))} />
              <Row label="Net artisan" value={formatCurrency(num(row.net_amount))} />
              <Row label="Séquestre" value={ESCROW[row.escrow_status]?.label || '—'} />
            </>
          )}
          {num(row.fees) > 0 && <Row label="Frais passerelle" value={formatCurrency(num(row.fees))} />}
          {row.provider_ref && <Row label="Réf. passerelle" value={row.provider_ref} />}
          {row.blocked_reason && <Row label="Motif de blocage" value={BLOCK_REASON[row.blocked_reason] || row.blocked_reason} tone="warn" />}
          {row.error_message && <Row label="Erreur" value={row.error_message} tone="warn" />}
          {num(row.retry_count) > 0 && <Row label="Tentatives" value={row.retry_count} />}
        </ul>

        {/* ───── Éléments liés : chargés à l'ouverture ───── */}
        {detail.isLoading && (
          <div className={styles.drawerSection}><span className={styles.panelLabel}>Éléments liés</span><Skeleton lines={4} /></div>
        )}
        {detail.isError && (
          <div className={styles.inlineError}>
            <span>{detail.error?.message || 'Détails indisponibles'}</span>
            <button type="button" onClick={() => detail.refetch()}>Réessayer</button>
          </div>
        )}

        {extra?.mission && (
          <div className={styles.drawerSection}>
            <span className={styles.panelLabel}>Mission</span>
            <ul className={styles.rows}>
              <Row label="Titre" value={extra.mission.title || extra.mission.description || '—'} />
              <Row label="Statut" value={extra.mission.status || '—'} />
            </ul>
          </div>
        )}

        {extra?.siblings?.length > 1 && (
          <div className={styles.drawerSection}>
            <span className={styles.panelLabel}>Paiements de la mission</span>
            <ul className={styles.related}>
              {extra.siblings.map((p) => (
                <li key={p.entry_id}>
                  <button type="button" disabled={p.entry_id === row.entry_id}
                    onClick={() => onOpenRelated({ flow_type: 'MISSION_PAYMENT', entry_id: p.entry_id })}>
                    <span>{subLabel(p.sub_type) || 'Paiement'}</span>
                    <span className={styles.muted}>{statusBadge(p.status).label}</span>
                    <b>{formatCurrency(num(p.amount))}</b>
                    {p.entry_id !== row.entry_id && <ChevronRight size={12} />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {extra?.invoices?.length > 0 && (
          <div className={styles.drawerSection}>
            <span className={styles.panelLabel}>Factures</span>
            <ul className={styles.related}>
              {extra.invoices.map((i) => (
                <li key={i.number}>
                  <div>
                    <span>{i.number}</span>
                    <span className={styles.muted}>{i.status}</span>
                    <b>{formatCurrency(num(i.total))}</b>
                    {i.pdf_url && (
                      <a href={i.pdf_url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le PDF"><ExternalLink size={12} /></a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {extra?.payouts?.length > 0 && (
          <div className={styles.drawerSection}>
            <span className={styles.panelLabel}>Versements liés</span>
            <ul className={styles.related}>
              {extra.payouts.map((p) => (
                <li key={p.entry_id}>
                  <button type="button" onClick={() => onOpenRelated({ flow_type: 'PAYOUT', entry_id: p.entry_id })}>
                    <span>{subLabel(p.type)}</span>
                    <span className={styles.muted}>{p.status}</span>
                    <b>{formatCurrency(num(p.amount))}</b>
                    <ChevronRight size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {extra?.subscription && (
          <div className={styles.drawerSection}>
            <span className={styles.panelLabel}>Abonnement</span>
            <ul className={styles.rows}>
              <Row label="Statut" value={extra.subscription.status} />
              <Row label="Cycle" value={subLabel(extra.subscription.cycle) || '—'} />
              <Row label="Début" value={dt(extra.subscription.start_date)} />
              <Row label="Fin" value={dt(extra.subscription.end_date)} />
              <Row label="Renouvellement auto" value={extra.subscription.auto_renew ? 'Oui' : 'Non'} />
            </ul>
          </div>
        )}

        {row.flow_type === 'PAYOUT' && extra && (
          <div className={styles.drawerSection}>
            <span className={styles.panelLabel}>Versement</span>
            <ul className={styles.rows}>
              <Row label="Téléphone" value={extra.phone || '—'} />
              <Row label="Titulaire" value={extra.owner_name || '—'} />
              <Row label="Initié par" value={extra.initiated_by || '—'} />
              <Row label="Envoyé le" value={dt(extra.sent_at)} />
              {extra.last_retry_at && <Row label="Dernière tentative" value={dt(extra.last_retry_at)} />}
              {extra.refunded_at && <Row label="Remboursé le" value={dt(extra.refunded_at)} />}
            </ul>
          </div>
        )}

        {row.flow_type === 'WALLET_DEPOSIT' && extra?.phone && (
          <div className={styles.drawerSection}>
            <ul className={styles.rows}><Row label="Téléphone" value={extra.phone} /></ul>
          </div>
        )}

        <div className={styles.drawerActions}>
          <Button variant="outline" size="sm" icon={Copy} onClick={() => onCopy(row.reference)}>Copier la référence</Button>
          {row.receipt_url && (
            <Button variant="outline" size="sm" icon={ExternalLink} onClick={() => window.open(row.receipt_url, '_blank', 'noopener')}>Reçu</Button>
          )}
        </div>
      </aside>
    </div>
  )
}

export default PaymentDrawer