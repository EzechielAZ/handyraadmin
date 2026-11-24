import React, { useState } from 'react'
import { Timer, Clock, Users, Activity } from 'lucide-react'
import StatCard from '../ui/StatCard'
import styles from './EngagementSection.module.css'

const ROLES = [
  { key: 'ALL',     label: 'Tous' },
  { key: 'CLIENT',  label: 'Clients' },
  { key: 'ARTISAN', label: 'Artisans' },
]

const BUCKET_LABELS = ['< 1 min', '1–5 min', '5–15 min', '15–30 min', '30 min +']
const FUNNEL_LABELS = ['1re mission', '2e mission', '3e mission', '4e mission', '5e mission et +']
const PERIODS = [1, 2, 3, 6, 12, 24]
const ROLE_LABEL = { CLIENT: 'Clients', ARTISAN: 'Artisans' }
const LOW_SAMPLE = 30

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const nInt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

const pct = (a, b) => (b > 0 ? (a / b) * 100 : null)
const fmtPct = (v) => (v == null ? '—' : `${nf.format(v)} %`)

const fmtDuration = (s) => {
  if (s == null) return '—'
  const t = Math.round(s)
  if (t < 60) return `${t} s`
  const m = Math.floor(t / 60)
  const r = t % 60
  return r ? `${m} min ${r} s` : `${m} min`
}

/* ─────────────────────────────────────────────
   INTERPRÉTATIONS
───────────────────────────────────────────── */
const sessionInsights = (d, buckets) => {
  if (!d || !d.sessions) return ['Aucune session exploitable sur les 30 derniers jours.']

  const out = []
  const { avgSeconds: avg, medianSeconds: med } = d

  out.push(`Une session typique dure ${fmtDuration(med)} (médiane) ; la moyenne est de ${fmtDuration(avg)}.`)

  if (med > 0 && avg / med >= 1.5) {
    out.push("La moyenne dépasse nettement la médiane : quelques longues sessions la tirent vers le haut. La médiane décrit mieux l'usage courant.")
  } else {
    out.push("Moyenne et médiane sont proches : l'usage est homogène, sans distorsion par des sessions extrêmes.")
  }

  const total = buckets.reduce((s, b) => s + b.count, 0)
  const shortShare = pct(buckets[0].count, total)
  if (shortShare != null) {
    out.push(
      shortShare >= 50
        ? `${fmtPct(shortShare)} des sessions durent moins d'une minute : ce sont surtout des passages rapides (notifications, messages, suivi de mission). À croiser avec l'abandon dans les parcours de commande.`
        : `${fmtPct(shortShare)} des sessions durent moins d'une minute : la majorité des utilisateurs reste le temps d'accomplir une action.`
    )
  }

  if (d.users > 0) {
    out.push(`${nf.format(d.sessions / d.users)} sessions par utilisateur actif sur 30 jours.`)
  }

  const stick = pct(d.dau, d.mau)
  if (stick != null) {
    if (stick < 10) {
      out.push(`Stickiness (actifs 24 h / actifs 30 j) de ${fmtPct(stick)} : usage occasionnel, attendu pour un service au besoin ponctuel. Le levier de fidélisation passe surtout par les missions répétées.`)
    } else if (stick < 20) {
      out.push(`Stickiness de ${fmtPct(stick)} : usage régulier mais pas quotidien.`)
    } else {
      out.push(`Stickiness de ${fmtPct(stick)} : une vraie habitude d'usage s'installe.`)
    }
  }

  return out
}

const funnelInsights = (steps, total) => {
  const s1 = steps[0]
  if (!s1 || !s1.clients) return ['Aucune mission terminée pour le moment.']

  const out = []
  const conv = pct(s1.clients, total)
  if (conv != null) {
    out.push(`${fmtPct(conv)} des clients inscrits (${nInt.format(s1.clients)} sur ${nInt.format(total)}) ont terminé au moins une mission.`)
  }

  const r12 = pct(steps[1].clients, s1.clients)
  if (r12 != null) {
    const gap = steps[1].medianGapDays
    out.push(`${fmtPct(r12)} reviennent pour une 2e mission${gap != null ? `, après une médiane de ${nf.format(gap)} jours` : ''}.`)
  }

  const r23 = pct(steps[2].clients, steps[1].clients)
  if (r12 != null && r23 != null) {
    out.push(
      r23 > r12
        ? `Après la 2e mission, la fidélisation s'ancre : ${fmtPct(r23)} font une 3e mission, contre ${fmtPct(r12)} pour la 2e.`
        : `La perte se concentre après la 1re mission : ${fmtPct(r12)} passent à la 2e, puis ${fmtPct(r23)} à la 3e.`
    )
  }

  const r34 = pct(steps[3].clients, steps[2].clients)
  if (r34 != null && r34 >= 50) {
    out.push(`Au-delà de 3 missions, ${fmtPct(r34)} continuent : le noyau de clients récurrents est solide.`)
  }

  return out
}

const retentionInsights = (ret) => {
  const get = (role, n) => (ret?.[role] || []).find((p) => p.n === n)
  const rate = (p) => (p && p.eligible > 0 ? (p.returned / p.eligible) * 100 : null)

  const out = []
  let lowSample = false

  const r1 = {}
  ;['CLIENT', 'ARTISAN'].forEach((role) => {
    const p1 = get(role, 1)
    const p3 = get(role, 3)
    const p12 = get(role, 12)
    r1[role] = rate(p1)

    if (p1 && p1.eligible > 0) {
      out.push(`${ROLE_LABEL[role]} : ${fmtPct(rate(p1))} actifs durant le 1er mois suivant l'inscription (${nInt.format(p1.returned)} sur ${nInt.format(p1.eligible)}).`)
    }

    const a = rate(p1)
    const b = rate(p3)
    const c = rate(p12)
    if (a != null && b != null && b < a * 0.5) {
      out.push(`${ROLE_LABEL[role]} : forte érosion entre M+1 et M+3 (${fmtPct(a)} → ${fmtPct(b)}).`)
    } else if (b != null && c != null && b > 0 && c >= b * 0.6) {
      out.push(`${ROLE_LABEL[role]} : la courbe se stabilise entre M+3 et M+12 (${fmtPct(b)} → ${fmtPct(c)}), signe d'un noyau fidèle.`)
    }

    ;(ret?.[role] || []).forEach((p) => {
      if (p.eligible > 0 && p.eligible < LOW_SAMPLE) lowSample = true
    })
  })

  if (r1.CLIENT != null && r1.ARTISAN != null && r1.ARTISAN > r1.CLIENT + 5) {
    out.push("Les artisans reviennent davantage que les clients, ce qui est fréquent : leur activité dépend des missions reçues, alors que le besoin client est ponctuel.")
  }

  if (lowSample) {
    out.push(`Certaines cohortes comptent moins de ${LOW_SAMPLE} comptes (barres atténuées) : lecture indicative uniquement.`)
  }

  return out.length ? out : ["Pas encore assez d'ancienneté de comptes pour mesurer la rétention."]
}

/* ─────────────────────────────────────────────
   SOUS-COMPOSANTS
───────────────────────────────────────────── */
const Reading = ({ items }) => (
  <div className={styles.reading}>
    <p className={styles.readingTitle}>Lecture</p>
    <ul className={styles.readingList}>
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  </div>
)

const RetentionCell = ({ point, artisan }) => {
  if (!point || !point.eligible) {
    return (
      <div className={styles.retCell}>
        <span className={styles.muted}>Trop récent</span>
      </div>
    )
  }

  const rate = pct(point.returned, point.eligible)
  const low = point.eligible < LOW_SAMPLE

  return (
    <div
      className={styles.retCell}
      title={low ? `Échantillon de ${point.eligible} comptes : lecture prudente` : undefined}
    >
      <div className={styles.track}>
        <div
          className={[
            styles.fill,
            artisan && styles.fillArtisan,
            low && styles.fillLow,
          ].filter(Boolean).join(' ')}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className={styles.retValue}>{fmtPct(rate)}</span>
      <span className={styles.retCount}>
        {nInt.format(point.returned)}/{nInt.format(point.eligible)}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SECTION
───────────────────────────────────────────── */
const EngagementSection = ({ data }) => {
  const [role, setRole] = useState('ALL')

  if (!data) {
    return (
      <section className={styles.section}>
        <div className={styles.head}>
          <div>
            <p className={styles.eyebrow}>Engagement</p>
            <h2 className={styles.title}>Usage & rétention</h2>
          </div>
        </div>
        <div className={styles.card}>
          <p className={styles.muted}>
            Données d'engagement indisponibles. Vérifie que la fonction admin.dashboard_engagement est déployée.
          </p>
        </div>
      </section>
    )
  }

  /* Sessions */
  const d = data.sessions?.[role] || null
  const buckets = BUCKET_LABELS.map((label, i) => ({
    label,
    count: d?.buckets?.find((b) => b.ord === i + 1)?.count || 0,
  }))
  const bTotal = buckets.reduce((s, b) => s + b.count, 0)
  const bMax = Math.max(...buckets.map((b) => b.count), 0)
  const stickiness = d ? pct(d.dau, d.mau) : null

  /* Entonnoir missions */
  const f = data.missionFunnel || { clientsTotal: 0, steps: [] }
  const byStep = Object.fromEntries((f.steps || []).map((s) => [s.step, s]))
  const steps = [1, 2, 3, 4, 5].map((n) => byStep[n] || { step: n, clients: 0, medianGapDays: null })
  const base = steps[0].clients

  /* Rétention */
  const ret = data.retention || {}
  const retByN = (r) => Object.fromEntries((ret[r] || []).map((p) => [p.n, p]))
  const clientsRet = retByN('CLIENT')
  const artisansRet = retByN('ARTISAN')

  const trackingStart = data.trackingStart
    ? new Date(data.trackingStart).toLocaleDateString('fr-FR')
    : null

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Engagement</p>
          <h2 className={styles.title}>Usage & rétention</h2>
        </div>
        <div className={styles.segment} role="tablist" aria-label="Population">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={role === r.key}
              className={`${styles.segmentBtn} ${role === r.key ? styles.segmentBtnActive : ''}`}
              onClick={() => setRole(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className={styles.kpis}>
        <StatCard
          title="Durée médiane"
          value={d?.medianSeconds != null ? d.medianSeconds / 60 : null}
          decimals={1}
          suffix="min"
          changeLabel={d ? `sur ${nInt.format(d.sessions)} sessions · 30 j` : 'aucune session'}
          icon={Timer}
          color="primary"
        />
        <StatCard
          title="Durée moyenne"
          value={d?.avgSeconds != null ? d.avgSeconds / 60 : null}
          decimals={1}
          suffix="min"
          changeLabel={d?.p90Seconds != null ? `90 % des sessions < ${fmtDuration(d.p90Seconds)}` : '—'}
          icon={Clock}
          color="primary"
        />
        <StatCard
          title="Actifs sur 30 j"
          value={d?.mau ?? 0}
          changeLabel={d ? `${nInt.format(d.wau)} sur 7 j · ${nInt.format(d.dau)} sur 24 h` : '—'}
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Stickiness"
          value={stickiness}
          decimals={1}
          suffix="%"
          changeLabel="actifs 24 h / actifs 30 j"
          icon={Activity}
          color="primary"
        />
      </div>

      <div className={styles.grid}>
        {/* ── Distribution des durées ── */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <p className={styles.eyebrow}>Temps passé</p>
            <h3 className={styles.cardTitle}>Durée des sessions — 30 jours</h3>
          </div>

          <div className={styles.histo}>
            {buckets.map((b) => (
              <div key={b.label} className={styles.histoCol}>
                <span className={styles.histoValue}>
                  {bTotal ? fmtPct(pct(b.count, bTotal)) : '—'}
                </span>
                <div className={styles.histoBarWrap}>
                  <div
                    className={styles.histoBar}
                    style={{
                      height: bMax ? `${(b.count / bMax) * 100}%` : '0%',
                      minHeight: b.count > 0 ? 3 : 0,
                    }}
                  />
                </div>
                <span className={styles.histoLabel}>{b.label}</span>
              </div>
            ))}
          </div>

          <Reading items={sessionInsights(d, buckets)} />
        </div>

        {/* ── Entonnoir de fidélisation ── */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <p className={styles.eyebrow}>Fidélisation</p>
            <h3 className={styles.cardTitle}>Clients revenus après une mission</h3>
          </div>

          <div className={styles.funnel}>
            {steps.map((s, i) => {
              const prev = i > 0 ? steps[i - 1].clients : null
              const rate = i > 0 ? pct(s.clients, prev) : null
              const width = base ? (s.clients / base) * 100 : 0
              return (
                <div key={s.step} className={styles.funnelRow}>
                  <span className={styles.funnelLabel}>{FUNNEL_LABELS[i]}</span>
                  <div className={styles.track}>
                    <div className={styles.fill} style={{ width: `${width}%` }} />
                  </div>
                  <div className={styles.funnelValue}>
                    <span className={styles.funnelCount}>{nInt.format(s.clients)}</span>
                    <span className={styles.funnelMeta}>
                      {i === 0
                        ? 'base'
                        : `${fmtPct(rate)}${s.medianGapDays != null ? ` · ${nf.format(s.medianGapDays)} j` : ''}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <p className={styles.hint}>
            Taux = part des clients de l'étape précédente ; durée = délai médian depuis la mission précédente.
          </p>

          <Reading items={funnelInsights(steps, f.clientsTotal)} />
        </div>

        {/* ── Rétention depuis l'inscription ── */}
        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHead}>
            <p className={styles.eyebrow}>Rétention</p>
            <h3 className={styles.cardTitle}>Comptes revenus après l'inscription</h3>
          </div>

          <div className={styles.retWrap}>
            <div className={styles.retInner}>
              <div className={`${styles.retRow} ${styles.retHeadRow}`}>
                <span />
                <span>Clients</span>
                <span>Artisans</span>
              </div>
              {PERIODS.map((n) => (
                <div key={n} className={styles.retRow}>
                  <span className={styles.retPeriod}>M+{n}</span>
                  <RetentionCell point={clientsRet[n]} />
                  <RetentionCell point={artisansRet[n]} artisan />
                </div>
              ))}
            </div>
          </div>

          <Reading items={retentionInsights(ret)} />

          <p className={styles.hint}>
            M+n : part des comptes ayant ouvert l'app durant le n-ième mois suivant leur création. Seuls les comptes assez anciens sont comptés
            {trackingStart ? `, parmi ceux créés depuis le début du suivi des sessions (${trackingStart})` : ''}.
            Sessions retenues : entre 5 s et 4 h. Missions : statut terminé.
          </p>
        </div>
      </div>
    </section>
  )
}

export default EngagementSection