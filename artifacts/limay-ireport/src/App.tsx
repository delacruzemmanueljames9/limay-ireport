import { Switch, Route, Redirect, Router as WouterRouter } from 'wouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import CasesPage from '@/pages/CasesPage'
import NewCasePage from '@/pages/NewCasePage'
import CaseDetailPage from '@/pages/CaseDetailPage'
import ReferralsPage from '@/pages/ReferralsPage'
import ReportsPage from '@/pages/ReportsPage'
import AdminPage from '@/pages/AdminPage'
import NotFound from '@/pages/not-found'

const queryClient = new QueryClient()

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/cases/new">
        <ProtectedRoute requiredRole="encoder">
          <NewCasePage />
        </ProtectedRoute>
      </Route>
      <Route path="/cases/:id">
        {() => (
          <ProtectedRoute>
            <CaseDetailPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/cases">
        <ProtectedRoute>
          <CasesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/referrals">
        <ProtectedRoute requiredRole="encoder">
          <ReferralsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          <ReportsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute requiredRole="super_admin">
          <AdminPage />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
