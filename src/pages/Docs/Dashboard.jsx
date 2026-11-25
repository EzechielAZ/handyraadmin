import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Rocket, Bug, FileText, Zap, ArrowUpRight, Search, Activity,
  ExternalLink, ChevronRight,
} from 'lucide-react'
import {
  StatCard, Card, Button, Input, Spinner, Tabs,
} from '../../components/ui'
import {
  DocsHeader, StatusBadge, ModuleIcon, Tooltip, DocsErrorState,
} from '../../components/docs'
import {
  useDocsDashboard, useModuleHealth, useDocsActivity, useDocsGlobalSearch,
  FEATURE_STATUS, ISSUE_SEVERITY, ACTIVITY_ENTITY, ACTIVITY_ACTION,
  RELEASE_STATUS, getModuleIcon,
} from '../../hooks/docs'
import { useDebounce } from '../../hooks/useDebounce'
import {
  formatRelative, formatTargetDate, formatPercent, truncate,
} from '../../utils/docsFormatters'
import styles from './Dashboard.module.css'

/* ─── Formatage activité ─── */
const renderActivityAction = (entry) => {
  const entity = ACTIVITY_ENTITY[entry.entity_type] || { label: entry.entity_type, icon: 'Package' }
  const action = ACTIVITY_ACTION[entry.action] || { label: entry.action, color: 'gray' }
  return { entity, action }
}

export const DocsDashboard = () => {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const debouncedQuery = useDebounce(searchInput, 350)
  const [activityTab, setActivityTab] = useState('all')

  const { features, issues, releases, pages, isLoading: dashLoading, isError: dashError, error: dashErr, refetch: refetchDash } = useDocsDashboard()
  const { modules, isLoading: modLoading, isError: modError } = useModuleHealth()
  const { activity, isLoading: actLoading, isError: actError } = useDocsActivity(30)
  const { items: searchResults, isLoading: searchLoading } = useDocsGlobalSearch(debouncedQuery, 15)

  const filteredActivity = useMemo(() => {
    if (activityTab === 'all') return activity
    return activity.filter((a) => {
      if (activityTab === 'releases') return a.entity_type === 'RELEASE' || a.entity_type === 'RELEASE_FEATURE'
      if (activityTab === 'features') return a.entity_type === 'FEATURE'
      if (activityTab === 'issues') return a.entity_type === 'ISSUE'
      if (activityTab === 'pages') return a.entity_type === 'PAGE'
      return true
    })
  }, [activity, activityTab])

  if (dashError) {
    return (
      <div className={styles.page}>
        <DocsErrorState
          title="Impossible de charger le tableau de bord docs"
          error={dashErr}
          onRetry={refetchDash}
        />
      </div>
    )
  }

  const gotoSearchResult = (item) => {
    if (item.entity === 'FEATURE') navigate(`/docs/features/${item.code}`)
    else if (item.entity === 'PAGE') navigate(`/docs/pages/${item.code}`)
    else if (item.entity === 'ISSUE') navigate(`/docs/issues/${item.code}`)
  }

  return (
    <div className={styles.page}>
      <DocsHeader
        eyebrow="Documentation produit"
        title="Vue d'ensemble"
        description="Catalogue des features, releases, issues et pages du produit Handyra."
        actions={
          <>
            <Button
              variant="outline"
              icon={Bug}
              onClick={() => navigate('/docs/issues')}
            >
              Issues
            </Button>
            <Button
              variant="primary"
              icon={Rocket}
              onClick={() => navigate('/docs/releases')}
            >
              Releases
            </Button>
          </>
        }
      />

      {/* ─── Recherche globale ─── */}
      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <Input
            size="md"
            icon={Search}
            placeholder="Rechercher dans features, pages et issues…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {debouncedQuery.trim().length >= 2 && (
        <Card padding="sm" className={styles.searchResults}>
          {searchLoading ? (
            <div className={styles.searchLoading}>
              <Spinner size="sm" />
              <span>Recherche…</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className={styles.searchEmpty}>
              Aucun résultat pour «&nbsp;{debouncedQuery}&nbsp;»
            </div>
          ) : (
            <ul className={styles.searchList}>
              {searchResults.map((r) => (
                <li key={`${r.entity}-${r.id}`}>
                  <button
                    type="button"
                    className={styles.searchItem}
                    onClick={() => gotoSearchResult(r)}
                  >
                    <span className={styles.searchEntity}>{r.entity}</span>
                    <span className={styles.searchTitle}>
                      {r.code ? `#${r.code} · ` : ''}{r.title}
                    </span>
                    {r.snippet && (
                      <span className={styles.searchSnippet}>{truncate(r.snippet, 80)}</span>
                    )}
                    <ChevronRight size={12} className={styles.searchArrow} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* ─── StatCards ─── */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Features LIVE"
          value={features.live}
          changeLabel={`sur ${features.total} features`}
          icon={Zap}
          loading={dashLoading}
          onClick={() => navigate('/docs/features')}
        />
        <StatCard
          title="Issues ouvertes"
          value={issues.open}
          changeLabel={
            issues.criticalOpen > 0
              ? `${issues.criticalOpen} critique(s)`
              : 'aucune critique'
          }
          icon={Bug}
          color={issues.criticalOpen > 0 ? 'danger' : 'primary'}
          loading={dashLoading}
          onClick={() => navigate('/docs/issues')}
        />
        <StatCard
          title="Release en cours"
          value={releases.current?.version || '—'}
          changeLabel={releases.current ? formatTargetDate(releases.current.targetDate) : 'aucune planifiée'}
          icon={Rocket}
          loading={dashLoading}
          onClick={() => navigate('/docs/releases')}
        />
        <StatCard
          title="Pages publiées"
          value={pages.published}
          changeLabel={pages.stale > 0 ? `${pages.stale} à revoir` : 'à jour'}
          icon={FileText}
          loading={dashLoading}
          onClick={() => navigate('/docs/pages')}
        />
      </div>

      {/* ─── Module health ─── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.sectionEyebrow}>Santé produit</p>
            <h2 className={styles.sectionTitle}>Modules</h2>
          </div>
          <span className={styles.sectionMeta}>
            {modules.length} module{modules.length > 1 ? 's' : ''}
          </span>
        </div>

        {modError ? (
          <DocsErrorState title="Impossible de charger les modules" compact />
        ) : modLoading ? (
          <div className={styles.modulesLoading}>
            <Spinner size="md" />
          </div>
        ) : modules.length === 0 ? (
          <div className={styles.modulesEmpty}>
            Aucun module catalogué. Commencez par créer une feature.
          </div>
        ) : (
          <div className={styles.modulesGrid}>
            {modules.map((m) => (
              <Card
                key={m.module}
                padding="sm"
                className={styles.moduleCard}
                as="button"
                onClick={() => navigate(`/docs/features?module=${encodeURIComponent(m.module)}`)}
                type="button"
              >
                <div className={styles.moduleHead}>
                  <span className={styles.moduleIconWrap}>
                    <ModuleIcon module={m.module} size={14} />
                  </span>
                  <span className={styles.moduleName}>{m.module}</span>
                </div>
                <div className={styles.moduleStats}>
                  <span className={styles.moduleStat}>
                    <strong>{m.features}</strong> features
                  </span>
                  <span className={`${styles.moduleStat} ${m.live > 0 ? styles.ok : ''}`}>
                    <strong>{m.live}</strong> LIVE
                  </span>
                  <span className={`${styles.moduleStat} ${m.openIssues > 0 ? styles.warn : ''} ${m.criticalOpen > 0 ? styles.danger : ''}`}>
                    <strong>{m.openIssues}</strong> issues
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ─── Activité récente ─── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.sectionEyebrow}>Journal</p>
            <h2 className={styles.sectionTitle}>Activité récente</h2>
          </div>
          <Link to="/docs/activity" className={styles.seeAll}>
            Tout voir <ArrowUpRight size={12} />
          </Link>
        </div>

        <Tabs
          activeTab={activityTab}
          onChange={setActivityTab}
          tabs={[
            { id: 'all', label: 'Tout' },
            { id: 'features', label: 'Features' },
            { id: 'releases', label: 'Releases' },
            { id: 'issues', label: 'Issues' },
            { id: 'pages', label: 'Pages' },
          ]}
        />

        {actError ? (
          <DocsErrorState title="Impossible de charger l'activité" compact />
        ) : actLoading ? (
          <div className={styles.activityLoading}>
            <Spinner size="md" />
          </div>
        ) : filteredActivity.length === 0 ? (
          <div className={styles.activityEmpty}>Aucune activité récente.</div>
        ) : (
          <ol className={styles.activityList}>
            {filteredActivity.map((a) => {
              const { entity, action } = renderActivityAction(a)
              return (
                <li key={a.id_activity} className={styles.activityItem}>
                  <span className={styles.activityIcon}>
                    <Activity size={12} />
                  </span>
                  <div className={styles.activityBody}>
                    <span className={styles.activityLine}>
                      <span className={styles.activityEntity}>{entity.label}</span>
                      <span className={`${styles.activityAction} ${styles[`act_${action.color}`] || ''}`}>
                        {action.label}
                      </span>
                      {a.new_data?.name && (
                        <span className={styles.activityTarget}>
                          · {truncate(a.new_data.name, 60)}
                        </span>
                      )}
                      {a.new_data?.title && (
                        <span className={styles.activityTarget}>
                          · {truncate(a.new_data.title, 60)}
                        </span>
                      )}
                      {a.new_data?.version && (
                        <span className={styles.activityTarget}>
                          · {a.new_data.version}
                        </span>
                      )}
                    </span>
                    <Tooltip content={new Date(a.created_at).toLocaleString('fr-FR')}>
                      <span className={styles.activityTime}>
                        {formatRelative(a.created_at)}
                      </span>
                    </Tooltip>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}

export default DocsDashboard