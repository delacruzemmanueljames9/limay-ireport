import { Link, useLocation } from 'wouter'
import { LayoutDashboard, FolderOpen, ArrowLeftRight, BarChart3, Settings, Shield, LogIn } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  roles?: ('super_admin' | 'admin' | 'encoder' | 'viewer')[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cases', label: 'Cases / Kaso', icon: FolderOpen },
  { href: '/referrals', label: 'Referrals', icon: ArrowLeftRight, roles: ['super_admin', 'admin', 'encoder'] },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation()
  const { profile } = useAuth()
  const role = profile?.role

  const visibleItems = navItems.filter(item => {
    if (!item.roles) return true
    if (!profile) return false
    return item.roles.includes(role as 'super_admin' | 'admin' | 'encoder' | 'viewer')
  })

  function isActive(href: string) {
    if (href === '/dashboard') return location === '/dashboard' || location === '/'
    return location.startsWith(href)
  }

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-sidebar-foreground">LIMAY iREPORT</p>
            <p className="text-xs text-sidebar-foreground/60 leading-tight">Municipality of Limay</p>
          </div>
        </div>
      </div>

      {profile?.office && (
        <div className="mx-3 mt-3 px-3 py-2 bg-sidebar-accent rounded-md">
          <p className="text-xs text-sidebar-accent-foreground/70 uppercase tracking-wide">Office</p>
          <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{profile.office.name}</p>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            data-testid={`nav-${label.toLowerCase().replace(/[\s/]+/g, '-')}`}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}

        {role === 'super_admin' && (
          <>
            <div className="my-2 border-t border-sidebar-border" />
            <Link
              href="/admin"
              onClick={onClose}
              data-testid="nav-admin"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                location.startsWith('/admin')
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border">
        {profile ? (
          <div className="px-1 space-y-0.5">
            <p className="text-xs text-sidebar-foreground/70 font-medium truncate">{profile.full_name}</p>
            <p className="text-xs text-sidebar-foreground/50">
              {role === 'super_admin' ? '⭐ Super Admin' : role === 'admin' ? '🛠️ Admin' : role === 'encoder' ? '✏️ Encoder' : '👁 Viewer'}
            </p>
          </div>
        ) : (
          <Link href="/login" onClick={onClose}>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
