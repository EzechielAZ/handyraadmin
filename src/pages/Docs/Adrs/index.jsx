import { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Plus, RefreshCw, ExternalLink, Clock, ArrowRight, FileSignature,
} from 'lucide-react'
import { Button, Card, Badge } from '../../../components/ui'
import {
  DocsHeader, DocsFilters, StatusBadge, DocsErrorState,
  DocsEmptyState, Tooltip,
} from '../../../components/docs'
import {
  useAdrs, ADR_STATUS, toSelectOptions,
} from '../../../hooks/docs'
import { useDebounce } from '../../../hooks/useDebounce'
import { formatDateShort, formatRelative } from '../../../utils/docsFormatters'
import { AdrDrawer } from './AdrDrawer'
import styles from './Adrs.module.css'

export const AdrsPage = () => {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const status = params.get('status') || null
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)

  const { adrs, isLoading, isFetching, isError, error, refetch } = useAdrs({ status, limit: 200 })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return adrs
    const q = debouncedSearch.toLowerCase()
    return adrs.filter((a) =>
      `${a.number} ${a.title} ${a.context_md || ''} ${a.decision_md || ''}`.toLowerCase().includes(q),
    )
  }, [adrs, debouncedSearch])

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

  const activeCount = [status, debouncedSearch].filter(Boolean).length
  const statusOptions = toSelectOptions(ADR_STATUS, { withAll: true, allLabel: 'Tous statuts' })

  const openCreate = () => { setEditing(null); setDrawerOpen(true) }
  const openEdit = (adr) => { setEditing(adr); setDrawerOpen(true) }
  const closeDrawer = () => { setDrawerOpen(false); setEditing(null) }

  if (isError) {
    return (
      <div className={styles.page}>
        <DocsHeader eyebrow="Documentation" title="ADRs" />
        <DocsErrorState error={error} onRetry={refetch} title="Impossible de charger les ADRs" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <DocsHeader
        eyebrow="Décisions d'architecture"
        title="Architecture Decision Records"
        description="Historique des décisions structurantes : contexte, décision, conséquences."
        actions={
          <>
            <Button variant="outline" icon={RefreshCw} onClick={refetch}
              isLoading={isFetching} aria-label="Rafraîchir" />
            <Button variant="primary" icon={Plus} onClick={openCreate}>
              Nouvel ADR
            </Button>
          </>
        }
      />

      <DocsFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Rechercher un ADR…"
        activeCount={activeCount}
        onClear={clearFilters}
        filters={[
          { key: 'status', label: 'Statut', value: status, options: statusOptions, onChange: (v) => updateFilter('status', v) },
        ]}
      />

      {isLoading ? (
        <div className={styles.loadingRow}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="md" className={styles.skeletonCard}>
              <span className={styles.skeletonBar} style={{ width: '40%' }} />
              <span className={styles.skeletonBar} style={{ width: '70%' }} />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <DocsEmptyState
          icon="FileSignature"
          title={activeCount > 0 ? 'Aucun ADR ne correspond' : 'Aucun ADR enregistré'}
          description={
            activeCount > 0
              ? 'Essayez de modifier vos filtres.'
              : 'Documentez la première décision structurante du produit.'
          }
          action={
            activeCount > 0
              ? { label: 'Réinitialiser', icon: 'RotateCcw', onClick: clearFilters }
              : { label: 'Nouvel ADR', icon: 'Plus', onClick: openCreate }
          }
        />
      ) : (
        <div className={styles.grid}>
          {filtered.map((adr) => (
            <Card
              key={adr.id_adr}
              padding="md"
              className={styles.adrCard}
              onClick={() => navigate(`/docs/adrs/${adr.number}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/docs/adrs/${adr.number}`)
                }
              }}
            >
              <div className={styles.adrHead}>
                <span className={styles.adrNumber}>ADR-{String(adr.number).padStart(3, '0')}</span>
                <StatusBadge map={ADR_STATUS} value={adr.status} size="sm" />
              </div>
              <h3 className={styles.adrTitle}>{adr.title}</h3>
              {adr.context_md && (
                <p className={styles.adrSnippet}>{adr.context_md.slice(0, 140)}{adr.context_md.length > 140 ? '…' : ''}</p>
              )}
              <div className={styles.adrFoot}>
                <Tooltip content={formatDateShort(adr.created_at)}>
                  <span className={styles.adrDate}>
                    <Clock size={11} />
                    {formatRelative(adr.created_at)}
                  </span>
                </Tooltip>
                <div className={styles.adrActions}>
                  <button
                    type="button"
                    className={styles.adrActionBtn}
                    onClick={(e) => { e.stopPropagation(); openEdit(adr) }}
                    title="Modifier"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className={styles.adrActionBtn}
                    onClick={(e) => { e.stopPropagation(); navigate(`/docs/adrs/${adr.number}`) }}
                    title="Ouvrir"
                  >
                    Ouvrir
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AdrDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        adr={editing}
      />
    </div>
  )
}

export default AdrsPage