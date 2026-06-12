import { ReactNode } from 'react'
import { Redirect } from 'wouter'
import { Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { useLocation } from 'wouter'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'super_admin' | 'encoder'
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

function ForbiddenPage() {
  const [, setLocation] = useLocation()
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">403 — Access Denied</h1>
        <p className="text-muted-foreground text-sm mb-6">
          You don't have permission to access this page. Contact your system administrator.
        </p>
        <Button onClick={() => setLocation('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { profile, loading } = useAuth()

  // While checking session — show spinner (prevents flash of login page on refresh)
  if (loading) return <FullPageSpinner />

  // Not logged in → go to login
  if (!profile) return <Redirect to="/login" />

  // Admin-only route — show 403 instead of silent redirect
  if (requiredRole === 'super_admin' && profile.role !== 'super_admin') {
    return <ForbiddenPage />
  }

  // Encoder-or-above required (viewer blocked)
  if (requiredRole === 'encoder' && profile.role === 'viewer') {
    return <ForbiddenPage />
  }

  return <>{children}</>
}
