import React from 'react'
import { Info } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { Heatmap, HBars, Donut, COLORS } from './MissionCharts'
import { SectionPanel, Row, SkeletonChart } from './missionsShared'
import {
  num, CANCEL_ACTOR, CANCEL_ACTOR_COLOR, CANCEL_STAGE, TYPE_LABEL, PRICING_LABEL, ORIGIN_LABEL, MODE_LABEL,
  RESPONSE_LABEL, fmtMinutes, shortId,
} from './missionsConfig'
import styles from './Missions.module.css'

const count = (v) => String(Math.round(Number(v) || 0))
const mixItems = (rows, labels) => rows.map((r, i) => ({ label: labels[r.key] || r.key, value: num(r.count), color: COLORS[i % COLORS.length] }))

/* Chaque panneau charge SA section uniquement quand il approche de l'écran. */
const MissionsAnalytics = () => (
  <div className={styles.grid}>
    <SectionPanel span={2} center eager section="cancellations" title="Qui annule ?" skeleton={<SkeletonChart height={150} />}>
      {(c) => (
        <Donut format={count} items={(c.by_actor || []).map((a) => ({
          label: CANCEL_ACTOR[a.actor] || a.actor, value: num(a.count), color: CANCEL_ACTOR_COLOR[a.actor],
        }))} centerValue={num(c.total)} centerLabel="Annulées" />
      )}
    </SectionPanel>

    <SectionPanel span={2} eager section="cancellations" title="Motifs d'annulation" hint="Top 8">
      {(c) => (
        <HBars valueFormat={count} color="var(--danger)" empty="Aucune annulation sur la période"
          items={(c.by_reason || []).map((r) => ({ label: r.label, value: num(r.count) }))} />
      )}
    </SectionPanel>

    <SectionPanel span={2} eager section="cancellations" title="Quand annule-t-on ?">
      {(c) => (
        <>
          <HBars valueFormat={count} empty="Aucune annulation sur la période" color="var(--warning)"
            items={(c.by_stage || []).map((s) => ({ label: CANCEL_STAGE[s.stage] || s.stage, value: num(s.count) }))} />
          <ul className={styles.rows}>
            <Row label="Délai moyen avant annulation" value={c.avg_hours_to_cancel != null ? `${c.avg_hours_to_cancel} h` : '—'} />
            <Row label="Montants remboursés" value={formatCurrency(num(c.refunded_amount))} />
          </ul>
        </>
      )}
    </SectionPanel>

    <SectionPanel span={4} section="heatmap" title="Affluence des demandes" hint="Jour × heure (heure du Bénin)" skeleton={<SkeletonChart height={150} />}>
      {(cells) => <Heatmap cells={cells} unit="mission" />}
    </SectionPanel>

    <SectionPanel span={2} section="mix" title="Nature des missions">
      {(m) => (
        <>
          <HBars valueFormat={count} items={mixItems(m.type || [], TYPE_LABEL)} />
          <HBars valueFormat={count} color="var(--info)" items={mixItems(m.pricing || [], PRICING_LABEL)} />
          <HBars valueFormat={count} color="var(--success)" items={mixItems(m.origin || [], ORIGIN_LABEL)} />
          <ul className={styles.rows}>
            {(m.mode || []).map((x) => <Row key={x.key} label={MODE_LABEL[x.key] || x.key} value={x.count} />)}
          </ul>
        </>
      )}
    </SectionPanel>

    <SectionPanel span={2} section="by_category" title="Par catégorie" hint="Top 8">
      {(rows) => (
        <HBars valueFormat={count} items={rows.map((c) => ({
          label: c.name, value: num(c.count),
          meta: `${c.completed} terminée(s) · ${c.cancelled} annulée(s) · ${formatCurrency(num(c.volume))}`,
        }))} />
      )}
    </SectionPanel>

    <SectionPanel span={2} section="by_zone" title="Par zone" hint="Quartier / commune">
      {(rows) => (
        <HBars valueFormat={count} color="var(--info)" items={rows.map((z) => ({
          label: z.name, value: num(z.count), meta: `${z.completed} terminée(s) · ${formatCurrency(num(z.volume))}`,
        }))} />
      )}
    </SectionPanel>

    <SectionPanel span={2} section="top_clients" title="Clients les plus actifs">
      {(rows) => (
        <HBars valueFormat={count} empty="Aucun client" items={rows.map((c) => ({
          label: c.name || 'Client inconnu', value: num(c.missions),
          meta: `${c.completed} terminée(s) · ${c.cancelled} annulée(s) · ${formatCurrency(num(c.volume))}`,
        }))} />
      )}
    </SectionPanel>

    <SectionPanel span={2} section="refusals" title="Affectations" hint="Tentatives par mission">
      {(r) => (
        <>
          <HBars valueFormat={count} items={(r.attempts || []).map((a) => ({
            label: a.n === 0 ? 'Aucune proposition' : a.n === 3 ? '3 tentatives ou plus' : `${a.n} tentative${a.n > 1 ? 's' : ''}`,
            value: num(a.count), color: a.n >= 2 ? 'var(--warning)' : 'var(--accent)',
          }))} />
          <ul className={styles.rows}>
            <Row label="Missions réaffectées" value={num(r.reassigned)} />
            {(r.by_response || []).map((x) => <Row key={x.key} label={RESPONSE_LABEL[x.key] || x.key} value={x.count} />)}
          </ul>
        </>
      )}
    </SectionPanel>

    <SectionPanel span={2} section="refusals" title="Motifs de refus des artisans" hint="Top 8">
      {(r) => (
        <HBars valueFormat={count} color="var(--warning)" empty="Aucun refus sur la période"
          items={(r.by_reason || []).map((x) => ({ label: x.label, value: num(x.count) }))} />
      )}
    </SectionPanel>

    <SectionPanel span={2} section="ratings" title="Satisfaction" hint="Avis des clients">
      {(r) => (
        <>
          <HBars valueFormat={count} empty="Aucun avis sur la période" color="var(--warning)"
            items={(r.distribution || []).slice().reverse().map((d) => ({ label: `${d.stars} ★`, value: num(d.count) }))} />
          <ul className={styles.rows}>
            <Row label="Note globale" value={r.avg_global != null ? `${r.avg_global} / 5` : '—'} strong />
            <Row label="Qualité · ponctualité" value={`${r.avg_quality ?? '—'} · ${r.avg_punctuality ?? '—'}`} />
          </ul>
        </>
      )}
    </SectionPanel>

    <SectionPanel span={2} section="top_artisans" title="Artisans les plus performants" hint="Missions terminées">
      {(rows) => (
        <HBars valueFormat={count} color="var(--success)" empty="Aucune mission terminée" items={rows.map((a) => ({
          label: a.name || 'Artisan inconnu', value: num(a.completed),
          meta: `${formatCurrency(num(a.volume))}${a.rating != null ? ` · ${a.rating} ★` : ''}`,
        }))} />
      )}
    </SectionPanel>

    <SectionPanel span={2} section="reliability" title="Artisans à surveiller" hint="Refus et délais dépassés">
      {(rows) => (
        <HBars valueFormat={(v) => `${v} %`} color="var(--danger)" empty="Aucun refus ni délai dépassé" items={rows.map((a) => ({
          label: a.name || 'Artisan inconnu', value: num(a.fail_rate),
          meta: `${a.refused} refus · ${a.missed} sans réponse · ${a.accepted} accepté(s) sur ${a.assignments}`,
        }))} />
      )}
    </SectionPanel>

    <SectionPanel span={2} section="ratings" title="Avis les plus bas" hint="≤ 2 étoiles">
      {(r) => (r.low_rated || []).length === 0 ? (
        <div className={styles.okState}>Aucun avis négatif sur la période.</div>
      ) : (
        <ul className={styles.rows}>
          {r.low_rated.map((x) => (
            <Row key={x.id_mission} label={`#${shortId(x.id_mission)} · ${formatDate(x.created_at)}`} value={`${x.rating} ★ ${x.comment ? `— ${x.comment}` : ''}`} />
          ))}
        </ul>
      )}
    </SectionPanel>

    <p className={`${styles.note} ${styles.s6}`}>
      <Info size={12} />
      Les chiffres de période portent sur les missions créées pendant la période (cohorte) : une mission créée en fin de mois
      mais terminée le mois suivant est comptée dans le mois de sa création.
      Délais mesurés entre la création et la première acceptation enregistrée.
    </p>
  </div>
)

export default MissionsAnalytics