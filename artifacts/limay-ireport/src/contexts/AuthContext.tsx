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

async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, office_id, is_active, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()
    return (data as Profile) ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 4000)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        clearTimeout(timer)
        if (event === 'SIGNED_OUT' || !session?.user) {
          setProfile(null)
          setLoading(false)
          return
        }
        const p = await getProfile(session.user.id)
        setProfile(p)
        setLoading(false)
      }
    )
    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    try {
      const timeoutPromise = new Promise<{ data: null; error: Error }>(resolve =>
        setTimeout(() => resolve({ data: null, error: new Error('Request timed out. Please try again.') }), 10000)
      )
      const authPromise = supabase.auth.signInWithPassword({ email, password })
      const result = await Promise.race([authPromise, timeoutPromise])
      if (result.error) return { error: result.error.message }
      if (result.data && 'user' in result.data && result.data.user) {
        const p = await getProfile(result.data.user.id)
        setProfile(p)
      }
      return { error: null }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Something went wrong.' }
    }
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
