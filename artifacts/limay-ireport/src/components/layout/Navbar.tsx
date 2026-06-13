import { useState } from 'react'
import { useLocation, Link } from 'wouter'
import { Bell, LogOut, Menu, LogIn } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/': 'Dashboard',
  '/cases': 'Cases / Kaso',
  '/cases/new': 'New Case',
  '/referrals': 'Referrals',
  '/reports': 'Reports',
  '/admin': 'Admin Panel',
}

function getTitle(location: string): string {
  if (PAGE_TITLES[location]) return PAGE_TITLES[location]
  if (location.startsWith('/cases/')) return 'Case Detail'
  return 'LIMAY iREPORT'
}

export function Navbar() {
  const [location, setLocation] = useLocation()
  const { profile, signOut } = useAuth()
  const { notifications, unreadCount, markAllAsRead } = useNotifications(
    profile?.id,
    profile?.office_id
  )
  const [mobileOpen, setMobileOpen] = useState(false)

  const pageTitle = getTitle(location)

  async function handleSignOut() {
    await signOut()
    setLocation('/login')
  }

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 no-print flex-shrink-0">
      {/* Mobile menu trigger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" data-testid="button-mobile-menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Page title + LIVE badge */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-semibold text-foreground truncate">{pageTitle}</span>
        <span
          className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 leading-none flex-shrink-0"
          data-testid="navbar-live-badge"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          LIVE
        </span>
      </div>

      {/* === NOT LOGGED IN: just a Login button === */}
      {!profile && (
        <Link href="/login">
          <Button size="sm" variant="outline" className="gap-2 flex-shrink-0" data-testid="button-login">
            <LogIn className="h-4 w-4" />
            Login
          </Button>
        </Link>
      )}

      {/* === LOGGED IN: user info + notifications + logout === */}
      {profile && (
        <>
          {/* Office & name */}
          <div className="hidden md:flex flex-col items-end flex-shrink-0">
            <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {profile.office?.name ?? 'No office assigned'}
            </p>
          </div>

          {/* Notification bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative flex-shrink-0" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-auto py-0 text-xs" onClick={markAllAsRead}>
                    Mark all read
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">No notifications</div>
              ) : (
                notifications.map(n => (
                  <DropdownMenuItem
                    key={n.id}
                    className={cn('flex flex-col items-start gap-0.5 cursor-pointer', !n.is_read && 'bg-muted/50')}
                    onClick={() => { if (n.case_id) setLocation(`/cases/${n.case_id}`) }}
                    data-testid={`notification-${n.id}`}
                  >
                    <span className="text-sm leading-snug">{n.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString('en-PH')}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Logout */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            data-testid="button-logout"
            title="Sign out"
            className="flex-shrink-0"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </>
      )}
    </header>
  )
}
