import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthContextType {
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Always stop loading after 3 seconds max
    const timeout = setTimeout(() => setLoading(false), 3000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, role, office_id, is_active, created_at, updated_at')
          .eq('id', session.user.id)
          .maybeSingle()
        setProfile(data as Profile ?? null)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setProfile(null)
          return
        }
        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, role, office_id, is_active, created_at, updated_at')
            .eq('id', session.user.id)
            .maybeSingle()
          setProfile(data as Profile ?? null)
        }
      }
    )
    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    if (data.user) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, full_name, role, office_id, is_active, created_at, updated_at')
        .eq('id', data.user.id)
        .maybeSingle()
      setProfile(p as Profile ?? null)
    }
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
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
