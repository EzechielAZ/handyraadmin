import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Send, Archive, RotateCcw, Link as LinkIcon,
  Clock, Globe, Lock, FileText, ChevronRight,
} from 'lucide-react'
import {
  Button, Card, Spinner, Badge, EmptyState, Modal,
} from '../../../components/ui'
import {
  DocsHeader, DocsErrorState, StatusBadge, Tooltip, Icon,
} from '../../../components/docs'
import {
  usePage, usePageVersions, usePageMutations,
  PAGE_CATEGORY, PAGE_STATUS, PAGE_VISIBILITY,
} from '../../../hooks/docs'
import { formatDateTime, formatRelative } from '../../../utils/docsFormatters'
import toast from 'react-hot-toast'
import { PageDrawer } from './PageDrawer'
import styles from './PageDetail.module.css'

export const PageDetailPage = () => {
  const { ref } = useParams()
  const navigate = useNavigate()

  const { page, backlinks, outlinks, isLoading, isError, error, refetch } = usePage(ref)
  const { versions } = usePageVersions(page?.id_page)
  const mutations = usePageMutations()

  const [editOpen, setEditOpen] = useState(false)
  const [restoreConfirm, setRestoreConfirm] = useState(null)

  if (isLoading) {
    return <div className={styles.loadingWrap}><Spinner size="lg" /></div>
  }

  if (isError || !page) {
    return (
      <div className={styles.page}>
        <DocsHeader
          eyebrow="Page"
          title="Introuvable"
          actions={
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/docs/pages')}>
              Retour
            </Button>
          }
        />
        <DocsErrorState error={error} title="Cette page est introuvable" onRetry={refetch} />
      </div>
    )
  }

  const handlePublish = async () => {
    try { await mutations.publish.mutateAsync(page.id_page); refetch() } catch {}
  }
  const handleArchive = async () => {
    try { await mutations.archive.mutateAsync(page.id_page); refetch() } catch {}
  }
  const handleRestore = async () => {
    if (!restoreConfirm) return
    try {
      await mutations.restoreVersion.mutateAsync({
        pageId: page.id_page,
        versionId: restoreConfirm.id_version,
      })
      setRestoreConfirm(null)
      refetch()
    } catch {}
  }

  const visibilityIcon = page.visibility === 'PUBLIC' ? Globe : page.visibility === 'RESTRICTED' ? Lock : FileText

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/docs/pages" className={styles.breadLink}>
          <ArrowLeft size={12} /> Pages
        </Link>
        <span className={styles.breadSep}>/</span>
        <span className={styles.breadCurrent}>{page.slug}</span>
      </div>

      <DocsHeader
        eyebrow={<span className={styles.eyebrowRow}>
          <StatusBadge map={PAGE_CATEGORY} value={page.category} />
          <StatusBadge map={PAGE_STATUS} value={page.status} />
          <StatusBadge map={PAGE_VISIBILITY} value={page.visibility} />
        </span>}
        title={page.title}
        description={page.summary}
        actions={
          <>
            {page.status === 'PUBLISHED' ? (
              <Button variant="outline" icon={Archive} onClick={handleArchive}
                isLoading={mutations.archive.isPending}>
                Archiver
              </Button>
            ) : (
              <Button variant="primary" icon={Send} onClick={handlePublish}
                isLoading={mutations.publish.isPending}>
                Publier
              </Button>
            )}
            <Button variant="outline" icon={Pencil} onClick={() => setEditOpen(true)}>
              Éditer
            </Button>
          </>
        }
      />

      <div className={styles.layout}>
        <main className={styles.main}>
          <Card padding="md">
            <pre className={styles.markdown}>{page.content_md}</pre>
          </Card>

          {(backlinks.length > 0 || outlinks.length > 0) && (
            <div className={styles.linksGrid}>
              {backlinks.length > 0 && (
                <Card padding="md">
                  <span className={styles.sectionLabel}>
                    <LinkIcon size={11} /> Pages qui référencent celle-ci
                  </span>
                  <ul className={styles.linkList}>
                    {backlinks.map((l) => (
                      <li key={l.id_link} className={styles.linkItem}>
                        <Link to={`/docs/pages/${l.source_page_id}`} className={styles.link}>
                          Page source
                          <ChevronRight size={11} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {outlinks.length > 0 && (
                <Card padding="md">
                  <span className={styles.sectionLabel}>
                    <LinkIcon size={11} /> Pages référencées
                  </span>
                  <ul className={styles.linkList}>
                    {outlinks.map((l) => (
                      <li key={l.id_link} className={styles.linkItem}>
                        <Link to={`/docs/pages/${l.target_page_id}`} className={styles.link}>
                          Page cible
                          <ChevronRight size={11} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </main>

        <aside className={styles.aside}>
          <Card padding="md">
            <span className={styles.sectionLabel}>Métadonnées</span>
            <dl className={styles.dl}>
              <dt>Slug</dt>
              <dd className={styles.mono}>{page.slug}</dd>
              <dt>Version</dt>
              <dd>v{page.version_number}</dd>
              <dt>Créée</dt>
              <dd>{formatDateTime(page.created_at)}</dd>
              <dt>Modifiée</dt>
              <dd>{formatDateTime(page.updated_at)}</dd>
              {page.published_at && (
                <>
                  <dt>Publiée</dt>
                  <dd>{formatDateTime(page.published_at)}</dd>
                </>
              )}
            </dl>
          </Card>

          {page.tags?.length > 0 && (
            <Card padding="md">
              <span className={styles.sectionLabel}>Tags</span>
              <div className={styles.tags}>
                {page.tags.map((t) => <Badge key={t} variant="secondary" size="sm">{t}</Badge>)}
              </div>
            </Card>
          )}

          {versions?.length > 0 && (
            <Card padding="md">
              <span className={styles.sectionLabel}>Historique ({versions.length})</span>
              <ul className={styles.versionList}>
                {versions.map((v) => (
                  <li key={v.id_version} className={styles.versionItem}>
                    <div className={styles.versionInfo}>
                      <span className={styles.versionNum}>v{v.version}</span>
                      {v.change_summary && (
                        <span className={styles.versionNote}>{v.change_summary}</span>
                      )}
                      <Tooltip content={formatDateTime(v.createdAt)}>
                        <span className={styles.versionTime}>{formatRelative(v.createdAt)}</span>
                      </Tooltip>
                    </div>
                    {v.version !== page.version_number && (
                      <button
                        type="button"
                        className={styles.restoreBtn}
                        onClick={() => setRestoreConfirm(v)}
                        title="Restaurer cette version"
                      >
                        <RotateCcw size={11} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      <PageDrawer
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        page={page}
        features={[]}
        mutations={mutations}
      />

      <Modal
        isOpen={!!restoreConfirm}
        onClose={() => setRestoreConfirm(null)}
        title={`Restaurer v${restoreConfirm?.version}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRestoreConfirm(null)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleRestore}
              isLoading={mutations.restoreVersion.isPending}
            >
              Restaurer
            </Button>
          </>
        }
      >
        <p className={styles.modalText}>
          Restaurer <strong>v{restoreConfirm?.version}</strong> créera une
          nouvelle version avec le contenu de cette version historique.
          La version actuelle (v{page.version_number}) sera conservée
          dans l'historique.
        </p>
      </Modal>
    </div>
  )
}

export default PageDetailPage