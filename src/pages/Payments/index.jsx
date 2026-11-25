import React, { useState, useEffect } from 'react'
import { usePayments, usePaymentStats } from '../../hooks/usePayments'
import { useDebounce } from '../../hooks/useDebounce'
import { useFilterStore } from '../../store/filterStore'
import {
  Button, Input, Select, Badge, Table, Spinner, EmptyState, ActionsMenu,
} from '../../components/ui'
import {
  Search, Download, CreditCard, TrendingUp, Wallet, DollarSign,
  RefreshCw, X, BarChart3, Copy, AlertTriangle,
} from 'lucide-react'
import { formatDate, formatDateTime, formatCurrency, formatStatus } from '../../utils/formatters'
import toast from 'react-hot-toast'
import styles from './Payments.module.css'

/* Empêche un clic dans une cellule de déclencher onRowClick */
const stop = (e) => e.stopPropagation()

/* ─────────────────────────────────────────────
   Options
───────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'SUCCESS', label: 'Réussi' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'FAILED', label: 'Échoué' },
  { value: 'REFUNDED', label: 'Remboursé' },
]

const METHOD_OPTIONS = [
  { value: 'all', label: 'Toutes méthodes' },
  { value: 'WALLET', label: 'Portefeuille' },
  { value: 'MOMO', label: 'Mobile Money' },
  { value: 'CARD', label: 'Carte' },
  { value: 'CASH', label: 'Espèces' },
]

/* Les valeurs DOIVENT correspondre aux clés gérées par filterStore.setDateRange */
const PERIOD_OPTIONS = [
  { value: 'all', label: 'Toute la période' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'yesterday', label: 'Hier' },
  { value: '7days', label: '7 derniers jours' },
  { value: '30days', label: '30 derniers jours' },
  { value: '90days', label: '90 derniers jours' },
  { value: 'thisMonth', label: 'Ce mois' },
  { value: 'lastMonth', label: 'Mois dernier' },
]

const METHOD_LABEL = {
  WALLET: 'Portefeuille',
  MOMO: 'Mobile Money',
  CARD: 'Carte',
  CASH: 'Espèces',
}
const methodLabel = (m) => METHOD_LABEL[m] || m || '—'

const ESCROW = {
  RELEASED: { color: 'success', label: 'Libéré' },
  HELD:     { color: 'warning', label: 'Retenu' },
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
const Payments = () => {
  const {
    globalFilters, setGlobalFilter,
    dateRange, setDateRange,
    pagination, setPagination,
    setSorting,
    activateScope,
  } = useFilterStore()

  /* Évite que les filtres (statut, recherche, page…) d'une autre page fuient ici */
  useEffect(() => { activateScope('payments') }, [activateScope])

  /* Recherche avec debounce, synchronisée avec le store */
  const [searchInput, setSearchInput] = useState(globalFilters.search || '')
  const debouncedSearch = useDebounce(searchInput, 350)

  useEffect(() => {
    if (debouncedSearch !== (globalFilters.search || '')) setGlobalFilter('search', debouncedSearch)
  }, [debouncedSearch])

  useEffect(() => {
    if (!globalFilters.search && searchInput !== '') setSearchInput('')
  }, [globalFilters.search])

  const {
    payments, total, totals, isLoading, isFetching, isError, error, refetch,
  } = usePayments()
  const {
    data: stats, isLoading: statsLoading, isError: statsError, error: statsErr, refetch: refetchStats,
  } = usePaymentStats()

  /* dateRange === null signifie « toute la période » */
  const periodValue =
    dateRange?.key ??
    PERIOD_OPTIONS.find((o) => o.label === dateRange?.label)?.value ??
    'all'

  const activeFiltersCount = [
    globalFilters.search, globalFilters.status, globalFilters.method, dateRange,
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearchInput('')
    setGlobalFilter('search', '')
    setGlobalFilter('status', null)
    setGlobalFilter('method', null)
    setDateRange('all')
  }

  const reload = () => { refetch(); refetchStats() }

  /* ── Actions ── */
  const copyRef = (ref) => {
    navigator.clipboard.writeText(ref || '')
    toast.success('Référence copiée')
  }

  const rowActions = (row) => [
    { label: 'Copier la référence', icon: Copy, onClick: () => copyRef(row.transaction_ref) },
  ]

  /* Export de la page affichée (vrai CSV, compatible Excel) */
  const handleExport = () => {
    if (!payments.length) return
    const rows = payments.map((p) => ({
      'Ref transaction': p.transaction_ref,
      Mission: p.request?.mission?.description,
      Client: p.sender?.full_name,
      Montant: p.amount,
      Frais: p.handyra_fee,
      Net: p.artisan_net,
      Méthode: methodLabel(p.payment_method),
      Statut: formatStatus(p.status)?.label || p.status,
      Séquestre: ESCROW[p.escrow_status]?.label || p.escrow_status || '-',
      Date: p.processed_at ? formatDateTime(p.processed_at) : '',
    }))
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const headers = Object.keys(rows[0])
    const text = '﻿' + [
      headers.map(esc).join(';'),
      ...rows.map((r) => headers.map((h) => esc(r[h])).join(';')),
    ].join('\n')

    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── Colonnes ── */
  const columns = [
    {
      id: 'transaction',
      header: 'Transaction',
      accessor: (row) => ({ ref: row.transaction_ref, method: row.payment_method }),
      cell: ({ value }) => (
        <div className={styles.txCell}>
          <span className={styles.txRef}>#{value.ref || '—'}</span>
          <span className={styles.txMethod}>{methodLabel(value.method)}</span>
        </div>
      ),
      sortable: false,
    },
    {
      id: 'mission',
      header: 'Mission',
      accessor: (row) => row.request?.mission?.description,
      cell: ({ value }) => value
        ? <span className={styles.missionCell} title={value}>{value}</span>
        : <span className={styles.muted}>—</span>,
      sortable: false,
    },
    {
      id: 'sender',
      header: 'Expéditeur',
      accessor: (row) => row.sender?.full_name,
      cell: ({ value }) => value
        ? <span className={styles.senderCell}>{value}</span>
        : <span className={styles.muted}>—</span>,
      sortable: false,
    },
    {
      id: 'amount',
      header: 'Montant',
      accessor: 'amount',
      cell: ({ value }) => <span className={styles.amount}>{formatCurrency(value || 0)}</span>,
      sortable: true,
    },
    {
      id: 'fees',
      header: 'Frais',
      accessor: (row) => row.handyra_fee,
      cell: ({ value }) => <span className={styles.secondary}>{formatCurrency(value || 0)}</span>,
      sortable: false,
    },
    {
      id: 'net',
      header: 'Net',
      accessor: (row) => row.artisan_net,
      cell: ({ value }) => <span className={styles.net}>{formatCurrency(value || 0)}</span>,
      sortable: false,
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => row.status,
      cell: ({ value }) => {
        const s = formatStatus(value)
        return <Badge variant={s.color} size="sm" dot>{s.label}</Badge>
      },
      sortable: false,
    },
    {
      id: 'escrow',
      header: 'Séquestre',
      accessor: (row) => row.escrow_status,
      cell: ({ value }) => {
        if (!value) return <span className={styles.muted}>—</span>
        const e = ESCROW[value] || { color: 'secondary', label: value }
        return <Badge variant={e.color} size="sm">{e.label}</Badge>
      },
      sortable: false,
    },
    {
      id: 'date',
      header: 'Date',
      accessor: 'processed_at',
      cell: ({ value }) => (
        <span className={styles.muted}>{value ? formatDateTime(value) : '—'}</span>
      ),
      sortable: true,
    },
    {
      id: 'actions',
      header: '',
      accessor: (row) => row,
      cell: ({ value }) => (
        <span className={styles.stopZone} onClick={stop}>
          <ActionsMenu items={rowActions(value)} />
        </span>
      ),
      width: '50px',
      sortable: false,
    },
  ]

  /* ── États transitoires ── */
  if (isError || statsError) {
    const err = error || statsErr
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <div className={styles.errorBox}>
            <strong>Erreur :</strong> {err?.message || 'Impossible de charger les paiements'}
            <div>
              <Button variant="outline" size="sm" onClick={reload}>Réessayer</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if ((isLoading || statsLoading) && payments.length === 0) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
        <span className={styles.loadingText}>Chargement des paiements…</span>
      </div>
    )
  }

  /* ── Analytiques ── */
  const methods = stats?.by_method || []
  const methodsTotal = Number(stats?.total_amount) || methods.reduce((s, m) => s + (Number(m.total) || 0), 0)
  const daily = (stats?.daily || []).slice(-7)
  const dailyMax = Math.max(0, ...daily.map((d) => Number(d.total) || 0))
  const showInsights = methods.length > 0 || daily.length > 0

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.toolbar}>
            <div className={styles.filtersGroup}>
              <div className={styles.searchWrap}>
                <Input
                  size="md"
                  icon={Search}
                  placeholder="Rechercher une transaction…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <div className={styles.filterItem}>
                <Select
                  size="md"
                  options={PERIOD_OPTIONS}
                  value={periodValue}
                  onChange={(v) => setDateRange(v)}
                />
              </div>
              <div className={styles.filterItem}>
                <Select
                  size="md"
                  options={STATUS_OPTIONS}
                  value={globalFilters.status || 'all'}
                  onChange={(v) => setGlobalFilter('status', v === 'all' ? null : v)}
                />
              </div>
              <div className={styles.filterItem}>
                <Select
                  size="md"
                  options={METHOD_OPTIONS}
                  value={globalFilters.method || 'all'}
                  onChange={(v) => setGlobalFilter('method', v === 'all' ? null : v)}
                />
              </div>
              {activeFiltersCount > 0 && (
                <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                  <X size={11} /> Effacer
                </button>
              )}
            </div>
            <div className={styles.actions}>
              <Button
                variant="outline" size="md" icon={RefreshCw}
                onClick={reload} isLoading={isFetching} aria-label="Rafraîchir"
              />
              <Button
                variant="outline" size="md" icon={Download}
                onClick={handleExport} disabled={payments.length === 0}
              >
                Exporter
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <DollarSign size={18} />
            <div>
              <span className={styles.statValue}>{formatCurrency(totals.total || 0)}</span>
              <span className={styles.statLabel}>Volume total</span>
            </div>
          </div>
          <div className={styles.stat}>
            <TrendingUp size={18} className={styles.success} />
            <div>
              <span className={styles.statValue}>{formatCurrency(totals.fees || 0)}</span>
              <span className={styles.statLabel}>Frais Handyra</span>
            </div>
          </div>
          <div className={styles.stat}>
            <Wallet size={18} className={styles.info} />
            <div>
              <span className={styles.statValue}>{formatCurrency(totals.net || 0)}</span>
              <span className={styles.statLabel}>Net artisans</span>
            </div>
          </div>
          <div className={styles.stat}>
            <CreditCard size={18} />
            <div>
              <span className={styles.statValue}>{total}</span>
              <span className={styles.statLabel}>Transactions</span>
            </div>
          </div>
        </div>

        {payments.length > 0 ? (
          <Table
            columns={columns}
            data={payments}
            rowKey="id_payment"
            loading={isFetching}
            sortable
            onSort={(field, dir) => setSorting(field, dir)}
            pagination={{
              currentPage: pagination.page,
              totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
              pageSize: pagination.pageSize,
              total,
              onPageChange: (page) => setPagination({ page }),
            }}
          />
        ) : (
          <EmptyState
            icon={CreditCard}
            title="Aucun paiement trouvé"
            description={
              activeFiltersCount > 0
                ? 'Aucun paiement ne correspond à vos critères.'
                : 'Aucun paiement enregistré pour le moment.'
            }
            action={activeFiltersCount > 0 ? { label: 'Réinitialiser', onClick: clearFilters } : undefined}
          />
        )}

        {showInsights && (
          <div className={styles.insights}>
            <div className={styles.insightsHeader}>
              <BarChart3 size={13} />
              <span>Analytiques rapides · période sélectionnée</span>
            </div>

            <div className={styles.insightsGrid}>
              <section className={styles.panel}>
                <span className={styles.panelLabel}>Répartition par méthode</span>
                {methods.length === 0 ? (
                  <span className={styles.muted}>Aucune donnée</span>
                ) : (
                  <ul className={styles.barList}>
                    {methods.map((m) => {
                      const pct = methodsTotal > 0 ? (Number(m.total) / methodsTotal) * 100 : 0
                      return (
                        <li key={m.method} className={styles.barItem}>
                          <div className={styles.barHead}>
                            <span className={styles.barName}>{methodLabel(m.method)}</span>
                            <span className={styles.barValue}>{formatCurrency(m.total || 0)}</span>
                          </div>
                          <div className={styles.barTrack}>
                            <div className={styles.barFill} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={styles.barMeta}>
                            {m.count} transaction{m.count > 1 ? 's' : ''} · {pct.toFixed(0)} %
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section className={styles.panel}>
                <span className={styles.panelLabel}>Évolution quotidienne (7 derniers jours)</span>
                {daily.length === 0 ? (
                  <span className={styles.muted}>Aucune donnée</span>
                ) : (
                  <ul className={styles.barList}>
                    {daily.map((d) => {
                      const pct = dailyMax > 0 ? (Number(d.total) / dailyMax) * 100 : 0
                      return (
                        <li key={d.date} className={styles.barItem}>
                          <div className={styles.barHead}>
                            <span className={styles.barName}>{formatDate(d.date, 'dd/MM')}</span>
                            <span className={styles.barValue}>{formatCurrency(d.total || 0)}</span>
                          </div>
                          <div className={styles.barTrack}>
                            <div className={styles.barFill} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={styles.barMeta}>
                            {d.count} transaction{d.count > 1 ? 's' : ''}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Payments