import { useLiveUpdates } from '@/lib/live';
import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, BarChart3, Bell, MessagesSquare, Briefcase, Building2, CalendarDays, Car, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, MessageSquare,
  Plus, Receipt, Settings, UserCog, Users, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Logo, PageLoader } from '@/components/common';

/** Only signed-in management (admin) accounts get past this. */
export function RequireManagement() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoader />;
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <Outlet />;
}

function useWaitingMessages() {
  const { data } = useQuery({ queryKey: ['conversations'], queryFn: () => api.get('/admin/conversations'), refetchInterval: 15000 });
  return (data || []).filter((c) => c.waiting > 0).length;
}

function useUnread() {
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/account/notifications'), refetchInterval: 10000 });
  return (data || []).filter((n) => !n.read_at).length;
}

function Dot({ n }) {
  if (!n) return null;
  return <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-white">{n > 9 ? '9+' : n}</span>;
}

const NAV = [
  { group: 'Operations', items: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/bookings', label: 'Bookings', icon: ClipboardList },
    { to: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/admin/conversations', label: 'Messages', icon: MessagesSquare, badge: 'messages' },
  ] },
  { group: 'Resources', items: [
    { to: '/admin/fleet', label: 'Fleet', icon: Car },
    { to: '/admin/drivers', label: 'Drivers', icon: Users },
    { to: '/admin/operators', label: 'External cover', icon: Briefcase },
  ] },
  { group: 'Finance', items: [
    { to: '/admin/customers', label: 'Customers', icon: Building2 },
    { to: '/admin/payments', label: 'Payments', icon: Receipt },
    { to: '/admin/invoices', label: 'Invoices', icon: FileText },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  ] },
  { group: 'Control', items: [
    { to: '/admin/messages', label: 'Notifications', icon: MessageSquare },
    { to: '/admin/activity', label: 'Activity', icon: Activity },
    { to: '/admin/team', label: 'Team', icon: UserCog },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ] },
];

const TITLES = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.to, i.label])));
function pageTitle(path) {
  if (path.startsWith('/admin/bookings/new')) return 'New booking';
  if (path.startsWith('/admin/bookings/')) return 'Booking details';
  const hit = Object.keys(TITLES).filter((k) => path === k || path.startsWith(k + '/')).sort((a, b) => b.length - a.length)[0];
  return TITLES[hit] || 'Command Center';
}

const adminLink = (n) => `/admin/bookings/${n.booking_id}`;
const initials = (name = '') => name.replace(/\(.*\)/, '').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export function ManagementLayout() {
  useLiveUpdates(adminLink);
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const unread = useUnread();
  const waitingMsgs = useWaitingMessages();
  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[72px] shrink-0 items-center justify-between px-6">
        <Logo dark />
        <button className="rounded-lg p-1 text-white/60 hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map((g) => (
          <div key={g.group} className="mt-3 first:mt-1">
            <div className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">{g.group}</div>
            {g.items.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
                className={({ isActive }) => cn(
                  'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white',
                  isActive && 'bg-white/[0.07] text-white',
                )}>
                {({ isActive }) => (<>
                  {isActive && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />}
                  <n.icon className={cn('h-[17px] w-[17px] stroke-[1.75]', isActive ? 'text-primary' : 'text-white/45 group-hover:text-white/80')} />
                  {n.label}
                  {n.badge === 'messages' && waitingMsgs > 0 && <span className="tabular ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">{waitingMsgs}</span>}
                </>)}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="shrink-0 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-2.5 ring-1 ring-white/[0.06]">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-orange-700 text-xs font-bold text-white">{initials(user.name)}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-white">{user.name.replace(/\s*\(.*\)/, '')}</div>
            <div className="flex items-center gap-1.5 truncate text-[11px] text-white/40"><span className={cn('rounded px-1 text-[10px] font-semibold uppercase tracking-wide', (user.staff_role || 'admin') === 'admin' ? 'bg-primary/20 text-orange-300' : 'bg-sky-400/15 text-sky-300')}>{user.staff_role || 'admin'}</span><span className="truncate">{user.email}</span></div>
          </div>
          <button onClick={signOut} title="Sign out" aria-label="Sign out" className="rounded-lg p-2 text-white/45 transition hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 bg-ink lg:block print:!hidden">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink shadow-2xl">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-60 print:!pl-0">
        <header className="sticky top-0 z-30 flex h-16 print:!hidden items-center justify-between gap-3 border-b border-black/[0.06] bg-white/80 px-4 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-1.5 hover:bg-surface lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <div className="text-[13px] text-muted-foreground"><span className="hidden sm:inline">Command Center <span className="mx-1.5 text-black/20">/</span></span><span className="font-semibold text-foreground">{pageTitle(loc.pathname)}</span></div>
          </div>
          <div className="flex items-center gap-1.5">
            <Link to="/admin/inbox" className="relative grid h-9 w-9 place-items-center rounded-full text-foreground/70 transition hover:bg-surface hover:text-foreground" title="Alerts"><Bell className="h-[18px] w-[18px]" /><Dot n={unread} /></Link>
            <Link to="/admin/bookings/new" className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-ink/85"><Plus className="h-4 w-4" />New booking</Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8 print:!max-w-none print:!p-0"><div key={loc.pathname} className="page-enter"><Outlet /></div></main>
      </div>
    </div>
  );
}
