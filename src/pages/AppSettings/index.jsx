import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Dialog, DialogBackdrop, DialogPanel, DialogTitle,
} from '@headlessui/react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useDebounce } from '../../hooks/useDebounce'
import {
  Button, Input, Select, Table, Spinner, EmptyState, ActionsMenu, Modal,
} from '../../components/ui'
import {
  Search, Plus, RefreshCw, X, Settings2, Pencil, Trash2, Copy, AlertTriangle,
  Key, Tag, FileText, Calendar, Save, ShieldCheck,
  UserCircle, Briefcase, Route, MapPin, QrCode, CreditCard, Server,
} from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import toast from 'react-hot-toast'
import base from '../Artisans/Artisans.module.css'
import styles from './AppSettings.module.css'

const PAGE_SIZE = 20
const KEY_PATTERN = /^[a-z0-9][a-z0-9_.-]*$/i

const DOMAIN_ICONS = {
  identity:   UserCircle,
  mission:    Briefcase,
  assignment: Route,
  tracking:   MapPin,
  search:     Search,
  invitation: QrCode,
  payment:    CreditCard,
  system:     Server,
}

const DomainIcon = ({ code, size = 12 }) => {
  const Icon = DOMAIN_ICONS[code] || Server
  return <Icon size={size} />
}

const EMPTY_FORM = {
  setting_key: '',
  setting_label: '',
  setting_value: '',
  description: '',
  setting_domain: 'system',
}

const errorMessage = (error) => {
  if (!error) return 'Une erreur est survenue'
  switch (error.code) {
    case 'P0001':
    case 'P0002':
      return error.message || 'Action refusée'
    case '23505':
      return 'Cette clé existe déjà'
    case '42501':
      return 'Action refusée : réservée aux SUPER_ADMIN'
    case 'PGRST116':
      return 'Paramètre introuvable'
    default:
      return error.message || 'Une erreur est survenue'
  }
}

/* ═══════════════════════════════════════════════════════════════
   DRAWER — édition / création
   ═══════════════════════════════════════════════════════════════ */
const SettingDrawer = ({
  isOpen, onClose, editing, form, errors, setField, onSave, saving, domains,
}) => (
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
            {editing ? 'Modifier le paramètre' : 'Nouveau paramètre'}
          </DialogTitle>
          {editing?.setting_key && (
            <span className={styles.drawerKeyBadge} title={editing.setting_key}>
              <Key size={10} />
              {editing.setting_key}
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
          <span className={styles.drawerSectionLabel}>Identité</span>

          <div className={styles.drawerField}>
            <label className={styles.drawerFieldLabel}>
              <Key size={12} />
              Clé
              <span className={styles.drawerRequired}>*</span>
            </label>
            <input
              className={[
                styles.drawerInput,
                styles.drawerInputMono,
                errors.setting_key && styles.drawerInputError,
                editing && styles.drawerInputReadonly,
              ].filter(Boolean).join(' ')}
              value={form.setting_key}
              onChange={(e) => setField('setting_key', e.target.value)}
              disabled={!!editing}
              placeholder="support_phone"
              autoComplete="off"
              spellCheck="false"
            />
            {errors.setting_key && (
              <span className={styles.drawerFieldError}>{errors.setting_key}</span>
            )}
            {!editing && (
              <span className={styles.drawerFieldHint}>
                Lettres minuscules, chiffres, <code>_</code> <code>.</code> <code>-</code> — non modifiable après création
              </span>
            )}
          </div>

          <div className={styles.drawerField}>
            <label className={styles.drawerFieldLabel}>
              <Tag size={12} />
              Libellé
              <span className={styles.drawerRequired}>*</span>
            </label>
            <input
              className={[
                styles.drawerInput,
                errors.setting_label && styles.drawerInputError,
              ].filter(Boolean).join(' ')}
              value={form.setting_label}
              onChange={(e) => setField('setting_label', e.target.value)}
              placeholder="Ex : Avatar — Artisane HPO"
              autoComplete="off"
            />
            {errors.setting_label && (
              <span className={styles.drawerFieldError}>{errors.setting_label}</span>
            )}
          </div>
        </section>

        <section className={styles.drawerSection}>
          <span className={styles.drawerSectionLabel}>Classification</span>
          <div className={styles.drawerDomainGrid}>
            {domains.map(d => (
              <button
                key={d.code}
                type="button"
                className={styles.drawerDomainCard}
                data-active={form.setting_domain === d.code}
                onClick={() => setField('setting_domain', d.code)}
              >
                <DomainIcon code={d.code} size={14} />
                <span>{d.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.drawerSection}>
          <span className={styles.drawerSectionLabel}>Contenu</span>

          <div className={styles.drawerField}>
            <label className={styles.drawerFieldLabel}>
              <FileText size={12} />
              Valeur
              <span className={styles.drawerRequired}>*</span>
            </label>
            <textarea
              className={[
                styles.drawerTextarea,
                errors.setting_value && styles.drawerInputError,
              ].filter(Boolean).join(' ')}
              value={form.setting_value}
              onChange={(e) => setField('setting_value', e.target.value)}
              placeholder="La valeur du paramètre…"
              rows={5}
              spellCheck="false"
            />
            {errors.setting_value && (
              <span className={styles.drawerFieldError}>{errors.setting_value}</span>
            )}
          </div>

          <div className={styles.drawerField}>
            <label className={styles.drawerFieldLabel}>
              <FileText size={12} />
              Description
              <span className={styles.drawerOptional}>optionnel</span>
            </label>
            <textarea
              className={styles.drawerTextarea}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="À quoi sert ce paramètre ?"
              rows={3}
            />
          </div>
        </section>

        {editing?.updated_at && (
          <div className={styles.drawerMeta}>
            <Calendar size={12} />
            <span>Dernière modification le {formatDate(editing.updated_at)}</span>
          </div>
        )}

        <div className={styles.drawerNotice}>
          <ShieldCheck size={14} />
          <span>
            Ce paramètre est lu par l'application mobile. La modification est
            immédiate après sauvegarde.
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

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */
const AppSettings = () => {
  const canManage = useAuthStore((s) => s.permissions.includes('manage_app_settings'))

  const [settings, setSettings] = useState([])
  const [domains, setDomains] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 300)
  const [filterDomain, setFilterDomain] = useState(null)
  const [page, setPage] = useState(1)

  /* Résultat serveur filtré par domaine.
     null  → pas de filtre distant actif (utilise les données locales)
     array → données rapatriées du serveur pour ce domaine */
  const [domainFilteredData, setDomainFilteredData] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  /* ── Chargement initial ─────────────────────────────────── */
  const load = useCallback(async () => {
    setIsFetching(true)
    const [settingsRes, domainsRes] = await Promise.all([
      supabase.rpc('list_app_settings'),
      supabase.rpc('list_app_setting_domains'),
    ])

    if (settingsRes.error) {
      setLoadError(settingsRes.error)
    } else {
      setSettings(settingsRes.data || [])
      setLoadError(null)
    }

    if (!domainsRes.error) setDomains(domainsRes.data || [])

    setIsLoading(false)
    setIsFetching(false)
  }, [])

  useEffect(() => { load() }, [load])

  /* ── Query serveur à chaque changement de domaine ───────── */
  useEffect(() => {
    if (!filterDomain) {
      setDomainFilteredData(null)
      return
    }

    let cancelled = false
    /* On repasse sur les données locales immédiatement,
       le serveur remplacera si succès. */
    setDomainFilteredData(null)

    ;(async () => {
      const { data, error } = await supabase.rpc('list_app_settings', {
        p_domain: filterDomain,
      })
      if (cancelled) return

      if (error) {
        // Fallback silencieux : on garde null → filtre local
        console.warn('[AppSettings] domain filter fallback to local:', error)
      } else {
        setDomainFilteredData(data || [])
      }
    })()

    return () => { cancelled = true }
  }, [filterDomain, refreshKey])

  useEffect(() => { setPage(1) }, [search, filterDomain])

  /* ── Données affichées ───────────────────────────────────── */
  const filtered = useMemo(() => {
    /* Base : serveur si dispo (déjà filtré par domaine), sinon local */
    const base = domainFilteredData ?? settings
    const q = search.trim().toLowerCase()

    return base.filter(s => {
      /* Si pas de résultat serveur, on applique le filtre domaine localement */
      if (!domainFilteredData && filterDomain && s.setting_domain !== filterDomain) return false
      if (!q) return true
      return `${s.setting_label || ''} ${s.setting_key} ${s.setting_value} ${s.description || ''}`
        .toLowerCase().includes(q)
    })
  }, [settings, domainFilteredData, search, filterDomain])

  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  const domainOptions = useMemo(() => [
    { value: 'all', label: 'Tous domaines' },
    ...domains.map(d => ({ value: d.code, label: d.label })),
  ], [domains])

  /* ── Drawer ─────────────────────────────────────────────── */
  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, setting_domain: filterDomain || 'system' })
    setErrors({})
    setDrawerOpen(true)
  }

  const openEdit = (setting) => {
    setEditing(setting)
    setForm({
      setting_key: setting.setting_key,
      setting_label: setting.setting_label || '',
      setting_value: setting.setting_value ?? '',
      description: setting.description || '',
      setting_domain: setting.setting_domain || 'system',
    })
    setErrors({})
    setDrawerOpen(true)
  }

  const closeDrawer = () => { if (!saving) setDrawerOpen(false) }

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  /* ── Save ───────────────────────────────────────────────── */
  const save = async () => {
    const found = {}
    const key   = form.setting_key.trim()
    const label = form.setting_label.trim()

    if (!editing) {
      if (!key) found.setting_key = 'La clé est requise'
      else if (!KEY_PATTERN.test(key)) found.setting_key = 'Lettres, chiffres, _ . - uniquement'
    }
    if (!label) found.setting_label = 'Le libellé est requis'
    if (form.setting_value === '') found.setting_value = 'La valeur est requise'

    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)

    const { error } = editing
      ? await supabase.rpc('update_app_setting', {
          p_id:          editing.id_setting,
          p_label:       label,
          p_value:       form.setting_value,
          p_description: form.description.trim() || null,
          p_domain:      form.setting_domain,
        })
      : await supabase.rpc('create_app_setting', {
          p_key:         key,
          p_label:       label,
          p_value:       form.setting_value,
          p_description: form.description.trim() || null,
          p_domain:      form.setting_domain,
        })

    setSaving(false)
    if (error) return toast.error(errorMessage(error))

    toast.success(editing ? 'Paramètre mis à jour' : 'Paramètre créé')
    setDrawerOpen(false)
    load()
    setRefreshKey(k => k + 1)
  }

  /* ── Delete ─────────────────────────────────────────────── */
  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    const { error } = await supabase.rpc('delete_app_setting', { p_id: toDelete.id_setting })
    setDeleting(false)

    if (error) return toast.error(errorMessage(error))

    toast.success('Paramètre supprimé')
    setToDelete(null)
    load()
    setRefreshKey(k => k + 1)
  }

  /* ── Actions menu ───────────────────────────────────────── */
  const rowActions = (row) => [
    { label: 'Modifier', icon: Pencil, onClick: () => openEdit(row) },
    {
      label: 'Copier la clé',
      icon: Copy,
      onClick: () => { navigator.clipboard.writeText(row.setting_key); toast.success('Clé copiée') },
    },
    { separator: true },
    { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setToDelete(row) },
  ]

  /* ── Colonnes ───────────────────────────────────────────── */
  const columns = [
    {
      id: 'label',
      header: 'Libellé',
      accessor: (row) => row.setting_label,
      cell: ({ value }) => value
        ? <span className={styles.labelCell} title={value}>{value}</span>
        : <span className={base.muted}>—</span>,
    },
    {
      id: 'domain',
      header: 'Domaine',
      accessor: (row) => row.setting_domain,
      cell: ({ value }) => {
        const dom = domains.find(d => d.code === value)
        if (!dom) return <span className={base.muted}>—</span>
        return (
          <span className={styles.domainBadge}>
            <DomainIcon code={value} size={10} />
            {dom.label}
          </span>
        )
      },
    },
    {
      id: 'key',
      header: 'Clé',
      accessor: (row) => row.setting_key,
      cell: ({ value }) => <span className={styles.keyCell} title={value}>{value}</span>,
    },
    {
      id: 'value',
      header: 'Valeur',
      accessor: (row) => row.setting_value,
      cell: ({ value }) => <span className={styles.valueCell} title={value}>{value}</span>,
    },
    {
      id: 'description',
      header: 'Description',
      accessor: (row) => row.description,
      cell: ({ value }) => value
        ? <span className={styles.descCell} title={value}>{value}</span>
        : <span className={base.muted}>—</span>,
    },
    {
      id: 'updated',
      header: 'Modifié le',
      accessor: (row) => row.updated_at,
      cell: ({ value }) => <span className={base.muted}>{value ? formatDate(value) : '—'}</span>,
    },
    {
      id: 'actions',
      header: '',
      accessor: (row) => row,
      cell: ({ value }) => <ActionsMenu items={rowActions(value)} />,
      width: '50px',
    },
  ]

  const activeFiltersCount = [search, filterDomain].filter(Boolean).length

  const clearFilters = () => {
    setSearchInput('')
    setFilterDomain(null)
  }

  /* ── États transitoires ─────────────────────────────────── */
  if (isLoading) {
    return (
      <div className={base.loading}>
        <Spinner size="lg" />
        <span className={base.loadingText}>Chargement des paramètres…</span>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={base.page}>
        <div className={styles.errorBox}>
          <strong>Erreur :</strong> {loadError.message}
          <div><Button variant="outline" size="sm" onClick={load}>Réessayer</Button></div>
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
                <Input size="md" icon={Search} placeholder="Rechercher un libellé, une clé, une valeur…"
                  value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
              </div>
              <div className={base.filterItem}>
                <Select
                  size="md"
                  searchable
                  options={domainOptions}
                  value={filterDomain || 'all'}
                  onChange={(v) => setFilterDomain(v === 'all' ? null : v)}
                />
              </div>
              {activeFiltersCount > 0 && (
                <button type="button" className={base.clearBtn} onClick={clearFilters}>
                  <X size={11} /> Effacer
                </button>
              )}
            </div>
            <div className={base.actions}>
              <Button variant="outline" size="md" icon={RefreshCw} onClick={load}
                isLoading={isFetching} aria-label="Rafraîchir" />
              {canManage && (
                <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>
                  Nouveau paramètre
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className={base.content}>
        <div className={styles.notice}>
          <AlertTriangle size={14} />
          <span>
            Ces paramètres sont lus par l'application mobile : une modification est visible
            immédiatement par les utilisateurs. N'y stockez jamais de secret (clé API, mot de passe).
          </span>
        </div>

        {filtered.length > 0 ? (
          <Table
            columns={columns}
            data={pageRows}
            rowKey="id_setting"
            loading={isFetching}
            onRowClick={openEdit}
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
            icon={Settings2}
            title="Aucun paramètre trouvé"
            description={
              activeFiltersCount > 0
                ? 'Aucun paramètre ne correspond à vos critères.'
                : 'Aucun paramètre défini pour le moment.'
            }
            action={activeFiltersCount > 0 ? { label: 'Réinitialiser', onClick: clearFilters } : undefined}
          />
        )}
      </div>

      <SettingDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        editing={editing}
        form={form}
        errors={errors}
        setField={setField}
        onSave={save}
        saving={saving}
        domains={domains}
      />

      <Modal
        isOpen={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        title="Supprimer le paramètre"
      >
        <div className={styles.modalBody}>
          <p className={styles.confirmText}>
            Supprimer{' '}
            <strong className={base.mono}>{toDelete?.setting_label || toDelete?.setting_key}</strong> ?{' '}
            Si l'application mobile utilise cette clé (<code>{toDelete?.setting_key}</code>),
            elle peut cesser de fonctionner correctement.
          </p>
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>Annuler</Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={deleting}>Supprimer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AppSettings