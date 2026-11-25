import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  RefreshCw, Activity as ActivityIcon, Filter,
} from 'lucide-react'
import {
  Button, Select, Card,
} from '../../components/ui'
import {
  DocsHeader, DocsErrorState, DocsEmptyState, Tooltip, Icon,
} from '../../components/docs'
import {
  useDocsActivity,
  ACTIVITY_ENTITY, ACTIVITY_ACTION,
} from '../../hooks/docs'
import { formatDateTime, formatRelative, truncate } from '../../utils/docsFormatters'
import styles from './Activity.module.css'

const ENTITY_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous types' },
  ...Object.entries(ACTIVITY_ENTITY).map(([k, v]) => ({ value: k, label: v.label })),
]

const ACTION_FILTER_OPTIONS = [
  { value: 'all', label: 'Toutes actions' },
  ...Object.entries(ACTIVITY_ACTION).map(([k, v]) => ({ value: k, label: v.label })),
]

/* Résout l'URL vers laquelle pointer selon le type d'entité */
const resolveEntityLink = (entry) => {
  const data = entry.new_data || entry.old_data || {}
  switch (entry.entity_type) {
    case 'FEATURE':
      return data.code ? `/docs/features/${data.code}` : null
    case 'PAGE':
      return data.slug ? `/docs/pages/${data.slug}` : null
    case 'ISSUE':
      return data.code ? `/docs/issues/${data.code}` : null
    case 'RELEASE':
      return data.version ? `/docs/releases/${data.version}` : null
    case 'ADR':
      return data.number ? `/docs/adrs/${data.number}` : null
    default:
      return null
  }
}

const resolveEntityLabel = (entry) => {
  const data = entry.new_data || entry.old_data || {}
  if (data.code) return data.code
  if (data.slug) return data.slug
  if (data.version) return `v${data.version}`
  if (data.number) return `ADR-${String(data.number).padStart(3, '0')}`
  if (data.name) return data.name
  if (data.title) return data.title
  return null
}

export const ActivityPage = () => {
  const navigate = useNavigate()

  const [entityFilter, setEntityFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [limit, setLimit] = useState(100)

  const { activity, total, isLoading, isFetching, isError, error, refetch } = useDocsActivity(limit)

  const filtered = useMemo(() => {
    return activity.filter((a) => {
      if (entityFilter !== 'all' && a.entity_type !== entityFilter) return false
      if (actionFilter !== 'all' && a.action !== actionFilter) return false
      return true
    })
  }, [activity, entityFilter, actionFilter])

  const hasFilter = entityFilter !== 'all' || actionFilter !== 'all'

  if (isError) {
    return (
      <div className={styles.page}>
        <DocsHeader eyebrow="Journal" title="Activité" />
        <DocsErrorState error={error} onRetry={refetch} title="Impossible de charger l'activité" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <DocsHeader
        eyebrow="Journal d'audit"
        title="Activité récente"
        description={`Toutes les actions enregistrées dans le module documentation · ${total} entrée${total > 1 ? 's' : ''}`}
        actions={
          <Button variant="outline" icon={RefreshCw} onClick={refetch}
            isLoading={isFetching} aria-label="Rafraîchir" />
        }
      />

      <div className={styles.filtersBar}>
        <div className={styles.filterItem}>
          <Select
            size="md"
            options={ENTITY_FILTER_OPTIONS}
            value={entityFilter}
            onChange={setEntityFilter}
          />
        </div>
        <div className={styles.filterItem}>
          <Select
            size="md"
            options={ACTION_FILTER_OPTIONS}
            value={actionFilter}
            onChange={setActionFilter}
          />
        </div>
        <div className={styles.filterItem}>
          <Select
            size="md"
            options={[
              { value: 50, label: '50 entrées' },
              { value: 100, label: '100 entrées' },
              { value: 200, label: '200 entrées' },
            ]}
            value={limit}
            onChange={(v) => setLimit(Number(v))}
          />
        </div>
        {hasFilter && (
          <Button
            variant="ghost"
            size="md"
            onClick={() => { setEntityFilter('all'); setActionFilter('all') }}
          >
            Effacer filtres
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card padding="md">
          <div className={styles.loadingRow}>
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className={styles.skeletonRow} />
            ))}
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <DocsEmptyState
          icon="Activity"
          title={hasFilter ? 'Aucune entrée pour ces filtres' : 'Aucune activité'}
          description={
            hasFilter
              ? 'Essayez d\'élargir vos filtres.'
              : 'Le journal se remplit à mesure des actions.'
          }
          action={
            hasFilter
              ? { label: 'Réinitialiser', icon: 'RotateCcw', onClick: () => { setEntityFilter('all'); setActionFilter('all') } }
              : undefined
          }
        />
      ) : (
        <Card padding="none" className={styles.timelineCard}>
          <ol className={styles.timeline}>
            {filtered.map((entry) => {
              const entityCfg = ACTIVITY_ENTITY[entry.entity_type] || { label: entry.entity_type, icon: 'Package' }
              const actionCfg = ACTIVITY_ACTION[entry.action] || { label: entry.action, color: 'gray' }
              const link = resolveEntityLink(entry)
              const entityLabel = resolveEntityLabel(entry)

              return (
                <li key={entry.id_activity} className={styles.timelineItem}>
                  <span className={styles.timelineIcon}>
                    <Icon name={entityCfg.icon} size={12} />
                  </span>

                  <div className={styles.timelineBody}>
                    <div className={styles.timelineLine}>
                      <span className={styles.entityLabel}>{entityCfg.label}</span>
                      <span className={`${styles.actionLabel} ${styles[`act_${actionCfg.color}`] || ''}`}>
                        {actionCfg.label}
                      </span>
                      {entityLabel && (
                        link ? (
                          <Link to={link} className={styles.entityLink}>
                            · {truncate(entityLabel, 60)}
                          </Link>
                        ) : (
                          <span className={styles.entityLinkMuted}>· {truncate(entityLabel, 60)}</span>
                        )
                      )}
                    </div>
                    {entry.is_system && (
                      <span className={styles.systemBadge}>système</span>
                    )}
                  </div>

                  <Tooltip content={formatDateTime(entry.created_at)}>
                    <span className={styles.timelineTime}>
                      {formatRelative(entry.created_at)}
                    </span>
                  </Tooltip>
                </li>
              )
            })}
          </ol>
        </Card>
      )}
    </div>
  )
}

export default ActivityPage