import { useState } from 'react'
import { useLocation } from 'wouter'
import { Eye, EyeOff, Shield, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export default function LoginPage() {
  const [, setLocation] = useLocation()
  const { signIn, profile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (profile) {
    setLocation('/')
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) {
      setError(err.includes('Invalid') ? 'Invalid email or password. Please try again.' : err)
      setLoading(false)
    } else {
      setLocation('/')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(218,64%,22%)] px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 25px 25px, white 2px, transparent 0)', backgroundSize: '50px 50px' }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo / Badge */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-20 w-20 rounded-full bg-[hsl(38,90%,55%)] flex items-center justify-center mb-4 shadow-lg">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide text-center">
            LIMAY iREPORT SYSTEM
          </h1>
          <p className="text-sm text-white/70 text-center mt-2 max-w-xs leading-relaxed italic">
            "Isang Click, Isang Aksyon — Para sa Kaligtasan ng Bawat Limayeño"
          </p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardContent className="p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">Sign In</h2>
              <p className="text-sm text-muted-foreground">Enter your credentials to access the system</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@limay.gov.ph"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    data-testid="input-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2" data-testid="text-error">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="button-submit"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</>
                ) : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/40 mt-6">
          Republic of the Philippines &bull; Province of Bataan<br />
          Municipality of Limay &bull; Official Government System
        </p>
      </div>
    </div>
  )
}
