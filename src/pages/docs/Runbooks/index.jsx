import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, RefreshCw, Clock, AlertTriangle, Rocket, Database,
  Shield, Activity, Phone, ArrowRightLeft, BookOpen, Pencil,
} from 'lucide-react'
import { Button, Card, Badge } from '../../../components/ui'
import {
  DocsHeader, DocsFilters, DocsErrorState, DocsEmptyState,
  DocsDrawer, StatusBadge, Tooltip,
} from '../../../components/docs'
import {
  useRunbooks, useRunbookMutations,
  RUNBOOK_CATEGORY, toSelectOptions,
} from '../../../hooks/docs'
import { useDebounce } from '../../../hooks/useDebounce'
import { formatDateTime, formatRelative } from '../../../utils/docsFormatters'
import { Input, Select } from '../../../components/ui'
import toast from 'react-hot-toast'
import styles from './Runbooks.module.css'

/* ═══════════════════════════════════════════════════════════════
   Drawer inline (création + édition)
   ═══════════════════════════════════════════════════════════════ */
const RunbookDrawer = ({ isOpen, onClose, runbook }) => {
  const isEdit = !!runbook
  const [form, setForm] = useState({
    title: '',
    category: 'OTHER',
    severityScope: '',
    triggerMd: '',
    stepsMd: '',
    rollbackMd: '',
  })
  const [errors, setErrors] = useState({})
  const mutations = useRunbookMutations()

  useMemo(() => {
    if (!isOpen) return
    if (runbook) {
      setForm({
        title: runbook.title || '',
        category: runbook.category || 'OTHER',
        severityScope: runbook.severity_scope || '',
        triggerMd: runbook.trigger_conditions_md || '',
        stepsMd: runbook.steps_md || '',
        rollbackMd: runbook.rollback_md || '',
      })
    } else {
      setForm({ title: '', category: 'OTHER', severityScope: '', triggerMd: '', stepsMd: '', rollbackMd: '' })
    }
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, runbook])

  const setField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const handleSave = async () => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Le titre est requis'
    if (!form.stepsMd.trim()) errs.stepsMd = 'Les étapes sont requises'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      if (isEdit) {
        await mutations.update.mutateAsync({
          id: runbook.id_runbook,
          payload: {
            title: form.title.trim(),
            category: form.category,
            steps_md: form.stepsMd.trim(),
            trigger_conditions_md: form.triggerMd.trim() || null,
            rollback_md: form.rollbackMd.trim() || null,
          },
        })
      } else {
        await mutations.create.mutateAsync({
          title: form.title.trim(),
          category: form.category,
          stepsMd: form.stepsMd.trim(),
          triggerMd: form.triggerMd.trim() || null,
          rollbackMd: form.rollbackMd.trim() || null,
          severityScope: form.severityScope.trim() || null,
        })
      }
      onClose()
    } catch { /* toast */ }
  }

  const categoryOptions = toSelectOptions(RUNBOOK_CATEGORY)
  const saving = mutations.create.isPending || mutations.update.isPending

  return (
    <DocsDrawer
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={isEdit ? 'Édition' : 'Création'}
      title={isEdit ? 'Modifier le runbook' : 'Nouveau runbook'}
      saveLabel={isEdit ? 'Enregistrer' : 'Créer'}
      saving={saving}
      onSave={handleSave}
      width="lg"
    >
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Identité</span>

        <Input
          label="Titre"
          required
          placeholder="Ex : Redémarrer le worker FedaPay"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          error={errors.title}
          disabled={saving}
        />

        <div className={styles.row2}>
          <Select
            label="Catégorie"
            options={categoryOptions}
            value={form.category}
            onChange={(v) => setField('category', v)}
            disabled={saving}
          />
          <Input
            label="Scope de sévérité"
            placeholder="Ex : CRITICAL uniquement"
            value={form.severityScope}
            onChange={(e) => setField('severityScope', e.target.value)}
            disabled={saving}
            hint="Optionnel"
          />
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Contenu (Markdown)</span>

        <label className={styles.label}>
          Conditions de déclenchement
          <span className={styles.optional}>optionnel</span>
        </label>
        <textarea
          className={styles.textarea}
          value={form.triggerMd}
          onChange={(e) => setField('triggerMd', e.target.value)}
          placeholder="Quand utiliser ce runbook ?"
          rows={3}
          disabled={saving}
        />

        <label className={styles.label}>
          Étapes
          <span className={styles.required}>*</span>
        </label>
        <textarea
          className={`${styles.textarea} ${errors.stepsMd ? styles.textareaError : ''}`}
          value={form.stepsMd}
          onChange={(e) => setField('stepsMd', e.target.value)}
          placeholder={'1. Vérifier que…\n2. Exécuter…\n3. Confirmer que…'}
          rows={10}
          disabled={saving}
        />
        {errors.stepsMd && <span className={styles.fieldError}>{errors.stepsMd}</span>}

        <label className={styles.label}>
          Rollback
          <span className={styles.optional}>optionnel</span>
        </label>
        <textarea
          className={styles.textarea}
          value={form.rollbackMd}
          onChange={(e) => setField('rollbackMd', e.target.value)}
          placeholder="Comment annuler si ça tourne mal"
          rows={4}
          disabled={saving}
        />
      </section>
    </DocsDrawer>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════ */
export const RunbooksPage = () => {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || null

  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)

  const { runbooks, isLoading, isFetching, isError, error, refetch } = useRunbooks({ category })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return runbooks
    const q = debouncedSearch.toLowerCase()
    return runbooks.filter((r) =>
      `${r.title} ${r.steps_md || ''} ${r.trigger_conditions_md || ''}`.toLowerCase().includes(q),
    )
  }, [runbooks, debouncedSearch])

  const updateFilter = (key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (!value) next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })
  }

  const clearFilters = () => {
    setSearchInput('')
    setParams({}, { replace: true })
  }

  const activeCount = [category, debouncedSearch].filter(Boolean).length
  const categoryOptions = toSelectOptions(RUNBOOK_CATEGORY, { withAll: true, allLabel: 'Toutes catégories' })

  const openCreate = () => { setEditing(null); setDrawerOpen(true) }
  const openEdit = (r) => { setEditing(r); setDrawerOpen(true) }
  const closeDrawer = () => { setDrawerOpen(false); setEditing(null) }

  if (isError) {
    return (
      <div className={styles.page}>
        <DocsHeader eyebrow="Documentation" title="Runbooks" />
        <DocsErrorState error={error} onRetry={refetch} title="Impossible de charger les runbooks" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <DocsHeader
        eyebrow="Opérations"
        title="Runbooks"
        description="Procédures opérationnelles standardisées : incidents, déploiements, migrations."
        actions={
          <>
            <Button variant="outline" icon={RefreshCw} onClick={refetch}
              isLoading={isFetching} aria-label="Rafraîchir" />
            <Button variant="primary" icon={Plus} onClick={openCreate}>
              Nouveau runbook
            </Button>
          </>
        }
      />

      <DocsFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Rechercher un runbook…"
        activeCount={activeCount}
        onClear={clearFilters}
        filters={[
          { key: 'category', label: 'Catégorie', value: category, options: categoryOptions, onChange: (v) => updateFilter('category', v), searchable: true },
        ]}
      />

      {isLoading ? (
        <div className={styles.loadingRow}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="md" className={styles.skeletonCard}>
              <span className={styles.skeletonBar} style={{ width: '50%' }} />
              <span className={styles.skeletonBar} style={{ width: '30%' }} />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <DocsEmptyState
          icon="BookOpen"
          title={activeCount > 0 ? 'Aucun runbook ne correspond' : 'Aucun runbook'}
          description={
            activeCount > 0
              ? 'Modifiez vos filtres.'
              : 'Documentez vos procédures d\'incident et de déploiement.'
          }
          action={
            activeCount > 0
              ? { label: 'Réinitialiser', icon: 'RotateCcw', onClick: clearFilters }
              : { label: 'Nouveau runbook', icon: 'Plus', onClick: openCreate }
          }
        />
      ) : (
        <div className={styles.grid}>
          {filtered.map((rb) => (
            <Card
              key={rb.id_runbook}
              padding="md"
              className={styles.runbookCard}
              onClick={() => openEdit(rb)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openEdit(rb)
                }
              }}
            >
              <div className={styles.runbookHead}>
                <StatusBadge map={RUNBOOK_CATEGORY} value={rb.category} size="sm" showIcon={false} />
                {rb.severity_scope && (
                  <Badge variant="warning" size="sm">{rb.severity_scope}</Badge>
                )}
              </div>
              <h3 className={styles.runbookTitle}>{rb.title}</h3>
              {rb.trigger_conditions_md && (
                <p className={styles.runbookSnippet}>
                  {rb.trigger_conditions_md.slice(0, 140)}
                  {rb.trigger_conditions_md.length > 140 ? '…' : ''}
                </p>
              )}
              <div className={styles.runbookFoot}>
                <Tooltip content={formatDateTime(rb.last_reviewed_at || rb.updated_at)}>
                  <span className={styles.runbookDate}>
                    <Clock size={11} />
                    {formatRelative(rb.last_reviewed_at || rb.updated_at)}
                  </span>
                </Tooltip>
                <button
                  type="button"
                  className={styles.editBtn}
                  onClick={(e) => { e.stopPropagation(); openEdit(rb) }}
                >
                  <Pencil size={11} />
                  Modifier
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <RunbookDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        runbook={editing}
      />
    </div>
  )
}

export default RunbooksPage