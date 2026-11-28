import React from 'react'
import {
  Briefcase, CheckCircle, XCircle, DollarSign, ShoppingBasket, Timer, Hourglass, Star, AlertTriangle, ChevronRight,
} from 'lucide-react'
import { Badge } from '../../components/ui'
import { formatCurrency } from '../../utils/formatters'
import { useMissionSection } from '../../hooks/useMissionsAdmin'
import { TrendChart, Donut, HBars, Delta } from './MissionCharts'
import { KpiGrid, Kpi, SectionPanel, Row, SkeletonChart } from './missionsShared'
import {
  num, ATTENTION, ATTENTION_SHORT, STATUS, STATUS_COLOR_VAR, statusBadge, fmtMinutes, pct, missionLabel, shortId,
} from './missionsConfig'
import styles from './Missions.module.css'

const count = (v) => String(Math.round(Number(v) || 0))

/* ───────── Bande d'alertes : UN conteneur, cellules cliquables → filtre la liste ───────── */
const AlertsBand = ({ onPick }) => {
  const q = useMissionSection('alerts')
  const alerts = q.data || []
  if (!alerts.length) return null
  return (
    <div className={styles.alertBar} role="status" aria-label="Points d'attention">
      <div className={styles.alertLead}>
        <AlertTriangle size={14} />
        <span>À traiter</span>
        <b>{alerts.reduce((s, a) => s + num(a.count), 0)}</b>
      </div>
      <ul className={styles.alertList}>
        {alerts.map((a) => (
          <li key={a.code} className={`${styles.alertItem} ${styles.alertClickable} ${styles[`sev_${a.severity}`]}`}>
            <button type="button" className={styles.alertBtn} title={`${ATTENTION[a.code] || a.code} — voir la liste`} onClick={() => onPick(a.code)}>
              <span className={styles.alertLabel}><i />{ATTENTION_SHORT[a.code] || a.code}</span>
              <span className={styles.alertFigures}>
                <b>{a.count}</b>
                <em>{formatCurrency(num(a.amount))}</em>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ───────── Missions à traiter (liste courte, instantané) ───────── */
const AttentionList = ({ onOpen }) => (
  <SectionPanel span={6} section="attention" title="Missions à traiter en priorité" hint="Instantané · 12 max">
    {(rows) => rows.length === 0 ? (
      <div className={styles.okState}><CheckCircle size={16} /> Rien à traiter : aucune mission ne demande d'attention.</div>
    ) : (
      <ul className={styles.attnList}>
        {rows.map((r) => {
          const s = statusBadge(r.status)
          return (
            <li key={r.id_mission}>
              <button type="button" className={styles.attnRow} onClick={() => onOpen(r)}>
                <span className={styles.attnMain}>
                  <span className={styles.attnTitle}>{missionLabel(r)}</span>
                  <span className={styles.attnSub}>
                    #{shortId(r.id_mission)} · {r.client_name || 'Client inconnu'}{r.artisan_name ? ` → ${r.artisan_name}` : ''}
                  </span>
                </span>
                <span className={styles.attnReason}>{ATTENTION[r.attention_reason] || r.attention_reason}</span>
                <Badge variant={s.color} size="sm" dot>{s.label}</Badge>
                <span className={styles.attnAmount}>{formatCurrency(num(r.amount))}</span>
                <span className={styles.attnAge}>{fmtMinutes(r.age_min)}</span>
                <ChevronRight size={14} className={styles.attnChevron} />
              </button>
            </li>
          )
        })}
      </ul>
    )}
  </SectionPanel>
)

const MissionsOverview = ({ onPickAlert, onOpen }) => (
  <>
    <AlertsBand onPick={onPickAlert} />

    <KpiGrid render={(k, p) => {
      const prev = (key) => (p ? p[key] : null)
      return (
        <>
          <Kpi icon={Briefcase} label="Missions"
            value={num(k.total)}
            delta={<Delta current={k.total} previous={prev('total')} />}
            sub={`${num(k.active)} en cours · ${num(k.waiting)} en attente${num(k.incident) ? ` · ${num(k.incident)} incident(s)` : ''}`} />
          <Kpi icon={CheckCircle} tone={k.completion_rate != null && k.completion_rate < 50 ? 'danger' : 'success'} label="Taux de complétion"
            value={k.completion_rate != null ? `${k.completion_rate} %` : '—'}
            delta={<Delta current={k.completion_rate} previous={prev('completion_rate')} />}
            sub={`${num(k.completed)} terminée(s) · ${num(k.cancelled)} annulée(s)`} />
          <Kpi icon={XCircle} tone={k.cancel_rate != null && k.cancel_rate >= 50 ? 'danger' : 'warning'} label="Taux d'annulation"
            value={k.cancel_rate != null ? `${k.cancel_rate} %` : '—'}
            delta={<Delta current={k.cancel_rate} previous={prev('cancel_rate')} invert />}
            sub={`${num(k.system_cancelled)} par le système · ${num(k.never_accepted)} sans artisan`} />
          <Kpi icon={DollarSign} tone="success" label="Volume terminé"
            value={formatCurrency(num(k.volume))}
            delta={<Delta current={k.volume} previous={prev('volume')} />}
            sub={`Commission Handyra ${formatCurrency(num(k.commission))}`} />
          <Kpi icon={ShoppingBasket} label="Panier moyen"
            value={formatCurrency(num(k.avg_basket))}
            delta={<Delta current={k.avg_basket} previous={prev('avg_basket')} />}
            sub={`${num(k.clients)} client(s) · ${num(k.artisans)} artisan(s) actif(s)`} />
          <Kpi icon={Timer} tone="info" label="Délai d'acceptation"
            value={fmtMinutes(k.median_accept_min)}
            delta={<Delta current={k.median_accept_min} previous={prev('median_accept_min')} invert />}
            sub={`Médiane · moyenne ${fmtMinutes(k.avg_accept_min)}`} />
          <Kpi icon={Hourglass} tone="info" label="Durée d'intervention"
            value={fmtMinutes(k.avg_duration_min)}
            delta={<Delta current={k.avg_duration_min} previous={prev('avg_duration_min')} />}
            sub="Moyenne, missions terminées" />
          <Kpi icon={Star} tone="warning" label="Satisfaction"
            value={k.avg_rating != null ? `${k.avg_rating} / 5` : '—'}
            delta={<Delta current={k.avg_rating} previous={prev('avg_rating')} />}
            sub={`${k.express_share != null ? k.express_share : 0} % de missions express (QR)`} />
        </>
      )
    }}
    />

    <div className={styles.grid}>
      <SectionPanel span={4} eager section="timeseries" title="Évolution" hint="Missions créées, par issue" skeleton={<SkeletonChart height={240} />}>
        {(d) => (
          <TrendChart data={d.points} bucket={d.bucket} format={count} series={[
            { key: 'created', label: 'Créées', color: 'var(--accent)', area: true },
            { key: 'completed', label: 'Terminées', color: 'var(--success)' },
            { key: 'cancelled', label: 'Annulées', color: 'var(--danger)' },
          ]} />
        )}
      </SectionPanel>

      <SectionPanel span={2} eager section="funnel" title="Entonnoir" hint="De la création à la fin" skeleton={<SkeletonChart height={150} />}>
        {(steps) => {
          const base = num(steps[0]?.count)
          return (
            <HBars valueFormat={count} items={steps.map((s, i) => ({
              label: s.label, value: num(s.count),
              meta: i === 0 ? 'Référence' : `${pct(num(s.count), base)} % des missions créées`,
              color: i === steps.length - 1 ? 'var(--success)' : 'var(--accent)',
            }))} />
          )
        }}
      </SectionPanel>

      <SectionPanel span={2} center section="by_status" title="Répartition par statut" skeleton={<SkeletonChart height={150} />}>
        {(rows) => (
          <Donut format={count} items={rows.map((r) => ({ label: statusBadge(r.status).label, value: num(r.count), color: STATUS_COLOR_VAR[r.status] }))}
            centerValue={rows.reduce((s, r) => s + num(r.count), 0)} centerLabel="Missions" />
        )}
      </SectionPanel>

      <SectionPanel span={2} section="pipeline" title="Missions en cours" hint="Instantané">
        {(rows) => rows.length === 0 ? (
          <div className={styles.okState}><CheckCircle size={16} /> Aucune mission active.</div>
        ) : (
          <ul className={styles.rows}>
            {rows.map((r) => (
              <Row key={r.status} label={(STATUS[r.status] || {}).label || r.status}
                value={`${r.count} · le plus ancien ${fmtMinutes(r.oldest_min)}`}
                tone={num(r.oldest_min) > 120 && r.status !== 'IN_PROGRESS' ? 'warn' : undefined} />
            ))}
          </ul>
        )}
      </SectionPanel>

      <SectionPanel span={2} section="delays" title="Délais d'acceptation" hint="Création → premier « oui »">
        {(d) => (
          <>
            <HBars valueFormat={count} items={(d.buckets || []).map((b) => ({
              label: b.label, value: num(b.count),
              color: b.key === 'never' ? 'var(--danger)' : b.key === 'gt60' ? 'var(--warning)' : 'var(--accent)',
            }))} />
            <ul className={styles.rows}>
              <Row label="Médiane / 90e centile" value={`${fmtMinutes(d.median_accept_min)} / ${fmtMinutes(d.p90_accept_min)}`} />
            </ul>
          </>
        )}
      </SectionPanel>

      <AttentionList onOpen={onOpen} />
    </div>
  </>
)

export default MissionsOverview