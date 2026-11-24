import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog, DialogBackdrop, DialogPanel, DialogTitle,
} from '@headlessui/react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useDebounce } from '../../hooks/useDebounce'
import {
  Button, Input, Select, Badge, Table, Spinner, EmptyState, ActionsMenu,
} from '../../components/ui'
import {
  Search, RefreshCw, X, Crown, CheckCircle, XCircle, Clock, AlertTriangle,
  Users, TrendingUp, Calendar, Gift, Star, Award, Ban, RotateCcw,
  Copy, Mail, User, CreditCard, ShieldCheck, Repeat, Download,
  Eye,
} from 'lucide-react'
import { formatDate, formatCurrency } from '../../utils/formatters'
import toast from 'react-hot-toast'
import base from '../Artisans/Artisans.module.css'
import styles from './Subscriptions.module.css'

const PAGE_SIZE = 20
const STALE_MS = 30_000

const SUBSCRIPTIONS_QUERY_KEY = ['subscriptions']
const PLANS_QUERY_KEY = ['subscription-plans']
const subscriptionQueryKey = (id) => ['subscription', id]

/* ── Meta par plan ───────────────────────────────────────────── */
const PLAN_META = {
  STARTER:         { icon: Gift,  color: '#94a3b8' },
  BASIC:           { icon: Gift,  color: '#94a3b8' },
  PRO:             { icon: Star,  color: '#f59e0b' },
  PRO_ARTISAN:     { icon: Star,  color: '#f59e0b' },
  EXPERT:          { icon: Award, color: '#8b5cf6' },
  MASTER:          { icon: Crown, color: '#2563eb' },
  PREMIUM_CLIENT:  { icon: Crown, color: '#2563eb' },
}
const getPlanMeta = (name) => PLAN_META[name] || { icon: Crown, color: '#64748b' }

/* ── Meta par statut ────────────────────────────────────────── */
const STATUS_META = {
  ACTIVE:          { variant: 'success',   label: 'Actif' },
  TRIAL:           { variant: 'info',      label: 'Essai' },
  EXPIRED:         { variant: 'secondary', label: 'Expiré' },
  CANCELED:        { variant: 'error',     label: 'Annulé' },
  PENDING_PAYMENT: { variant: 'warning',   label: 'Paiement en attente' },
}
const getStatusMeta = (status) =>
  STATUS_META[status] || { variant: 'secondary', label: status }

/* ── Cycle de facturation ───────────────────────────────────── */
const CYCLE_LABELS = {
  MONTHLY:   'Mensuel',
  QUARTERLY: 'Trimestriel',
  YEARLY:    'Annuel',
}

const errorMessage = (error) => {
  if (!error) return 'Une erreur est survenue'
  switch (error.code) {
    case 'P0001':
    case 'P0002':
      return error.message || 'Action refusée'
    case '42501':
      return 'Action refusée : réservée aux SUPER_ADMIN'
    case 'PGRST116':
      return 'Abonnement introuvable'
    default:
      return error.message || 'Une erreur est survenue'
  }
}

/* ═══════════════════════════════════════════════════════════════
   DRAWER — détail / actions sur un abonnement
   ═══════════════════════════════════════════════════════════════ */
const SubscriptionDrawer = ({
  isOpen, onClose, subscription, acting,
  onCancel, onReactivate, onToggleAutoRenew,
}) => {
  if (!subscription) return null

  const statusMeta = getStatusMeta(subscription.status)
  const planMeta = getPlanMeta(subscription.plan_name)
  const PlanIcon = planMeta.icon

  const canCancel = ['ACTIVE', 'TRIAL'].includes(subscription.status)
  const canReactivate = ['CANCELED', 'EXPIRED'].includes(subscription.status)

  return (
    <Dialog
      open={isOpen}
      onClose={acting ? () => {} : onClose}
      className={styles.drawerRoot}
      transition
    >
      <DialogBackdrop className={styles.drawerBackdrop} transition />

      <DialogPanel className={styles.drawerPanel} transition>
        {/* ── Header ───────────────────────────────────────── */}
        <header className={styles.drawerHeader}>
          <div className={styles.drawerHeaderContent}>
            <span className={styles.drawerEyebrow}>Abonnement</span>
            <DialogTitle className={styles.drawerTitle}>
              {subscription.full_name || 'Abonné'}
            </DialogTitle>
            <div className={styles.drawerHeaderBadges}>
              <span className={styles.drawerKeyBadge}>
                <PlanIcon size={10} style={{ color: planMeta.color }} />
                {subscription.plan_name}
              </span>
              <Badge variant={statusMeta.variant} size="sm" dot>
                {statusMeta.label}
              </Badge>
            </div>
          </div>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            disabled={acting}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </header>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className={styles.drawerBody}>
          {/* Abonné */}
          <section className={styles.drawerSection}>
            <span className={styles.drawerSectionLabel}>Abonné</span>

            <div className={styles.drawerRow}>
              <User size={12} className={styles.drawerRowIcon} />
              <div className={styles.drawerRowContent}>
                <span className={styles.drawerRowLabel}>Nom</span>
                <span className={styles.drawerRowValue}>{subscription.full_name || '—'}</span>
              </div>
            </div>

            {subscription.email && (
              <div className={styles.drawerRow}>
                <Mail size={12} className={styles.drawerRowIcon} />
                <div className={styles.drawerRowContent}>
                  <span className={styles.drawerRowLabel}>Email</span>
                  <a
                    href={`mailto:${subscription.email}`}
                    className={styles.drawerRowValue}
                  >
                    {subscription.email}
                  </a>
                </div>
              </div>
            )}

            <div className={styles.drawerRow}>
              <Users size={12} className={styles.drawerRowIcon} />
              <div className={styles.drawerRowContent}>
                <span className={styles.drawerRowLabel}>Rôle</span>
                <span className={styles.drawerRowValue}>
                  {subscription.user_role === 'ARTISAN' ? 'Artisan' : 'Client'}
                </span>
              </div>
            </div>
          </section>

          {/* Abonnement */}
          <section className={styles.drawerSection}>
            <span className={styles.drawerSectionLabel}>Détails de l'abonnement</span>

            <div className={styles.drawerRow}>
              <Calendar size={12} className={styles.drawerRowIcon} />
              <div className={styles.drawerRowContent}>
                <span className={styles.drawerRowLabel}>Période</span>
                <span className={styles.drawerRowValue}>
                  Du {formatDate(subscription.start_date)} au {formatDate(subscription.end_date)}
                </span>
              </div>
            </div>

            <div className={styles.drawerRow}>
              <CreditCard size={12} className={styles.drawerRowIcon} />
              <div className={styles.drawerRowContent}>
                <span className={styles.drawerRowLabel}>Montant payé</span>
                <span className={styles.drawerRowValue}>
                  {formatCurrency(subscription.price_paid || 0)}
                  {subscription.billing_cycle && (
                    <span className={styles.drawerRowHint}>
                      {' '}· {CYCLE_LABELS[subscription.billing_cycle] || subscription.billing_cycle}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className={styles.drawerRow}>
              <Clock size={12} className={styles.drawerRowIcon} />
              <div className={styles.drawerRowContent}>
                <span className={styles.drawerRowLabel}>Créé le</span>
                <span className={styles.drawerRowValue}>{formatDate(subscription.created_at)}</span>
              </div>
            </div>
          </section>

          {/* Renouvellement auto */}
          <section className={styles.drawerSection}>
            <span className={styles.drawerSectionLabel}>Renouvellement</span>

            <label className={styles.drawerSwitch} data-active={subscription.auto_renew}>
              <div className={styles.drawerSwitchText}>
                <strong>Renouvellement automatique</strong>
                <span>Le plan est renouvelé à la date de fin</span>
              </div>
              <span className={styles.drawerSwitchTrack}>
                <input
                  type="checkbox"
                  checked={!!subscription.auto_renew}
                  onChange={onToggleAutoRenew}
                  disabled={acting}
                />
                <span className={styles.drawerSwitchThumb} />
              </span>
            </label>
          </section>

          {/* Actions */}
          {(canCancel || canReactivate) && (
            <section className={styles.drawerSection}>
              <span className={styles.drawerSectionLabel}>Actions</span>

              {canCancel && (
                <button
                  type="button"
                  className={styles.drawerActionDanger}
                  onClick={onCancel}
                  disabled={acting}
                >
                  <Ban size={14} />
                  <div>
                    <strong>Annuler l'abonnement</strong>
                    <span>Le renouvellement automatique sera désactivé</span>
                  </div>
                </button>
              )}

              {canReactivate && (
                <button
                  type="button"
                  className={styles.drawerActionPrimary}
                  onClick={onReactivate}
                  disabled={acting}
                >
                  <RotateCcw size={14} />
                  <div>
                    <strong>Réactiver l'abonnement</strong>
                    <span>Prolonge la période selon le plan</span>
                  </div>
                </button>
              )}
            </section>
          )}

          {/* Notice */}
          <div className={styles.drawerNotice}>
            <ShieldCheck size={14} />
            <span>
              Les abonnements sont créés automatiquement lors du paiement.
              Toute modification est immédiatement répercutée dans l'application mobile.
            </span>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer className={styles.drawerFooter}>
          <span className={styles.drawerFooterHint}>
            <kbd>Échap</kbd> pour fermer
          </span>
          <div className={styles.drawerFooterActions}>
            <button
              type="button"
              className={styles.drawerBtnSecondary}
              onClick={onClose}
              disabled={acting}
            >
              Fermer
            </button>
          </div>
        </footer>
      </DialogPanel>
    </Dialog>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */
const Subscriptions = () => {
  const canManage = useAuthStore((s) =>
    s.permissions.includes('manage_subscriptions') || s.permissions.includes('manage_app_settings')
  )
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 300)
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [acting, setActing] = useState(false)

  /* ── Query plans ──────────────────────────────────────── */
  const { data: plans = [] } = useQuery({
    queryKey: PLANS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_subscription_plans')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  /* ── Query subscriptions ──────────────────────────────── */
  const {
    data: subscriptions = [],
    isLoading,
    isFetching,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: SUBSCRIPTIONS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_subscriptions')
      if (error) throw error
      return data || []
    },
    staleTime: STALE_MS,
  })

  useEffect(() => { setPage(1) }, [search, statusFilter, planFilter, roleFilter])

  /* ── Stats ────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const active = subscriptions.filter(s => s.status === 'ACTIVE')
    const monthlyRevenue = active.reduce((sum, s) => {
      const price = Number(s.price_paid) || 0
      if (s.billing_cycle === 'MONTHLY')   return sum + price
      if (s.billing_cycle === 'QUARTERLY') return sum + price / 3
      if (s.billing_cycle === 'YEARLY')    return sum + price / 12
      return sum
    }, 0)
    return {
      total: subscriptions.length,
      active: active.length,
      expired: subscriptions.filter(s => s.status === 'EXPIRED').length,
      canceled: subscriptions.filter(s => s.status === 'CANCELED').length,
      monthlyRevenue,
      artisans: subscriptions.filter(s => s.user_role === 'ARTISAN').length,
      clients: subscriptions.filter(s => s.user_role === 'CLIENT').length,
    }
  }, [subscriptions])

  /* ── Filtrage ─────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return subscriptions.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (planFilter !== 'all' && s.plan_name !== planFilter) return false
      if (roleFilter !== 'all' && s.user_role !== roleFilter) return false
      if (q) {
        const hay = `${s.full_name || ''} ${s.email || ''} ${s.plan_name || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [subscriptions, search, statusFilter, planFilter, roleFilter])

  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  /* ── Options de filtres ───────────────────────────────── */
  const statusOptions = [
    { value: 'all', label: 'Tous statuts' },
    { value: 'ACTIVE', label: 'Actifs' },
    { value: 'TRIAL', label: 'Essai' },
    { value: 'EXPIRED', label: 'Expirés' },
    { value: 'CANCELED', label: 'Annulés' },
    { value: 'PENDING_PAYMENT', label: 'Paiement en attente' },
  ]

  const planOptions = useMemo(() => [
    { value: 'all', label: 'Tous les plans' },
    ...plans.map(p => ({ value: p.name, label: p.name })),
  ], [plans])

  const roleOptions = [
    { value: 'all', label: 'Tous les rôles' },
    { value: 'ARTISAN', label: 'Artisans' },
    { value: 'CLIENT', label: 'Clients' },
  ]

  /* ── Ouverture du drawer (fetch serveur avant cache) ─── */
  const openDrawerFor = (subscription) => {
    setSelected(subscription)
    setDrawerOpen(true)
  }

  const openDetail = async (row) => {
    const id = row.id_sub

    const specificState = queryClient.getQueryState(subscriptionQueryKey(id))
    if (specificState?.data && Date.now() - specificState.dataUpdatedAt < STALE_MS) {
      openDrawerFor(specificState.data)
      return
    }

    const listState = queryClient.getQueryState(SUBSCRIPTIONS_QUERY_KEY)
    if (listState?.data && Date.now() - listState.dataUpdatedAt < STALE_MS) {
      const fromList = listState.data.find(s => s.id_sub === id)
      if (fromList) {
        queryClient.setQueryData(subscriptionQueryKey(id), fromList)
        openDrawerFor(fromList)
        return
      }
    }

    const toastId = toast.loading('Chargement…')
    try {
      const { data, error } = await supabase.rpc('get_subscription', { p_id: id })
      if (error) throw error
      if (!data) throw new Error('Abonnement introuvable')
      queryClient.setQueryData(subscriptionQueryKey(id), data)
      toast.dismiss(toastId)
      openDrawerFor(data)
    } catch (err) {
      toast.dismiss(toastId)
      toast.error(errorMessage(err))
    }
  }

  const closeDrawer = () => { if (!acting) setDrawerOpen(false) }

  /* ── Actions RPC ──────────────────────────────────────── */
  const invalidateAll = (id) => {
    queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_QUERY_KEY })
    if (id) queryClient.invalidateQueries({ queryKey: subscriptionQueryKey(id) })
  }

  const handleCancel = async () => {
    if (!selected) return
    setActing(true)
    try {
      const { data, error } = await supabase.rpc('cancel_subscription', { p_id: selected.id_sub })
      if (error) throw error
      toast.success('Abonnement annulé')
      setSelected(data)
      invalidateAll(selected.id_sub)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setActing(false)
    }
  }

  const handleReactivate = async () => {
    if (!selected) return
    setActing(true)
    try {
      const { data, error } = await supabase.rpc('reactivate_subscription', { p_id: selected.id_sub })
      if (error) throw error
      toast.success('Abonnement réactivé')
      setSelected(data)
      invalidateAll(selected.id_sub)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setActing(false)
    }
  }

  const handleToggleAutoRenew = async () => {
    if (!selected) return
    setActing(true)
    try {
      const { data, error } = await supabase.rpc('toggle_subscription_auto_renew', {
        p_id: selected.id_sub,
      })
      if (error) throw error
      toast.success(data.auto_renew ? 'Renouvellement activé' : 'Renouvellement désactivé')
      setSelected(data)
      invalidateAll(selected.id_sub)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setActing(false)
    }
  }

  /* ── Actions row ──────────────────────────────────────── */
  const rowActions = (row) => {
    const items = [
      { label: 'Voir détails', icon: Eye, onClick: () => openDetail(row) },
      { label: 'Copier l\'ID', icon: Copy, onClick: () => { navigator.clipboard.writeText(row.id_sub); toast.success('ID copié') } },
    ]
    if (canManage) {
      items.push({ separator: true })
      if (['ACTIVE', 'TRIAL'].includes(row.status)) {
        items.push({
          label: 'Annuler',
          icon: Ban,
          danger: true,
          onClick: async () => {
            if (!confirm('Confirmer l\'annulation ?')) return
            const { error } = await supabase.rpc('cancel_subscription', { p_id: row.id_sub })
            if (error) return toast.error(errorMessage(error))
            toast.success('Abonnement annulé')
            invalidateAll(row.id_sub)
          },
        })
      } else if (['CANCELED', 'EXPIRED'].includes(row.status)) {
        items.push({
          label: 'Réactiver',
          icon: RotateCcw,
          onClick: async () => {
            const { error } = await supabase.rpc('reactivate_subscription', { p_id: row.id_sub })
            if (error) return toast.error(errorMessage(error))
            toast.success('Abonnement réactivé')
            invalidateAll(row.id_sub)
          },
        })
      }
    }
    return items
  }

  /* ── Colonnes ─────────────────────────────────────────── */
  const columns = [
    {
      id: 'subscriber',
      header: 'Abonné',
      accessor: (row) => row,
      cell: ({ value }) => (
        <div className={base.artisanCell}>
          <span className={base.categoryIcon}>
            {value.full_name?.charAt(0)?.toUpperCase() || '?'}
          </span>
          <div className={base.artisanInfo}>
            <span className={base.artisanName}>{value.full_name || '—'}</span>
            {value.email && (
              <span className={base.artisanMeta}><span>{value.email}</span></span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Rôle',
      accessor: (row) => row.user_role,
      cell: ({ value }) => (
        <Badge variant={value === 'ARTISAN' ? 'primary' : 'secondary'} size="sm">
          {value === 'ARTISAN' ? 'Artisan' : 'Client'}
        </Badge>
      ),
    },
    {
      id: 'plan',
      header: 'Plan',
      accessor: (row) => row.plan_name,
      cell: ({ value }) => {
        const meta = getPlanMeta(value)
        const Icon = meta.icon
        return (
          <span className={styles.planCell}>
            <span className={styles.planIcon} style={{ background: meta.color + '15', color: meta.color }}>
              <Icon size={12} />
            </span>
            {value}
          </span>
        )
      },
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => row.status,
      cell: ({ value }) => {
        const meta = getStatusMeta(value)
        return <Badge variant={meta.variant} size="sm" dot>{meta.label}</Badge>
      },
    },
    {
      id: 'amount',
      header: 'Montant',
      accessor: (row) => row.price_paid,
      cell: ({ value }) => (
        <span className={base.amount}>{formatCurrency(value || 0)}</span>
      ),
    },
    {
      id: 'cycle',
      header: 'Cycle',
      accessor: (row) => row.billing_cycle,
      cell: ({ value }) => (
        <Badge variant="secondary" size="sm">
          {CYCLE_LABELS[value] || value || '—'}
        </Badge>
      ),
    },
    {
      id: 'period',
      header: 'Période',
      accessor: (row) => row,
      cell: ({ value }) => (
        <span className={base.muted}>
          {formatDate(value.start_date)} → {formatDate(value.end_date)}
        </span>
      ),
    },
    {
      id: 'autoRenew',
      header: 'Renouv.',
      accessor: (row) => row.auto_renew,
      cell: ({ value }) => value
        ? <Badge variant="success" size="sm">Auto</Badge>
        : <Badge variant="secondary" size="sm">Manuel</Badge>,
    },
    {
      id: 'actions',
      header: '',
      accessor: (row) => row,
      cell: ({ value }) => <ActionsMenu items={rowActions(value)} />,
      width: '50px',
    },
  ]

  /* ── Filtres actifs ───────────────────────────────────── */
  const activeFilters = [
    search,
    statusFilter !== 'all',
    planFilter !== 'all',
    roleFilter !== 'all',
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearchInput('')
    setStatusFilter('all')
    setPlanFilter('all')
    setRoleFilter('all')
  }

  /* ── Export CSV ───────────────────────────────────────── */
  const handleExport = () => {
    const rows = filtered.map(s => ({
      ID: s.id_sub,
      Nom: s.full_name,
      Email: s.email,
      Rôle: s.user_role,
      Plan: s.plan_name,
      Statut: s.status,
      Montant: s.price_paid,
      Cycle: s.billing_cycle,
      Début: formatDate(s.start_date),
      Fin: formatDate(s.end_date),
      'Renouvellement auto': s.auto_renew ? 'Oui' : 'Non',
    }))
    const headers = Object.keys(rows[0] || {}).join(',')
    const lines = rows.map(r => Object.values(r).map(v =>
      typeof v === 'string' && v.includes(',') ? `"${v}"` : v
    ).join(','))
    const blob = new Blob([[headers, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `abonnements_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── États transitoires ───────────────────────────────── */
  if (isLoading) {
    return (
      <div className={base.loading}>
        <Spinner size="lg" />
        <span className={base.loadingText}>Chargement des abonnements…</span>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={base.page}>
        <div className={styles.errorBox}>
          <strong>Erreur :</strong> {loadError.message || 'Chargement impossible'}
          <div><Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button></div>
        </div>
      </div>
    )
  }

  /* ── Rendu principal ──────────────────────────────────── */
  return (
    <div className={base.page}>
      <header className={base.pageHeader}>
        <div className={base.pageHeaderInner}>
          <div className={base.toolbar}>
            <div className={base.filtersGroup}>
              <div className={base.searchWrap}>
                <Input size="md" icon={Search} placeholder="Rechercher un abonné…"
                  value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
              </div>
              <div className={base.filterItem}>
                <Select size="md" options={statusOptions}
                  value={statusFilter} onChange={setStatusFilter} />
              </div>
              <div className={base.filterItem}>
                <Select size="md" searchable options={planOptions}
                  value={planFilter} onChange={setPlanFilter} />
              </div>
              <div className={base.filterItem}>
                <Select size="md" options={roleOptions}
                  value={roleFilter} onChange={setRoleFilter} />
              </div>
              {activeFilters > 0 && (
                <button type="button" className={base.clearBtn} onClick={clearFilters}>
                  <X size={11} /> Effacer
                </button>
              )}
            </div>
            <div className={base.actions}>
              <Button variant="outline" size="md" icon={Download} onClick={handleExport}>
                Exporter
              </Button>
              <Button variant="outline" size="md" icon={RefreshCw} onClick={() => refetch()}
                isLoading={isFetching} aria-label="Rafraîchir" />
            </div>
          </div>
        </div>
      </header>

      <div className={base.content}>
        {/* ── Plans (cliquables pour filtrer) ──────────────── */}
        {plans.length > 0 && (
          <div className={styles.plansGrid}>
            {plans.filter(p => p.is_active).map(plan => {
              const meta = getPlanMeta(plan.name)
              const Icon = meta.icon
              const count = subscriptions.filter(
                s => s.plan_name === plan.name && s.status === 'ACTIVE'
              ).length
              const isActive = planFilter === plan.name

              return (
                <button
                  key={plan.id_plan}
                  type="button"
                  className={styles.planCard}
                  data-active={isActive}
                  onClick={() => setPlanFilter(isActive ? 'all' : plan.name)}
                >
                  <div className={styles.planHeader} style={{ background: meta.color + '10' }}>
                    <Icon size={18} style={{ color: meta.color }} />
                    <h3>{plan.name}</h3>
                    {isActive && <X size={12} className={styles.planClear} />}
                  </div>
                  <div className={styles.planPrice}>
                    <span className={styles.price}>{formatCurrency(plan.price || 0)}</span>
                    <span className={styles.period}>/ {plan.duration_days}j</span>
                  </div>
                  <div className={styles.planFooter}>
                    <Users size={12} />
                    <span>{count} actif{count > 1 ? 's' : ''}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Stats ───────────────────────────────────────── */}
        <div className={base.stats}>
          <div className={base.stat}>
            <CheckCircle size={18} className={base.success} />
            <div>
              <span className={base.statValue}>{stats.active}</span>
              <span className={base.statLabel}>Actifs</span>
            </div>
          </div>
          <div className={base.stat}>
            <TrendingUp size={18} className={base.info} />
            <div>
              <span className={base.statValue}>{formatCurrency(stats.monthlyRevenue)}</span>
              <span className={base.statLabel}>Revenu mensuel</span>
            </div>
          </div>
          <div className={base.stat}>
            <Users size={18} className={base.success} />
            <div>
              <span className={base.statValue}>{stats.artisans}</span>
              <span className={base.statLabel}>Artisans</span>
            </div>
          </div>
          <div className={base.stat}>
            <Users size={18} className={base.info} />
            <div>
              <span className={base.statValue}>{stats.clients}</span>
              <span className={base.statLabel}>Clients</span>
            </div>
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────── */}
        {filtered.length > 0 ? (
          <Table
            columns={columns}
            data={pageRows}
            rowKey="id_sub"
            loading={isFetching}
            onRowClick={openDetail}
            pagination={{
              currentPage: page,
              totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
              pageSize: PAGE_SIZE,
              total: filtered.length,
              onPageChange: setPage,
            }}
          />
        ) : (
          <EmptyState
            icon={Crown}
            title="Aucun abonnement trouvé"
            description={
              activeFilters > 0
                ? 'Aucun abonnement ne correspond à vos critères.'
                : 'Aucun abonnement pour le moment.'
            }
            action={activeFilters > 0 ? { label: 'Réinitialiser', onClick: clearFilters } : undefined}
          />
        )}
      </div>

      {/* ── Drawer détail / actions ──────────────────────── */}
      <SubscriptionDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        subscription={selected}
        acting={acting}
        onCancel={handleCancel}
        onReactivate={handleReactivate}
        onToggleAutoRenew={handleToggleAutoRenew}
      />
    </div>
  )
}

export default Subscriptions