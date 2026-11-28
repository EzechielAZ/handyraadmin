import React, { useMemo } from 'react'
import { CreditCard, Copy, Eye } from 'lucide-react'
import { Badge, Table, Spinner, EmptyState, ActionsMenu, Button } from '../../components/ui'
import { formatDateTime, formatCurrency } from '../../utils/formatters'
import { useFilterStore } from '../../store/filterStore'
import { usePayments } from '../../hooks/usePayments'
import {
  num, FLOW_LABEL, FLOW_COLOR, ESCROW, BLOCK_REASON, methodLabel, subLabel, statusBadge,
} from './paymentsConfig'
import styles from './Payments.module.css'

const stop = (e) => e.stopPropagation()

const PaymentsTransactions = ({ onOpen, onCopy, onClear, hasFilters }) => {
  const { pagination, setPagination, setSorting } = useFilterStore()
  const list = usePayments()

  const columns = useMemo(() => [
    {
      id: 'flow_type', header: 'Opération', sortable: true, accessor: (r) => r,
      cell: ({ value: r }) => (
        <div className={styles.txCell}>
          <span className={styles.flowTag}>
            <i style={{ background: FLOW_COLOR[r.flow_type] }} />
            {FLOW_LABEL[r.flow_type] || r.flow_type}
            {subLabel(r.sub_type) && <em> · {subLabel(r.sub_type)}</em>}
          </span>
          <span className={styles.txRef}>#{r.reference || '—'}</span>
        </div>
      ),
    },
    {
      id: 'party_name', header: 'Partie / Détail', sortable: true, accessor: (r) => r,
      cell: ({ value: r }) => (
        <div className={styles.txCell}>
          <span className={styles.senderCell}>{r.party_name || '—'}</span>
          {(r.mission_description || r.plan_name) && (
            <span className={styles.missionCell} title={r.mission_description || r.plan_name}>
              {r.mission_description || `Offre ${r.plan_name}`}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'amount', header: 'Montant', sortable: true, accessor: (r) => r,
      cell: ({ value: r }) => (
        <span className={r.direction === 'OUT' ? styles.amountOut : styles.amountIn}>
          {r.direction === 'OUT' ? '−' : '+'}{formatCurrency(num(r.amount))}
        </span>
      ),
    },
    {
      id: 'split', header: 'Plateforme / Net', sortable: false, accessor: (r) => r,
      cell: ({ value: r }) => r.flow_type === 'MISSION_PAYMENT' ? (
        <div className={styles.txCell}>
          <span className={styles.secondary}>{formatCurrency(num(r.platform_amount))}</span>
          <span className={styles.net}>{formatCurrency(num(r.net_amount))}</span>
        </div>
      ) : <span className={styles.muted}>—</span>,
    },
    {
      id: 'method', header: 'Méthode', sortable: true, accessor: (r) => r,
      cell: ({ value: r }) => (
        <div className={styles.txCell}>
          <span className={styles.secondary}>{methodLabel(r.method)}</span>
          {r.network && <span className={styles.muted}>{r.network}</span>}
        </div>
      ),
    },
    {
      id: 'status', header: 'Statut', sortable: true, accessor: (r) => r,
      cell: ({ value: r }) => {
        const s = statusBadge(r.status)
        return (
          <div className={styles.txCell}>
            <Badge variant={s.color} size="sm" dot>{s.label}</Badge>
            {r.blocked_reason && <span className={styles.muted}>{BLOCK_REASON[r.blocked_reason] || r.blocked_reason}</span>}
          </div>
        )
      },
    },
    {
      id: 'escrow', header: 'Séquestre', sortable: false, accessor: (r) => r.escrow_status,
      cell: ({ value }) => {
        if (!value) return <span className={styles.muted}>—</span>
        const e = ESCROW[value] || { color: 'secondary', label: value }
        return <Badge variant={e.color} size="sm">{e.label}</Badge>
      },
    },
    {
      id: 'occurred_at', header: 'Date', sortable: true, accessor: 'occurred_at',
      cell: ({ value }) => <span className={styles.muted}>{value ? formatDateTime(value) : '—'}</span>,
    },
    {
      id: 'actions', header: '', width: '50px', sortable: false, accessor: (r) => r,
      cell: ({ value: r }) => (
        <span className={styles.stopZone} onClick={stop}>
          <ActionsMenu items={[
            { label: 'Voir le détail', icon: Eye, onClick: () => onOpen(r) },
            { label: 'Copier la référence', icon: Copy, onClick: () => onCopy(r.reference) },
          ]}
          />
        </span>
      ),
    },
  ], [onOpen, onCopy])

  if (list.isLoading && list.payments.length === 0) {
    return <div className={styles.loading}><Spinner size="lg" /><span className={styles.loadingText}>Chargement des transactions…</span></div>
  }
  if (list.isError) {
    return (
      <div className={styles.errorBox}>
        <strong>Erreur :</strong> {list.error?.message || 'Impossible de charger les transactions'}
        <div><Button variant="outline" size="sm" onClick={() => list.refetch()}>Réessayer</Button></div>
      </div>
    )
  }
  if (list.payments.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Aucune transaction trouvée"
        description={hasFilters ? 'Aucune transaction ne correspond à vos critères.' : 'Aucune transaction enregistrée pour le moment.'}
        action={hasFilters ? { label: 'Réinitialiser', onClick: onClear } : undefined}
      />
    )
  }
  return (
    <div className={list.isPlaceholderData ? styles.dim : undefined}>
      <Table
        columns={columns}
        data={list.payments}
        rowKey="entry_id"
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
  )
}

export default PaymentsTransactions