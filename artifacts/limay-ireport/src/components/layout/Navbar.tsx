import { useState } from 'react'
import { useLocation } from 'wouter'
import { Bell, LogOut, Menu, X, ChevronRight } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/cases': 'Cases / Kaso',
  '/cases/new': 'New Case',
  '/referrals': 'Referrals',
  '/reports': 'Reports',
  '/admin': 'Admin Panel',
}

export function Navbar() {
  const [location, setLocation] = useLocation()
  const { profile, signOut } = useAuth()
  const { notifications, unreadCount, markAllAsRead } = useNotifications(
    profile?.id,
    profile?.office_id
  )
  const [mobileOpen, setMobileOpen] = useState(false)

  const pageTitle = PAGE_TITLES[location] ?? 'LIMAY iREPORT'

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 no-print">
      {/* Mobile menu */}
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

      {/* Page title */}
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-sm font-semibold text-foreground">{pageTitle}</span>
      </div>

      {/* Office & user info */}
      <div className="hidden md:flex flex-col items-end">
        <p className="text-xs font-medium text-foreground">{profile?.full_name}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{profile?.office?.name ?? 'No office assigned'}</p>
      </div>

      {/* Notification bell */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
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
      <Button variant="ghost" size="icon" onClick={signOut} data-testid="button-logout" title="Sign out">
        <LogOut className="h-5 w-5" />
      </Button>
    </header>
  )
}
