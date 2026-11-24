import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { useArtisans, useSuspensionReasons } from '../../hooks/useArtisans'
import { useCategories, buildCategoryOptions } from '../../hooks/useCategories'
import { useDebounce } from '../../hooks/useDebounce'
import { useFilterStore } from '../../store/filterStore'
import { Button, Input, Select, Badge, Table, Spinner, EmptyState, ActionsMenu } from '../../components/ui'
import {
  Search, Download, Users, CheckCircle, Clock, Shield,
  X, TrendingUp, Star, BarChart3, Briefcase,
  RefreshCw, ArrowUpRight, Award, Zap,
  Eye, Copy, AlertTriangle, Mail, FileText, FileCheck,
} from 'lucide-react'
import { formatDate, formatCurrency } from '../../utils/formatters'
import toast from 'react-hot-toast'
import SuspendFields, { EMPTY_SUSPEND, toSuspendPayload } from './SuspendFields'
import styles from './Artisans.module.css'

/* Empêche un clic dans une cellule d'ouvrir la fiche (onRowClick) */
const stop = (e) => e.stopPropagation()

/* Formatage des analytiques : « — » quand la donnée est absente (et non un 0 trompeur) */
const pct = (v) => (v == null ? '—' : `${v}%`)
const num = (v, d = 1) => (v == null ? '—' : Number(v).toFixed(d))

/* ─────────────────────────────────────────────
   Étape KYC (calculée côté serveur : admin.artisan_kyc_stage)
   « Soumission en attente » = rien à traiter pour l'admin
   « À traiter » / « En traitement » = dossier soumis
───────────────────────────────────────────── */
const KYC_STAGE = {
  AWAITING_SUBMISSION:  { color: 'secondary', label: 'Soumission en attente' },
  AWAITING_REVIEW:      { color: 'warning',   label: 'À traiter' },
  UNDER_REVIEW:         { color: 'info',      label: 'En traitement' },
  VALIDATED:            { color: 'success',   label: 'Validé' },
  REJECTED:             { color: 'danger',    label: 'Rejeté' },
  PERMANENTLY_REJECTED: { color: 'danger',    label: 'Rejeté définitivement' },
}
const REVIEWABLE = ['AWAITING_REVIEW', 'UNDER_REVIEW']

/* Repli sur kyc_status si le RPC ne renvoie pas encore kyc_stage */
const stageOf = (row) => {
  if (row.kyc_stage) return row.kyc_stage
  if (row.kyc_status === 'VALIDATED') return 'VALIDATED'
  if (row.kyc_status === 'REJECTED') return 'REJECTED'
  return 'AWAITING_SUBMISSION'
}

/* ─────────────────────────────────────────────
   Dialogues de confirmation
   (la suppression de compte relève de la gestion des clients)
───────────────────────────────────────────── */
const DIALOG_COPY = {
  suspend: {
    title: 'Suspendre',
    verb: 'Suspendre',
    danger: true,
    text: (n) => n > 1
      ? 'Ces artisans passeront hors ligne et ne recevront plus de missions.'
      : "L'artisan passera hors ligne et ne recevra plus de missions.",
  },
  validateKYC: {
    title: 'Valider le KYC',
    verb: 'Valider',
    text: (n) => n > 1
      ? 'Le KYC de ces artisans sera marqué comme validé, sans revue détaillée des documents.'
      : "Le KYC de l'artisan sera marqué comme validé, sans revue détaillée des documents.",
  },
  reactivate: {
    title: 'Réactiver',
    verb: 'Réactiver',
    text: (n) => n > 1
      ? 'Ces comptes seront réactivés et les artisans repasseront disponibles.'
      : "Le compte sera réactivé et l'artisan repassera disponible.",
  },
}

const ConfirmDialog = ({ dialog, busy, onCancel, onConfirm }) => {
  const { action, rows } = dialog
  const cfg = DIALOG_COPY[action]
  const [form, setForm] = useState(EMPTY_SUSPEND)
  const { data: reasons = [] } = useSuspensionReasons()

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  const handleConfirm = () => {
    if (action === 'suspend') {
      const res = toSuspendPayload(form, reasons)
      if (res.error) {
        toast.error(res.error)
        return
      }
      onConfirm(res.payload)
    } else {
      onConfirm({})
    }
  }

  const many = rows.length > 1
  const shown = rows.slice(0, 5)
  const suspendBlocked = action === 'suspend' && !form.reasonCode

  return createPortal(
    <div className={styles.overlay} onClick={() => { if (!busy) onCancel() }}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="artisan-dialog-title"
        onClick={stop}
      >
        <h3 id="artisan-dialog-title" className={styles.dialogTitle}>
          {cfg.title}{many ? ` (${rows.length})` : ''}
        </h3>
        <p className={styles.dialogText}>{cfg.text(rows.length)}</p>

        <ul className={styles.dialogList}>
          {shown.map((r) => (
            <li key={r.id_artisan}>{r.user?.full_name || r.ifu_number || r.id_artisan}</li>
          ))}
          {rows.length > shown.length && (
            <li className={styles.dialogMore}>…et {rows.length - shown.length} autre(s)</li>
          )}
        </ul>

        {action === 'suspend' && (
          <SuspendFields reasons={reasons} value={form} onChange={setForm} />
        )}

        <div className={styles.dialogFooter}>
          <Button variant="outline" size="md" onClick={onCancel} disabled={busy}>
            Annuler
          </Button>
          <button
            type="button"
            className={cfg.danger ? styles.confirmDanger : styles.confirmBtn}
            onClick={handleConfirm}
            disabled={busy || suspendBlocked}
          >
            {busy ? 'En cours…' : `${cfg.verb}${many ? ` (${rows.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
const Artisans = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    globalFilters, setGlobalFilter,
    pagination, setPagination,
    sorting, setSorting,
    activateScope,
  } = useFilterStore()

  useEffect(() => { activateScope('artisans') }, [location.pathname])

  const [selectedArtisans, setSelectedArtisans] = useState([])
  const [exportLoading, setExportLoading] = useState(false)
  const [dialog, setDialog] = useState(null)

  const [searchInput, setSearchInput] = useState(globalFilters.search || '')
  const debouncedSearch = useDebounce(searchInput, 350)

  useEffect(() => {
    if (debouncedSearch !== globalFilters.search) setGlobalFilter('search', debouncedSearch)
  }, [debouncedSearch])

  useEffect(() => {
    if (globalFilters.search === '' && searchInput !== '') setSearchInput('')
  }, [globalFilters.search])

  const {
    artisans, total, stats, isLoading, isFetching, isError, error, refetch,
    runAction, isRunningAction,
  } = useArtisans()

  /* La sélection ne survit pas à un changement de page, de tri ou de filtre :
     les statuts des lignes hors page sont inconnus, donc les actions seraient aveugles. */
  const selectionScope = [
    pagination.page, pagination.pageSize,
    sorting?.field ?? '', sorting?.order ?? '',
    globalFilters.search ?? '', globalFilters.status ?? '',
    globalFilters.availability ?? '', globalFilters.category ?? '',
  ].join('|')
  const scopeRef = useRef(selectionScope)
  useEffect(() => {
    if (scopeRef.current !== selectionScope) {
      scopeRef.current = selectionScope
      setSelectedArtisans([])
    }
  }, [selectionScope])

  const { categories } = useCategories()
  const categoryOptions = useMemo(
    () => buildCategoryOptions(categories, 'Toutes catégories'),
    [categories]
  )

  const selectedRows = useMemo(
    () => artisans.filter((a) => selectedArtisans.includes(a.id_artisan)),
    [artisans, selectedArtisans]
  )

  /* Pour chaque action, les lignes de la sélection auxquelles elle s'applique.
     Aucune décision KYC tant que l'artisan n'a pas soumis son dossier. */
  const eligible = useMemo(() => ({
    validate: selectedRows.filter((r) =>
      !['VALIDATED', 'AWAITING_SUBMISSION', 'PERMANENTLY_REJECTED'].includes(stageOf(r))),
    reject:   selectedRows.filter((r) => REVIEWABLE.includes(stageOf(r))),
    suspend:  selectedRows.filter((r) => !['SUSPENDED', 'DELETED'].includes(r.user?.status)),
    reactivate: selectedRows.filter((r) => r.user?.status === 'SUSPENDED'),
  }), [selectedRows])

  /* Bascule basée sur l'état précédent (et non sur l'état DOM de la case) */
  const toggleArtisan = (id) =>
    setSelectedArtisans((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const allSelected = artisans.length > 0 && selectedRows.length === artisans.length

  /* ── Actions ── */
  const copy = (text, label = 'Copié') => {
    navigator.clipboard.writeText(text)
    toast.success(label)
  }

  const perform = async (action, rows, payload) => {
    const ids = rows.map((r) => r.id_artisan)
    if (!ids.length) return
    await runAction({ action, ids, payload })
    setSelectedArtisans([])
  }

  /* Dialogue pour les actions sensibles ou groupées, exécution directe sinon */
  const requestAction = (action, rows) => {
    if (!rows.length) return
    const needsDialog =
      action === 'suspend' ||
      ((action === 'validateKYC' || action === 'reactivate') && rows.length > 1)
    if (needsDialog) setDialog({ action, rows })
    else perform(action, rows)
  }

  const confirmDialog = async (payload) => {
    await perform(dialog.action, dialog.rows, payload)
    setDialog(null)
  }

  const rowActions = (row) => {
    const status = row.user?.status
    const stage = stageOf(row)
    const items = [
      { label: 'Voir détails', icon: Eye, onClick: () => navigate(`/artisans/${row.id_artisan}`) },
      { label: 'Copier IFU', icon: Copy, onClick: () => copy(row.ifu_number, 'IFU copié') },
      { label: 'Copier email', icon: Mail, onClick: () => copy(row.user?.email || '', 'Email copié') },
    ]
    if (REVIEWABLE.includes(stage)) {
      items.push({ separator: true })
      items.push({
        label: 'Traiter le dossier', icon: FileCheck,
        onClick: () => navigate(`/artisans/${row.id_artisan}?tab=kyc`),
      })
    }
    const canValidate = !['VALIDATED', 'AWAITING_SUBMISSION', 'PERMANENTLY_REJECTED'].includes(stage)
    if (canValidate) {
      if (!REVIEWABLE.includes(stage)) items.push({ separator: true })
      items.push({ label: 'Valider KYC', icon: CheckCircle, onClick: () => requestAction('validateKYC', [row]) })
    }
    if (REVIEWABLE.includes(stage)) {
      items.push({ label: 'Rejeter KYC', icon: X, onClick: () => requestAction('rejectKYC', [row]) })
    }
    if (status !== 'DELETED') {
      items.push({ separator: true })
      if (status === 'SUSPENDED') {
        items.push({ label: 'Réactiver', icon: RefreshCw, onClick: () => requestAction('reactivate', [row]) })
      } else {
        items.push({ label: 'Suspendre', icon: AlertTriangle, danger: true, onClick: () => requestAction('suspend', [row]) })
      }
    }
    return items
  }

  const statusOptions = [
    { value: 'all', label: 'Tous statuts KYC' },
    { value: 'AWAITING_SUBMISSION', label: 'Soumission en attente' },
    { value: 'AWAITING_REVIEW', label: 'À traiter' },
    { value: 'UNDER_REVIEW', label: 'En traitement' },
    { value: 'VALIDATED', label: 'Validé' },
    { value: 'REJECTED', label: 'Rejeté' },
  ]
  const availabilityOptions = [
    { value: 'all', label: 'Toute dispo' },
    { value: 'AVAILABLE', label: 'Disponible' },
    { value: 'BUSY', label: 'Occupé' },
    { value: 'OFFLINE', label: 'Hors ligne' },
  ]

  const columns = [
    {
      id: 'select',
      header: () => (
        <label className={styles.checkHit} onClick={stop}>
          <input
            type="checkbox"
            className={styles.checkbox}
            ref={(el) => {
              if (el) el.indeterminate =
                selectedRows.length > 0 && selectedRows.length < artisans.length
            }}
            checked={allSelected}
            onClick={stop}
            onChange={() =>
              setSelectedArtisans(allSelected ? [] : artisans.map((a) => a.id_artisan))
            }
          />
        </label>
      ),
      accessor: (row) => row.id_artisan,
      cell: ({ value }) => (
        <label className={styles.checkHit} onClick={stop}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={selectedArtisans.includes(value)}
            onClick={stop}
            onChange={() => toggleArtisan(value)}
          />
        </label>
      ),
      width: '40px',
      sortable: false,
    },
    {
      id: 'artisan',
      header: 'Artisan',
      accessor: (row) => ({
        name: row.user?.full_name,
        ifu: row.ifu_number,
        avatar: row.user?.avatar_url,
        email: row.user?.email,
      }),
      cell: ({ value }) => (
        <div className={styles.artisanCell}>
          <div className={styles.avatar}>
            {value.avatar ? (
              <img src={value.avatar} alt={value.name} />
            ) : (
              <span className={styles.avatarFallback}>{value.name?.charAt(0) || '?'}</span>
            )}
          </div>
          <div className={styles.artisanInfo}>
            <span className={styles.artisanName}>{value.name || '—'}</span>
            <span className={styles.artisanMeta}>
              <span className={styles.mono}>IFU·{value.ifu || '—'}</span>
              <span>{value.email || '—'}</span>
            </span>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'category',
      header: 'Catégorie',
      accessor: (row) => row.category,
      cell: ({ value }) => value?.name ? (
        <span className={styles.categoryCell}>
          <span className={styles.categoryIcon}>{value.name.charAt(0)}</span>
          {value.name}
        </span>
      ) : <span className={styles.muted}>—</span>,
    },
    {
      id: 'status',
      header: 'KYC',
      accessor: (row) => stageOf(row),
      cell: ({ value }) => {
        const s = KYC_STAGE[value] || { color: 'secondary', label: value || '—' }
        return <Badge variant={s.color} size="sm" dot>{s.label}</Badge>
      },
      sortable: true,
    },
    {
      id: 'availability',
      header: 'Disponibilité',
      accessor: (row) => row.availability_status,
      cell: ({ value }) => {
        const map = {
          AVAILABLE: { color: 'success', label: 'Disponible' },
          BUSY:      { color: 'warning', label: 'Occupé' },
          OFFLINE:   { color: 'secondary', label: 'Hors ligne' },
        }
        const s = map[value] || { color: 'secondary', label: value || '—' }
        return <Badge variant={s.color} size="sm" dot>{s.label}</Badge>
      },
    },
    {
      id: 'rating',
      header: 'Note',
      accessor: (row) => row.average_rating,
      cell: ({ value }) => (
        <span className={styles.rating}>
          <Star size={11} className={styles.starIcon} />
          {Number(value) > 0 ? Number(value).toFixed(1) : '—'}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'missions',
      header: 'Missions',
      accessor: (row) => row.total_missions,
      cell: ({ value }) => (
        <span className={styles.inlineMetric}>
          <Briefcase size={11} />{value || 0}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'revenue',
      header: 'Revenu',
      accessor: (row) => row.wallet?.balance ?? row.total_revenue,
      cell: ({ value }) => (
        <span className={styles.amount}>{formatCurrency(value || 0)}</span>
      ),
    },
    {
      id: 'badge',
      header: 'Badge',
      accessor: (row) => row.badge,
      cell: ({ value }) => value?.name ? (
        <span className={styles.inlineMetric}>
          <Award size={11} />{value.name}
        </span>
      ) : <span className={styles.muted}>—</span>,
    },
    {
      id: 'joined',
      header: 'Inscription',
      accessor: (row) => row.created_at,
      cell: ({ value }) => (
        <span className={styles.muted}>{formatDate(value)}</span>
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

  const activeFiltersCount = [
    globalFilters.search, globalFilters.status,
    globalFilters.availability, globalFilters.category,
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearchInput('')
    setGlobalFilter('search', '')
    setGlobalFilter('status', null)
    setGlobalFilter('availability', null)
    setGlobalFilter('category', null)
  }

  const resetFilters = () => { clearFilters(); setSelectedArtisans([]) }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const rows = selectedRows.length > 0 ? selectedRows : artisans
      if (!rows.length) return
      const csv = rows.map(a => ({
        Nom: a.user?.full_name, Email: a.user?.email, Téléphone: a.user?.phone_number,
        IFU: a.ifu_number, Catégorie: a.category?.name,
        KYC: KYC_STAGE[stageOf(a)]?.label || stageOf(a),
        Disponibilité: a.availability_status,
        Note: Number(a.average_rating) > 0 ? Number(a.average_rating).toFixed(1) : 'N/A',
        Missions: a.total_missions || 0,
        Revenu: a.wallet?.balance ?? a.total_revenue ?? 0,
        'Date inscription': formatDate(a.created_at),
      }))
      const headers = Object.keys(csv[0]).join(',')
      const lines = csv.map(r => Object.values(r).map(v =>
        typeof v === 'string' && v.includes(',') ? `"${v}"` : v
      ).join(','))
      const blob = new Blob([[headers, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `artisans_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportLoading(false)
    }
  }

  if (isLoading && artisans.length === 0) {
    return <div className={styles.loading}><Spinner size="lg" /><span className={styles.loadingText}>Chargement des artisans…</span></div>
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <div style={{ padding: 16, background: 'var(--danger-subtle)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius)', color: 'var(--danger)', fontSize: 'var(--fs-sm)' }}>
          <strong>Erreur :</strong> {error?.message || 'Erreur inconnue'}
          <br />
          <button onClick={() => refetch()} style={{ marginTop: 8, padding: '6px 10px', border: '1px solid var(--danger-border)', background: 'var(--bg)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Réessayer</button>
        </div>
      </div>
    )
  }

  const isSingle = selectedRows.length === 1
  const isMulti = selectedRows.length > 1
  const suffix = (list) => (isMulti ? ` (${list.length})` : '')

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.toolbar}>
            <div className={styles.filtersGroup}>
              <div className={styles.searchWrap}>
                <Input size="md" icon={Search}
                  placeholder="Rechercher par nom, email ou IFU…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)} />
              </div>
              <div className={styles.filterItem}>
                <Select size="md" options={statusOptions}
                  value={globalFilters.status || 'all'}
                  onChange={(v) => setGlobalFilter('status', v === 'all' ? null : v)} />
              </div>
              <div className={styles.filterItem}>
                <Select size="md" options={availabilityOptions}
                  value={globalFilters.availability || 'all'}
                  onChange={(v) => setGlobalFilter('availability', v === 'all' ? null : v)} />
              </div>
              <div className={styles.filterItem}>
                <Select size="md" searchable clearable options={categoryOptions}
                  value={globalFilters.category || 'all'}
                  onChange={(v) => setGlobalFilter('category', v === 'all' ? null : v)} />
              </div>
              {activeFiltersCount > 0 && (
                <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                  <X size={11} /> Effacer
                </button>
              )}
            </div>
            <div className={styles.actions}>
              <Button variant="outline" size="md" icon={RefreshCw} onClick={() => refetch()} aria-label="Rafraîchir" />
              <Button variant="outline" size="md" icon={Download} onClick={handleExport} isLoading={exportLoading}>Exporter</Button>
              <Button variant="primary" size="md" icon={ArrowUpRight} onClick={() => navigate('/artisans/register')}>Nouvel artisan</Button>
            </div>
          </div>
        </div>
      </header>

      <div className={`${styles.content} ${selectedRows.length > 0 ? styles.contentWithBulk : ''}`}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <Users size={18} />
            <div>
              <span className={styles.statValue}>{total}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <span
              className={styles.statExtra}
              title="Dossiers KYC soumis, en attente de décision d'un admin"
            >
              <span className={styles.statExtraIcon}>
                <Clock size={10} strokeWidth={3} />
              </span>
              {stats?.toReview || 0} à traiter
            </span>
          </div>
          <div className={styles.stat} title="Artisans actifs et disponibles pour accepter des missions">
            <Zap size={18} className={styles.success} />
            <div>
              <span className={styles.statValue}>{stats?.available || 0}</span>
              <span className={styles.statLabel}>Disponibles</span>
            </div>
          </div>
          <div className={styles.stat}>
            <CheckCircle size={18} className={styles.success} />
            <div>
              <span className={styles.statValue}>{stats?.validated || 0}</span>
              <span className={styles.statLabel}>KYC validés</span>
            </div>
            <span
              className={styles.statExtra}
              title="Artisans inscrits qui n'ont pas encore soumis leur dossier KYC"
            >
              <span className={styles.statExtraIcon}>
                <FileText size={10} strokeWidth={3} />
              </span>
              {stats?.awaitingSubmission || 0} sans dossier
            </span>
          </div>
          <div className={styles.stat}>
            <Shield size={18} className={styles.info} />
            <div>
              <span className={styles.statValue}>{stats?.proMembers || 0}</span>
              <span className={styles.statLabel}>Pro membres</span>
            </div>
          </div>
        </div>

        {artisans.length > 0 ? (
          <Table
            columns={columns}
            data={artisans}
            rowKey="id_artisan"
            loading={isFetching}
            sortable
            onSort={(col, dir) => setSorting(col, dir)}
            onRowClick={(row) => navigate(`/artisans/${row.id_artisan}`)}
            pagination={{
              currentPage: pagination.page,
              totalPages: Math.ceil(total / pagination.pageSize),
              pageSize: pagination.pageSize,
              total,
              onPageChange: (page) => setPagination({ page }),
            }}
          />
        ) : (
          <EmptyState icon={Users} title="Aucun artisan trouvé" description="Aucun artisan ne correspond à vos critères."
            action={{ label: 'Réinitialiser', onClick: resetFilters }}
            secondaryAction={{ label: 'Ajouter un artisan', onClick: () => navigate('/artisans/register') }} />
        )}

        {artisans.length > 0 && (
          <div className={styles.insights}>
            <div className={styles.insightsHeader}>
              <BarChart3 size={13} />
              <span>Analytiques rapides · {total} artisan{total > 1 ? 's' : ''} (filtres appliqués)</span>
            </div>
            <div className={styles.insightsGrid}>
              <div className={styles.insight} title="Artisans validés / dossiers soumis (hors soumission en attente)">
                <Shield size={13} /><span>Taux de validation KYC</span>
                <strong>{pct(stats?.kycValidationRate)}</strong>
              </div>
              <div className={styles.insight} title="Dossiers soumis, en attente de décision">
                <Clock size={13} /><span>Dossiers à traiter</span>
                <strong>{stats?.toReview ?? 0}</strong>
              </div>
              <div className={styles.insight} title="Artisans inscrits n'ayant pas encore soumis leur dossier">
                <FileText size={13} /><span>Sans dossier soumis</span>
                <strong>{stats?.awaitingSubmission ?? 0}</strong>
              </div>
              <div className={styles.insight} title="Moyenne sur les artisans dont le KYC est validé">
                <TrendingUp size={13} /><span>Missions / artisan validé</span>
                <strong>{num(stats?.avgMissionsPerArtisan)}</strong>
              </div>
              <div className={styles.insight} title="Moyenne sur les artisans ayant au moins un avis">
                <Star size={13} /><span>Note moyenne{stats?.ratedCount ? ` (${stats.ratedCount} notés)` : ''}</span>
                <strong>{stats?.avgRating == null ? '—' : `${num(stats.avgRating)}/5`}</strong>
              </div>
              <div className={styles.insight} title="Comptes suspendus ou bannis">
                <AlertTriangle size={13} /><span>Suspendus / bannis</span>
                <strong>{stats?.suspended ?? 0}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barre d'actions flottante : portal dans <body>, visible quel que soit le scroll */}
      {selectedRows.length > 0 && createPortal(
        <div className={styles.bulkBar} role="toolbar" aria-label="Actions sur la sélection">
          <span className={styles.bulkInfo}>
            <span className={styles.bulkCount}>{selectedRows.length}</span>
            sélectionné{isMulti ? 's' : ''}
          </span>
          <div className={styles.bulkActions}>
            {isSingle && (
              <Button
                variant="outline" size="sm" icon={Eye}
                onClick={() => navigate(`/artisans/${selectedRows[0].id_artisan}`)}
              >
                Voir détails
              </Button>
            )}
            {isSingle && REVIEWABLE.includes(stageOf(selectedRows[0])) && (
              <Button
                variant="outline" size="sm" icon={FileCheck}
                onClick={() => navigate(`/artisans/${selectedRows[0].id_artisan}?tab=kyc`)}
              >
                Traiter le dossier
              </Button>
            )}
            {eligible.validate.length > 0 && (
              <Button
                variant="outline" size="sm" icon={CheckCircle}
                disabled={isRunningAction}
                onClick={() => requestAction('validateKYC', eligible.validate)}
              >
                Valider KYC{suffix(eligible.validate)}
              </Button>
            )}
            {isSingle && eligible.reject.length > 0 && (
              <Button
                variant="outline" size="sm" icon={X}
                disabled={isRunningAction}
                onClick={() => requestAction('rejectKYC', eligible.reject)}
              >
                Rejeter KYC
              </Button>
            )}
            {eligible.suspend.length > 0 && (
              <Button
                variant="outline" size="sm" icon={AlertTriangle}
                disabled={isRunningAction}
                onClick={() => requestAction('suspend', eligible.suspend)}
              >
                Suspendre{suffix(eligible.suspend)}
              </Button>
            )}
            {eligible.reactivate.length > 0 && (
              <Button
                variant="outline" size="sm" icon={RefreshCw}
                disabled={isRunningAction}
                onClick={() => requestAction('reactivate', eligible.reactivate)}
              >
                Réactiver{suffix(eligible.reactivate)}
              </Button>
            )}
            {isMulti && (
              <Button
                variant="outline" size="sm" icon={Download}
                onClick={handleExport} isLoading={exportLoading}
              >
                Exporter
              </Button>
            )}
          </div>
          <Button
            variant="ghost" size="sm" icon={X}
            aria-label="Désélectionner"
            onClick={() => setSelectedArtisans([])}
          />
        </div>,
        document.body
      )}

      {dialog && (
        <ConfirmDialog
          key={`${dialog.action}-${dialog.rows.length}`}
          dialog={dialog}
          busy={isRunningAction}
          onCancel={() => setDialog(null)}
          onConfirm={confirmDialog}
        />
      )}
    </div>
  )
}

export default Artisans