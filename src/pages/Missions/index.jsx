import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import { Button, Input, Select, Spinner } from '../../components/ui'
import { Search, Download, RefreshCw, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDebounce } from '../../hooks/useDebounce'
import { useCategories, buildCategoryOptions } from '../../hooks/useCategories'
import { useFilterStore } from '../../store/filterStore'
import { useMissionSection, usePrefetchMissionsTab, fetchMissionsForExport } from '../../hooks/useMissionsAdmin'
import { formatDateTime } from '../../utils/formatters'
import {
  TABS, PERIOD_OPTIONS, TYPE_OPTIONS, ATTENTION_OPTIONS, TYPE_LABEL, PRICING_LABEL, MODE_LABEL, CANCEL_ACTOR, ESCROW,
  statusBadge, relativeTime, num,
} from './missionsConfig'
import styles from './Missions.module.css'

/* Chaque onglet, le tiroir et les fenêtres d'action sont des « chunks » séparés : téléchargés au premier besoin */
const MissionsOverview = lazy(() => import('./MissionsOverview'))
const MissionsAnalytics = lazy(() => import('./MissionsAnalytics'))
const MissionsTable = lazy(() => import('./MissionsTable'))
const MissionDrawer = lazy(() => import('./MissionDrawer'))
const MissionActionModals = lazy(() => import('./MissionActionModals'))

const TabFallback = () => <div className={styles.loading}><Spinner size="lg" /></div>

const TAB_KEY = 'missions:tab'
const readTab = () => {
  try { const t = sessionStorage.getItem(TAB_KEY); return TABS.some((x) => x.id === t) ? t : 'overview' } catch { return 'overview' }
}

/* Filtres de la liste : monté (et donc chargé) uniquement sur l'onglet « Missions » */
const ListFilters = ({ searchInput, setSearchInput, onClear, activeCount }) => {
  const { globalFilters, setGlobalFilter } = useFilterStore()
  const { categories } = useCategories()
  const categoryOptions = useMemo(() => buildCategoryOptions(categories, 'Toutes catégories'), [categories])
  return (
    <div className={styles.filterBar} role="search">
      <Input size="md" icon={Search} placeholder="Mission, client, artisan, téléphone, #id…"
        value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
      <Select size="md" options={TYPE_OPTIONS} value={globalFilters.type || 'all'}
        onChange={(v) => setGlobalFilter('type', v === 'all' ? null : v)} />
      <Select size="md" searchable options={categoryOptions} value={globalFilters.category || 'all'}
        onChange={(v) => setGlobalFilter('category', v === 'all' ? null : v)} />
      <Select size="md" options={ATTENTION_OPTIONS} value={globalFilters.attention || 'all'}
        onChange={(v) => setGlobalFilter('attention', v === 'all' ? null : v)} />
      <button type="button" className={styles.clearBtn} onClick={onClear} disabled={activeCount === 0}>
        <X size={11} /> Effacer
      </button>
    </div>
  )
}

const Missions = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const prefetchTab = usePrefetchMissionsTab()
  const fetchingCount = useIsFetching({ queryKey: ['missions-admin'] })

  const { globalFilters, setGlobalFilter, dateRange, setDateRange, activateScope } = useFilterStore()

  const [tab, setTab] = useState(readTab)
  /* Un onglet n'est monté (et ne charge rien) qu'à sa première visite, puis reste en mémoire */
  const [visited, setVisited] = useState(() => new Set([readTab()]))
  const [detail, setDetail] = useState(null)
  const [action, setAction] = useState(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { activateScope('missions') }, [activateScope])

  const selectTab = useCallback((id) => {
    setTab(id)
    setVisited((v) => (v.has(id) ? v : new Set(v).add(id)))
    try { sessionStorage.setItem(TAB_KEY, id) } catch { /* ignore */ }
  }, [])

  /* Raccourcis : 1 / 2 / 3 pour changer d'onglet (hors champs de saisie) */
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const i = Number(e.key) - 1
      if (TABS[i]) selectTab(TABS[i].id)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectTab])

  const onTabKeyDown = (e) => {
    const i = TABS.findIndex((t) => t.id === tab)
    if (e.key === 'ArrowRight') selectTab(TABS[(i + 1) % TABS.length].id)
    if (e.key === 'ArrowLeft') selectTab(TABS[(i - 1 + TABS.length) % TABS.length].id)
  }

  /* Recherche avec debounce */
  const [searchInput, setSearchInput] = useState(globalFilters.search || '')
  const debouncedSearch = useDebounce(searchInput, 350)
  useEffect(() => {
    if (debouncedSearch !== (globalFilters.search || '')) setGlobalFilter('search', debouncedSearch)
  }, [debouncedSearch])
  useEffect(() => {
    if (!globalFilters.search && searchInput !== '') setSearchInput('')
  }, [globalFilters.search])

  const periodValue = dateRange?.key ?? PERIOD_OPTIONS.find((o) => o.label === dateRange?.label)?.value ?? 'all'

  const hasListFilters = [globalFilters.search, globalFilters.status, globalFilters.type, globalFilters.category, globalFilters.attention]
    .some(Boolean)
  const activeFiltersCount = (hasListFilters ? 1 : 0) + (dateRange ? 1 : 0)

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setGlobalFilter('search', '')
    ;['status', 'type', 'category', 'attention', 'cancelledBy', 'artisanId', 'clientId'].forEach((k) => setGlobalFilter(k, null))
    setDateRange('all')
  }, [setGlobalFilter, setDateRange])

  /* Une alerte de la vue d'ensemble ouvre la liste déjà filtrée sur sa cause */
  const pickAlert = useCallback((code) => {
    setGlobalFilter('status', null)
    setGlobalFilter('attention', code)
    selectTab('missions')
  }, [setGlobalFilter, selectTab])

  /* Rafraîchir : seules les requêtes actuellement affichées sont relancées */
  const refresh = () => qc.invalidateQueries({ queryKey: ['missions-admin'] })

  const kpis = qc.getQueryState(['missions-admin', 'section', 'kpis', {
    start: dateRange?.start || null, end: dateRange?.end || null,
  }])
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(t) }, [])

  const copy = useCallback((txt) => {
    navigator.clipboard.writeText(txt || '')
    toast.success('Identifiant copié')
  }, [])

  const openDetail = useCallback((row) => setDetail(row), [])
  const closeDetail = useCallback(() => setDetail(null), [])
  const openPage = useCallback((row) => navigate(`/missions/${row.id_mission}`), [navigate])
  const doAction = useCallback((type, mission) => setAction({ type, mission }), [])
  const closeAction = useCallback(() => setAction(null), [])
  /* Après une action réussie, le tiroir (qui affiche l'ancien statut) est refermé : la liste se met à jour seule */
  const actionDone = useCallback(() => { setAction(null); setDetail(null) }, [])

  const handleExport = async () => {
    try {
      setExporting(true)
      const items = await fetchMissionsForExport({ onlyPeriod: tab !== 'missions' })
      if (!items.length) { toast('Rien à exporter'); return }
      const rows = items.map((m) => ({
        ID: m.id_mission, Titre: m.title || '', Description: m.description || '',
        Client: m.client_name || '', 'Téléphone client': m.client_phone || '',
        Artisan: m.artisan_name || 'Non assigné', Catégorie: m.category_name || '', Zone: m.zone || '',
        Type: TYPE_LABEL[m.mission_type] || m.mission_type, Mode: MODE_LABEL[m.mission_mode] || m.mission_mode,
        Tarification: PRICING_LABEL[m.pricing_type] || m.pricing_type || '',
        Statut: statusBadge(m.status).label, 'Annulée par': CANCEL_ACTOR[m.cancelled_by] || '', Motif: m.cancellation_label || m.cancellation_reason || '',
        Montant: m.amount, 'Commission Handyra': m.handyra_fee, Encaissé: m.paid_amount, Remboursé: m.refunded_amount,
        Séquestre: ESCROW[m.escrow_state]?.label || '', Tentatives: num(m.attempts),
        'Délai acceptation (min)': m.accept_delay_min ?? '', 'Durée (min)': m.duration_min ?? '', Note: m.rating ?? '',
        'Créée le': m.created_at ? formatDateTime(m.created_at) : '', 'Terminée le': m.ended_at ? formatDateTime(m.ended_at) : '',
      }))
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const headers = Object.keys(rows[0])
      const text = '﻿' + [headers.map(esc).join(';'), ...rows.map((r) => headers.map((h) => esc(r[h])).join(';'))].join('\n')
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `missions_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${items.length} mission${items.length > 1 ? 's' : ''} exportée${items.length > 1 ? 's' : ''}`)
    } catch (e) {
      toast.error(e.message || "Échec de l'export")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          {/* Ligne 1 : navigation + actions globales. Position IDENTIQUE sur tous les onglets. */}
          <div className={`${styles.headRow} ${tab === 'missions' ? styles.headRowRuled : ''}`}>
            <nav className={styles.tabs} role="tablist" aria-label="Sections missions" onKeyDown={onTabKeyDown}>
              {TABS.map((t, i) => (
                <button key={t.id} type="button" role="tab" id={`mis-tab-${t.id}`} aria-selected={tab === t.id}
                  aria-controls={`mis-panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1}
                  title={`${t.label} (${i + 1})`}
                  className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                  onClick={() => selectTab(t.id)}
                  onMouseEnter={() => tab !== t.id && !visited.has(t.id) && prefetchTab(t.id)}
                  onFocus={() => tab !== t.id && !visited.has(t.id) && prefetchTab(t.id)}
                >
                  {t.label}
                  {t.id === 'overview' && <AlertCount />}
                </button>
              ))}
            </nav>

            <div className={styles.actions}>
              <span className={styles.updated} aria-live="polite">
                {kpis?.dataUpdatedAt ? `Mis à jour ${relativeTime(kpis.dataUpdatedAt)}` : ''}
              </span>
              <div className={styles.periodSelect}>
                <Select size="md" options={PERIOD_OPTIONS} value={periodValue} onChange={(v) => setDateRange(v)} />
              </div>
              <Button variant="outline" size="md" icon={RefreshCw} onClick={refresh}
                isLoading={fetchingCount > 0} aria-label="Rafraîchir" title="Rafraîchir" />
              <Button variant="outline" size="md" icon={Download} onClick={handleExport} isLoading={exporting}
                title={tab === 'missions' ? 'Exporter les résultats filtrés' : 'Exporter les missions de la période'}>
                Exporter
              </Button>
            </div>
          </div>

          {/* Ligne 2 : filtres propres à la liste (grille fixe, ne touche jamais aux actions) */}
          {tab === 'missions' && (
            <ListFilters searchInput={searchInput} setSearchInput={setSearchInput}
              onClear={clearFilters} activeCount={activeFiltersCount} />
          )}
        </div>
      </header>

      <div className={styles.content}>
        {visited.has('overview') && (
          <div id="mis-panel-overview" role="tabpanel" aria-labelledby="mis-tab-overview" hidden={tab !== 'overview'} className={styles.tabPanel}>
            <Suspense fallback={<TabFallback />}><MissionsOverview onPickAlert={pickAlert} onOpen={openDetail} /></Suspense>
          </div>
        )}
        {visited.has('analytics') && (
          <div id="mis-panel-analytics" role="tabpanel" aria-labelledby="mis-tab-analytics" hidden={tab !== 'analytics'} className={styles.tabPanel}>
            <Suspense fallback={<TabFallback />}><MissionsAnalytics /></Suspense>
          </div>
        )}
        {visited.has('missions') && (
          <div id="mis-panel-missions" role="tabpanel" aria-labelledby="mis-tab-missions" hidden={tab !== 'missions'} className={styles.tabPanel}>
            <Suspense fallback={<TabFallback />}>
              <MissionsTable onOpen={openDetail} onOpenPage={openPage} onCopy={copy} onAction={doAction}
                onClear={clearFilters} hasFilters={activeFiltersCount > 0} />
            </Suspense>
          </div>
        )}
      </div>

      {detail && (
        <Suspense fallback={null}>
          <MissionDrawer key={detail.id_mission} seed={detail} onClose={closeDetail} onCopy={copy}
            onOpenPage={openPage} onAction={doAction} />
        </Suspense>
      )}
      {action && (
        <Suspense fallback={null}>
          <MissionActionModals action={action} onClose={closeAction} onDone={actionDone} />
        </Suspense>
      )}
    </div>
  )
}

/* Pastille d'alertes : réutilise la section « alerts » (même cache que la bande d'alertes) */
const AlertCount = () => {
  const q = useMissionSection('alerts')
  const n = (q.data || []).reduce((s, a) => s + num(a.count), 0)
  return n > 0 ? <span className={styles.tabBadge} aria-label={`${n} missions à traiter`}>{n}</span> : null
}

export default Missions