import React from 'react'
import {
  CreditCard, DollarSign, Repeat, ArrowDownLeft, ArrowUpRight, Landmark, Percent, Undo2, AlertTriangle,
} from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { usePaymentSection } from '../../hooks/usePayments'
import { TrendChart, Donut, HBars, Delta } from './PaymentCharts'
import { KpiGrid, Kpi, SectionPanel, Row, SkeletonChart, Skeleton } from './paymentsShared'
import {
  num, ALERTS, ALERTS_SHORT, FLOW_LABEL, FLOW_COLOR, methodLabel, compactMoney,
} from './paymentsConfig'
import styles from './Payments.module.css'

const AlertsBand = () => {
  const q = usePaymentSection('alerts')
  const alerts = q.data || []
  if (!alerts.length) return null
  return (
    <div className={styles.alertBar} role="status" aria-label="Alertes">
      <div className={styles.alertLead}>
        <AlertTriangle size={14} />
        <span>Alertes</span>
        <b>{alerts.length}</b>
      </div>
      <ul className={styles.alertList}>
        {alerts.map((a) => (
          <li key={a.code} className={`${styles.alertItem} ${styles[`sev_${a.severity}`]}`} title={ALERTS[a.code] || a.code}>
            <span className={styles.alertLabel}><i />{ALERTS_SHORT[a.code] || a.code}</span>
            <span className={styles.alertFigures}>
              <b>{a.count}</b>
              <em>{formatCurrency(num(a.amount))}</em>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const PaymentsOverview = () => (
  <>
    <AlertsBand />

    <KpiGrid render={(k, p) => {
      const prev = (key) => (p ? p[key] : null)
      return (
        <>
          <Kpi icon={DollarSign} tone="success" label="Revenus plateforme"
            value={formatCurrency(num(k.platform_revenue))}
            delta={<Delta current={k.platform_revenue} previous={prev('platform_revenue')} />}
            sub={`Commissions ${formatCurrency(num(k.commissions))} · abonnements ${formatCurrency(num(k.subscriptions_revenue))}`} />
          <Kpi icon={CreditCard} label="Volume missions"
            value={formatCurrency(num(k.missions_volume))}
            delta={<Delta current={k.missions_volume} previous={prev('missions_volume')} />}
            sub={`${num(k.missions_count)} paiement(s) · panier moyen ${formatCurrency(num(k.missions_avg_basket))}`} />
          <Kpi icon={Repeat} tone="info" label="Abonnements encaissés"
            value={formatCurrency(num(k.subscriptions_revenue))}
            delta={<Delta current={k.subscriptions_revenue} previous={prev('subscriptions_revenue')} />}
            sub={`${num(k.subscriptions_count)} paiement(s)`} />
          <Kpi icon={ArrowDownLeft} tone="success" label="Recharges portefeuille"
            value={formatCurrency(num(k.deposits_amount))}
            delta={<Delta current={k.deposits_amount} previous={prev('deposits_amount')} />}
            sub={`${num(k.deposits_count)} recharge(s)`} />
          <Kpi icon={ArrowUpRight} tone="warning" label="Décaissements envoyés"
            value={formatCurrency(num(k.payouts_sent))}
            delta={<Delta current={k.payouts_sent} previous={prev('payouts_sent')} invert />}
            sub={`${num(k.payouts_sent_count)} envoyé(s) · ${formatCurrency(num(k.payouts_pending))} en attente${num(k.payouts_refunded_count) ? ` · ${num(k.payouts_refunded_count)} remboursé(s)` : ''}`} />
          <Kpi icon={Landmark} tone="info" label="Trésorerie nette"
            value={formatCurrency(num(k.cash_net))}
            delta={<Delta current={k.cash_net} previous={prev('cash_net')} />}
            sub={`Entrées ${formatCurrency(num(k.cash_in))} − sorties ${formatCurrency(num(k.cash_out))}`} />
          <Kpi icon={Percent} tone={k.success_rate != null && k.success_rate < 85 ? 'danger' : 'success'} label="Taux de réussite"
            value={k.success_rate != null ? `${k.success_rate} %` : '—'}
            delta={<Delta current={k.success_rate} previous={prev('success_rate')} />}
            sub={`${num(k.in_failed)} échec(s) · ${formatCurrency(num(k.failed_amount))} non encaissés`} />
          <Kpi icon={Undo2} tone="danger" label="Remboursements"
            value={formatCurrency(num(k.refunds_amount))}
            delta={<Delta current={k.refunds_amount} previous={prev('refunds_amount')} invert />}
            sub={`${num(k.refunds_count)} remboursement(s)`} />
        </>
      )
    }}
    />

    <div className={styles.grid}>
      <SectionPanel span={4} eager section="timeseries" title="Évolution" skeleton={<SkeletonChart height={240} />}>
        {(d) => (
          <TrendChart data={d.points} bucket={d.bucket} series={[
            { key: 'missions_volume', label: 'Volume missions', color: 'var(--accent)', area: true },
            { key: 'revenue', label: 'Revenus plateforme', color: 'var(--success)' },
            { key: 'payouts', label: 'Décaissements', color: 'var(--warning)' },
          ]} />
        )}
      </SectionPanel>
    <SectionPanel span={2} center eager section="by_flow" title="Encaissements par flux" skeleton={<SkeletonChart height={150} />}>
        {(rows) => {
          const items = rows.filter((f) => f.direction === 'IN')
            .map((f) => ({ label: FLOW_LABEL[f.flow_type], value: num(f.success_amount), color: FLOW_COLOR[f.flow_type] }))
          return <Donut items={items} centerValue={compactMoney(items.reduce((s, i) => s + i.value, 0))} centerLabel="Encaissé" />
        }}
      </SectionPanel>
    <SectionPanel span={2} section="by_method" title="Par méthode de paiement" hint="Encaissements">
        {(rows) => (
          <HBars items={rows.map((m) => ({
            label: methodLabel(m.method), value: num(m.success_amount),
            meta: `${m.success_count} réussi${m.success_count > 1 ? 's' : ''} · ${m.failed_count} échec${m.failed_count > 1 ? 's' : ''}${m.fail_rate != null ? ` · ${m.fail_rate} % d'échec` : ''}`,
          }))} />
        )}
      </SectionPanel>
    <SectionPanel span={2} section="payout_pipeline" title="File des décaissements" hint="Instantané">
        {(p) => (
          <ul className={styles.rows}>
            <Row label="En attente / bloqués" value={`${num(p.pending_count)} · ${formatCurrency(num(p.pending_amount))}`} strong />
            <Row label="Dont bloqués" value={`${num(p.blocked_count)} · ${formatCurrency(num(p.blocked_amount))}`} tone={num(p.blocked_count) ? 'warn' : undefined} />
            <Row label="En attente > 24 h" value={`${num(p.stuck_24h_count)} · ${formatCurrency(num(p.stuck_24h_amount))}`} tone={num(p.stuck_24h_count) ? 'warn' : undefined} />
            <Row label="Délai moyen d'envoi (30 j)" value={p.avg_delay_minutes != null ? `${p.avg_delay_minutes} min` : '—'} />
          </ul>
        )}
      </SectionPanel>
    <SectionPanel span={2} section="subscriptions" title="Abonnements" hint="Instantané" skeleton={<Skeleton lines={5} />}>
        {(s) => (
          <ul className={styles.rows}>
            <Row label="MRR (revenu mensuel récurrent)" value={formatCurrency(num(s.mrr))} strong />
            <Row label="Abonnés actifs" value={num(s.active_count)} />
            <Row label="Essais en cours" value={num(s.trial_count)} />
            <Row label="Expirent sous 30 j" value={`${num(s.expiring_30d_count)} (${num(s.expiring_30d_auto_renew)} en renouvellement auto)`} />
            <Row label="Renouvellement auto" value={s.auto_renew_rate != null ? `${s.auto_renew_rate} %` : '—'} />
          </ul>
        )}
      </SectionPanel>
    <SectionPanel span={3} section="escrow" title="Séquestre" hint="Fonds retenus">
        {(e) => (
          <>
            <ul className={styles.rows}>
              <Row label="Fonds retenus" value={formatCurrency(num(e.held_amount))} strong />
              <Row label="Dont commission plateforme" value={formatCurrency(num(e.held_platform))} />
              <Row label="Dont part artisans" value={formatCurrency(num(e.held_artisan))} />
            </ul>
            <HBars items={(e.aging || []).map((a, i) => ({
              label: a.label, value: num(a.amount), meta: `${a.count} paiement${a.count > 1 ? 's' : ''}`,
              color: i >= 3 ? 'var(--danger)' : i === 2 ? 'var(--warning)' : 'var(--accent)',
            }))} empty="Aucun fonds retenu" />
          </>
        )}
      </SectionPanel>
    <SectionPanel span={3} section="wallets" title="Fonds dans les portefeuilles" hint="Passif plateforme">
        {(w) => (
          <ul className={styles.rows}>
            <Row label="Total détenu" value={formatCurrency(num(w.artisan_balance) + num(w.client_balance))} strong />
            <Row label={`Artisans (${num(w.artisan_count)})`} value={formatCurrency(num(w.artisan_balance))} />
            <Row label="Artisans · gelé" value={formatCurrency(num(w.artisan_frozen))} />
            <Row label="Artisans · FEF" value={formatCurrency(num(w.artisan_fef))} />
            <Row label="Artisans · primes HPRE cumulées" value={formatCurrency(num(w.artisan_hpre))} />
            <Row label={`Clients (${num(w.client_count)})`} value={formatCurrency(num(w.client_balance))} />
            <Row label="Clients · gelé" value={formatCurrency(num(w.client_frozen))} />
            <Row label="Portefeuilles bloqués" value={num(w.artisan_blocked) + num(w.client_blocked)} />
          </ul>
        )}
      </SectionPanel>
    </div>
  </>
)

export default PaymentsOverview