import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Bug, FileText, Link as LinkIcon, AlertCircle,
  ArrowRight, ArrowLeft as ArrowLeftIcon,
} from 'lucide-react'
import {
  Button, Card, Spinner, Badge, EmptyState,
} from '../../../components/ui'
import {
  DocsHeader, StatusBadge, DocsErrorState, Tooltip, Icon, ModuleIcon,
} from '../../../components/docs'
import {
  useFeature, useFeatureMutations, useFeatures,
  FEATURE_STATUS, FEATURE_PRIORITY, FEATURE_COMPLEXITY,
  ISSUE_STATUS, PAGE_STATUS,
} from '../../../hooks/docs'
import { formatDateTime, formatRelative } from '../../../utils/docsFormatters'
import { useState } from 'react'
import { FeatureDrawer } from './FeatureDrawer'
import styles from './FeatureDetail.module.css'

export const FeatureDetailPage = () => {
  const { ref } = useParams()
  const navigate = useNavigate()

  const { feature, stakeholders, dependenciesOut, dependenciesIn, openIssuesCount, pagesCount, isLoading, isError, error, refetch } = useFeature(ref)
  const mutations = useFeatureMutations()
  const [editOpen, setEditOpen] = useState(false)

  // Pour afficher les noms des dépendances
  const { features: allFeatures } = useFeatures({ pageSize: 500 })

  if (isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (isError || !feature) {
    return (
      <div className={styles.page}>
        <DocsHeader
          eyebrow="Feature"
          title="Introuvable"
          actions={
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/docs/features')}>
              Retour
            </Button>
          }
        />
        <DocsErrorState
          error={error}
          title="Cette feature est introuvable"
          onRetry={refetch}
        />
      </div>
    )
  }

  const featureById = (id) => allFeatures.find((f) => f.id_feature === id)

  const handleSave = async (payload) => {
    try {
      await mutations.update.mutateAsync({ id: feature.id_feature, payload })
      setEditOpen(false)
    } catch { /* toast géré */ }
  }

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/docs/features" className={styles.breadLink}>
          <ArrowLeft size={12} /> Features
        </Link>
        <span className={styles.breadSep}>/</span>
        <span className={styles.breadCurrent}>{feature.code}</span>
      </div>

      <DocsHeader
        eyebrow={feature.module}
        title={feature.name}
        description={feature.summary}
        actions={
          <Button variant="outline" icon={Pencil} onClick={() => setEditOpen(true)}>
            Modifier
          </Button>
        }
      />

      <div className={styles.layout}>
        <main className={styles.main}>
          <Card padding="md">
            <div className={styles.metaGrid}>
              <div>
                <span className={styles.metaLabel}>Statut</span>
                <StatusBadge map={FEATURE_STATUS} value={feature.status} size="md" />
              </div>
              <div>
                <span className={styles.metaLabel}>Priorité</span>
                {feature.priority
                  ? <StatusBadge map={FEATURE_PRIORITY} value={feature.priority} size="md" />
                  : <span className={styles.metaMuted}>—</span>}
              </div>
              <div>
                <span className={styles.metaLabel}>Complexité</span>
                {feature.complexity
                  ? <StatusBadge map={FEATURE_COMPLEXITY} value={feature.complexity} size="md" showIcon={false} />
                  : <span className={styles.metaMuted}>—</span>}
              </div>
              <div>
                <span className={styles.metaLabel}>Module</span>
                <span className={styles.metaValue}>
                  <ModuleIcon module={feature.module} size={12} />
                  {feature.module}
                </span>
              </div>
              <div>
                <span className={styles.metaLabel}>Créée le</span>
                <Tooltip content={formatDateTime(feature.created_at)}>
                  <span className={styles.metaValue}>{formatRelative(feature.created_at)}</span>
                </Tooltip>
              </div>
              {feature.launched_at && (
                <div>
                  <span className={styles.metaLabel}>En production depuis</span>
                  <Tooltip content={formatDateTime(feature.launched_at)}>
                    <span className={styles.metaValue}>{formatRelative(feature.launched_at)}</span>
                  </Tooltip>
                </div>
              )}
            </div>
          </Card>

          {feature.description_md && (
            <Card padding="md" className={styles.mdCard}>
              <span className={styles.sectionLabel}>Description</span>
              <pre className={styles.markdown}>{feature.description_md}</pre>
            </Card>
          )}

          {dependenciesOut.length > 0 && (
            <Card padding="md">
              <span className={styles.sectionLabel}>Dépend de ({dependenciesOut.length})</span>
              <ul className={styles.depList}>
                {dependenciesOut.map((d) => {
                  const target = featureById(d.depends_on_feature_id)
                  return (
                    <li key={d.id_dependency} className={styles.depItem}>
                      <Link to={`/docs/features/${target?.code || d.depends_on_feature_id}`} className={styles.depLink}>
                        <ArrowRight size={12} />
                        {target ? (
                          <>
                            <span className={styles.depCode}>{target.code}</span>
                            <span>{target.name}</span>
                          </>
                        ) : (
                          <span className={styles.depMuted}>Feature inconnue</span>
                        )}
                      </Link>
                      <Badge variant="secondary" size="sm">{d.dependency_type}</Badge>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}

          {dependenciesIn.length > 0 && (
            <Card padding="md">
              <span className={styles.sectionLabel}>Requis par ({dependenciesIn.length})</span>
              <ul className={styles.depList}>
                {dependenciesIn.map((d) => {
                  const src = featureById(d.feature_id)
                  return (
                    <li key={d.id_dependency} className={styles.depItem}>
                      <Link to={`/docs/features/${src?.code || d.feature_id}`} className={styles.depLink}>
                        <ArrowLeftIcon size={12} />
                        {src ? (
                          <>
                            <span className={styles.depCode}>{src.code}</span>
                            <span>{src.name}</span>
                          </>
                        ) : (
                          <span className={styles.depMuted}>Feature inconnue</span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </main>

        <aside className={styles.aside}>
          <Card padding="md">
            <span className={styles.sectionLabel}>Traçabilité</span>
            <div className={styles.traceList}>
              <Link to={`/docs/issues?feature=${feature.id_feature}`} className={styles.traceItem}>
                <Bug size={14} />
                <span>Issues ouvertes</span>
                <strong>{openIssuesCount}</strong>
              </Link>
              <Link to={`/docs/pages?feature=${feature.id_feature}`} className={styles.traceItem}>
                <FileText size={14} />
                <span>Pages liées</span>
                <strong>{pagesCount}</strong>
              </Link>
            </div>
          </Card>

          <Card padding="md">
            <span className={styles.sectionLabel}>Métadonnées</span>
            <dl className={styles.dl}>
              <dt>ID</dt>
              <dd className={styles.mono}>{feature.id_feature.slice(0, 8)}…</dd>
              <dt>Créée</dt>
              <dd>{formatDateTime(feature.created_at)}</dd>
              <dt>Modifiée</dt>
              <dd>{formatDateTime(feature.updated_at)}</dd>
            </dl>
          </Card>
        </aside>
      </div>

      <FeatureDrawer
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        feature={feature}
        onSave={handleSave}
        saving={mutations.update.isPending}
        existingModules={[feature.module]}
      />
    </div>
  )
}

export default FeatureDetailPage