import { useState, useMemo } from 'react'
import { Plus, RefreshCw, Pencil, Trash2, BookMarked } from 'lucide-react'
import {
  Button, Input, Card, Modal, Badge,
} from '../../../components/ui'
import {
  DocsHeader, DocsErrorState, DocsEmptyState,
} from '../../../components/docs'
import {
  useGlossary, useGlossaryMutations,
} from '../../../hooks/docs'
import { useDebounce } from '../../../hooks/useDebounce'
import toast from 'react-hot-toast'
import styles from './Glossary.module.css'

const EMPTY_FORM = { term: '', definition: '', exampleMd: '', category: '' }

export const GlossaryPage = () => {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const { terms, isLoading, isFetching, isError, error, refetch } = useGlossary()
  const mutations = useGlossaryMutations()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [toDelete, setToDelete] = useState(null)

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return terms
    const q = debouncedSearch.toLowerCase()
    return terms.filter((t) =>
      `${t.term} ${t.definition} ${t.category || ''}`.toLowerCase().includes(q),
    )
  }, [terms, debouncedSearch])

  const grouped = useMemo(() => {
    const g = {}
    filtered.forEach((t) => {
      const letter = t.term[0].toUpperCase()
      if (!g[letter]) g[letter] = []
      g[letter].push(t)
    })
    return g
  }, [filtered])

  const sortedLetters = Object.keys(grouped).sort()

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setDrawerOpen(true)
  }

  const openEdit = (term) => {
    setEditing(term)
    setForm({
      term: term.term,
      definition: term.definition,
      exampleMd: term.example_md || '',
      category: term.category || '',
    })
    setErrors({})
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    if (mutations.upsert.isPending) return
    setDrawerOpen(false)
    setEditing(null)
  }

  const setField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  const handleSave = async () => {
    const errs = {}
    if (!form.term.trim()) errs.term = 'Le terme est requis'
    if (!form.definition.trim()) errs.definition = 'La définition est requise'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      await mutations.upsert.mutateAsync({
        term: form.term.trim(),
        definition: form.definition.trim(),
        exampleMd: form.exampleMd.trim() || null,
        category: form.category.trim() || null,
      })
      closeDrawer()
    } catch { /* toast */ }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await mutations.remove.mutateAsync(toDelete.id_term)
      setToDelete(null)
    } catch { /* toast */ }
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <DocsHeader eyebrow="Documentation" title="Glossaire" />
        <DocsErrorState error={error} onRetry={refetch} title="Impossible de charger le glossaire" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <DocsHeader
        eyebrow="Références"
        title="Glossaire"
        description="Termes métier et techniques du produit Handyra."
        actions={
          <>
            <Button variant="outline" icon={RefreshCw} onClick={refetch}
              isLoading={isFetching} aria-label="Rafraîchir" />
            <Button variant="primary" icon={Plus} onClick={openCreate}>
              Nouveau terme
            </Button>
          </>
        }
      />

      <div className={styles.searchRow}>
        <Input
          icon={BookMarked}
          placeholder="Rechercher un terme, une définition…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <DocsEmptyState
          icon="Book"
          title={debouncedSearch ? 'Aucun terme trouvé' : 'Glossaire vide'}
          description={
            debouncedSearch
              ? 'Essayez un autre mot-clé.'
              : 'Documentez les termes clés du produit.'
          }
          action={
            debouncedSearch
              ? { label: 'Réinitialiser', icon: 'RotateCcw', onClick: () => setSearchInput('') }
              : { label: 'Nouveau terme', icon: 'Plus', onClick: openCreate }
          }
        />
      ) : (
        <div className={styles.lettersWrap}>
          {sortedLetters.map((letter) => (
            <section key={letter} className={styles.letterSection}>
              <h2 className={styles.letterHeading}>{letter}</h2>
              <dl className={styles.termsList}>
                {grouped[letter].map((t) => (
                  <div key={t.id_term} className={styles.termItem}>
                    <dt className={styles.termHead}>
                      <span className={styles.term}>{t.term}</span>
                      {t.category && <Badge variant="secondary" size="sm">{t.category}</Badge>}
                      <div className={styles.termActions}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => openEdit(t)}
                          aria-label="Modifier"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => setToDelete(t)}
                          aria-label="Supprimer"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </dt>
                    <dd className={styles.definition}>{t.definition}</dd>
                    {t.example_md && (
                      <dd className={styles.example}>
                        <span className={styles.exampleLabel}>Exemple</span>
                        <pre className={styles.exampleCode}>{t.example_md}</pre>
                      </dd>
                    )}
                    {t.related_terms?.length > 0 && (
                      <dd className={styles.related}>
                        <span className={styles.relatedLabel}>Voir aussi :</span>
                        {t.related_terms.map((r) => (
                          <span key={r} className={styles.relatedTerm}>{r}</span>
                        ))}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}

      {/* Modal création/édition */}
      <Modal
        isOpen={drawerOpen}
        onClose={closeDrawer}
        title={editing ? `Modifier « ${editing.term} »` : 'Nouveau terme'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={closeDrawer} disabled={mutations.upsert.isPending}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={mutations.upsert.isPending}
            >
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </>
        }
      >
        <div className={styles.modalForm}>
          <Input
            label="Terme"
            required
            placeholder="Ex : HPO"
            value={form.term}
            onChange={(e) => setField('term', e.target.value)}
            error={errors.term}
            disabled={!!editing || mutations.upsert.isPending}
            hint={editing ? 'Immuable après création' : undefined}
          />
          <Input
            label="Catégorie"
            placeholder="Ex : métier, technique, produit"
            value={form.category}
            onChange={(e) => setField('category', e.target.value)}
            disabled={mutations.upsert.isPending}
          />
          <label className={styles.label}>
            Définition
            <span className={styles.required}>*</span>
          </label>
          <textarea
            className={`${styles.textarea} ${errors.definition ? styles.textareaError : ''}`}
            value={form.definition}
            onChange={(e) => setField('definition', e.target.value)}
            rows={4}
            disabled={mutations.upsert.isPending}
          />
          {errors.definition && <span className={styles.fieldError}>{errors.definition}</span>}
          <label className={styles.label}>
            Exemple
            <span className={styles.optional}>optionnel</span>
          </label>
          <textarea
            className={styles.textarea}
            value={form.exampleMd}
            onChange={(e) => setField('exampleMd', e.target.value)}
            rows={3}
            disabled={mutations.upsert.isPending}
          />
        </div>
      </Modal>

      {/* Confirm delete */}
      <Modal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Supprimer le terme"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={mutations.remove.isPending}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={mutations.remove.isPending}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          Supprimer le terme <strong>« {toDelete?.term} »</strong> ?
          Cette action est définitive.
        </p>
      </Modal>
    </div>
  )
}

export default GlossaryPage