import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import { Button, Input, Select, Spinner } from '../../components/ui'
import { Search, Download, RefreshCw, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDebounce } from '../../hooks/useDebounce'
import { useFilterStore } from '../../store/filterStore'
import { usePaymentSection, usePrefetchPaymentsTab, fetchPaymentsForExport } from '../../hooks/usePayments'
import { formatDateTime } from '../../utils/formatters'
import {
  TABS, PERIOD_OPTIONS, STATUS_OPTIONS, METHOD_OPTIONS, FLOW_OPTIONS,
  FLOW_LABEL, ESCROW, methodLabel, subLabel, statusBadge, relativeTime,
} from './paymentsConfig'
import styles from './Payments.module.css'

/* Chaque onglet et le tiroir sont des « chunks » séparés : téléchargés au premier besoin */
const PaymentsOverview = lazy(() => import('./PaymentsOverview'))
const PaymentsAnalytics = lazy(() => import('./PaymentsAnalytics'))
const PaymentsTransactions = lazy(() => import('./PaymentsTransactions'))
const PaymentDrawer = lazy(() => import('./PaymentDrawer'))

const TabFallback = () => (
  <div className={styles.loading}><Spinner size="lg" /></div>
)

const TAB_KEY = 'payments:tab'
const readTab = () => {
  try { const t = sessionStorage.getItem(TAB_KEY); return TABS.some((x) => x.id === t) ? t : 'overview' } catch { return 'overview' }
}

const Payments = () => {
  const qc = useQueryClient()
  const prefetchTab = usePrefetchPaymentsTab()
  const fetchingCount = useIsFetching({ queryKey: ['payments'] })

  const { globalFilters, setGlobalFilter, dateRange, setDateRange, activateScope } = useFilterStore()

  const [tab, setTab] = useState(readTab)
  /* Un onglet n'est monté (et ne charge rien) qu'à sa première visite, puis reste en mémoire */
  const [visited, setVisited] = useState(() => new Set([readTab()]))
  const [detail, setDetail] = useState(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { activateScope('payments') }, [activateScope])

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

  const periodValue =
    dateRange?.key ?? PERIOD_OPTIONS.find((o) => o.label === dateRange?.label)?.value ?? 'all'

  const hasListFilters = [globalFilters.search, globalFilters.status, globalFilters.method, globalFilters.flow].some(Boolean)
  const activeFiltersCount = (hasListFilters ? 1 : 0) + (dateRange ? 1 : 0)

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setGlobalFilter('search', '')
    setGlobalFilter('status', null)
    setGlobalFilter('method', null)
    setGlobalFilter('flow', null)
    setDateRange('all')
  }, [setGlobalFilter, setDateRange])

  /* Rafraîchir : seules les requêtes actuellement affichées sont relancées */
  const refresh = () => qc.invalidateQueries({ queryKey: ['payments'] })

  /* Indicateur « mis à jour » (lit le cache des KPI, ne déclenche aucun appel) */
  const kpis = qc.getQueryState(['payments', 'section', 'kpis', {
    start: dateRange?.start || null, end: dateRange?.end || null,
  }])
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(t) }, [])

  const copy = useCallback((txt) => {
    navigator.clipboard.writeText(txt || '')
    toast.success('Référence copiée')
  }, [])

  const openDetail = useCallback((row) => setDetail(row), [])
  const closeDetail = useCallback(() => setDetail(null), [])

  const handleExport = async () => {
    try {
      setExporting(true)
      const items = await fetchPaymentsForExport({ onlyPeriod: tab !== 'transactions' })
      if (!items.length) { toast('Rien à exporter'); return }
      const rows = items.map((p) => ({
        Date: p.occurred_at ? formatDateTime(p.occurred_at) : '',
        Flux: FLOW_LABEL[p.flow_type] || p.flow_type,
        Type: subLabel(p.sub_type) || '',
        Sens: p.direction === 'OUT' ? 'Sortie' : 'Entrée',
        Référence: p.reference, Partie: p.party_name, Mission: p.mission_description,
        Artisan: p.artisan_name, Offre: p.plan_name, Montant: p.amount,
        'Part plateforme': p.platform_amount, 'Net artisan': p.net_amount, Frais: p.fees,
        Méthode: methodLabel(p.method), Réseau: p.network, Statut: statusBadge(p.status).label,
        Séquestre: ESCROW[p.escrow_status]?.label || '', 'Réf. passerelle': p.provider_ref,
      }))
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const headers = Object.keys(rows[0])
      const text = '﻿' + [headers.map(esc).join(';'), ...rows.map((r) => headers.map((h) => esc(r[h])).join(';'))].join('\n')
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${items.length} ligne${items.length > 1 ? 's' : ''} exportée${items.length > 1 ? 's' : ''}`)
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
          <div className={`${styles.headRow} ${tab === 'transactions' ? styles.headRowRuled : ''}`}>
            <nav className={styles.tabs} role="tablist" aria-label="Sections paiements" onKeyDown={onTabKeyDown}>
              {TABS.map((t, i) => (
                <button key={t.id} type="button" role="tab" id={`pay-tab-${t.id}`} aria-selected={tab === t.id}
                  aria-controls={`pay-panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1}
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
                title={tab === 'transactions' ? 'Exporter les résultats filtrés' : 'Exporter les transactions de la période'}>
                Exporter
              </Button>
            </div>
          </div>

          {/* Ligne 2 : filtres propres aux transactions (grille fixe, ne touche jamais aux actions) */}
          {tab === 'transactions' && (
            <div className={styles.filterBar} role="search">
              <Input size="md" icon={Search} placeholder="Référence, nom, mission…"
                value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
              <Select size="md" options={FLOW_OPTIONS} value={globalFilters.flow || 'all'}
                onChange={(v) => setGlobalFilter('flow', v === 'all' ? null : v)} />
              <Select size="md" options={STATUS_OPTIONS} value={globalFilters.status || 'all'}
                onChange={(v) => setGlobalFilter('status', v === 'all' ? null : v)} />
              <Select size="md" options={METHOD_OPTIONS} value={globalFilters.method || 'all'}
                onChange={(v) => setGlobalFilter('method', v === 'all' ? null : v)} />
              <button type="button" className={styles.clearBtn} onClick={clearFilters}
                disabled={activeFiltersCount === 0}>
                <X size={11} /> Effacer
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={styles.content}>
        {/* Seuls les onglets déjà visités sont montés ; les autres n'ont chargé ni code ni données */}
        {visited.has('overview') && (
          <div id="pay-panel-overview" role="tabpanel" aria-labelledby="pay-tab-overview" hidden={tab !== 'overview'} className={styles.tabPanel}>
            <Suspense fallback={<TabFallback />}><PaymentsOverview /></Suspense>
          </div>
        )}
        {visited.has('analytics') && (
          <div id="pay-panel-analytics" role="tabpanel" aria-labelledby="pay-tab-analytics" hidden={tab !== 'analytics'} className={styles.tabPanel}>
            <Suspense fallback={<TabFallback />}><PaymentsAnalytics /></Suspense>
          </div>
        )}
        {visited.has('transactions') && (
          <div id="pay-panel-transactions" role="tabpanel" aria-labelledby="pay-tab-transactions" hidden={tab !== 'transactions'} className={styles.tabPanel}>
            <Suspense fallback={<TabFallback />}>
              <PaymentsTransactions onOpen={openDetail} onCopy={copy} onClear={clearFilters} hasFilters={activeFiltersCount > 0} />
            </Suspense>
          </div>
        )}
      </div>

      {detail && (
        <Suspense fallback={null}>
          <PaymentDrawer
            key={`${detail.flow_type}:${detail.entry_id}`}
            seed={detail} onClose={closeDetail} onCopy={copy} onOpenRelated={openDetail}
          />
        </Suspense>
      )}
    </div>
  )
}

/* Pastille d'alertes : réutilise la section « alerts » (même cache que la bande d'alertes) */
const AlertCount = () => {
  const q = usePaymentSection('alerts')
  const n = q.data?.length || 0
  return n > 0 ? <span className={styles.tabBadge} aria-label={`${n} alertes`}>{n}</span> : null
}

export default Payments