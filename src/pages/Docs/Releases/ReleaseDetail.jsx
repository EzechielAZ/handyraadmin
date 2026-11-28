import { useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Target, Boxes, ListChecks, PenTool, Rocket,
  AlertCircle, Check, RotateCcw, Pencil, Trash2, Link2, Bug, X,
} from 'lucide-react'
import {
  Button, Card, Tabs, Spinner,
} from '../../../components/ui'
import {
  DocsHeader, DocsErrorState, StatusBadge, Tooltip, ConfirmDialog,
} from '../../../components/docs'
import { Markdown } from '../../../components/docs/Markdown/Markdown'
import {
  useRelease, useReleaseMutations, useReleaseReadiness, useIssues,
  RELEASE_STATUS, RELEASE_TYPE, RELEASE_INCLUSION_TYPE,
  RELEASE_FEATURE_STATUS, SIGNOFF_ROLE, SIGNOFF_STATUS,
  CHECKLIST_CATEGORY, ISSUE_STATUS,
} from '../../../hooks/docs'
import { useDebounce } from '../../../hooks/useDebounce'
import {
  formatDateShort, formatDateTime, formatTargetDate, formatRelative, formatPercent,
} from '../../../utils/docsFormatters'
import styles from './ReleaseDetail.module.css'
import { ReleaseReadinessDialog } from './ReleaseReadinessDialog'

const TABS = [
  { id: 'overview',  label: 'Vue d\'ensemble', icon: Target },
  { id: 'objectives',label: 'Objectifs',       icon: Target },
  { id: 'features',  label: 'Features',        icon: Boxes },
  { id: 'checklist', label: 'Checklist',       icon: ListChecks },
  { id: 'signoffs',  label: 'Sign-offs',       icon: PenTool },
]

/* État calculé d'un objectif (valeurs produites par le SQL : docs.release_objectives_computed) */
const OBJECTIVE_STATE = {
  ACHIEVED:     { label: 'Atteint',  color: 'green',  icon: 'Check' },
  IN_PROGRESS:  { label: 'En cours', color: 'orange', icon: 'Play' },
  NEEDS_REVIEW: { label: 'À revoir', color: 'red',    icon: 'AlertCircle' },
  PENDING:      { label: 'À faire',  color: 'gray',   icon: 'Circle' },
}

export const ReleaseDetailPage = () => {
  const { ref } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'overview'

  const { release, objectives, features, checklist, signoffs, progress,
          isLoading, isError, error, refetch } = useRelease(ref)

  const [readinessOpen, setReadinessOpen] = useState(false)
  const [rollbackOpen, setRollbackOpen] = useState(false)

  const mutations = useReleaseMutations()
  const { readiness } = useReleaseReadiness(release?.id_release, { enabled: !!release })

  const setTab = (id) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', id)
      return next
    }, { replace: true })
  }

  const counts = useMemo(() => ({
    objectives: objectives.length,
    objectivesDone: objectives.filter((o) => o.is_achieved).length,
    features: features.length,
    checklist: checklist.length,
    signoffs: signoffs.length,
  }), [objectives, features, checklist, signoffs])

  const tabs = TABS.map((t) => ({
    ...t,
    badge: counts[t.id],
  }))

  if (isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (isError || !release) {
    return (
      <div className={styles.page}>
        <DocsHeader
          eyebrow="Release"
          title="Introuvable"
          actions={
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/docs/releases')}>
              Retour
            </Button>
          }
        />
        <DocsErrorState error={error} title="Cette release est introuvable" onRetry={refetch} />
      </div>
    )
  }

  const isLocked = release.status === 'RELEASED' || release.status === 'ROLLED_BACK' || release.status === 'CANCELLED'
  const canValidate = release.status !== 'READY' && !isLocked && readiness?.ok
  const canPublish = release.status === 'READY'

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/docs/releases" className={styles.breadLink}>
          <ArrowLeft size={12} /> Releases
        </Link>
        <span className={styles.breadSep}>/</span>
        <span className={styles.breadCurrent}>v{release.version}</span>
      </div>

      <DocsHeader
        eyebrow={release.release_type}
        title={
          <span className={styles.titleRow}>
            <span>v{release.version}</span>
            {release.codename && (
              <span className={styles.codename}>· {release.codename}</span>
            )}
            <StatusBadge map={RELEASE_STATUS} value={release.status} size="md" />
          </span>
        }
        description={release.summary}
        actions={
          <>
            {!isLocked && (
              <Button
                variant="outline"
                icon={Rocket}
                onClick={() => setReadinessOpen(true)}
              >
                {canPublish ? 'Publier' : canValidate ? 'Valider' : 'Vérifier'}
              </Button>
            )}
            {release.status === 'RELEASED' && (
              <Button
                variant="outline"
                icon={RotateCcw}
                onClick={() => setRollbackOpen(true)}
              >
                Rollback
              </Button>
            )}
          </>
        }
      />

      {/* Bandeau de progression global */}
      {progress && (
        <div className={styles.progressBanner}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>Progression globale</span>
            <span className={styles.progressValue}>
              {formatPercent(progress.globalPct)}
            </span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress.globalPct}%` }}
            />
          </div>
          <div className={styles.progressStats}>
            {progress.objectives?.total > 0 && (
              <span>
                Objectifs : <strong>{progress.objectives.done}</strong> / {progress.objectives.total}
              </span>
            )}
            <span>
              Features : <strong>{progress.features.done}</strong> / {progress.features.total}
            </span>
            {Object.entries(progress.checklist || {}).map(([cat, c]) => (
              <span key={cat}>
                {CHECKLIST_CATEGORY[cat]?.label || cat} :{' '}
                <strong>{c.done}</strong> / {c.total}
              </span>
            ))}
          </div>
        </div>
      )}

      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} className={styles.tabs} />

      <div className={styles.tabContent}>
        {tab === 'overview' && (
          <ReleaseOverview release={release} progress={progress} counts={counts} />
        )}
        {tab === 'objectives' && (
          <ReleaseObjectives
            release={release}
            objectives={objectives}
            features={features}
            mutations={mutations}
            locked={isLocked}
          />
        )}
        {tab === 'features' && (
          <ReleaseFeatures
            release={release}
            features={features}
            mutations={mutations}
            locked={isLocked}
          />
        )}
        {tab === 'checklist' && (
          <ReleaseChecklist
            release={release}
            checklist={checklist}
            mutations={mutations}
            locked={isLocked}
          />
        )}
        {tab === 'signoffs' && (
          <ReleaseSignoffs
            release={release}
            signoffs={signoffs}
            mutations={mutations}
            locked={isLocked}
          />
        )}
      </div>

      <ReleaseReadinessDialog
        isOpen={readinessOpen}
        onClose={() => setReadinessOpen(false)}
        releaseId={release.id_release}
        releaseVersion={release.version}
        currentStatus={release.status}
        onSuccess={() => {
          setReadinessOpen(false)
          refetch()
        }}
      />

      <ConfirmDialog
        isOpen={rollbackOpen}
        onClose={() => setRollbackOpen(false)}
        onConfirm={async () => {
          try {
            await mutations.rollback.mutateAsync({
              releaseId: release.id_release,
              reason: 'Rollback manuel depuis la fiche release',
            })
            setRollbackOpen(false)
            refetch()
          } catch { /* toast géré */ }
        }}
        title={`Rollback de v${release.version}`}
        description="Cette action marque la release comme annulée. Les features promues ne seront pas rétrogradées automatiquement."
        confirmLabel="Confirmer le rollback"
        loading={mutations.rollback.isPending}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 1 — Vue d'ensemble
   ═══════════════════════════════════════════════════════════════ */
const ReleaseOverview = ({ release, progress, counts }) => (
  <div className={styles.overviewGrid}>
    <Card padding="md">
      <span className={styles.sectionLabel}>Informations</span>
      <dl className={styles.dl}>
        <dt>Type</dt>
        <dd><StatusBadge map={RELEASE_TYPE} value={release.release_type} /></dd>
        <dt>Statut</dt>
        <dd><StatusBadge map={RELEASE_STATUS} value={release.status} /></dd>
        <dt>Date cible</dt>
        <dd>
          {release.target_date ? (
            <Tooltip content={formatDateShort(release.target_date)}>
              <span>{formatTargetDate(release.target_date)}</span>
            </Tooltip>
          ) : '—'}
        </dd>
        <dt>Publiée le</dt>
        <dd>{release.actual_release_date ? formatDateTime(release.actual_release_date) : '—'}</dd>
        <dt>Code freeze</dt>
        <dd>{release.code_freeze_at ? formatDateTime(release.code_freeze_at) : '—'}</dd>
        <dt>QA start</dt>
        <dd>{release.qa_start_at ? formatDateTime(release.qa_start_at) : '—'}</dd>
      </dl>
    </Card>

    <Card padding="md">
      <span className={styles.sectionLabel}>Avancement</span>
      <ul className={styles.countList}>
        <li>
          <Target size={13} />
          <span>Objectifs atteints</span>
          <strong>{counts.objectivesDone} / {counts.objectives}</strong>
        </li>
        <li>
          <Boxes size={13} />
          <span>Features</span>
          <strong>{counts.features}</strong>
        </li>
        <li>
          <ListChecks size={13} />
          <span>Items checklist</span>
          <strong>{counts.checklist}</strong>
        </li>
        <li>
          <PenTool size={13} />
          <span>Sign-offs</span>
          <strong>{counts.signoffs}</strong>
        </li>
      </ul>
    </Card>

    {release.objectives_md && (
      <Card padding="md" className={styles.mdCard}>
        <span className={styles.sectionLabel}>Objectifs (narratif)</span>
        <pre className={styles.markdown}>{release.objectives_md}</pre>
      </Card>
    )}

    {release.release_notes_md && (
      <Card padding="md" className={styles.mdCard}>
        <span className={styles.sectionLabel}>Release notes</span>
        <pre className={styles.markdown}>{release.release_notes_md}</pre>
      </Card>
    )}
  </div>
)

/* ═══════════════════════════════════════════════════════════════
   TAB 2 — Objectifs
   Un objectif SANS lien est manuel (marquer atteint / rouvrir).
   Un objectif AVEC liens (issues, features de la release) a un état
   calculé côté serveur : il ne peut plus être coché à la main.
   ═══════════════════════════════════════════════════════════════ */
const ReleaseObjectives = ({ release, objectives, features, mutations, locked }) => {
  const [title, setTitle] = useState('')
  const [toDelete, setToDelete] = useState(null)

  const handleAdd = async () => {
    if (!title.trim()) return
    try {
      await mutations.addObjective.mutateAsync({
        releaseId: release.id_release,
        title: title.trim(),
      })
      setTitle('')
    } catch { /* toast */ }
  }

  const handleConfirmDelete = async () => {
    if (!toDelete) return
    try {
      await mutations.deleteObjective.mutateAsync({
        releaseId: release.id_release,
        objectiveId: toDelete.id_objective,
      })
      setToDelete(null)
    } catch { /* toast */ }
  }

  return (
    <Card padding="md">
      {!locked && (
        <div className={styles.addRow}>
          <input
            type="text"
            className={styles.addInput}
            placeholder="Nouvel objectif (ex : Refondre le chat)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button
            variant="primary"
            icon={Check}
            onClick={handleAdd}
            isLoading={mutations.addObjective.isPending}
            disabled={!title.trim()}
          >
            Ajouter
          </Button>
        </div>
      )}

      {objectives.length === 0 ? (
        <div className={styles.emptyTab}>
          {locked
            ? 'Aucun objectif défini pour cette release.'
            : 'Aucun objectif défini. Ajoutez un premier objectif ci-dessus, puis liez-y des issues ou des features.'}
        </div>
      ) : (
        <ul className={styles.objectiveList}>
          {objectives.map((o) => (
            <ObjectiveItem
              key={o.id_objective}
              objective={o}
              release={release}
              features={features}
              mutations={mutations}
              locked={locked}
              onDelete={() => setToDelete(o)}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer l'objectif"
        description={
          toDelete
            ? `« ${toDelete.title} » sera supprimé${toDelete.links_total > 0 ? ' ainsi que ses liens (les issues et features liées ne sont pas touchées)' : ''}.`
            : ''
        }
        confirmLabel="Supprimer"
        variant="danger"
        loading={mutations.deleteObjective.isPending}
      />
    </Card>
  )
}

const ObjectiveItem = ({ objective: o, release, features, mutations, locked, onDelete }) => {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(o.title)
  const [draftDesc, setDraftDesc] = useState(o.description_md || '')
  const [pickerOpen, setPickerOpen] = useState(false)

  const releaseId = release.id_release
  const isLinked = o.mode === 'LINKED'
  const done = !!o.is_achieved
  const needsReview = o.state === 'NEEDS_REVIEW'

  const startEdit = () => {
    setDraftTitle(o.title)
    setDraftDesc(o.description_md || '')
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!draftTitle.trim()) return
    try {
      await mutations.updateObjective.mutateAsync({
        releaseId,
        objectiveId: o.id_objective,
        payload: { title: draftTitle.trim(), description_md: draftDesc },
      })
      setEditing(false)
    } catch { /* toast */ }
  }

  const classNames = [
    styles.objectiveItem,
    done ? styles.objectiveDone : '',
    needsReview ? styles.objectiveReview : '',
  ].join(' ')

  return (
    <li className={classNames}>
      <span className={`${styles.objectiveCheck} ${needsReview ? styles.objectiveCheckReview : ''}`}>
        {done ? <Check size={12} /> : needsReview ? <AlertCircle size={12} /> : <span />}
      </span>

      <div className={styles.objectiveBody}>
        {editing ? (
          <div className={styles.editForm}>
            <input
              type="text"
              className={styles.addInput}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              placeholder="Titre de l'objectif"
              autoFocus
            />
            <textarea
              className={styles.editTextarea}
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              placeholder="Description (Markdown, optionnelle)"
              rows={3}
            />
            <div className={styles.editActions}>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Check}
                onClick={saveEdit}
                isLoading={mutations.updateObjective.isPending}
                disabled={!draftTitle.trim()}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.objectiveHead}>
              <span className={styles.objectiveTitle}>{o.title}</span>
              <StatusBadge map={OBJECTIVE_STATE} value={o.state} size="sm" />
              {isLinked && (
                <span className={styles.objectiveProgress}>
                  {o.links_done} / {o.links_total}
                </span>
              )}
            </div>

            {o.description_md && (
              <div className={styles.objectiveDesc}>
                <Markdown compact>{o.description_md}</Markdown>
              </div>
            )}

            {done && o.achieved_at && (
              <span className={styles.objectiveMeta}>
                Atteint {formatRelative(o.achieved_at)}
              </span>
            )}

            {isLinked && (
              <ul className={styles.objectiveLinks}>
                {o.links.map((l) => {
                  const isIssue = l.link_type === 'ISSUE'
                  return (
                    <li
                      key={l.id_link}
                      className={`${styles.linkItem} ${l.needs_review ? styles.linkItemReview : ''}`}
                      title={l.needs_review ? 'Cet élément est abandonné ou reporté : à revoir' : undefined}
                    >
                      {isIssue ? <Bug size={12} /> : <Boxes size={12} />}
                      {isIssue ? (
                        <Link to={`/docs/issues/${l.code}`} className={styles.linkCode}>
                          {l.code}
                        </Link>
                      ) : (
                        <span className={styles.linkKind}>Feature</span>
                      )}
                      <span className={styles.linkTitle}>{l.title}</span>
                      <StatusBadge
                        map={isIssue ? ISSUE_STATUS : RELEASE_FEATURE_STATUS}
                        value={l.status}
                        size="sm"
                        showIcon={false}
                      />
                      {!locked && (
                        <button
                          type="button"
                          className={styles.linkRemove}
                          onClick={() =>
                            mutations.removeObjectiveLink.mutate({
                              releaseId, linkId: l.id_link,
                            })
                          }
                          disabled={mutations.removeObjectiveLink.isPending}
                          aria-label="Retirer ce lien"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {pickerOpen && !locked && (
              <ObjectiveLinkPicker
                objective={o}
                release={release}
                features={features}
                mutations={mutations}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </>
        )}
      </div>

      {!editing && !locked && (
        <div className={styles.objectiveActions}>
          {!isLinked && !done && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                mutations.achieveObjective.mutate({
                  releaseId, objectiveId: o.id_objective,
                })
              }
              isLoading={mutations.achieveObjective.isPending}
            >
              Marquer atteint
            </Button>
          )}
          {!isLinked && done && (
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={() =>
                mutations.unachieveObjective.mutate({
                  releaseId, objectiveId: o.id_objective,
                })
              }
              isLoading={mutations.unachieveObjective.isPending}
            >
              Rouvrir
            </Button>
          )}
          <Tooltip content="Lier une issue ou une feature">
            <button
              type="button"
              className={`${styles.iconBtn} ${pickerOpen ? styles.iconBtnActive : ''}`}
              onClick={() => setPickerOpen((v) => !v)}
              aria-label="Lier une issue ou une feature"
            >
              <Link2 size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Modifier">
            <button
              type="button"
              className={styles.iconBtn}
              onClick={startEdit}
              aria-label="Modifier l'objectif"
            >
              <Pencil size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Supprimer">
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
              onClick={onDelete}
              aria-label="Supprimer l'objectif"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      )}
    </li>
  )
}

/* Sélecteur : issues (recherche serveur) ou features déjà présentes dans la release */
const ObjectiveLinkPicker = ({ objective, release, features, mutations, onClose }) => {
  const [kind, setKind] = useState('ISSUE')
  const [q, setQ] = useState('')
  const debouncedQ = useDebounce(q, 300)

  const { issues, isFetching } = useIssues({
    search: debouncedQ, pageSize: 8, sortBy: 'updated_at', sortDir: 'desc',
  })

  const linkedIssueIds = new Set(
    objective.links.filter((l) => l.link_type === 'ISSUE').map((l) => l.issue_id),
  )
  const linkedFeatureIds = new Set(
    objective.links.filter((l) => l.link_type === 'FEATURE').map((l) => l.release_feature_id),
  )

  const availableIssues = issues.filter((i) => !linkedIssueIds.has(i.id_issue))
  const needle = q.trim().toLowerCase()
  const availableFeatures = features
    .filter((f) => !linkedFeatureIds.has(f.id_item))
    .filter((f) => !needle || f.title.toLowerCase().includes(needle))

  const link = (linkType, targetId) =>
    mutations.addObjectiveLink.mutate({
      releaseId: release.id_release,
      objectiveId: objective.id_objective,
      linkType,
      targetId,
    })

  const pending = mutations.addObjectiveLink.isPending

  return (
    <div className={styles.picker}>
      <div className={styles.pickerHead}>
        <div className={styles.pickerTabs}>
          <button
            type="button"
            className={`${styles.pickerTab} ${kind === 'ISSUE' ? styles.pickerTabActive : ''}`}
            onClick={() => setKind('ISSUE')}
          >
            <Bug size={12} /> Issue
          </button>
          <button
            type="button"
            className={`${styles.pickerTab} ${kind === 'FEATURE' ? styles.pickerTabActive : ''}`}
            onClick={() => setKind('FEATURE')}
          >
            <Boxes size={12} /> Feature de la release
          </button>
        </div>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onClose}
          aria-label="Fermer le sélecteur"
        >
          <X size={14} />
        </button>
      </div>

      <input
        type="text"
        className={styles.addInput}
        placeholder={kind === 'ISSUE' ? 'Rechercher une issue (code, titre)…' : 'Filtrer les features de la release…'}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {kind === 'ISSUE' ? (
        availableIssues.length === 0 ? (
          <div className={styles.pickerEmpty}>
            {isFetching ? 'Recherche…' : 'Aucune issue à lier.'}
          </div>
        ) : (
          <ul className={styles.pickerList}>
            {availableIssues.map((i) => (
              <li key={i.id_issue}>
                <button
                  type="button"
                  className={styles.pickerItem}
                  onClick={() => link('ISSUE', i.id_issue)}
                  disabled={pending}
                >
                  <span className={styles.linkCode}>{i.code}</span>
                  <span className={styles.linkTitle}>{i.title}</span>
                  <StatusBadge map={ISSUE_STATUS} value={i.status} size="sm" showIcon={false} />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : availableFeatures.length === 0 ? (
        <div className={styles.pickerEmpty}>
          {features.length === 0
            ? 'Cette release ne contient encore aucune feature (onglet Features).'
            : 'Aucune feature à lier.'}
        </div>
      ) : (
        <ul className={styles.pickerList}>
          {availableFeatures.map((f) => (
            <li key={f.id_item}>
              <button
                type="button"
                className={styles.pickerItem}
                onClick={() => link('FEATURE', f.id_item)}
                disabled={pending}
              >
                <span className={styles.linkTitle}>{f.title}</span>
                <StatusBadge map={RELEASE_FEATURE_STATUS} value={f.status} size="sm" showIcon={false} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 3 — Features
   ═══════════════════════════════════════════════════════════════ */
const ReleaseFeatures = ({ release, features, mutations, locked }) => {
  const handleCheck = (item) => {
    if (locked) return
    mutations.checkFeature.mutate({
      releaseId: release.id_release,
      itemId: item.id_item,
    })
  }

  const handleUncheck = (item) => {
    if (locked) return
    mutations.uncheckFeature.mutate({
      releaseId: release.id_release,
      itemId: item.id_item,
    })
  }

  if (features.length === 0) {
    return (
      <Card padding="md">
        <div className={styles.emptyTab}>
          Aucune feature dans cette release.
        </div>
      </Card>
    )
  }

  return (
    <Card padding="none">
      <ul className={styles.featureList}>
        {features.map((f) => (
          <li key={f.id_item} className={styles.featureItem}>
            <button
              type="button"
              className={`${styles.checkbox} ${f.is_checked ? styles.checkboxChecked : ''}`}
              onClick={() => (f.is_checked ? handleUncheck(f) : handleCheck(f))}
              disabled={locked}
              aria-label={f.is_checked ? 'Décocher' : 'Cocher'}
            >
              {f.is_checked && <Check size={11} strokeWidth={3} />}
            </button>

            <div className={styles.featureBody}>
              <div className={styles.featureHead}>
                <span className={styles.featureTitle}>{f.title}</span>
                <StatusBadge map={RELEASE_INCLUSION_TYPE} value={f.inclusion_type} size="sm" />
                <StatusBadge map={RELEASE_FEATURE_STATUS} value={f.status} size="sm" showIcon={false} />
              </div>
              {f.description_md && (
                <span className={styles.featureDesc}>{f.description_md}</span>
              )}
              {f.is_checked && f.checked_at && (
                <span className={styles.featureMeta}>
                  Coché {formatRelative(f.checked_at)}
                  {f.checked_note && ` · ${f.checked_note}`}
                  {f.evidence_url && (
                    <>
                      {' · '}
                      <a href={f.evidence_url} target="_blank" rel="noopener noreferrer">
                        Preuve
                      </a>
                    </>
                  )}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 4 — Checklist
   ═══════════════════════════════════════════════════════════════ */
const ReleaseChecklist = ({ release, checklist, mutations, locked }) => {
  const grouped = useMemo(() => {
    const g = {}
    checklist.forEach((c) => {
      if (!g[c.category]) g[c.category] = []
      g[c.category].push(c)
    })
    return g
  }, [checklist])

  const handleCheck = (item) => {
    if (locked || item.is_checked) return
    mutations.checkItem.mutate({
      releaseId: release.id_release,
      itemId: item.id_item,
    })
  }

  if (checklist.length === 0) {
    return (
      <Card padding="md">
        <div className={styles.emptyTab}>
          Aucun item de checklist. Appliquez un template pour démarrer.
        </div>
      </Card>
    )
  }

  return (
    <div className={styles.checklistWrap}>
      {Object.entries(grouped).map(([category, items]) => {
        const done = items.filter((i) => i.is_checked).length
        const total = items.length
        const pct = total === 0 ? 0 : Math.round((done / total) * 100)
        const catCfg = CHECKLIST_CATEGORY[category] || { label: category }

        return (
          <Card key={category} padding="md" className={styles.checklistGroup}>
            <div className={styles.checklistGroupHead}>
              <div>
                <span className={styles.checklistCategoryLabel}>{catCfg.label}</span>
                <span className={styles.checklistGroupCount}>
                  {done} / {total}
                </span>
              </div>
              <span className={styles.checklistPct}>{pct}%</span>
            </div>
            <div className={styles.checklistBar}>
              <div className={styles.checklistFill} style={{ width: `${pct}%` }} />
            </div>

            <ul className={styles.checklistItems}>
              {items.map((item) => (
                <li
                  key={item.id_item}
                  className={`${styles.checklistItem} ${item.is_checked ? styles.checklistItemDone : ''}`}
                >
                  <button
                    type="button"
                    className={`${styles.checkbox} ${item.is_checked ? styles.checkboxChecked : ''}`}
                    onClick={() => handleCheck(item)}
                    disabled={locked || item.is_checked}
                    aria-label={item.is_checked ? 'Fait' : 'Marquer comme fait'}
                  >
                    {item.is_checked && <Check size={11} strokeWidth={3} />}
                  </button>
                  <div className={styles.checklistBody}>
                    <span className={styles.checklistLabel}>
                      {item.label}
                      {item.is_mandatory && (
                        <span className={styles.mandatoryDot} title="Obligatoire">*</span>
                      )}
                    </span>
                    {item.description && (
                      <span className={styles.checklistDesc}>{item.description}</span>
                    )}
                    {item.is_checked && item.checked_at && (
                      <span className={styles.checklistMeta}>
                        Coché {formatRelative(item.checked_at)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 5 — Sign-offs
   ═══════════════════════════════════════════════════════════════ */
const ReleaseSignoffs = ({ release, signoffs, mutations, locked }) => {
  const [role, setRole] = useState('QA')

  const handleAdd = async () => {
    try {
      await mutations.addSignoff.mutateAsync({
        releaseId: release.id_release,
        role,
      })
    } catch { /* toast */ }
  }

  const handleApprove = (signoff) => {
    mutations.approveSignoff.mutate({
      releaseId: release.id_release,
      signoffId: signoff.id_signoff,
    })
  }

  const handleReject = (signoff) => {
    const comment = window.prompt('Raison du rejet (obligatoire)')
    if (!comment?.trim()) return
    mutations.rejectSignoff.mutate({
      releaseId: release.id_release,
      signoffId: signoff.id_signoff,
      comment: comment.trim(),
    })
  }

  return (
    <Card padding="md">
      {!locked && (
        <div className={styles.addRow}>
          <select
            className={styles.addInput}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {Object.entries(SIGNOFF_ROLE).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <Button
            variant="primary"
            icon={Check}
            onClick={handleAdd}
            isLoading={mutations.addSignoff.isPending}
          >
            Ajouter un sign-off
          </Button>
        </div>
      )}

      {signoffs.length === 0 ? (
        <div className={styles.emptyTab}>
          Aucun sign-off requis. Ajoutez les rôles qui doivent approuver.
        </div>
      ) : (
        <ul className={styles.signoffList}>
          {signoffs.map((s) => (
            <li key={s.id_signoff} className={styles.signoffItem}>
              <div className={styles.signoffBody}>
                <span className={styles.signoffRole}>
                  {SIGNOFF_ROLE[s.signoff_role]?.label || s.signoff_role}
                </span>
                <StatusBadge map={SIGNOFF_STATUS} value={s.status} size="sm" />
                {s.comment && (
                  <span className={styles.signoffComment}>« {s.comment} »</span>
                )}
                {s.signed_at && (
                  <span className={styles.signoffMeta}>
                    {formatRelative(s.signed_at)}
                  </span>
                )}
              </div>
              {!locked && s.status === 'PENDING' && (
                <div className={styles.signoffActions}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Check}
                    onClick={() => handleApprove(s)}
                    isLoading={mutations.approveSignoff.isPending}
                  >
                    Approuver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={AlertCircle}
                    onClick={() => handleReject(s)}
                    isLoading={mutations.rejectSignoff.isPending}
                  >
                    Rejeter
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default ReleaseDetailPage