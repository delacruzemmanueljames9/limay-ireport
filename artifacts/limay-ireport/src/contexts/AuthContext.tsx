import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Profile } from '@/types'

const SUPABASE_URL = 'https://inovdbudrzicbgkcnbpd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlub3ZkYnVkcnppY2Jna2NuYnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDY1NzEsImV4cCI6MjA5NjgyMjU3MX0.fBJ418qpVpnGusbFPV9_GriTF2OttI7-lCHdLUxZbZU'

interface AuthContextType {
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

async function getProfile(userId: string, accessToken: string): Promise<Profile | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=id,full_name,role,office_id,email,is_active,created_at,updated_at,office:offices(id,name,office_type,address,contact_number,created_at)&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )
    const data = await res.json()
    return Array.isArray(data) && data.length > 0 ? data[0] as Profile : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSession() {
      try {
        const raw = localStorage.getItem('sb-session')
        if (!raw) { setLoading(false); return }
        const session = JSON.parse(raw)
        if (!session?.user?.id || !session?.access_token) { setLoading(false); return }
        const p = await getProfile(session.user.id, session.access_token)
        setProfile(p)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    loadSession()
  }, [])

  async function signIn(email: string, password: string) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok || data.error) return { error: data.error_description || 'Invalid credentials.' }
      localStorage.setItem('sb-session', JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
      }))
      const p = await getProfile(data.user.id, data.access_token)
      setProfile(p)
      return { error: null }
    } catch {
      return { error: 'Connection error. Please try again.' }
    }
  }

  async function signOut() {
    localStorage.removeItem('sb-session')
    setProfile(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
