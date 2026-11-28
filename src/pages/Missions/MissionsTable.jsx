import React, { useMemo } from 'react'
import { Briefcase, Copy, Eye, ExternalLink, Ban, CheckCircle, Zap, Calendar, QrCode, AlertTriangle } from 'lucide-react'
import { Badge, Table, Spinner, EmptyState, ActionsMenu, Button } from '../../components/ui'
import { formatDateTime, formatCurrency } from '../../utils/formatters'
import { useFilterStore } from '../../store/filterStore'
import { useMissionsList } from '../../hooks/useMissionsAdmin'
import {
  num, STATUS_ORDER, ATTENTION_SHORT, CANCEL_ACTOR, ESCROW, statusBadge, shortId, missionLabel, fmtMinutes, isTerminal,
} from './missionsConfig'
import styles from './Missions.module.css'

const stop = (e) => e.stopPropagation()
const CAN_COMPLETE = new Set(['IN_PROGRESS', 'PENDING_VALIDATION'])

/* Pastilles de statut : comptages calculés par la base sous les AUTRES filtres */
const StatusChips = ({ facets, active, onPick }) => {
  const total = Object.values(facets).reduce((s, n) => s + num(n), 0)
  const items = STATUS_ORDER.filter((s) => num(facets[s]) > 0 || active === s)
  return (
    <div className={styles.chips} role="group" aria-label="Filtrer par statut">
      <button type="button" className={`${styles.chip} ${!active ? styles.chipActive : ''}`} onClick={() => onPick(null)} aria-pressed={!active}>
        Toutes <b>{total}</b>
      </button>
      {items.map((s) => (
        <button key={s} type="button" className={`${styles.chip} ${active === s ? styles.chipActive : ''}`}
          onClick={() => onPick(active === s ? null : s)} aria-pressed={active === s}>
          {statusBadge(s).label} <b>{num(facets[s])}</b>
        </button>
      ))}
    </div>
  )
}

const MissionsTable = ({ onOpen, onOpenPage, onCopy, onAction, onClear, hasFilters }) => {
  const { pagination, setPagination, setSorting, globalFilters, setGlobalFilter } = useFilterStore()
  const list = useMissionsList()

  const columns = useMemo(() => [
    {
      id: 'ref', header: 'Réf.', sortable: false, accessor: (r) => r,
      cell: ({ value: r }) => (
        <div className={styles.txCell}>
          <span className={styles.txRef}>#{shortId(r.id_mission)}</span>
          {r.attention_reason && (
            <span className={styles.attnTag} title={ATTENTION_SHORT[r.attention_reason]}><AlertTriangle size={10} />{ATTENTION_SHORT[r.attention_reason]}</span>
          )}
        </div>
      ),
    },
    {
      id: 'mission', header: 'Mission', sortable: false, accessor: (r) => r,
      cell: ({ value: r }) => <span className={styles.missionCell} title={missionLabel(r)}>{missionLabel(r)}</span>,
    },
    {
      id: 'category_name', header: 'Catégorie', sortable: true, accessor: (r) => r,
      cell: ({ value: r }) => r.category_name ? <span className={styles.secondary}>{r.category_name}</span> : <span className={styles.muted}>—</span>,
    },
    {
      id: 'type', header: 'Type', sortable: false, accessor: (r) => r,
      cell: ({ value: r }) => (
        <div className={styles.txCell}>
          <span className={styles.flowTag}>
            {r.mission_type === 'IMMEDIATE' ? <><Zap size={12} /> Immédiate</> : <><Calendar size={12} /> Planifiée</>}
          </span>
          {r.mission_mode === 'EXPRESS' && <span className={styles.muted}><QrCode size={10} /> Express</span>}
        </div>
      ),
    },
    {
      id: 'client_name', header: 'Client', sortable: true, accessor: (r) => r,
      cell: ({ value: r }) => (
        <div className={styles.txCell}>
          <span className={styles.senderCell}>{r.client_name || '—'}</span>
          {r.client_phone && <span className={styles.muted}>{r.client_phone}</span>}
        </div>
      ),
    },
    {
      id: 'artisan_name', header: 'Artisan', sortable: true, accessor: (r) => r,
      cell: ({ value: r }) => r.artisan_name ? (
        <div className={styles.txCell}>
          <span className={styles.senderCell}>{r.artisan_name}</span>
          {r.artisan_is_last && <span className={styles.mutedItalic}>dernier proposé</span>}
        </div>
      ) : <span className={styles.mutedItalic}>Non assigné</span>,
    },
    {
      id: 'status', header: 'Statut', sortable: true, accessor: (r) => r,
      cell: ({ value: r }) => {
        const s = statusBadge(r.status)
        return (
          <div className={styles.txCell}>
            <Badge variant={s.color} size="sm" dot>{s.label}</Badge>
            {r.status === 'CANCELLED' && (
              <span className={styles.muted} title={r.cancellation_label || r.cancellation_reason || ''}>
                par {CANCEL_ACTOR[r.cancelled_by] || '—'}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'amount', header: 'Montant', sortable: true, accessor: (r) => r,
      cell: ({ value: r }) => <span className={styles.amountIn}>{formatCurrency(num(r.amount))}</span>,
    },
    {
      id: 'escrow', header: 'Paiement', sortable: false, accessor: (r) => r,
      cell: ({ value: r }) => {
        const e = r.escrow_state ? ESCROW[r.escrow_state] : null
        return e ? <Badge variant={e.color} size="sm">{e.label}</Badge> : <span className={styles.muted}>Non payée</span>
      },
    },
    {
      id: 'attempts', header: 'Tentatives', sortable: true, accessor: (r) => r,
      cell: ({ value: r }) => num(r.attempts) > 0
        ? <span className={num(r.attempts) > 1 ? styles.warnText : styles.secondary}>{r.attempts}</span>
        : <span className={styles.muted}>—</span>,
    },
    {
      id: 'created_at', header: 'Créée le', sortable: true, accessor: (r) => r,
      cell: ({ value: r }) => (
        <div className={styles.txCell}>
          <span className={styles.secondary}>{r.created_at ? formatDateTime(r.created_at) : '—'}</span>
          {r.accept_delay_min != null && <span className={styles.muted}>acceptée en {fmtMinutes(r.accept_delay_min)}</span>}
        </div>
      ),
    },
    {
      id: 'actions', header: '', width: '50px', sortable: false, accessor: (r) => r,
      cell: ({ value: r }) => {
        const items = [
          { label: 'Aperçu rapide', icon: Eye, onClick: () => onOpen(r) },
          { label: 'Ouvrir la page', icon: ExternalLink, onClick: () => onOpenPage(r) },
          { label: "Copier l'identifiant", icon: Copy, onClick: () => onCopy(r.id_mission) },
        ]
        if (CAN_COMPLETE.has(r.status)) items.push({ separator: true }, { label: 'Terminer la mission', icon: CheckCircle, onClick: () => onAction('complete', r) })
        if (!isTerminal(r.status)) {
          if (!CAN_COMPLETE.has(r.status)) items.push({ separator: true })
          items.push({ label: 'Annuler la mission', icon: Ban, danger: true, onClick: () => onAction('cancel', r) })
        }
        return <span className={styles.stopZone} onClick={stop}><ActionsMenu items={items} /></span>
      },
    },
  ], [onOpen, onOpenPage, onCopy, onAction])

  const chips = (
    <StatusChips facets={list.facets} active={globalFilters.status || null}
      onPick={(v) => setGlobalFilter('status', v)} />
  )

  if (list.isLoading && list.missions.length === 0) {
    return <div className={styles.loading}><Spinner size="lg" /><span className={styles.loadingText}>Chargement des missions…</span></div>
  }
  if (list.isError) {
    return (
      <div className={styles.errorBox}>
        <strong>Erreur :</strong> {list.error?.message || 'Impossible de charger les missions'}
        <div><Button variant="outline" size="sm" onClick={() => list.refetch()}>Réessayer</Button></div>
      </div>
    )
  }
  return (
    <>
      {chips}
      {list.missions.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Aucune mission trouvée"
          description={hasFilters ? 'Aucune mission ne correspond à vos critères.' : 'Aucune mission enregistrée pour le moment.'}
          action={hasFilters ? { label: 'Réinitialiser', onClick: onClear } : undefined}
        />
      ) : (
        <div className={list.isPlaceholderData ? styles.dim : undefined}>
          <Table
            columns={columns}
            data={list.missions}
            rowKey="id_mission"
            loading={list.isFetching}
            sortable
            onRowClick={onOpen}
            onSort={(field, dir) => setSorting(field, dir)}
            pagination={{
              currentPage: pagination.page,
              totalPages: Math.max(1, Math.ceil(list.total / pagination.pageSize)),
              pageSize: pagination.pageSize,
              total: list.total,
              onPageChange: (page) => setPagination({ page }),
            }}
          />
        </div>
      )}
    </>
  )
}

export default MissionsTable