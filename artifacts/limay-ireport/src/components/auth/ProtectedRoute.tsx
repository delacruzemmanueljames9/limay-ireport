import { ReactNode } from 'react'
import { Redirect } from 'wouter'
import { Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { useLocation } from 'wouter'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'super_admin' | 'admin' | 'encoder'
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
        <Button onClick={() => setLocation('/dashboard')}>Go to Dashboard</Button>
      </div>
    </div>
  )
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!profile) {
    try {
      const raw = localStorage.getItem('sb-session')
      if (!raw) return <Redirect to="/login" />
      const session = JSON.parse(raw)
      if (!session?.user?.id) return <Redirect to="/login" />
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      )
    } catch {
      return <Redirect to="/login" />
    }
  }

  if (requiredRole === 'super_admin' && profile.role !== 'super_admin') return <ForbiddenPage />
  if (requiredRole === 'encoder' && profile.role === 'viewer') return <ForbiddenPage />

  return <>{children}</>
}
