'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Ticket,
  Building2,
  Users,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useLogout } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';
import { getInitials, cn } from '@/lib/utils';
import { useUnreadCount } from '@/hooks/useNotifications';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');
  const { data: unread } = useUnreadCount();
  const showBadge = href === '/notifications' && (unread?.count ?? 0) > 0;

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {showBadge && (
        <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">
          {unread!.count > 99 ? '99+' : unread!.count}
        </span>
      )}
    </Link>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const logout = useLogout();
  const user = useAuthStore((s) => s.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const Sidebar = () => (
    <aside className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          HelpDesk
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {user && (
        <div className="p-3 border-t">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {getInitials(user.firstName, user.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout.mutate()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      )}
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-60 shrink-0 border-r flex-col">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-60 bg-background border-r">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-primary">HelpDesk</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
