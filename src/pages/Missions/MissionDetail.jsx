import React, { useState, useCallback, Suspense, lazy } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Badge, Spinner } from '../../components/ui'
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Copy, MapPin, Calendar, Clock, CreditCard, ExternalLink,
  Send, Phone, Image as ImageIcon, MessageSquare, User, Star, Receipt,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters'
import { useMissionDetail, useMissionActions } from '../../hooks/useMissionsAdmin'
import { Row, Skeleton } from './missionsShared'
import Timeline from './Timeline'
import {
  num, ATTENTION, CANCEL_ACTOR, ESCROW, TYPE_LABEL, PRICING_LABEL, ORIGIN_LABEL, MODE_LABEL, RESPONSE_LABEL, RESPONSE_COLOR,
  METHOD_LABEL, REQUEST_TYPE, PAY_STATUS, REPORT_REASON, REPORT_STATUS, PHOTO_TYPE, CALL_STATUS, AUDIT_ACTION,
  statusBadge, shortId, missionLabel, fmtMinutes, fmtSeconds, isTerminal,
} from './missionsConfig'
import mstyles from './Missions.module.css'
import styles from './MissionDetail.module.css'

const MissionActionModals = lazy(() => import('./MissionActionModals'))

const TABS = [
  { id: 'overview', label: 'Aperçu', icon: Calendar },
  { id: 'parties', label: 'Parties', icon: User },
  { id: 'assignments', label: 'Affectations', icon: Clock },
  { id: 'payments', label: 'Paiements', icon: CreditCard },
  { id: 'comms', label: 'Échanges', icon: MessageSquare },
  { id: 'evidence', label: 'Preuves & avis', icon: ImageIcon },
  { id: 'journal', label: 'Journal', icon: Receipt },
]
const CAN_COMPLETE = new Set(['IN_PROGRESS', 'PENDING_VALIDATION'])
const dt = (v) => (v ? formatDateTime(v) : '—')

/* ───────── Briques ───────── */
const Card = ({ title, aside, children, flush }) => (
  <section className={styles.card}>
    {(title || aside) && (
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{title}</h3>
        {aside}
      </div>
    )}
    <div className={flush ? undefined : styles.cardBody}>{children}</div>
  </section>
)

const Empty = ({ icon: Icon, children }) => <div className={styles.empty}>{Icon && <Icon size={20} />}<span>{children}</span></div>

const TabState = ({ q, children, lines = 6 }) => {
  if (q.isLoading) return <Card><Skeleton lines={lines} /></Card>
  if (q.isError) {
    return (
      <div className={mstyles.inlineError}>
        <span>{q.error?.message || 'Chargement impossible'}</span>
        <button type="button" onClick={() => q.refetch()}>Réessayer</button>
      </div>
    )
  }
  return children(q.data)
}

const ContactItem = ({ label, value, href }) => (
  <div className={styles.contactItem}>
    <span className={styles.contactLabel}>{label}</span>
    {href && value ? <a href={href} className={styles.contactValue}>{value}</a> : <span className={styles.contactValue}>{value || '—'}</span>}
  </div>
)

const Person = ({ title, p, children }) => {
  if (!p) return <Card title={title}><Empty icon={User}>Aucune information</Empty></Card>
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}><h3 className={styles.cardTitle}>{title}</h3></div>
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          {p.avatar_url ? <img src={p.avatar_url} alt="" loading="lazy" /> : <span className={styles.avatarFallback}>{p.full_name?.charAt(0)}</span>}
        </div>
        <div className={styles.profileInfo}>
          <h4 className={styles.profileName}>{p.full_name || 'Inconnu'}</h4>
          <div className={styles.profileBadges}>
            <Badge variant={p.status === 'ACTIVE' ? 'success' : 'secondary'} size="sm" dot>{p.status || 'Inconnu'}</Badge>
            {p.is_verified && <Badge variant="info" size="sm">Vérifié</Badge>}
            {p.profile?.is_pro_member && <Badge variant="primary" size="sm">PRO</Badge>}
            {p.is_last_assigned && <Badge variant="warning" size="sm">Dernier proposé</Badge>}
          </div>
        </div>
      </div>
      <div className={styles.contactGrid}>
        <ContactItem label="Email" value={p.email} href={`mailto:${p.email}`} />
        <ContactItem label="Téléphone" value={p.phone_number} href={`tel:${p.phone_number}`} />
        <ContactItem label="Dernière activité" value={p.last_active_at ? dt(p.last_active_at) : null} />
        {p.created_at && <ContactItem label="Membre depuis" value={formatDate(p.created_at)} />}
      </div>
      {children}
    </section>
  )
}

const MiniStats = ({ items }) => (
  <div className={styles.miniStats}>
    {items.map((i) => (
      <div key={i.label} className={styles.miniStat}>
        <span className={styles.miniStatLabel}>{i.label}</span>
        <span className={styles.miniStatValue}>{i.value}</span>
      </div>
    ))}
  </div>
)

/* ───────── Onglets (chacun ne charge sa donnée qu'à l'ouverture) ───────── */
const OverviewTab = ({ id, core }) => {
  const timeline = useMissionDetail(id, 'timeline')
  const m = core.mission
  const loc = core.location
  return (
    <div className={styles.tabStack}>
      <Card title="Description">
        <p className={styles.description}>{m.description || '—'}</p>
      </Card>

      <Card title="Caractéristiques">
        <ul className={mstyles.rows}>
          <Row label="Catégorie" value={m.category_name || 'Non catégorisée'} />
          <Row label="Type" value={TYPE_LABEL[m.mission_type] || m.mission_type} />
          <Row label="Mode" value={MODE_LABEL[m.mission_mode] || m.mission_mode} />
          <Row label="Tarification" value={PRICING_LABEL[m.pricing_type] || m.pricing_type || '—'} />
          <Row label="Origine du client" value={ORIGIN_LABEL[m.client_origin] || m.client_origin || '—'} />
          <Row label="Adresse" value={m.location_address || 'Non spécifiée'} />
          {loc?.geographic_name && <Row label="Zone" value={loc.geographic_name} />}
          {loc?.latitude != null && (
            <Row label="Position" value={
              <a className={styles.contactValue} target="_blank" rel="noreferrer"
                href={`https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=17/${loc.latitude}/${loc.longitude}`}>
                {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)} <ExternalLink size={11} />
              </a>} />
          )}
          {m.accept_delay_min != null && <Row label="Délai d'acceptation" value={fmtMinutes(m.accept_delay_min)} />}
          {m.duration_min != null && <Row label="Durée d'intervention" value={fmtMinutes(m.duration_min)} />}
          {core.children > 0 && <Row label="Missions liées" value={core.children} />}
          {m.quality_dispute && <Row label="Litige qualité" value="Oui" tone="warn" />}
          {m.refund_status && m.refund_status !== 'NONE' && <Row label="Remboursement" value={m.refund_status} tone="warn" />}
        </ul>
      </Card>

      {core.materials?.length > 0 && (
        <Card title="Matériaux">
          <div className={styles.materials}>
            {core.materials.map((x) => (
              <div key={x.id_material} className={styles.materialRow}>
                <span className={styles.materialName}>{x.item_name}</span>
                <span className={styles.materialQty}>{x.quantity} × {formatCurrency(num(x.unit_price))}</span>
                <span className={styles.materialTotal}>{formatCurrency(num(x.total_price))}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {core.milestones?.length > 0 && (
        <Card title="Jalons">
          <div className={styles.materials}>
            {core.milestones.map((x, i) => (
              <div key={x.id_milestone} className={styles.materialRow}>
                <span className={styles.materialName}>{i + 1}. {x.title}</span>
                <span className={styles.materialQty}>{x.amount_percentage} %</span>
                <Badge variant={x.status === 'PAID' ? 'success' : x.status === 'COMPLETED' ? 'info' : 'secondary'} size="sm">{x.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Chronologie">
        <TabState q={timeline} lines={5}>{(ev) => <Timeline events={ev} />}</TabState>
      </Card>
    </div>
  )
}

const PartiesTab = ({ id }) => {
  const q = useMissionDetail(id, 'parties')
  return (
    <TabState q={q}>
      {(d) => (
        <div className={styles.tabStack}>
          <Person title="Client" p={d.client}>
            {d.client && <MiniStats items={[
              { label: 'Missions', value: num(d.client.stats?.missions) },
              { label: 'Annulées', value: num(d.client.stats?.cancelled) },
              { label: 'Dépensé', value: formatCurrency(num(d.client.stats?.spent)) },
            ]} />}
          </Person>
          <Person title="Artisan" p={d.artisan}>
            {d.artisan && (
              <>
                <MiniStats items={[
                  { label: 'Note', value: `${d.artisan.profile?.average_rating != null ? Number(d.artisan.profile.average_rating).toFixed(1) : '—'}/5` },
                  { label: 'Terminées', value: num(d.artisan.stats?.completed) },
                  { label: 'Expérience', value: `${num(d.artisan.profile?.experience_years)} ans` },
                ]} />
                <MiniStats items={[
                  { label: 'Propositions', value: num(d.artisan.stats?.assignments) },
                  { label: 'Refus', value: num(d.artisan.stats?.refused) },
                  { label: 'Sans réponse', value: num(d.artisan.stats?.missed) },
                ]} />
                <div className={styles.contactGrid}>
                  <ContactItem label="IFU" value={d.artisan.profile?.ifu_number} />
                  <ContactItem label="KYC" value={d.artisan.profile?.kyc_status} />
                  <ContactItem label="Disponibilité" value={d.artisan.profile?.availability_status} />
                </div>
              </>
            )}
          </Person>
        </div>
      )}
    </TabState>
  )
}

const AssignmentsTab = ({ id }) => {
  const q = useMissionDetail(id, 'assignments')
  return (
    <TabState q={q}>
      {(d) => (
        <div className={styles.tabStack}>
          <Card title="Tentatives d'affectation" flush>
            {d.assignments.length === 0 ? <Empty icon={Clock}>Aucune proposition à un artisan</Empty> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>#</th><th>Artisan</th><th>Proposée</th><th>Réponse</th><th>Délai</th><th>Statut</th></tr></thead>
                  <tbody>
                    {d.assignments.map((a) => (
                      <tr key={a.id}>
                        <td>{a.attempt_number}{a.is_current && <em className={styles.curTag}>actuelle</em>}</td>
                        <td>{a.artisan_name || '—'}</td>
                        <td>{dt(a.assigned_at)}</td>
                        <td>{dt(a.responded_at)}</td>
                        <td>{fmtSeconds(a.response_seconds)}</td>
                        <td><Badge variant={RESPONSE_COLOR[a.response_status] || 'secondary'} size="sm" dot>{RESPONSE_LABEL[a.response_status] || a.response_status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {d.refusals.length > 0 && (
            <Card title="Refus d'artisans">
              <ul className={mstyles.rows}>
                {d.refusals.map((r, i) => (
                  <Row key={i} label={`${r.artisan_name || 'Artisan'} · ${dt(r.refused_at)}`} value={`${r.label || r.code || '—'}${r.details ? ` — ${r.details}` : ''}`} />
                ))}
              </ul>
            </Card>
          )}

          {d.tracking && (
            <Card title="Suivi GPS">
              <ul className={mstyles.rows}>
                <Row label="État" value={d.tracking.status === 'active' ? 'Actif' : 'Archivé'} />
                <Row label="Dernier signal" value={dt(d.tracking.last_heartbeat_at)} />
                <Row label="Position actuelle" value={d.tracking.current_lat != null ? `${Number(d.tracking.current_lat).toFixed(5)}, ${Number(d.tracking.current_lng).toFixed(5)}` : '—'} />
                <Row label="Précision" value={d.tracking.accuracy_m != null ? `${Math.round(d.tracking.accuracy_m)} m` : '—'} />
                <Row label="Points enregistrés" value={d.tracking.points} />
              </ul>
            </Card>
          )}

          {d.stuck.length > 0 && (
            <Card title="Surveillance automatique">
              <ul className={mstyles.rows}>
                {d.stuck.map((s, i) => (
                  <Row key={i} label={`${s.case_type} · niveau ${s.escalation_level ?? 0}`}
                    value={s.resolved_at ? `Résolu le ${dt(s.resolved_at)}` : `Signalé le ${dt(s.first_flagged_at)} · ${s.notification_count} relance(s)`}
                    tone={s.resolved_at ? undefined : 'warn'} />
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </TabState>
  )
}

const PaymentsTab = ({ id }) => {
  const q = useMissionDetail(id, 'payments')
  return (
    <TabState q={q}>
      {(d) => {
        const s = d.summary || {}
        const esc = s.escrow_state ? ESCROW[s.escrow_state] : null
        return (
          <div className={styles.tabStack}>
            <Card title="Synthèse">
              <ul className={mstyles.rows}>
                <Row label="Montant de la mission" value={formatCurrency(num(s.amount))} strong />
                <Row label="Estimé · final" value={`${formatCurrency(num(s.estimated))} · ${s.final != null ? formatCurrency(num(s.final)) : '—'}`} />
                <Row label="Commission Handyra" value={formatCurrency(num(s.handyra_fee))} />
                {num(s.travel_fee) > 0 && <Row label="Frais de déplacement" value={formatCurrency(num(s.travel_fee))} />}
                {num(s.materials) > 0 && <Row label="Matériaux" value={formatCurrency(num(s.materials))} />}
                <Row label="Encaissé" value={formatCurrency(num(s.paid))} />
                {num(s.refunded) > 0 && <Row label="Remboursé" value={formatCurrency(num(s.refunded))} />}
                <Row label="Séquestre" value={esc?.label || '—'} />
              </ul>
            </Card>

            {d.requests.length === 0 ? <Card><Empty icon={CreditCard}>Aucune demande de paiement</Empty></Card> : d.requests.map((r) => (
              <Card key={r.id_request} title={`${REQUEST_TYPE[r.type] || r.type} · ${formatCurrency(num(r.amount))}`}
                aside={<Badge variant={(PAY_STATUS[r.status] || {}).color || 'secondary'} size="sm" dot>{(PAY_STATUS[r.status] || {}).label || r.status}</Badge>}>
                {r.payments.length === 0 ? <span className={mstyles.muted}>Aucun paiement enregistré</span> : (
                  <ul className={mstyles.rows}>
                    {r.payments.map((p) => (
                      <Row key={p.id_payment}
                        label={`${METHOD_LABEL[p.method] || p.method}${p.network ? ` · ${p.network}` : ''} · ${dt(p.processed_at)}`}
                        value={<>{formatCurrency(num(p.amount))} <Badge variant={(PAY_STATUS[p.status] || {}).color || 'secondary'} size="sm">{(PAY_STATUS[p.status] || {}).label || p.status}</Badge>{' '}
                          <Badge variant={(ESCROW[p.escrow_status] || {}).color || 'secondary'} size="sm">{(ESCROW[p.escrow_status] || {}).label || p.escrow_status}</Badge></>} />
                    ))}
                  </ul>
                )}
              </Card>
            ))}

            {d.quotes.length > 0 && d.quotes.map((qt) => (
              <Card key={qt.id_quote} title={`Devis ${qt.number}`} aside={<Badge variant="secondary" size="sm">{qt.status}</Badge>}>
                <ul className={mstyles.rows}>
                  {qt.lines.map((l, i) => (
                    <Row key={i} label={`${l.description || l.type} · ${l.quantity} ${l.unit || ''} × ${formatCurrency(num(l.unit_price))}`} value={formatCurrency(num(l.total))} />
                  ))}
                  <Row label="Total devis" value={formatCurrency(num(qt.total))} strong />
                </ul>
                {qt.pdf_url && <a className={styles.contactValue} href={qt.pdf_url} target="_blank" rel="noreferrer">Télécharger le PDF <ExternalLink size={11} /></a>}
              </Card>
            ))}

            {d.invoices.length > 0 && (
              <Card title="Factures">
                <ul className={mstyles.rows}>
                  {d.invoices.map((i) => (
                    <Row key={i.id_invoice} label={`${i.number} · ${i.type} · ${i.status}`}
                      value={<>{formatCurrency(num(i.total))}{i.pdf_url && <> <a href={i.pdf_url} target="_blank" rel="noreferrer" className={styles.contactValue}><ExternalLink size={11} /></a></>}</>} />
                  ))}
                </ul>
              </Card>
            )}

            <Card title="Registre des revenus Handyra">
              {d.revenue.length === 0
                ? <span className={mstyles.muted}>Aucune écriture pour cette mission{num(s.fee) > 0 && num(s.paid) > 0 && s.escrow_state === 'RELEASED' ? ' — vérifier la comptabilité' : ''}.</span>
                : <ul className={mstyles.rows}>{d.revenue.map((r, i) => <Row key={i} label={`${r.source_type} · ${dt(r.recorded_at)}`} value={formatCurrency(num(r.amount))} />)}</ul>}
            </Card>
          </div>
        )
      }}
    </TabState>
  )
}

const CommsTab = ({ id }) => {
  const q = useMissionDetail(id, 'comms')
  return (
    <TabState q={q}>
      {(d) => (
        <div className={styles.tabStack}>
          <section className={styles.chatCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Messages</h3>
              <span className={mstyles.muted}>{d.messages.length} · lecture seule</span>
            </div>
            <div className={styles.chatMessages}>
              {d.messages.length === 0 && <Empty icon={MessageSquare}>Aucun message</Empty>}
              {d.messages.map((m) => m.message_type === 'SYSTEM_EVENT' ? (
                <div key={m.id_message} className={styles.sysEvent}>
                  <span>{m.event ? `Événement : ${m.event}` : 'Événement système'}</span><time>{dt(m.sent_at)}</time>
                </div>
              ) : (
                <div key={m.id_message} className={styles.message}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageSender}>{m.sender_name || 'Inconnu'}</span>
                    <span className={styles.messageTime}>{dt(m.sent_at)}</span>
                  </div>
                  <p className={styles.messageContent}>{m.is_deleted ? <em>Message supprimé</em> : (m.content || (m.media_url ? '📎 Pièce jointe' : ''))}</p>
                </div>
              ))}
            </div>
            {d.messages.some((m) => m.direct === false) && (
              <p className={styles.chatNote}>Certains messages proviennent de la conversation client–artisan pendant la durée de la mission.</p>
            )}
          </section>

          <Card title="Appels" flush>
            {d.calls.length === 0 ? <Empty icon={Phone}>Aucun appel</Empty> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Date</th><th>De</th><th>Vers</th><th>Durée</th><th>Statut</th></tr></thead>
                  <tbody>
                    {d.calls.map((c) => (
                      <tr key={c.id_call}>
                        <td>{dt(c.start_time)}</td><td>{c.caller_name || '—'}</td><td>{c.receiver_name || '—'}</td>
                        <td>{c.duration_seconds != null ? fmtSeconds(c.duration_seconds) : '—'}</td>
                        <td>{CALL_STATUS[c.status] || c.status}{c.is_masked ? ' · masqué' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </TabState>
  )
}

const EvidenceTab = ({ id }) => {
  const q = useMissionDetail(id, 'evidence')
  return (
    <TabState q={q}>
      {(d) => (
        <div className={styles.tabStack}>
          <Card title={`Photos (${d.photos.length})`}>
            {d.photos.length === 0 ? <span className={mstyles.muted}>Aucune photo</span> : (
              <div className={styles.photoGrid}>
                {d.photos.map((p) => (
                  <a key={p.id_photo} href={p.url} target="_blank" rel="noreferrer" className={styles.photo} title={p.notes || ''}>
                    <img src={p.thumbnail_url || p.url} alt={PHOTO_TYPE[p.type] || 'Photo'} loading="lazy" />
                    <span>{PHOTO_TYPE[p.type] || p.type}</span>
                  </a>
                ))}
              </div>
            )}
          </Card>

          <Card title="Avis">
            {d.reviews.length === 0 ? <span className={mstyles.muted}>Aucun avis</span> : (
              <ul className={styles.reviewList}>
                {d.reviews.map((r, i) => (
                  <li key={i}>
                    <div className={styles.reviewHead}>
                      <b>{r.role === 'CLIENT' ? 'Le client' : "L'artisan"}</b>
                      <span className={styles.stars}><Star size={12} /> {r.rating}/5</span>
                      <span className={mstyles.muted}>qualité {r.quality ?? '—'} · ponctualité {r.punctuality ?? '—'} · {dt(r.created_at)}</span>
                    </div>
                    {r.comment && <p className={styles.reviewText}>{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Signalements (${d.reports.length})`}>
            {d.reports.length === 0 ? <span className={mstyles.muted}>Aucun signalement</span> : (
              <ul className={styles.reviewList}>
                {d.reports.map((r) => (
                  <li key={r.id_report}>
                    <div className={styles.reviewHead}>
                      <b>{REPORT_REASON[r.reason_type] || r.reason_type}</b>
                      <Badge variant={r.status === 'OPEN' ? 'danger' : r.status === 'UNDER_INVESTIGATION' ? 'warning' : 'secondary'} size="sm">{REPORT_STATUS[r.status] || r.status}</Badge>
                      <span className={mstyles.muted}>{r.reporter_name} → {r.reported_name} · {dt(r.created_at)}</span>
                    </div>
                    {r.description && <p className={styles.reviewText}>{r.description}</p>}
                    {r.admin_note && <p className={styles.reviewText}><em>Note admin : {r.admin_note}</em></p>}
                    {r.evidence_url && <a className={styles.contactValue} href={r.evidence_url} target="_blank" rel="noreferrer">Pièce jointe <ExternalLink size={11} /></a>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </TabState>
  )
}

const JournalTab = ({ id }) => {
  const q = useMissionDetail(id, 'journal')
  const { addNote } = useMissionActions()
  const [note, setNote] = useState('')
  const submit = () => addNote.mutate({ id, note: note.trim() }, { onSuccess: () => setNote('') })
  return (
    <div className={styles.tabStack}>
      <Card title="Ajouter une note interne">
        <div className={styles.noteForm}>
          <textarea className={mstyles.textarea} rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Visible uniquement par l'équipe admin : appel passé, décision prise, suite à donner…" />
          <Button variant="primary" icon={Send} onClick={submit} isLoading={addNote.isPending} disabled={note.trim().length < 2}>Enregistrer la note</Button>
        </div>
      </Card>
      <Card title="Historique des actions admin">
        <TabState q={q} lines={4}>
          {(rows) => rows.length === 0 ? <span className={mstyles.muted}>Aucune action ni note pour cette mission.</span> : (
            <ul className={styles.reviewList}>
              {rows.map((r) => (
                <li key={r.id_log}>
                  <div className={styles.reviewHead}>
                    <b>{AUDIT_ACTION[r.action] || r.action}</b>
                    <span className={mstyles.muted}>{r.admin_name || 'Admin'} · {dt(r.created_at)}</span>
                  </div>
                  {(r.new_data?.note || r.new_data?.reason) && <p className={styles.reviewText}>{r.new_data.note || r.new_data.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </TabState>
      </Card>
    </div>
  )
}

/* ───────── Page ───────── */
const SummaryRow = ({ icon: Icon, label, value }) => (
  <div className={styles.summaryRow}>
    <Icon size={12} className={styles.summaryIcon} />
    <div><span className={styles.summaryLabel}>{label}</span><span className={styles.summaryValue}>{value}</span></div>
  </div>
)

const MissionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const core = useMissionDetail(id, 'core')
  const [tab, setTab] = useState('overview')
  const [action, setAction] = useState(null)

  const copy = useCallback(() => { navigator.clipboard.writeText(id || ''); toast.success('Identifiant copié') }, [id])

  if (core.isLoading) {
    return <div className={styles.loading}><Spinner size="lg" /><span className={styles.loadingText}>Chargement…</span></div>
  }
  if (core.isError || !core.data?.mission) {
    return (
      <div className={styles.errorPage}>
        <AlertTriangle size={32} className={styles.errorIcon} />
        <h2>Mission introuvable</h2>
        <p>{core.error?.message || "Cette mission n'existe pas ou a été supprimée."}</p>
        <Button onClick={() => navigate('/missions')}>Retour à la liste</Button>
      </div>
    )
  }

  const data = core.data
  const m = data.mission
  const s = statusBadge(m.status)
  const esc = m.escrow_state ? ESCROW[m.escrow_state] : null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/missions')}>Retour</Button>
          <span className={styles.divider} />
          <div>
            <p className={styles.eyebrow}>Mission</p>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>#{shortId(m.id_mission)}</h1>
              <Badge variant={s.color} size="md" dot>{s.label}</Badge>
              {esc && <Badge variant={esc.color} size="sm">{esc.label}</Badge>}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" size="sm" icon={Copy} onClick={copy}>Copier l'ID</Button>
          {CAN_COMPLETE.has(m.status) && (
            <Button variant="success" size="sm" icon={CheckCircle} onClick={() => setAction({ type: 'complete', mission: m })}>Terminer</Button>
          )}
          {!isTerminal(m.status) && (
            <Button variant="danger" size="sm" icon={XCircle} onClick={() => setAction({ type: 'cancel', mission: m })}>Annuler</Button>
          )}
        </div>
      </header>

      {m.attention_reason && (
        <p className={`${mstyles.modalWarn} ${styles.banner}`}><AlertTriangle size={14} /><span>{ATTENTION[m.attention_reason] || m.attention_reason}</span></p>
      )}

      <div className={styles.content}>
        <div className={styles.main}>
          <nav className={styles.tabs} role="tablist" aria-label="Sections de la mission">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>
                <t.icon size={13} />{t.label}
              </button>
            ))}
          </nav>
          <div className={styles.tabContent} role="tabpanel">
            {tab === 'overview' && <OverviewTab id={id} core={data} />}
            {tab === 'parties' && <PartiesTab id={id} />}
            {tab === 'assignments' && <AssignmentsTab id={id} />}
            {tab === 'payments' && <PaymentsTab id={id} />}
            {tab === 'comms' && <CommsTab id={id} />}
            {tab === 'evidence' && <EvidenceTab id={id} />}
            {tab === 'journal' && <JournalTab id={id} />}
          </div>
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.card}>
            <div className={styles.cardHeader}><h3 className={styles.cardTitle}>{missionLabel(m)}</h3></div>
            <div className={styles.cardBody}>
              <SummaryRow icon={Calendar} label="Créée le" value={dt(m.created_at)} />
              {m.scheduled_at && <SummaryRow icon={Clock} label="Planifiée" value={dt(m.scheduled_at)} />}
              {m.started_at && <SummaryRow icon={Clock} label="Démarrée" value={dt(m.started_at)} />}
              {m.ended_at && <SummaryRow icon={Clock} label="Terminée" value={dt(m.ended_at)} />}
              {m.cancelled_at && <SummaryRow icon={Clock} label="Annulée" value={dt(m.cancelled_at)} />}
              <SummaryRow icon={MapPin} label="Adresse" value={m.location_address || 'Non spécifiée'} />
              <div className={styles.dividerH} />
              <SummaryRow icon={User} label="Client" value={m.client_name || '—'} />
              <SummaryRow icon={User} label="Artisan" value={m.artisan_name ? `${m.artisan_name}${m.artisan_is_last ? ' (dernier proposé)' : ''}` : 'Non assigné'} />
              <div className={styles.dividerH} />
              <SummaryRow icon={CreditCard} label="Estimé" value={formatCurrency(num(m.estimated_price))} />
              {m.final_price != null && <SummaryRow icon={CreditCard} label="Final" value={formatCurrency(num(m.final_price))} />}
              <SummaryRow icon={CreditCard} label="Commission Handyra" value={formatCurrency(num(m.handyra_fee))} />
              <SummaryRow icon={CreditCard} label="Encaissé" value={formatCurrency(num(m.paid_amount))} />
              {num(m.material_cost_total) > 0 && <SummaryRow icon={CreditCard} label="Matériaux" value={formatCurrency(num(m.material_cost_total))} />}
              {m.status === 'CANCELLED' && (
                <>
                  <div className={styles.dividerH} />
                  <div className={styles.cancellation}>
                    <AlertTriangle size={13} />
                    <div>
                      <span className={styles.summaryLabel}>Annulée par {CANCEL_ACTOR[m.cancelled_by] || '—'}</span>
                      <p className={styles.cancellationReason}>{m.cancellation_label || m.cancellation_reason || 'Motif non renseigné'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </aside>
      </div>

      {action && (
        <Suspense fallback={null}>
          <MissionActionModals action={action} onClose={() => setAction(null)} />
        </Suspense>
      )}
    </div>
  )
}

export default MissionDetail