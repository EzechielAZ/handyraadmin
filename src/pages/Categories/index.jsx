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
  Search, Plus, RefreshCw, X, Layers, CheckCircle, EyeOff, GitBranch,
  Pencil, Power, Lock, Copy,
  Tag, FileText, Image as ImageIcon, Save, ShieldCheck,
} from 'lucide-react'
import { formatDate, formatCurrency } from '../../utils/formatters'
import toast from 'react-hot-toast'
import { ImageUpload } from '../../components/ui/ImageUpload/ImageUpload'
import base from '../Artisans/Artisans.module.css'
import styles from './Categories.module.css'

const PAGE_SIZE = 20
const STALE_MS = 30_000

const CATEGORIES_QUERY_KEY = ['categories']
const categoryQueryKey = (id) => ['category', id]

/* Champs numériques : sert au rendu du formulaire ET à la validation */
const SECTIONS = [
  {
    title: 'Tarification',
    fields: [
      { key: 'base_price',      label: 'Prix de base (XOF)', min: 0 },
      { key: 'commission_rate', label: 'Commission (%)',     min: 0, max: 100 },
    ],
  },
  {
    title: 'HPRE',
    fields: [
      { key: 'hpre_weight',             label: 'Poids HPRE',              min: 0 },
      { key: 'hpre_lambda',             label: 'Lambda HPRE',             min: 0 },
      { key: 'p_variable_rate',         label: 'Taux variable (P)',       min: 0 },
      { key: 'ca_saturation_k',         label: 'Saturation CA (K)',       min: 0 },
      { key: 'min_ca_requirement',      label: 'CA minimum (XOF)',        min: 0 },
      { key: 'bonus_excellence_amount', label: 'Bonus excellence (XOF)',  min: 0 },
    ],
  },
  {
    title: 'Missions',
    fields: [
      { key: 'max_immediate_missions', label: 'Missions immédiates max',   min: 0, int: true },
      { key: 'max_scheduled_per_day',  label: 'Missions planifiées / jour', min: 0, int: true },
    ],
  },
]
const NUMERIC_FIELDS = SECTIONS.flatMap(s => s.fields)

const DEFAULT_FORM = {
  name: '',
  description: '',
  parent_id: 'none',
  icon_url: '',
  is_active: true,
  hpo_available: false,
  base_price: '',
  commission_rate: '',
  hpre_weight: '1',
  hpre_lambda: '',
  p_variable_rate: '0.05',
  ca_saturation_k: '',
  min_ca_requirement: '50000',
  bonus_excellence_amount: '5000',
  max_immediate_missions: '1',
  max_scheduled_per_day: '2',
}

const toForm = (c) => {
  const form = {
    name: c.name || '',
    description: c.description || '',
    parent_id: c.parent_id || 'none',
    icon_url: c.icon_url || '',
    is_active: c.is_active !== false,
    hpo_available: !!c.hpo_available,
  }
  NUMERIC_FIELDS.forEach(f => { form[f.key] = c[f.key] == null ? '' : String(c[f.key]) })
  return form
}

const validate = (form) => {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Le nom est requis'

  NUMERIC_FIELDS.forEach(({ key, min, max, int }) => {
    const raw = String(form[key]).trim()
    if (raw === '') return
    const n = Number(raw)
    if (!Number.isFinite(n)) errors[key] = 'Nombre invalide'
    else if (int && !Number.isInteger(n)) errors[key] = 'Entier requis'
    else if (min != null && n < min) errors[key] = `Minimum ${min}`
    else if (max != null && n > max) errors[key] = `Maximum ${max}`
  })
  return errors
}

const toNumOrNull = (v) => {
  const s = String(v ?? '').trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

const toIntOrNull = (v) => {
  const n = toNumOrNull(v)
  return n == null ? null : Math.trunc(n)
}

const buildRpcPayload = (form) => ({
  p_name: form.name.trim(),
  p_description: form.description.trim() || null,
  p_parent_id: form.parent_id === 'none' ? null : form.parent_id,
  p_icon_url: form.icon_url.trim() || null,
  p_is_active: form.is_active,
  p_hpo_available: form.hpo_available,
  p_base_price: toNumOrNull(form.base_price),
  p_commission_rate: toNumOrNull(form.commission_rate),
  p_hpre_weight: toNumOrNull(form.hpre_weight),
  p_hpre_lambda: toNumOrNull(form.hpre_lambda),
  p_p_variable_rate: toNumOrNull(form.p_variable_rate),
  p_ca_saturation_k: toNumOrNull(form.ca_saturation_k),
  p_min_ca_requirement: toNumOrNull(form.min_ca_requirement),
  p_bonus_excellence_amount: toNumOrNull(form.bonus_excellence_amount),
  p_max_immediate_missions: toIntOrNull(form.max_immediate_missions),
  p_max_scheduled_per_day: toIntOrNull(form.max_scheduled_per_day),
})

const descendantIds = (id, list) => {
  const out = new Set()
  const walk = (parentId) => {
    list.forEach(c => {
      if (c.parent_id === parentId && !out.has(c.id_category)) {
        out.add(c.id_category)
        walk(c.id_category)
      }
    })
  }
  walk(id)
  return out
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
      return 'Catégorie introuvable'
    default:
      return error.message || 'Une erreur est survenue'
  }
}

/* ═══════════════════════════════════════════════════════════════
   DRAWER — édition / création
   ═══════════════════════════════════════════════════════════════ */
const CategoryDrawer = ({
  isOpen, onClose, editing, form, errors, setField, onSave, saving, parentOptions,
}) => {
  const parentLabel = form.parent_id !== 'none'
    ? parentOptions.find(o => o.value === form.parent_id)?.label
    : null

  return (
    <Dialog
      open={isOpen}
      onClose={saving ? () => {} : onClose}
      className={styles.drawerRoot}
      transition
    >
      <DialogBackdrop className={styles.drawerBackdrop} transition />

      <DialogPanel className={styles.drawerPanel} transition>
        <header className={styles.drawerHeader}>
          <div className={styles.drawerHeaderContent}>
            <span className={styles.drawerEyebrow}>
              {editing ? 'Édition' : 'Création'}
            </span>
            <DialogTitle className={styles.drawerTitle}>
              {editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </DialogTitle>
            {editing && (
              <span className={styles.drawerKeyBadge}>
                <GitBranch size={10} />
                {parentLabel ? `Sous-catégorie de ${parentLabel}` : 'Catégorie principale'}
              </span>
            )}
          </div>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            disabled={saving}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </header>

        <div className={styles.drawerBody}>
          <section className={styles.drawerSection}>
            <span className={styles.drawerSectionLabel}>Général</span>

            <div className={styles.drawerField}>
              <label className={styles.drawerFieldLabel}>
                <Tag size={12} />
                Nom
                <span className={styles.drawerRequired}>*</span>
              </label>
              <input
                className={[
                  styles.drawerInput,
                  errors.name && styles.drawerInputError,
                ].filter(Boolean).join(' ')}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Ex : Plomberie"
                autoComplete="off"
              />
              {errors.name && <span className={styles.drawerFieldError}>{errors.name}</span>}
            </div>

            <div className={styles.drawerField}>
              <label className={styles.drawerFieldLabel}>
                <FileText size={12} />
                Description
                <span className={styles.drawerOptional}>optionnel</span>
              </label>
              <textarea
                className={styles.drawerTextarea}
                rows={2}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="À quoi sert cette catégorie ?"
              />
            </div>

            <div className={styles.drawerField}>
              <label className={styles.drawerFieldLabel}>
                <GitBranch size={12} />
                Catégorie parente
                <span className={styles.drawerOptional}>optionnel</span>
              </label>
              <Select
                size="md"
                searchable
                options={parentOptions}
                value={form.parent_id}
                onChange={(v) => setField('parent_id', v)}
              />
            </div>

            <div className={styles.drawerField}>
              <label className={styles.drawerFieldLabel}>
                <ImageIcon size={12} />
                Icône
                <span className={styles.drawerOptional}>optionnel</span>
              </label>
              <ImageUpload folder="categories" label="Icône" value={form.icon_url} onChange={(u) => setField('icon_url', u)} />
            </div>
          </section>

          <section className={styles.drawerSection}>
            <span className={styles.drawerSectionLabel}>Options</span>

            <label className={styles.drawerSwitch} data-active={form.is_active}>
              <div className={styles.drawerSwitchText}>
                <strong>Catégorie active</strong>
                <span>Visible dans l'application mobile</span>
              </div>
              <span className={styles.drawerSwitchTrack}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setField('is_active', e.target.checked)}
                />
                <span className={styles.drawerSwitchThumb} />
              </span>
            </label>

            <label className={styles.drawerSwitch} data-active={form.hpo_available}>
              <div className={styles.drawerSwitchText}>
                <strong>HPO disponible</strong>
                <span>Supervision de chantier par un superviseur certifié</span>
              </div>
              <span className={styles.drawerSwitchTrack}>
                <input
                  type="checkbox"
                  checked={form.hpo_available}
                  onChange={(e) => setField('hpo_available', e.target.checked)}
                />
                <span className={styles.drawerSwitchThumb} />
              </span>
            </label>
          </section>

          {SECTIONS.map(section => (
            <section key={section.title} className={styles.drawerSection}>
              <span className={styles.drawerSectionLabel}>{section.title}</span>
              <div className={styles.drawerFormGrid}>
                {section.fields.map(f => (
                  <div key={f.key} className={styles.drawerField}>
                    <label className={styles.drawerFieldLabel}>{f.label}</label>
                    <input
                      className={[
                        styles.drawerInput,
                        styles.drawerInputMono,
                        errors[f.key] && styles.drawerInputError,
                      ].filter(Boolean).join(' ')}
                      type="number"
                      step="any"
                      value={form[f.key]}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder="—"
                    />
                    {errors[f.key] && (
                      <span className={styles.drawerFieldError}>{errors[f.key]}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div className={styles.drawerNotice}>
            <ShieldCheck size={14} />
            <span>
              {editing
                ? 'Les modifications sont immédiatement visibles dans l\'application mobile.'
                : 'Les champs numériques laissés vides prennent la valeur par défaut de la base.'}
            </span>
          </div>
        </div>

        <footer className={styles.drawerFooter}>
          <span className={styles.drawerFooterHint}>
            <kbd>Échap</kbd> pour annuler
          </span>
          <div className={styles.drawerFooterActions}>
            <button
              type="button"
              className={styles.drawerBtnSecondary}
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="button"
              className={styles.drawerBtnPrimary}
              onClick={onSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className={styles.drawerSpinner} />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Save size={14} />
                  {editing ? 'Enregistrer' : 'Créer'}
                </>
              )}
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
const Categories = () => {
  const canManage = useAuthStore((s) => s.permissions.includes('manage_categories'))
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 300)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  /* ── List query (TanStack) ─────────────────────────────── */
  const {
    data: categories = [],
    isLoading,
    isFetching,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_categories')
      if (error) throw error
      return data || []
    },
    staleTime: STALE_MS,
  })

  useEffect(() => { setPage(1) }, [search, statusFilter, typeFilter])

  const byId = useMemo(
    () => Object.fromEntries(categories.map(c => [c.id_category, c])),
    [categories]
  )

  const stats = useMemo(() => ({
    total: categories.length,
    active: categories.filter(c => c.is_active).length,
    inactive: categories.filter(c => !c.is_active).length,
    sub: categories.filter(c => c.parent_id).length,
  }), [categories])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return categories.filter(c => {
      if (q && !`${c.name} ${c.description || ''}`.toLowerCase().includes(q)) return false
      if (statusFilter === 'active' && !c.is_active) return false
      if (statusFilter === 'inactive' && c.is_active) return false
      if (typeFilter === 'root' && c.parent_id) return false
      if (typeFilter === 'sub' && !c.parent_id) return false
      return true
    })
  }, [categories, search, statusFilter, typeFilter])

  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  /* ── Parent options — UNIQUEMENT les racines ───────────── */
  const parentOptions = useMemo(() => {
    const roots = categories.filter(c => !c.parent_id)
    const excluded = editing
      ? new Set([editing.id_category, ...descendantIds(editing.id_category, categories)])
      : new Set()
    return [
      { value: 'none', label: 'Aucune (catégorie principale)' },
      ...roots
        .filter(c => !excluded.has(c.id_category))
        .map(c => ({ value: c.id_category, label: c.name })),
    ]
  }, [categories, editing])

  /* ── Drawer open helpers ───────────────────────────────── */
  const openDrawerFor = (category) => {
    setEditing(category)
    setForm(toForm(category))
    setErrors({})
    setDrawerOpen(true)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setErrors({})
    setDrawerOpen(true)
  }

  const openEdit = async (category) => {
    const id = category.id_category

    /* 1) Cache spécifique fraîche ? */
    const specificState = queryClient.getQueryState(categoryQueryKey(id))
    if (specificState?.data && Date.now() - specificState.dataUpdatedAt < STALE_MS) {
      openDrawerFor(specificState.data)
      return
    }

    /* 2) Cache de la liste fraîche ? → seed sans fetch */
    const listState = queryClient.getQueryState(CATEGORIES_QUERY_KEY)
    if (listState?.data && Date.now() - listState.dataUpdatedAt < STALE_MS) {
      const fromList = listState.data.find(c => c.id_category === id)
      if (fromList) {
        queryClient.setQueryData(categoryQueryKey(id), fromList)
        openDrawerFor(fromList)
        return
      }
    }

    /* 3) Fetch serveur */
    const toastId = toast.loading('Chargement…')
    try {
      const { data, error } = await supabase.rpc('get_category', { p_id: id })
      if (error) throw error
      if (!data) throw new Error('Catégorie introuvable')

      queryClient.setQueryData(categoryQueryKey(id), data)
      toast.dismiss(toastId)
      openDrawerFor(data)
    } catch (err) {
      toast.dismiss(toastId)
      toast.error(errorMessage(err))
    }
  }

  const closeDrawer = () => { if (!saving) setDrawerOpen(false) }

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  /* ── Save (RPC) ────────────────────────────────────────── */
  const save = async () => {
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    const isUpdate = !!editing
    const payload = buildRpcPayload(form)

    try {
      if (isUpdate) {
        const { error } = await supabase.rpc('update_category', {
          p_id: editing.id_category,
          ...payload,
        })
        if (error) throw error
        toast.success('Catégorie mise à jour')
      } else {
        const { error } = await supabase.rpc('create_category', payload)
        if (error) throw error
        toast.success('Catégorie créée')
      }

      await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY })
      if (isUpdate) {
        queryClient.invalidateQueries({ queryKey: categoryQueryKey(editing.id_category) })
      }

      setDrawerOpen(false)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  /* ── Toggle active (RPC) ───────────────────────────────── */
  const toggleActive = async (category) => {
    const { error } = await supabase.rpc('toggle_category_active', {
      p_id: category.id_category,
    })

    if (error) return toast.error(errorMessage(error))

    toast.success(category.is_active ? 'Catégorie désactivée' : 'Catégorie activée')
    queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: categoryQueryKey(category.id_category) })
  }

  const rowActions = (row) => [
    { label: 'Modifier', icon: Pencil, onClick: () => openEdit(row) },
    { label: 'Copier l\'ID', icon: Copy, onClick: () => { navigator.clipboard.writeText(row.id_category); toast.success('ID copié') } },
    { separator: true },
    row.is_active
      ? { label: 'Désactiver', icon: Power, danger: true, onClick: () => toggleActive(row) }
      : { label: 'Activer', icon: Power, onClick: () => toggleActive(row) },
  ]

  const columns = [
    {
      id: 'name',
      header: 'Catégorie',
      accessor: (row) => row,
      cell: ({ value }) => (
        <div className={base.artisanCell}>
          <span className={base.categoryIcon}>{value.name?.charAt(0) || '?'}</span>
          <div className={base.artisanInfo}>
            <span className={base.artisanName}>{value.name}</span>
            {value.description && (
              <span className={base.artisanMeta}><span>{value.description}</span></span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'parent',
      header: 'Parent',
      accessor: (row) => byId[row.parent_id]?.name,
      cell: ({ value }) => value ? <span>{value}</span> : <span className={base.muted}>—</span>,
    },
    {
      id: 'base_price',
      header: 'Prix de base',
      accessor: (row) => row.base_price,
      cell: ({ value }) => value == null
        ? <span className={base.muted}>—</span>
        : <span className={base.amount}>{formatCurrency(value)}</span>,
    },
    {
      id: 'commission',
      header: 'Commission',
      accessor: (row) => row.commission_rate,
      cell: ({ value }) => value == null
        ? <span className={base.muted}>—</span>
        : <span className={base.amount}>{value}%</span>,
    },
    {
      id: 'hpre',
      header: 'Poids HPRE',
      accessor: (row) => row.hpre_weight,
      cell: ({ value }) => value == null
        ? <span className={base.muted}>—</span>
        : <span className={base.amount}>{value}</span>,
    },
    {
      id: 'limits',
      header: 'Max imm. / plan.',
      accessor: (row) => row,
      cell: ({ value }) => (
        <span className={base.muted}>
          {value.max_immediate_missions ?? '—'} / {value.max_scheduled_per_day ?? '—'}
        </span>
      ),
    },
    {
      id: 'hpo',
      header: 'HPO',
      accessor: (row) => row.hpo_available,
      cell: ({ value }) => value
        ? <Badge variant="primary" size="sm">HPO</Badge>
        : <span className={base.muted}>—</span>,
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => row.is_active,
      cell: ({ value }) => (
        <Badge variant={value ? 'success' : 'secondary'} size="sm" dot>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'created',
      header: 'Création',
      accessor: (row) => row.created_at,
      cell: ({ value }) => <span className={base.muted}>{formatDate(value)}</span>,
    },
    ...(canManage ? [{
      id: 'actions',
      header: '',
      accessor: (row) => row,
      cell: ({ value }) => <ActionsMenu items={rowActions(value)} />,
      width: '50px',
    }] : []),
  ]

  const activeFilters = [search, statusFilter !== 'all', typeFilter !== 'all'].filter(Boolean).length
  const clearFilters = () => { setSearchInput(''); setStatusFilter('all'); setTypeFilter('all') }

  if (isLoading) {
    return (
      <div className={base.loading}>
        <Spinner size="lg" />
        <span className={base.loadingText}>Chargement des catégories…</span>
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

  return (
    <div className={base.page}>
      <header className={base.pageHeader}>
        <div className={base.pageHeaderInner}>
          <div className={base.toolbar}>
            <div className={base.filtersGroup}>
              <div className={base.searchWrap}>
                <Input size="md" icon={Search} placeholder="Rechercher une catégorie…"
                  value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
              </div>
              <div className={base.filterItem}>
                <Select size="md" value={statusFilter} onChange={setStatusFilter}
                  options={[
                    { value: 'all', label: 'Tous statuts' },
                    { value: 'active', label: 'Actives' },
                    { value: 'inactive', label: 'Inactives' },
                  ]} />
              </div>
              <div className={base.filterItem}>
                <Select size="md" value={typeFilter} onChange={setTypeFilter}
                  options={[
                    { value: 'all', label: 'Tous types' },
                    { value: 'root', label: 'Principales' },
                    { value: 'sub', label: 'Sous-catégories' },
                  ]} />
              </div>
              {activeFilters > 0 && (
                <button type="button" className={base.clearBtn} onClick={clearFilters}>
                  <X size={11} /> Effacer
                </button>
              )}
            </div>
            <div className={base.actions}>
              {!canManage && (
                <Badge variant="secondary" size="sm"><Lock size={10} /> Lecture seule</Badge>
              )}
              <Button variant="outline" size="md" icon={RefreshCw} onClick={() => refetch()}
                isLoading={isFetching} aria-label="Rafraîchir" />
              {canManage && (
                <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>
                  Nouvelle catégorie
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className={base.content}>
        <div className={base.stats}>
          <div className={base.stat}>
            <Layers size={18} />
            <div><span className={base.statValue}>{stats.total}</span><span className={base.statLabel}>Total</span></div>
          </div>
          <div className={base.stat}>
            <CheckCircle size={18} className={base.success} />
            <div><span className={base.statValue}>{stats.active}</span><span className={base.statLabel}>Actives</span></div>
          </div>
          <div className={base.stat}>
            <EyeOff size={18} className={base.warning} />
            <div><span className={base.statValue}>{stats.inactive}</span><span className={base.statLabel}>Inactives</span></div>
          </div>
          <div className={base.stat}>
            <GitBranch size={18} className={base.info} />
            <div><span className={base.statValue}>{stats.sub}</span><span className={base.statLabel}>Sous-catégories</span></div>
          </div>
        </div>

        {filtered.length > 0 ? (
          <Table
            columns={columns}
            data={pageRows}
            rowKey="id_category"
            loading={isFetching}
            onRowClick={canManage ? openEdit : undefined}
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
            icon={Layers}
            title="Aucune catégorie trouvée"
            description="Aucune catégorie ne correspond à vos critères."
            action={activeFilters > 0 ? { label: 'Réinitialiser', onClick: clearFilters } : undefined}
          />
        )}
      </div>

      <CategoryDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        editing={editing}
        form={form}
        errors={errors}
        setField={setField}
        onSave={save}
        saving={saving}
        parentOptions={parentOptions}
      />
    </div>
  )
}

export default Categories