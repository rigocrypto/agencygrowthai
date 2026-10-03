'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Calendar, UserPlus, Briefcase, Megaphone,
  BarChart3, BrainCircuit, ShieldCheck, Settings, LogOut, TrendingUp,
  Menu, FileText, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { isDemoMode, repo } from '@/lib/repo';
import type { Agency } from '@/lib/types';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { href: '/dashboard/recruiting', label: 'Recruiting', icon: UserPlus },
  { href: '/dashboard/agents', label: 'Agents', icon: Briefcase },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/dashboard/content', label: 'Content', icon: FileText },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/ai-assistant', label: 'AI Assistant', icon: BrainCircuit },
  { href: '/dashboard/compliance', label: 'Compliance', icon: ShieldCheck },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardShell({ children, title, breadcrumbs }: { children: React.ReactNode; title: string; breadcrumbs?: { label: string; href?: string }[] }) {
  const { user, loading, signOut, isDemo } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agency, setAgency] = useState<Agency | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    repo.getAgency().then(setAgency).catch(() => setAgency(null));
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <TrendingUp className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-base font-bold">{agency?.name || 'AgencyGrowthAI'}</span>
      </Link>

      {isDemo && (
        <div className="mx-4 mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">DEMO MODE</span>
          <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">Demo data — {agency?.name || 'configured agency'}</p>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/40 p-4">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {user.first_name.charAt(0)}{user.last_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{user.first_name} {user.last_name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="mt-2 w-full justify-start text-muted-foreground">
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border/40 bg-background lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetClose asChild>
            <span className="hidden"><Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button></span>
          </SheetClose>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center gap-4 border-b border-border/40 bg-background px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {breadcrumbs.map((bc, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {bc.href ? (
                      <Link href={bc.href} className="hover:text-foreground">{bc.label}</Link>
                    ) : (
                      <span>{bc.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <Badge variant="outline" className="hidden sm:flex">{user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Badge>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
