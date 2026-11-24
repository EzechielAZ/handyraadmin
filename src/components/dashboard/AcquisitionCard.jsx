import React, { useState } from 'react'
import { Globe, Share2, QrCode } from 'lucide-react'
import styles from './AcquisitionCard.module.css'

const PERIODS = [
  { key: 'ALL', label: 'Tout' },
  { key: '30D', label: '30 j' },
]

const CHANNELS = [
  {
    key: 'ORGANIC',
    label: 'Inscription directe',
    hint: 'Sans parrain ni QR : campagnes, ads, recherche, bouche-à-oreille',
    icon: Globe,
    tone: 'toneA',
  },
  {
    key: 'REFERRAL',
    label: 'Parrainage artisan',
    hint: "Inscrits avec le code de parrainage d'un artisan",
    icon: Share2,
    tone: 'toneB',
  },
  {
    key: 'QR',
    label: 'QR devis',
    hint: "Arrivés via le QR d'un artisan (mission NEW_VIA_QR)",
    icon: QrCode,
    tone: 'toneC',
  },
]

const MIN_SAMPLE = 10

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const nInt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const pct = (a, b) => (b > 0 ? (a / b) * 100 : null)
const fmtPct = (v) => (v == null ? '—' : `${nf.format(v)} %`)

const buildInsights = (rows, total, data, period) => {
  if (!total) return ['Aucun client inscrit sur cette période.']

  const out = []

  const lead = [...rows].sort((a, b) => b.n - a.n)[0]
  out.push(
    `${lead.label} est le premier canal : ${fmtPct(pct(lead.n, total))} des inscrits (${nInt.format(lead.n)} sur ${nInt.format(total)}).`
  )

  const recommended = rows.filter((r) => r.key !== 'ORGANIC').reduce((s, r) => s + r.n, 0)
  const recShare = pct(recommended, total)
  out.push(
    recShare >= 50
      ? `Les artisans ambassadeurs (parrainage + QR devis) apportent ${fmtPct(recShare)} des clients : le réseau d'artisans pèse plus que l'acquisition directe.`
      : `Les artisans ambassadeurs (parrainage + QR devis) apportent ${fmtPct(recShare)} des clients ; l'acquisition directe reste le canal dominant.`
  )

  if (period === 'ALL') {
    if (data.overlapQrReferral > 0) {
      out.push(
        `${nInt.format(data.overlapQrReferral)} client(s) cumulent parrainage et QR devis : ils sont comptés dans QR devis.`
      )
    }
    if (data.invalidReferrals > 0) {
      out.push(
        `${nInt.format(data.invalidReferrals)} client(s) ont un parrain qui n'est pas un artisan : anomalie de données, ils sont comptés en inscription directe.`
      )
    }
  }

  const qualified = rows.filter((r) => r.n >= MIN_SAMPLE)
  if (qualified.length >= 2) {
    const ranked = [...qualified].sort((a, b) => b.conv - a.conv)
    const best = ranked[0]
    const worst = ranked[ranked.length - 1]
    if (best.conv - worst.conv >= 5) {
      out.push(
        `Qualité : les clients « ${best.label} » terminent plus souvent une mission (${fmtPct(best.conv)} contre ${fmtPct(worst.conv)} pour « ${worst.label} »).`
      )
    } else {
      out.push('Le taux de première mission terminée est comparable entre les canaux : aucun ne ressort sur la qualité.')
    }
  } else {
    out.push(`Moins de ${MIN_SAMPLE} clients sur la plupart des canaux : comparaison de qualité non fiable pour l'instant.`)
  }

  if (period === '30D') {
    out.push('Sur 30 jours, les derniers inscrits ont eu peu de temps pour commander : le taux de conversion est sous-estimé.')
  }

  return out
}

const AcquisitionCard = ({ data }) => {
  const [period, setPeriod] = useState('ALL')

  const head = (
    <div className={styles.head}>
      <div>
        <p className={styles.eyebrow}>Acquisition</p>
        <h3 className={styles.title}>Canaux d'inscription clients</h3>
      </div>
      {data && (
        <div className={styles.segment} role="tablist" aria-label="Période">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={period === p.key}
              className={`${styles.segmentBtn} ${period === p.key ? styles.segmentBtnActive : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  if (!data) {
    return (
      <div className={styles.card}>
        {head}
        <p className={styles.muted}>
          Données d'acquisition indisponibles. Vérifie que la fonction admin.dashboard_acquisition est déployée.
        </p>
      </div>
    )
  }

  const rows = CHANNELS.map((c) => {
    const ch = data.channels?.[c.key] || {}
    const all = period === 'ALL'
    const n = (all ? ch.total : ch.last30) || 0
    const conv = (all ? ch.converted : ch.converted30) || 0
    return { ...c, n, conv: pct(conv, n), convCount: conv }
  })

  const total = rows.reduce((s, r) => s + r.n, 0)

  return (
    <div className={styles.card}>
      {head}

      <div className={styles.summary}>
        <span className={styles.summaryValue}>{nInt.format(total)}</span>
        <span className={styles.summaryLabel}>
          {period === 'ALL' ? 'clients inscrits au total' : 'nouveaux clients sur 30 jours'}
        </span>
      </div>

      <div className={styles.stack} role="img" aria-label="Répartition des clients par canal">
        {rows.map((r) =>
          r.n > 0 ? (
            <div
              key={r.key}
              className={`${styles.seg} ${styles[r.tone]}`}
              style={{ width: `${(r.n / total) * 100}%` }}
              title={`${r.label} : ${nInt.format(r.n)}`}
            />
          ) : null
        )}
      </div>

      <div className={styles.rows}>
        {rows.map((r) => {
          const Icon = r.icon
          return (
            <div key={r.key} className={styles.row}>
              <span className={`${styles.iconTile} ${styles[`${r.tone}Soft`]}`}>
                <Icon size={15} strokeWidth={1.75} />
              </span>
              <div className={styles.rowText}>
                <span className={styles.rowLabel}>
                  <span className={`${styles.dot} ${styles[r.tone]}`} />
                  {r.label}
                </span>
                <span className={styles.rowHint}>{r.hint}</span>
              </div>
              <div className={styles.rowValue}>
                <span className={styles.rowCount}>
                  {nInt.format(r.n)}
                  <span className={styles.rowShare}>{fmtPct(pct(r.n, total))}</span>
                </span>
                <span className={styles.rowConv}>
                  {r.n > 0
                    ? `${fmtPct(r.conv)} ont terminé une mission`
                    : 'aucun client'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.reading}>
        <p className={styles.readingTitle}>Lecture</p>
        <ul className={styles.readingList}>
          {buildInsights(rows, total, data, period).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      <p className={styles.hint}>
        Un client est rattaché à un seul canal, par priorité : QR devis, puis parrainage artisan, puis inscription directe.
        « Inscription directe » regroupe tout ce qui n'est pas tracé ; pour isoler réseaux sociaux et ads, il faudra
        enregistrer la source (UTM) à l'inscription. Conversion = au moins une mission terminée.
      </p>
    </div>
  )
}

export default AcquisitionCard