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
      {/* Public — login page */}
      <Route path="/login" component={LoginPage} />

      {/* Root → dashboard */}
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

      {/* PUBLIC — no login required */}
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/cases" component={CasesPage} />
      <Route path="/cases/:id" component={CaseDetailPage} />
      <Route path="/reports" component={ReportsPage} />

      {/* PROTECTED — encoder + super_admin only */}
      <Route path="/cases/new">
        <ProtectedRoute requiredRole="encoder">
          <NewCasePage />
        </ProtectedRoute>
      </Route>
      <Route path="/referrals">
        <ProtectedRoute requiredRole="encoder">
          <ReferralsPage />
        </ProtectedRoute>
      </Route>

      {/* PROTECTED — super_admin only */}
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
          <WouterRouter base="">
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
