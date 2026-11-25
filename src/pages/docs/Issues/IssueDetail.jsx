import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Bug, MessageSquare, Plus, Trash2, PencilLine,
  Check, AlertCircle, Link as LinkIcon,
} from 'lucide-react'
import {
  Button, Card, Spinner, Badge, EmptyState,
} from '../../../components/ui'
import {
  DocsHeader, DocsErrorState, StatusBadge, Tooltip, ModuleIcon,
} from '../../../components/docs'
import {
  useIssue, useIssueMutations, useFeatures,
  ISSUE_TYPE, ISSUE_STATUS, ISSUE_SEVERITY, ISSUE_PRIORITY,
  ISSUE_TRANSITIONS, canTransition,
} from '../../../hooks/docs'
import { formatDateTime, formatRelative } from '../../../utils/docsFormatters'
import toast from 'react-hot-toast'
import { Markdown } from '../../../components/docs/Markdown/Markdown'
import { IssueDrawer } from './IssueDrawer'
import styles from './IssueDetail.module.css'

export const IssueDetailPage = () => {
  const { ref } = useParams()
  const navigate = useNavigate()

  const { issue, comments, relations, isLoading, isError, error, refetch } = useIssue(ref)
  const mutations = useIssueMutations()
  const { features: allFeatures } = useFeatures({ pageSize: 300 })

  const [editOpen, setEditOpen] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [transitionOpen, setTransitionOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [transitionReason, setTransitionReason] = useState('')

  if (isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (isError || !issue) {
    return (
      <div className={styles.page}>
        <DocsHeader
          eyebrow="Issue"
          title="Introuvable"
          actions={
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/docs/issues')}>
              Retour
            </Button>
          }
        />
        <DocsErrorState error={error} title="Cette issue est introuvable" onRetry={refetch} />
      </div>
    )
  }

  const linkedFeature = allFeatures?.find((f) => f.id_feature === issue.feature_id)
  const allowedTransitions = ISSUE_TRANSITIONS[issue.status] || []

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    try {
      await mutations.addComment.mutateAsync({
        issueId: issue.id_issue,
        contentMd: newComment.trim(),
      })
      setNewComment('')
      refetch()
    } catch { /* toast */ }
  }

  const handleDeleteComment = async (id) => {
    if (!window.confirm('Supprimer ce commentaire ?')) return
    try {
      await mutations.deleteComment.mutateAsync(id)
      refetch()
    } catch { /* toast */ }
  }

  const handleTransition = async () => {
    if (!newStatus) return
    try {
      await mutations.transition.mutateAsync({
        id: issue.id_issue,
        newStatus,
        reason: transitionReason.trim() || null,
      })
      setTransitionOpen(false)
      setNewStatus('')
      setTransitionReason('')
      refetch()
    } catch { /* toast */ }
  }

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/docs/issues" className={styles.breadLink}>
          <ArrowLeft size={12} /> Issues
        </Link>
        <span className={styles.breadSep}>/</span>
        <span className={styles.breadCurrent}>{issue.code}</span>
      </div>

      <DocsHeader
        eyebrow={<span className={styles.eyebrowRow}>
          <StatusBadge map={ISSUE_TYPE} value={issue.issue_type} />
          <StatusBadge map={ISSUE_STATUS} value={issue.status} />
        </span>}
        title={issue.title}
        actions={
          <>
            {allowedTransitions.length > 0 && (
              <Button
                variant="primary"
                icon={Check}
                onClick={() => setTransitionOpen(true)}
              >
                Changer le statut
              </Button>
            )}
            <Button variant="outline" icon={Pencil} onClick={() => setEditOpen(true)}>
              Modifier
            </Button>
          </>
        }
      />

      <div className={styles.layout}>
        <main className={styles.main}>
          {issue.description_md && (
            <Card padding="md">
              <span className={styles.sectionLabel}>Description</span>
              <Markdown>{issue.description_md}</Markdown>
            </Card>
          )}

          {issue.reproduction_steps && (
            <Card padding="md">
              <span className={styles.sectionLabel}>Étapes de reproduction</span>
              <Markdown>{issue.reproduction_steps}</Markdown>
            </Card>
          )}

          {(issue.expected_behavior || issue.actual_behavior) && (
            <div className={styles.twoCol}>
              {issue.expected_behavior && (
                <Card padding="md">
                  <span className={styles.sectionLabel}>Attendu</span>
                  <Markdown>{issue.expected_behavior}</Markdown>
                </Card>
              )}
              {issue.actual_behavior && (
                <Card padding="md">
                  <span className={styles.sectionLabel}>Observé</span>
                  <Markdown>{issue.actual_behavior}</Markdown>
                </Card>
              )}
            </div>
          )}

          {issue.environment && Object.keys(issue.environment).length > 0 && (
            <Card padding="md">
              <span className={styles.sectionLabel}>Environnement</span>
              <pre className={styles.markdown}>
                {JSON.stringify(issue.environment, null, 2)}
              </pre>
            </Card>
          )}

          {/* Commentaires */}
          <Card padding="md">
            <span className={styles.sectionLabel}>
              Commentaires ({comments.length})
            </span>

            {comments.length === 0 ? (
              <p className={styles.noComments}>Aucun commentaire pour l'instant.</p>
            ) : (
              <ul className={styles.commentList}>
                {comments.map((c) => (
                  <li key={c.id_comment} className={styles.comment}>
                    <div className={styles.commentHeader}>
                      <span className={styles.commentAuthor}>
                        {c.is_internal ? '📝 Note interne' : 'Commentaire'}
                      </span>
                      <Tooltip content={formatDateTime(c.created_at)}>
                        <span className={styles.commentTime}>
                          {formatRelative(c.created_at)}
                        </span>
                      </Tooltip>
                      <button
                        type="button"
                        className={styles.commentDelete}
                        onClick={() => handleDeleteComment(c.id_comment)}
                        aria-label="Supprimer le commentaire"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <Markdown compact>{c.content_md}</Markdown>
                  </li>
                ))}
              </ul>
            )}

            <div className={styles.commentComposer}>
              <textarea
                className={styles.commentTextarea}
                placeholder="Ajouter un commentaire (Markdown)…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button
                variant="primary"
                icon={Plus}
                onClick={handleAddComment}
                isLoading={mutations.addComment.isPending}
                disabled={!newComment.trim()}
              >
                Publier
              </Button>
            </div>
          </Card>
        </main>

        <aside className={styles.aside}>
          <Card padding="md">
            <span className={styles.sectionLabel}>Métadonnées</span>
            <dl className={styles.dl}>
              <dt>Type</dt>
              <dd><StatusBadge map={ISSUE_TYPE} value={issue.issue_type} /></dd>
              <dt>Sévérité</dt>
              <dd>{issue.severity ? <StatusBadge map={ISSUE_SEVERITY} value={issue.severity} /> : '—'}</dd>
              <dt>Priorité</dt>
              <dd>{issue.priority ? <StatusBadge map={ISSUE_PRIORITY} value={issue.priority} /> : '—'}</dd>
              {issue.module && (
                <>
                  <dt>Module</dt>
                  <dd className={styles.moduleCell}>
                    <ModuleIcon module={issue.module} size={11} />
                    {issue.module}
                  </dd>
                </>
              )}
              {linkedFeature && (
                <>
                  <dt>Feature</dt>
                  <dd>
                    <Link to={`/docs/features/${linkedFeature.code}`} className={styles.link}>
                      {linkedFeature.code}
                    </Link>
                  </dd>
                </>
              )}
            </dl>
          </Card>

          {issue.labels?.length > 0 && (
            <Card padding="md">
              <span className={styles.sectionLabel}>Labels</span>
              <div className={styles.labels}>
                {issue.labels.map((l) => (
                  <Badge key={l} variant="secondary" size="sm">{l}</Badge>
                ))}
              </div>
            </Card>
          )}

          {relations.length > 0 && (
            <Card padding="md">
              <span className={styles.sectionLabel}>Relations ({relations.length})</span>
              <ul className={styles.relations}>
                {relations.map((r) => (
                  <li key={r.id_relation} className={styles.relationItem}>
                    <Badge variant="secondary" size="sm">{r.relation_type}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card padding="md">
            <span className={styles.sectionLabel}>Dates</span>
            <dl className={styles.dl}>
              <dt>Créée</dt>
              <dd>{formatDateTime(issue.created_at)}</dd>
              <dt>Modifiée</dt>
              <dd>{formatDateTime(issue.updated_at)}</dd>
              {issue.triaged_at && (
                <>
                  <dt>Triage</dt>
                  <dd>{formatDateTime(issue.triaged_at)}</dd>
                </>
              )}
              {issue.resolved_at && (
                <>
                  <dt>Résolue</dt>
                  <dd>{formatDateTime(issue.resolved_at)}</dd>
                </>
              )}
            </dl>
          </Card>
        </aside>
      </div>

      <IssueDrawer
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        issue={issue}
        features={allFeatures}
        mutations={mutations}
      />

      {/* Modal transition */}
      {transitionOpen && (
        <div className={styles.modalOverlay} onClick={() => setTransitionOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Changer le statut</h3>
            <p className={styles.modalSubtitle}>
              Statut actuel : <strong>{ISSUE_STATUS[issue.status]?.label}</strong>
            </p>

            <label className={styles.modalLabel}>Nouveau statut</label>
            <select
              className={styles.modalSelect}
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="">— Sélectionner —</option>
              {allowedTransitions.map((s) => (
                <option key={s} value={s}>{ISSUE_STATUS[s]?.label || s}</option>
              ))}
            </select>

            <label className={styles.modalLabel}>Raison (optionnel)</label>
            <textarea
              className={styles.modalTextarea}
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              rows={3}
              placeholder="Contexte du changement…"
            />

            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setTransitionOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleTransition}
                isLoading={mutations.transition.isPending}
                disabled={!newStatus}
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

export default IssueDetailPage