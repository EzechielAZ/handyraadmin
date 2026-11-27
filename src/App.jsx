import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import { Spinner } from './components/ui'
import { useAuthStore } from './store/authStore'
import { supabase } from './lib/supabase'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import './App.css'

// ─── Pages métier ───
const Artisans         = lazy(() => import('./pages/Artisans'))
const ArtisanDetail    = lazy(() => import('./pages/Artisans/ArtisanDetail'))
const Missions         = lazy(() => import('./pages/Missions'))
const MissionDetail    = lazy(() => import('./pages/Missions/MissionDetail'))
const Users            = lazy(() => import('./pages/Users'))
const UserDetail       = lazy(() => import('./pages/Users/UserDetail'))
const Payments         = lazy(() => import('./pages/Payments'))
const HPO              = lazy(() => import('./pages/HPO'))
const HPOIndex         = lazy(() => import('./pages/HPO/index'))
const SupervisorsList  = lazy(() => import('./pages/HPO/SupervisorsList'))
const AgentsList       = lazy(() => import('./pages/HPO/AgentsList'))
const ContractsList    = lazy(() => import('./pages/HPO/ContractsList'))
const ArbitrationsList = lazy(() => import('./pages/HPO/ArbitrationsList'))
const AlertsList       = lazy(() => import('./pages/HPO/AlertsList'))
const Hardware         = lazy(() => import('./pages/Hardware'))
const NewHardware      = lazy(() => import('./pages/Hardware/NewHardware'))
const HardwareDetail   = lazy(() => import('./pages/Hardware/HardwareDetail'))
const Reports          = lazy(() => import('./pages/Reports'))
const Subscriptions    = lazy(() => import('./pages/Subscriptions'))
const Settings         = lazy(() => import('./pages/Settings'))
const Categories       = lazy(() => import('./pages/Categories'))
const AppSettings      = lazy(() => import('./pages/AppSettings'))

// ─── Module Documentation ───
// Les barrels (Releases/, Issues/) exposent désormais `default` grâce au
// correctif des index.js. Les dossiers sans barrel (Features/, Adrs/,
// Glossary/) utilisent `index.jsx` comme point d'entrée — donc `lazy()` y
// trouve aussi un `default`. Uniforme et simple.
const DocsDashboard      = lazy(() => import('./pages/Docs/Dashboard'))
const FeaturesPage       = lazy(() => import('./pages/Docs/Features'))
const FeatureDetailPage  = lazy(() => import('./pages/Docs/Features/FeatureDetail'))
const ReleasesPage       = lazy(() => import('./pages/Docs/Releases'))
const ReleaseDetailPage  = lazy(() => import('./pages/Docs/Releases/ReleaseDetail'))
const IssuesPage         = lazy(() => import('./pages/Docs/Issues'))
const IssueDetailPage    = lazy(() => import('./pages/Docs/Issues/IssueDetail'))
const PagesPage          = lazy(() => import('./pages/Docs/Pages'))
const PageDetailPage     = lazy(() => import('./pages/Docs/Pages/PageDetail'))
const AdrsPage           = lazy(() => import('./pages/Docs/Adrs'))
const AdrDetailPage      = lazy(() => import('./pages/Docs/Adrs/AdrDetail'))
const RunbooksPage       = lazy(() => import('./pages/Docs/Runbooks'))
const GlossaryPage       = lazy(() => import('./pages/Docs/Glossary'))
const ActivityPage       = lazy(() => import('./pages/Docs/Activity'))
const TestCampaignsPage  = lazy(() => import('./pages/Tests/Campaigns'))
const TestCampaignDetail = lazy(() => import('./pages/Tests/Campaigns/CampaignDetail'))
const TestScenariosPage  = lazy(() => import('./pages/Tests/Scenarios'))
const TestScenarioDetail = lazy(() => import('./pages/Tests/Scenarios/ScenarioDetail'))
const TestFindingsPage   = lazy(() => import('./pages/Tests/Findings'))
const Portal = lazy(() => import('./pages/Portal'))
const TestFindingDetail  = lazy(() => import('./pages/Tests/Findings/FindingDetail'))

// Autorise la route si l'utilisateur a au moins une des permissions demandées
const RequirePermission = ({ anyOf, children }) => {
  const allowed = useAuthStore((s) => anyOf.some((p) => s.permissions.includes(p)))
  return allowed ? children : <Navigate to="/dashboard" replace />
}

function App() {
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    useAuthStore.getState().checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const store = useAuthStore.getState()
      if (event === 'SIGNED_OUT') store.handleSignedOut()
      if (event === 'TOKEN_REFRESHED') store.handleTokenRefreshed(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Portail testeur : public, accessible par lien d'invitation (sans compte)
  if (window.location.pathname.startsWith('/join/')) {
    return (
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes><Route path="/join/:token/*" element={<Portal />} /></Routes>
        </Suspense>
      </BrowserRouter>
    )
  }

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*"      element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar />
        <div className="shell">
          <TopBar />
          <main className="content">
            <ErrorBoundary>
            <Suspense fallback={
              <div className="suspense-fallback">
                <Spinner size="lg" />
              </div>
            }>
              <Routes>
                <Route path="/"               element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard"      element={<Dashboard />} />
                <Route path="/artisans"       element={<Artisans />} />
                <Route path="/artisans/:id"   element={<ArtisanDetail />} />
                <Route path="/missions"       element={<Missions />} />
                <Route path="/missions/:id"   element={<MissionDetail />} />
                <Route path="/users"          element={<Users />} />
                <Route path="/users/:id"      element={<UserDetail />} />
                <Route path="/payments"       element={<Payments />} />
                <Route path="/hpo"            element={<HPO />}>
                  <Route index               element={<HPOIndex />} />
                  <Route path="supervisors"  element={<SupervisorsList />} />
                  <Route path="agents"       element={<AgentsList />} />
                  <Route path="contracts"    element={<ContractsList />} />
                  <Route path="arbitrations" element={<ArbitrationsList />} />
                  <Route path="alerts"       element={<AlertsList />} />
                </Route>
                <Route path="/hardware"       element={<Hardware />} />
                <Route path="/hardware/new"   element={<NewHardware />} />
                <Route path="/hardware/:id"   element={<HardwareDetail />} />
                <Route path="/reports"        element={<Reports />} />
                <Route path="/subscriptions"  element={<Subscriptions />} />
                <Route path="/settings"       element={<Settings />} />
                <Route path="/categories"     element={
                  <RequirePermission anyOf={['view_categories', 'manage_categories']}>
                    <Categories />
                  </RequirePermission>
                } />
                <Route path="/app-settings"   element={
                  <RequirePermission anyOf={['manage_app_settings']}>
                    <AppSettings />
                  </RequirePermission>
                } />

                {/* ─── Module Documentation ─── */}
                <Route path="/docs" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs', 'manage_features', 'manage_pages', 'manage_issues', 'manage_releases', 'manage_adrs', 'manage_runbooks', 'manage_glossary']}>
                    <DocsDashboard />
                  </RequirePermission>
                } />
                <Route path="/docs/features" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs', 'manage_features']}>
                    <FeaturesPage />
                  </RequirePermission>
                } />
                <Route path="/docs/features/:ref" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs', 'manage_features']}>
                    <FeatureDetailPage />
                  </RequirePermission>
                } />
                <Route path="/docs/releases" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs', 'manage_releases']}>
                    <ReleasesPage />
                  </RequirePermission>
                } />
                <Route path="/docs/releases/:ref" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs', 'manage_releases']}>
                    <ReleaseDetailPage />
                  </RequirePermission>
                } />
                <Route path="/docs/issues" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs', 'manage_issues']}>
                    <IssuesPage />
                  </RequirePermission>
                } />
                <Route path="/docs/issues/:ref" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs', 'manage_issues']}>
                    <IssueDetailPage />
                  </RequirePermission>
                } />
                <Route path="/docs/pages" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs', 'manage_pages']}>
                    <PagesPage />
                  </RequirePermission>
                } />
                <Route path="/docs/pages/:ref" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs', 'manage_pages']}>
                    <PageDetailPage />
                  </RequirePermission>
                } />
                <Route path="/docs/adrs" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs', 'manage_adrs']}>
                    <AdrsPage />
                  </RequirePermission>
                } />
                <Route path="/docs/adrs/:ref" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs', 'manage_adrs']}>
                    <AdrDetailPage />
                  </RequirePermission>
                } />
                <Route path="/docs/runbooks" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs', 'manage_runbooks']}>
                    <RunbooksPage />
                  </RequirePermission>
                } />
                <Route path="/docs/glossary" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs', 'manage_glossary']}>
                    <GlossaryPage />
                  </RequirePermission>
                } />
                <Route path="/docs/activity" element={
                  <RequirePermission anyOf={['view_docs', 'manage_docs']}>
                    <ActivityPage />
                  </RequirePermission>
                } />

                {/* ─── Module Tests de validation ─── */}
                <Route path="/tests" element={
                  <RequirePermission anyOf={['view_tests', 'manage_tests']}>
                    <TestCampaignsPage />
                  </RequirePermission>
                } />
                <Route path="/tests/campaigns/:ref" element={
                  <RequirePermission anyOf={['view_tests', 'manage_tests']}>
                    <TestCampaignDetail />
                  </RequirePermission>
                } />
                <Route path="/tests/scenarios" element={
                  <RequirePermission anyOf={['view_tests', 'manage_tests']}>
                    <TestScenariosPage />
                  </RequirePermission>
                } />
                <Route path="/tests/scenarios/:ref" element={
                  <RequirePermission anyOf={['view_tests', 'manage_tests']}>
                    <TestScenarioDetail />
                  </RequirePermission>
                } />
                <Route path="/tests/findings" element={
                  <RequirePermission anyOf={['view_tests', 'manage_tests']}>
                    <TestFindingsPage />
                  </RequirePermission>
                } />
                <Route path="/tests/findings/:ref" element={
                  <RequirePermission anyOf={['view_tests', 'manage_tests']}>
                    <TestFindingDetail />
                  </RequirePermission>
                } />

                <Route path="*"               element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App