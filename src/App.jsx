import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import {Spinner} from './components/ui'
import { useAuthStore } from './store/authStore'
import { supabase } from './lib/supabase'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import './App.css'

// Lazy load pages
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

// Autorise la route si l'utilisateur a au moins une des permissions demandées
const RequirePermission = ({ anyOf, children }) => {
  const allowed = useAuthStore((s) => anyOf.some((p) => s.permissions.includes(p)))
  return allowed ? children : <Navigate to="/dashboard" replace />
}

function App() {
  const { isAuthenticated } = useAuthStore()

  // Valide la session et le rôle admin au démarrage
  useEffect(() => {
    useAuthStore.getState().checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const store = useAuthStore.getState()
      if (event === 'SIGNED_OUT') store.handleSignedOut()
      if (event === 'TOKEN_REFRESHED') store.handleTokenRefreshed(session)
    })

    return () => subscription.unsubscribe()
  }, [])

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