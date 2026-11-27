import { useState } from 'react'
import { UserPlus, MessageCircle, RefreshCw, UserMinus, Pencil, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Table, ActionsMenu, Modal, Input, Select } from '../../../../components/ui'
import { StatusBadge, DocsEmptyState, DocsErrorState, ConfirmDialog } from '../../../../components/docs'
import { ProgressBar } from '../../../../components/tests'
import {
  useTestTesters, useTestTesterMutations, TESTER_STATUS, TESTER_PROFILE, PLATFORM, buildInviteLink, toSelectOptions,
} from '../../../../hooks/tests'
import { useDebounce } from '../../../../hooks/useDebounce'
import { InviteModal } from './InviteModal'
import styles from '../../Tests.module.css'

const EditModal = ({ tester, onClose, update }) => {
  const [f, setF] = useState(() => ({
    fullName: tester.full_name || '', phone: tester.phone || '', profile: tester.profile, platform: tester.platform || '',
    deviceModel: tester.device_model || '', osVersion: tester.os_version || '', notes: tester.notes || '',
  }))
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }))
  const save = async () => {
    try { await update.mutateAsync({ id: tester.id_tester, payload: f }); onClose() } catch { /* toast */ }
  }
  return (
    <Modal isOpen onClose={onClose} title={`Modifier ${tester.email}`} size="md"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={save} isLoading={update.isPending}>Enregistrer</Button></>}>
      <div className={styles.formSection}>
        <Input label="Nom" value={f.fullName} onChange={set('fullName')} />
        <Input label="Téléphone / WhatsApp" value={f.phone} onChange={set('phone')} placeholder="+229 …" />
        <div className={styles.row}>
          <Select label="Profil" options={toSelectOptions(TESTER_PROFILE)} value={f.profile} onChange={set('profile')} />
          <Select label="Plateforme" value={f.platform} onChange={set('platform')} options={[{ value: '', label: 'Non précisée' }, ...toSelectOptions(PLATFORM)]} />
        </div>
        <div className={styles.row}>
          <Input label="Appareil" value={f.deviceModel} onChange={set('deviceModel')} placeholder="Tecno Spark 10" />
          <Input label="Version de l'OS" value={f.osVersion} onChange={set('osVersion')} placeholder="Android 13" />
        </div>
        <Input label="Notes internes" value={f.notes} onChange={set('notes')} />
      </div>
    </Modal>
  )
}

export const TestersTab = ({ campaign, readOnly }) => {
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 300)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const { testers, total, stats, isLoading, isError, error, refetch } =
    useTestTesters(campaign.id_campaign, { search, status: status || null, page, pageSize: 50 })
  const { invite, update, regenerateToken, getInvite } = useTestTesterMutations()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [regen, setRegen] = useState(null)

  const copyLink = async (t) => {
    try { const r = await getInvite(t.id_tester); await navigator.clipboard.writeText(buildInviteLink(r.invite_token)); toast.success('Lien copié') } catch { /* toast */ }
  }
  const whatsapp = async (t) => {
    try {
      const r = await getInvite(t.id_tester)
      const msg = `Bonjour${t.full_name ? ` ${t.full_name}` : ''} 👋\nMerci de participer aux tests de validation de Handyra (${campaign.name}).\nVotre lien personnel : ${buildInviteLink(r.invite_token)}\nIl vous donnera accès à vos scénarios de test. Ne le partagez pas.`
      const phone = (t.phone || '').replace(/\D/g, '')
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
    } catch { /* toast */ }
  }

  const columns = [
    { id: 'email', header: 'Testeur', accessor: 'email', cell: ({ row }) => (
      <div className={styles.titleCell}>
        <span className={styles.titlePrimary}>{row.full_name || row.email}</span>
        <span className={styles.titleMeta}>{row.full_name ? row.email : ''}{row.device_model ? ` · ${row.device_model}` : ''}</span>
      </div>) },
    { id: 'profile', header: 'Profil', accessor: 'profile', width: '150px', cell: ({ value }) => <StatusBadge map={TESTER_PROFILE} value={value} showIcon={false} /> },
    { id: 'platform', header: 'OS', accessor: 'platform', width: '90px', cell: ({ value }) => value ? <StatusBadge map={PLATFORM} value={value} showIcon={false} /> : <span className={styles.muted}>—</span> },
    { id: 'status', header: 'Statut', accessor: 'status', width: '110px', cell: ({ value }) => <StatusBadge map={TESTER_STATUS} value={value} /> },
    { id: 'progress', header: 'Progression', width: '170px', cell: ({ row }) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <ProgressBar total={row.runsTotal} segments={[{ value: row.runsPassed, color: 'green' }, { value: row.runsFailed, color: 'red' }]} />
        <span className={styles.hint}>{row.runsDone}/{row.runsTotal} · {row.runsFailed} échec(s) · {row.findings} retour(s)</span>
      </div>) },
    { id: 'actions', header: '', width: '50px', sortable: false, cell: ({ row }) => !readOnly && row.status !== 'REMOVED' && (
      <ActionsMenu items={[
        { label: 'Copier le lien', icon: Copy, onClick: () => copyLink(row) },
        { label: 'Envoyer sur WhatsApp', icon: MessageCircle, onClick: () => whatsapp(row) },
        { label: 'Nouveau lien…', icon: RefreshCw, onClick: () => setRegen(row) },
        { label: 'Modifier', icon: Pencil, onClick: () => setEditing(row) },
        { label: 'Retirer', icon: UserMinus, onClick: () => setRemoving(row) },
      ]} />) },
  ]

  if (isError) return <DocsErrorState error={error} onRetry={refetch} title="Impossible de charger les testeurs" />
  const none = !isLoading && stats.total === 0
  return (
    <div>
      {none ? (
        <DocsEmptyState icon="Users" title="Aucun testeur invité"
          description="Invitez vos testeurs par e-mail : chacun reçoit un lien personnel et ne voit que les scénarios de son profil."
          action={!readOnly ? { label: 'Inviter des testeurs', icon: UserPlus, onClick: () => setInviteOpen(true) } : undefined} />
      ) : (<>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className={styles.textarea} style={{ minHeight: 0, height: 34, width: 240 }} placeholder="Rechercher…" aria-label="Rechercher un testeur"
              value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1) }} />
            <select className={styles.textarea} style={{ minHeight: 0, height: 34, width: 160 }} aria-label="Filtrer par statut" value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
              <option value="">Tous statuts</option>
              {Object.entries(TESTER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {!readOnly && <Button variant="primary" icon={UserPlus} onClick={() => setInviteOpen(true)}>Inviter</Button>}
        </div>
        <Table columns={columns} data={testers} rowKey="id_tester" loading={isLoading}
          pagination={{ currentPage: page, totalPages: Math.max(1, Math.ceil(total / 50)), pageSize: 50, total, onPageChange: setPage }}
          emptyMessage="Aucun testeur ne correspond." />
      </>)}

      <InviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} campaign={campaign} invite={invite} />
      {editing && <EditModal tester={editing} onClose={() => setEditing(null)} update={update} />}
      <ConfirmDialog isOpen={!!removing} onClose={() => setRemoving(null)} loading={update.isPending}
        title="Retirer ce testeur ?" confirmLabel="Retirer"
        description="Ses exécutions non commencées sont supprimées ; son historique et ses retours sont conservés."
        onConfirm={async () => { try { await update.mutateAsync({ id: removing.id_tester, payload: { status: 'REMOVED' } }); setRemoving(null) } catch { /* toast */ } }} />
      <ConfirmDialog isOpen={!!regen} onClose={() => setRegen(null)} loading={regenerateToken.isPending} variant="warning"
        title="Générer un nouveau lien ?" confirmLabel="Générer"
        description="L'ancien lien cessera immédiatement de fonctionner. À utiliser si le lien a fuité."
        onConfirm={async () => { try { await regenerateToken.mutateAsync(regen.id_tester); setRegen(null) } catch { /* toast */ } }} />
    </div>
  )
}

export default TestersTab
