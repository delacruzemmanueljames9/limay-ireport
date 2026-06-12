import { ReactNode } from 'react'
import { Redirect } from 'wouter'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'super_admin' | 'encoder'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return <Redirect to="/login" />
  }

  if (requiredRole === 'super_admin' && profile.role !== 'super_admin') {
    return <Redirect to="/" />
  }

  if (requiredRole === 'encoder' && profile.role === 'viewer') {
    return <Redirect to="/" />
  }

  return <>{children}</>
}
