import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Pencil, ArrowRight, AlertCircle,
} from 'lucide-react'
import { Button, Card, Spinner, Select } from '../../../components/ui'
import {
  DocsHeader, DocsErrorState, StatusBadge, Tooltip,
} from '../../../components/docs'
import {
  useAdr, useAdrs, useAdrMutations,
  ADR_STATUS, toSelectOptions,
} from '../../../hooks/docs'
import { formatDateTime } from '../../../utils/docsFormatters'
import toast from 'react-hot-toast'
import { AdrDrawer } from './AdrDrawer'
import styles from './AdrDetail.module.css'

export const AdrDetailPage = () => {
  const { ref } = useParams()
  const navigate = useNavigate()

  // Support both ADR-XXX and just number
  const adrNumber = String(ref).replace(/^ADR-?/i, '')
  const adrId = `adr-${adrNumber}`

  const { adr, isLoading, isError, error } = useAdr(adrId)
  const { adrs: allAdrs } = useAdrs({ limit: 200 })
  const mutations = useAdrMutations()

  const [editOpen, setEditOpen] = useState(false)
  const [supersedeTarget, setSupersedeTarget] = useState('')
  const [supersedeOpen, setSupersedeOpen] = useState(false)

  // useAdr by uuid, so find from list
  const adrFromList = (allAdrs || []).find((a) => String(a.number) === adrNumber)

  const currentAdr = adr || adrFromList

  if (isLoading && !currentAdr) {
    return <div className={styles.loadingWrap}><Spinner size="lg" /></div>
  }

  if (!currentAdr) {
    return (
      <div className={styles.page}>
        <DocsHeader eyebrow="ADR" title="Introuvable"
          actions={
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/docs/adrs')}>
              Retour
            </Button>
          } />
        <DocsErrorState error={error || new Error('ADR introuvable')} />
      </div>
    )
  }

  const supersededBy = currentAdr.superseded_by_adr_id
    ? (allAdrs || []).find((a) => a.id_adr === currentAdr.superseded_by_adr_id)
    : null

  const supersedeOptions = [
    { value: '', label: '— Sélectionner —' },
    ...(allAdrs || [])
      .filter((a) => a.id_adr !== currentAdr.id_adr && a.status !== 'SUPERSEDED')
      .map((a) => ({ value: a.id_adr, label: `ADR-${String(a.number).padStart(3, '0')} · ${a.title}` })),
  ]

  const handleSupersede = async () => {
    if (!supersedeTarget) return
    try {
      await mutations.supersede.mutateAsync({
        oldId: currentAdr.id_adr,
        newId: supersedeTarget,
      })
      setSupersedeOpen(false)
      setSupersedeTarget('')
      window.location.reload()
    } catch { /* toast */ }
  }

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/docs/adrs" className={styles.breadLink}>
          <ArrowLeft size={12} /> ADRs
        </Link>
        <span className={styles.breadSep}>/</span>
        <span className={styles.breadCurrent}>ADR-{String(currentAdr.number).padStart(3, '0')}</span>
      </div>

      <DocsHeader
        eyebrow={<span className={styles.eyebrowRow}>
          <span className={styles.adrNumber}>ADR-{String(currentAdr.number).padStart(3, '0')}</span>
          <StatusBadge map={ADR_STATUS} value={currentAdr.status} />
        </span>}
        title={currentAdr.title}
        actions={
          <>
            {currentAdr.status !== 'SUPERSEDED' && (
              <Button variant="outline" icon={ArrowRight} onClick={() => setSupersedeOpen(true)}>
                Marquer remplacé
              </Button>
            )}
            <Button variant="outline" icon={Pencil} onClick={() => setEditOpen(true)}>
              Modifier
            </Button>
          </>
        }
      />

      {supersededBy && (
        <div className={styles.supersedeBanner}>
          <AlertCircle size={14} />
          <span>
            Cet ADR a été remplacé par{' '}
            <Link to={`/docs/adrs/${supersededBy.number}`} className={styles.bannerLink}>
              ADR-{String(supersededBy.number).padStart(3, '0')} · {supersededBy.title}
            </Link>
          </span>
        </div>
      )}

      <div className={styles.content}>
        <Card padding="md" className={styles.block}>
          <span className={styles.sectionLabel}>Contexte</span>
          <pre className={styles.markdown}>{currentAdr.context_md}</pre>
        </Card>

        <Card padding="md" className={styles.block}>
          <span className={styles.sectionLabel}>Décision</span>
          <pre className={styles.markdown}>{currentAdr.decision_md}</pre>
        </Card>

        {currentAdr.consequences_md && (
          <Card padding="md" className={styles.block}>
            <span className={styles.sectionLabel}>Conséquences</span>
            <pre className={styles.markdown}>{currentAdr.consequences_md}</pre>
          </Card>
        )}

        {currentAdr.alternatives_considered_md && (
          <Card padding="md" className={styles.block}>
            <span className={styles.sectionLabel}>Alternatives considérées</span>
            <pre className={styles.markdown}>{currentAdr.alternatives_considered_md}</pre>
          </Card>
        )}

        <div className={styles.metaFoot}>
          <span>Créé le {formatDateTime(currentAdr.created_at)}</span>
          {currentAdr.decided_at && (
            <span>Décidé le {formatDateTime(currentAdr.decided_at)}</span>
          )}
        </div>
      </div>

      <AdrDrawer
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        adr={currentAdr}
      />

      {supersedeOpen && (
        <div className={styles.modalOverlay} onClick={() => setSupersedeOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Marquer comme remplacé</h3>
            <p className={styles.modalText}>
              Choisissez l'ADR qui remplace celui-ci. L'ADR actuel passera en statut <strong>SUPERSEDED</strong>.
            </p>
            <Select
              label="ADR remplaçant"
              options={supersedeOptions}
              value={supersedeTarget}
              onChange={setSupersedeTarget}
              searchable
            />
            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setSupersedeOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleSupersede}
                disabled={!supersedeTarget}
                isLoading={mutations.supersede.isPending}
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdrDetailPage