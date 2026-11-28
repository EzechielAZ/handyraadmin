import React, { useMemo, useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { Button, Modal, Select } from '../../components/ui'
import { formatCurrency } from '../../utils/formatters'
import { useMissionActions, useMissionSection } from '../../hooks/useMissionsAdmin'
import { num, statusBadge, shortId, missionLabel } from './missionsConfig'
import styles from './Missions.module.css'

const OTHER = '__other'

const Summary = ({ mission }) => (
  <div className={styles.modalSummary}>
    <b>#{shortId(mission.id_mission)} · {missionLabel(mission)}</b>
    <span>{statusBadge(mission.status).label}{mission.client_name ? ` · ${mission.client_name}` : ''}{mission.artisan_name ? ` → ${mission.artisan_name}` : ''}</span>
  </div>
)

const CancelForm = ({ mission, onClose, onDone }) => {
  const { cancel } = useMissionActions()
  const reasons = useMissionSection('reasons')
  const [code, setCode] = useState('')
  const [detail, setDetail] = useState('')

  const options = useMemo(() => [
    ...(reasons.data || []).filter((r) => r.code && r.label).map((r) => ({ value: r.code, label: r.label })),
    { value: OTHER, label: 'Autre motif (à préciser)' },
  ], [reasons.data])

  const label = options.find((o) => o.value === code)?.label
  const isOther = code === OTHER
  const text = detail.trim()
  const valid = code && (!isOther || text.length >= 3)
  const held = mission.escrow_state === 'HELD'

  const submit = () => {
    cancel.mutate({
      id: mission.id_mission,
      reasonCode: isOther ? null : code,
      reason: isOther ? text : (text ? `${label} — ${text}` : null),
    }, { onSuccess: onDone })
  }

  return (
    <div className={styles.modalStack}>
      <Summary mission={mission} />
      <Select label="Motif" required options={options} value={code} onChange={setCode}
        placeholder={reasons.isLoading ? 'Chargement…' : 'Sélectionner un motif…'} searchable />
      <label className={styles.field}>
        <span>{isOther ? 'Précisez le motif' : 'Précision (facultatif)'}</span>
        <textarea className={styles.textarea} rows={3} maxLength={400} value={detail}
          onChange={(e) => setDetail(e.target.value)} placeholder="Contexte utile pour le client, l'artisan et l'équipe…" />
      </label>
      <p className={styles.modalWarn}>
        <AlertTriangle size={14} />
        <span>
          Le client et l'artisan seront notifiés. {held
            ? <>Les fonds retenus ({formatCurrency(num(mission.paid_amount))}) seront remboursés au client : immédiatement sur le portefeuille, sous 24 à 48 h pour Mobile Money.</>
            : 'Aucun fonds retenu sur cette mission.'}
          {' '}Cette action est irréversible et enregistrée à votre nom.
        </span>
      </p>
      <div className={styles.modalActions}>
        <Button variant="outline" onClick={onClose} disabled={cancel.isPending}>Retour</Button>
        <Button variant="danger" onClick={submit} isLoading={cancel.isPending} disabled={!valid}>Confirmer l'annulation</Button>
      </div>
    </div>
  )
}

const CompleteForm = ({ mission, onClose, onDone }) => {
  const { complete } = useMissionActions()
  const [note, setNote] = useState('')
  const valid = note.trim().length >= 5
  return (
    <div className={styles.modalStack}>
      <Summary mission={mission} />
      <label className={styles.field}>
        <span>Justification <em>(obligatoire)</em></span>
        <textarea className={styles.textarea} rows={3} maxLength={400} value={note}
          onChange={(e) => setNote(e.target.value)} placeholder="Ex. : travail confirmé par téléphone avec le client le …" />
      </label>
      <p className={styles.modalInfo}>
        <Info size={14} />
        <span>
          La mission passe en « Terminée » : le séquestre est libéré à l'artisan et la commission Handyra est enregistrée,
          comme lors d'une validation par le client. Action enregistrée à votre nom.
        </span>
      </p>
      <div className={styles.modalActions}>
        <Button variant="outline" onClick={onClose} disabled={complete.isPending}>Retour</Button>
        <Button variant="success" onClick={() => complete.mutate({ id: mission.id_mission, note: note.trim() }, { onSuccess: onDone })}
          isLoading={complete.isPending} disabled={!valid}>Terminer la mission</Button>
      </div>
    </div>
  )
}

/* action = { type: 'cancel' | 'complete', mission } */
const MissionActionModals = ({ action, onClose, onDone = onClose }) => {
  if (!action) return null
  const { type, mission } = action
  return (
    <Modal isOpen onClose={onClose} title={type === 'cancel' ? 'Annuler la mission' : 'Terminer la mission'}>
      {type === 'cancel'
        ? <CancelForm key={mission.id_mission} mission={mission} onClose={onClose} onDone={onDone} />
        : <CompleteForm key={mission.id_mission} mission={mission} onClose={onClose} onDone={onDone} />}
    </Modal>
  )
}

export default MissionActionModals