import React from 'react'
import { Info } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { StackedBars, Heatmap, HBars, Donut, COLORS } from './PaymentCharts'
import { SectionPanel, Row, SkeletonChart } from './paymentsShared'
import { num, subLabel, BLOCK_REASON } from './paymentsConfig'
import styles from './Payments.module.css'

/* Chaque panneau charge SA section uniquement quand il approche de l'écran. */
const PaymentsAnalytics = () => (
  <div className={styles.grid}>
    <SectionPanel span={4} eager section="tx_series" title="Transactions d'encaissement" hint="Réussies vs échouées" skeleton={<SkeletonChart height={170} />}>
      {(d) => (
        <StackedBars data={d.points} bucket={d.bucket} series={[
          { key: 'tx_success', label: 'Réussies', color: 'var(--success)' },
          { key: 'tx_failed', label: 'Échouées', color: 'var(--danger)' },
        ]} />
      )}
    </SectionPanel>
    <SectionPanel span={2} eager section="by_network" title="Fiabilité par réseau" hint="Taux d'échec">
      {(rows) => (
        <HBars valueFormat={(v) => `${v} %`} empty="Aucune donnée réseau" items={rows.map((n) => ({
          label: n.network, value: num(n.fail_rate),
          color: num(n.fail_rate) >= 20 ? 'var(--danger)' : num(n.fail_rate) >= 10 ? 'var(--warning)' : 'var(--success)',
          meta: `${n.count} opération(s) · ${formatCurrency(num(n.success_amount))} encaissés`,
        }))} />
      )}
    </SectionPanel>
    <SectionPanel span={4} section="heatmap" title="Affluence" hint="Jour × heure (heure du Bénin)" skeleton={<SkeletonChart height={150} />}>
      {(cells) => <Heatmap cells={cells} />}
    </SectionPanel>
    <SectionPanel span={2} center section="by_request_type" title="Acompte / jalon / solde" skeleton={<SkeletonChart height={150} />}>
      {(rows) => (
        <Donut items={rows.map((r, i) => ({ label: subLabel(r.request_type), value: num(r.amount), color: COLORS[i % COLORS.length] }))} />
      )}
    </SectionPanel>
    <SectionPanel span={2} section="top_artisans" title="Top artisans" hint="Revenus nets">
      {(rows) => (
        <HBars items={rows.slice(0, 5).map((a) => ({
          label: a.name, value: num(a.net),
          meta: `${a.count} paiement(s) · brut ${formatCurrency(num(a.gross))} · commission ${formatCurrency(num(a.platform))}`,
        }))} />
      )}
    </SectionPanel>
    <SectionPanel span={2} section="top_payers" title="Top payeurs" hint="Missions + abonnements">
      {(rows) => (
        <HBars color="var(--info)" items={rows.slice(0, 5).map((p) => ({
          label: `${p.name}${p.role ? ` · ${p.role === 'ARTISAN' ? 'Artisan' : 'Client'}` : ''}`,
          value: num(p.amount), meta: `${p.count} paiement(s)`,
        }))} />
      )}
    </SectionPanel>
    <SectionPanel span={2} section="by_category" title="Missions par catégorie">
      {(rows) => (
        <HBars color="var(--success)" items={rows.slice(0, 5).map((c) => ({
          label: c.category, value: num(c.amount),
          meta: `${c.count} paiement(s) · commission ${formatCurrency(num(c.platform))}`,
        }))} />
      )}
    </SectionPanel>
    <SectionPanel span={2} section="subscription_plans" title="Abonnements par offre" hint="Encaissé">
      {(rows) => (
        <HBars color="var(--info)" items={rows.map((s) => ({ label: s.plan, value: num(s.amount), meta: `${s.count} paiement(s)` }))} />
      )}
    </SectionPanel>
    <SectionPanel span={2} section="subscriptions" title="Abonnés actifs par offre" hint="MRR">
      {(s) => (
        <HBars color="var(--info)" items={(s.by_plan || []).map((p) => ({ label: p.plan, value: num(p.mrr), meta: `${p.count} abonné(s)` }))} />
      )}
    </SectionPanel>
    <SectionPanel span={2} section="payout_types" title="Décaissements par type">
      {(rows) => (
        <HBars color="var(--warning)" items={rows.map((p) => ({
          label: subLabel(p.payout_type), value: num(p.sent_amount),
          meta: `${p.count} au total · ${formatCurrency(num(p.pending_amount))} en attente · ${p.failed_count} échec(s)`,
        }))} />
      )}
    </SectionPanel>
    <SectionPanel span={2} section="payout_issues" title="Causes de blocage / échec" hint="Décaissements">
      {(rows) => (
        <HBars valueFormat={(v) => String(v)} color="var(--danger)" empty="Aucun incident" items={rows.map((p) => ({
          label: BLOCK_REASON[p.reason] || p.reason, value: num(p.count), meta: formatCurrency(num(p.amount)),
        }))} />
      )}
    </SectionPanel>
    <SectionPanel span={2} section="receivables" title="Créances & factures">
      {(r) => (
        <ul className={styles.rows}>
          <Row label="Factures ouvertes" value={`${num(r.open_count)} · ${formatCurrency(num(r.open_amount))}`} strong />
          <Row label="En retard" value={`${num(r.overdue_count)} · ${formatCurrency(num(r.overdue_amount))}`} tone={num(r.overdue_count) ? 'warn' : undefined} />
          <Row label="Avoirs émis (période)" value={`${num(r.credit_notes_count)} · ${formatCurrency(num(r.credit_notes_amount))}`} />
        </ul>
      )}
    </SectionPanel>
    <SectionPanel span={2} section="rewards" title="Primes mensuelles HPRE">
      {(r) => (
        <ul className={styles.rows}>
          <Row label="À payer" value={`${num(r.pending_count)} · ${formatCurrency(num(r.pending_amount))}`} strong />
          <Row label="Payées (période)" value={`${num(r.paid_count)} · ${formatCurrency(num(r.paid_amount))}`} />
        </ul>
      )}
    </SectionPanel>
    <SectionPanel span={6} section="reconciliation" title="Cohérence comptable" hint="Période">
      {(r) => {
        const gap = num(r.platform_revenue) - num(r.revenue_recorded)
        return (
          <>
            <ul className={`${styles.rows} ${styles.rowsCols}`}>
              <Row label="Revenus (paiements)" value={formatCurrency(num(r.platform_revenue))} />
              <Row label="Revenus enregistrés" value={formatCurrency(num(r.revenue_recorded))} />
              <Row label="Écart" value={formatCurrency(gap)} tone={gap !== 0 ? 'warn' : undefined} strong />
            </ul>
            <p className={styles.note}>
              <Info size={12} />
              Un écart peut venir de commissions encore en séquestre ({formatCurrency(num(r.commissions_held))}) ou d'une écriture manquante dans handyra_revenue.
            </p>
          </>
        )
      }}
    </SectionPanel>
  </div>
)

export default PaymentsAnalytics