import { Link, useLocation } from 'wouter'
import { LayoutDashboard, FolderOpen, ArrowLeftRight, BarChart3, Settings, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cases', label: 'Cases / Kaso', icon: FolderOpen },
  { href: '/referrals', label: 'Referrals', icon: ArrowLeftRight },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation()
  const { profile } = useAuth()

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Header */}
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

      {/* Office badge */}
      {profile?.office && (
        <div className="mx-3 mt-3 px-3 py-2 bg-sidebar-accent rounded-md">
          <p className="text-xs text-sidebar-accent-foreground/70 uppercase tracking-wide">Office</p>
          <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{profile.office.name}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? location === '/' : location.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}

        {profile?.role === 'super_admin' && (
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
        )}
      </nav>

      {/* Role badge */}
      <div className="px-4 py-3 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/50 capitalize">
          Role: <span className="text-sidebar-foreground/80 font-medium">{profile?.role?.replace('_', ' ')}</span>
        </p>
      </div>
    </div>
  )
}
