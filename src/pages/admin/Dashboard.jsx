import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ChevronRight, FileText, Inbox, MessageSquareWarning, Navigation, Plus,
  Receipt, Sparkles, UserCheck, UserPlus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { LEG_STATUS, gbp, shortDateTime, timeOnly } from '@/lib/format';
import { Avatar, CountUp, ErrorState, IconTile, PageLoader, StatusBadge } from '@/components/common';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const TZ = 'Europe/London';
const ukParts = (v) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(v)).map((p) => [p.type, Number(p.value) || p.value]));
const ukHour = (v) => { const p = ukParts(v); return p.hour + p.minute / 60; };

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000 * 30); return () => clearInterval(t); }, []);
  return now;
}

export default function Dashboard() {
  const { data: d, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/admin/dashboard'), refetchInterval: 10000 });
  const now = useClock();
  const { user } = useAuth();
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  const c = d.counts;
  const n = (...k) => k.reduce((t, x) => t + (c[x] || 0), 0);
  const stages = [
    { label: 'Review', value: n('pending', 'under_review', 'change_requested', 'clarification_needed'), icon: Inbox, tone: 'amber', to: '/admin/bookings?tab=requests' },
    { label: 'Quoted', value: n('quote_sent', 'quote_accepted'), icon: FileText, tone: 'blue', to: '/admin/bookings?tab=quoted' },
    { label: 'Assign', value: n('confirmed'), icon: UserPlus, tone: 'violet', to: '/admin/bookings?tab=to_assign' },
    { label: 'Ready', value: n('driver_assigned'), icon: UserCheck, tone: 'green', to: '/admin/bookings?tab=assigned' },
    { label: 'On road', value: n('on_the_way', 'arrived', 'started'), icon: Navigation, tone: 'brand', to: '/admin/bookings?tab=in_progress', live: true },
    { label: 'Done', value: n('completed'), icon: CheckCircle2, tone: 'dark', to: '/admin/bookings?tab=completed' },
  ];
  const alerts = [
    { label: 'Quotes accepted — confirm them', value: c.quote_accepted || 0, icon: CheckCircle2, tone: 'blue', to: '/admin/bookings?tab=quoted' },
    { label: 'Journeys with no chauffeur', value: d.unassigned.length, icon: UserPlus, tone: 'violet', to: '/admin/bookings?tab=to_assign' },
    { label: 'Driver or car double-booked', value: d.conflicts.length, icon: AlertTriangle, tone: 'red', to: '/admin/calendar' },
    { label: 'Jobs waiting for payment', value: d.unpaid, icon: Receipt, tone: 'amber', to: '/admin/payments' },
    { label: 'People asking to join', value: d.pendingCustomers, icon: UserPlus, tone: 'green', to: '/admin/customers' },
  ];
  const hot = alerts.filter((a) => a.value > 0);
  const todo = stages[0].value + hot.reduce((t, a) => t + a.value, 0);
  const doneToday = d.today.filter((l) => l.status === 'completed').length;
  // Greeting follows the viewer's own clock (their device's time zone); bookings still run on UK time.
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || TZ;
  const hour = now.getHours();
  const greet = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 17 ? 'Good afternoon' : hour >= 17 && hour < 22 ? 'Good evening' : 'Working late';
  const awayFromUk = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(now) !== new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(now);
  const city = (new Intl.DateTimeFormat('en-GB', { timeZoneName: 'shortGeneric' }).formatToParts(now).find((x) => x.type === 'timeZoneName')?.value || localTz.split('/').pop().replace(/_/g, ' ')).replace(/^GMT([+-]\d.*)$/, 'GMT$1');
  const firstName = user?.name ? `, ${user.name.replace(/\s*\(.*\)/, '').split(' ')[0]}` : '';

  return (
    <div className="space-y-6">
      {/* ---------- Hero ---------- */}
      <section className="animate-rise relative overflow-hidden rounded-[20px] bg-ink p-6 text-white shadow-[0_24px_60px_-28px_rgba(16,16,20,.6)] sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/40 blur-3xl dash-blob" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-orange-300/10 blur-3xl dash-blob [animation-delay:-4s]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_top_right,#000,transparent_70%)]" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0 max-w-xl">
            <div className="flex items-center gap-2 text-[13px] text-white/55">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
              {new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}
              <span className="text-white/25">·</span>
              <span className="tabular">{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(now)}{awayFromUk ? ` ${city}` : ' UK'}</span>
              {awayFromUk && <><span className="text-white/25">·</span><span className="tabular rounded-md bg-white/10 px-1.5 py-0.5 text-[12px] text-white/70">{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(now)} UK</span></>}
            </div>
            <h1 className="mt-3 font-heading text-[32px] font-semibold leading-[1.1] tracking-tight sm:text-[40px]">{greet}{firstName}.</h1>
            <p className="mt-2 text-[15px] text-white/65">
              {todo > 0
                ? <><span className="font-semibold text-white"><CountUp value={todo} /> things</span> need you. {d.today.length ? <>There {d.today.length === 1 ? 'is' : 'are'} <span className="font-semibold text-white">{d.today.length} journey{d.today.length === 1 ? '' : 's'}</span> today.</> : 'No journeys today.'}</>
                : <>All clear. <Sparkles className="mb-1 inline h-4 w-4 text-orange-300" /> Nothing waiting on you right now.</>}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/admin/bookings/new" className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(255,113,15,.8)] hover:bg-primary/90"><Plus className="h-4 w-4" />New booking</Link>
              <Link to="/admin/calendar" className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white/10 px-4 text-[14px] font-medium text-white ring-1 ring-inset ring-white/15 backdrop-blur hover:bg-white/15"><CalendarDays className="h-4 w-4" />Open calendar</Link>
            </div>
          </div>
          <TodayRing done={doneToday} total={d.today.length} />
        </div>
      </section>

      {/* ---------- Pipeline ---------- */}
      <section className="card-surface animate-rise p-5 [animation-delay:80ms]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-[15px] font-semibold">Booking flow</h2>
            <p className="text-[13px] text-muted-foreground">Where every booking is right now. Tap a step to see them.</p>
          </div>
          <Link to="/admin/bookings" className="hidden items-center gap-1 text-[13px] font-medium text-primary sm:inline-flex">All bookings<ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="relative grid grid-cols-3 gap-y-5 sm:grid-cols-6">
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-[27px] hidden h-[2px] sm:block">
            <div className="h-full w-full rounded-full bg-neutral-100" />
            <div className="dash-flow absolute inset-0 rounded-full" />
          </div>
          {stages.map((s, i) => (
            <Link key={s.label} to={s.to} style={{ animationDelay: `${120 + i * 70}ms` }} className="animate-rise group relative flex flex-col items-center text-center">
              <div className="relative rounded-2xl bg-white p-1 ring-4 ring-white">
                <IconTile icon={s.icon} tone={s.value ? s.tone : 'grey'} live={s.live && s.value > 0} className="!h-12 !w-12 !rounded-2xl transition group-hover:-translate-y-1 group-hover:shadow-[0_10px_20px_-10px_rgba(16,16,20,.4)]" />
              </div>
              <CountUp value={s.value} className={cn('mt-2 font-heading text-[24px] font-semibold leading-none', s.value ? 'text-ink' : 'text-neutral-300')} />
              <div className="mt-1 text-[12.5px] font-medium text-muted-foreground group-hover:text-ink">{s.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Alerts ---------- */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-heading text-[15px] font-semibold">Needs your attention</h2>
          {hot.length > 0 && <span className="tabular rounded-md bg-primary px-1.5 text-[11px] font-semibold text-white">{hot.length}</span>}
        </div>
        {hot.length === 0 ? (
          <div className="card-surface flex items-center gap-3 p-4 text-[14px]"><IconTile icon={CheckCircle2} tone="green" /><div><div className="font-semibold">You're all caught up</div><div className="text-[13px] text-muted-foreground">No conflicts, payments or requests waiting.</div></div></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {hot.map((a, i) => (
              <Link key={a.label} to={a.to} style={{ animationDelay: `${200 + i * 60}ms` }}
                className={cn('card-surface lift animate-rise group relative overflow-hidden p-4', a.tone === 'red' && 'border-red-200')}>
                <div className={cn('pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60 blur-2xl', { red: 'bg-red-200', amber: 'bg-amber-200', blue: 'bg-sky-200', violet: 'bg-violet-200', green: 'bg-emerald-200' }[a.tone])} />
                <div className="relative flex items-start justify-between">
                  <IconTile icon={a.icon} tone={a.tone} live={a.tone === 'red'} />
                  <ArrowRight className="h-4 w-4 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-ink" />
                </div>
                <CountUp value={a.value} className="relative mt-3 block font-heading text-[30px] font-semibold leading-none tracking-tight" />
                <div className="relative mt-1 text-[13px] font-medium text-muted-foreground">{a.label}</div>
              </Link>
            ))}
          </div>
        )}
        {(d.failedMessages > 0 || d.overdueInvoices.n > 0) && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {d.failedMessages > 0 && (
              <Link to="/admin/messages?failed=1" className="flex items-center gap-3 rounded-[14px] border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-900 hover:bg-amber-100/70">
                <MessageSquareWarning className="h-5 w-5 shrink-0" /><span><b>{d.failedMessages}</b> messages didn't reach customers by WhatsApp/email in the last 2 days.</span><ArrowRight className="ml-auto h-4 w-4 shrink-0" />
              </Link>
            )}
            {d.overdueInvoices.n > 0 && (
              <Link to="/admin/invoices" className="flex items-center gap-3 rounded-[14px] border border-red-200 bg-red-50 p-3.5 text-[13px] text-red-800 hover:bg-red-100/70">
                <FileText className="h-5 w-5 shrink-0" /><span><b>{d.overdueInvoices.n}</b> overdue invoice{d.overdueInvoices.n === 1 ? '' : 's'} · <b>{gbp(d.overdueInvoices.total)}</b></span><ArrowRight className="ml-auto h-4 w-4 shrink-0" />
              </Link>
            )}
          </div>
        )}
      </section>

      {/* ---------- Today + decisions ---------- */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card-surface animate-rise overflow-hidden [animation-delay:260ms]">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="font-heading text-[15px] font-semibold">Today on the road</h2>
            <Link to="/admin/calendar" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary">Calendar<ChevronRight className="h-4 w-4" /></Link>
          </div>
          <DayStrip legs={d.today} now={now} />
          {d.today.length === 0 ? (
            <div className="flex flex-col items-center px-5 pb-8 pt-2 text-center">
              <div className="float-y"><IconTile icon={CalendarDays} tone="grey" size="lg" /></div>
              <div className="mt-3 text-[14px] font-semibold">No journeys today</div>
              <div className="text-[13px] text-muted-foreground">Enjoy the quiet — or take a new booking.</div>
            </div>
          ) : (
            <div className="divide-y">
              {d.today.map((l, i) => (
                <Link key={l.id} to={`/admin/bookings/${l.booking_id}`} style={{ animationDelay: `${i * 40}ms` }} className="row-in group flex items-center gap-4 px-5 py-3 hover:bg-neutral-50">
                  <div className="tabular w-14 font-heading text-[17px] font-semibold">{timeOnly(l.pickup_at)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{l.lead_passenger} <span className="font-normal text-muted-foreground">· {l.ref}</span></div>
                    <div className="truncate text-[12.5px] text-muted-foreground">{l.pickup} → {l.destination}</div>
                  </div>
                  {l.driver_name ? <Avatar name={l.driver_name} dark className="h-8 w-8" /> : <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11.5px] font-semibold text-orange-700">No chauffeur</span>}
                  <span className="hidden w-24 text-right text-[12px] font-medium text-muted-foreground sm:block">{LEG_STATUS[l.status]}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card-surface animate-rise overflow-hidden [animation-delay:320ms]">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="font-heading text-[15px] font-semibold">Waiting for a decision</h2>
            <span className="tabular rounded-md bg-neutral-100 px-1.5 text-[11px] font-semibold text-neutral-600">{d.attention.length}</span>
          </div>
          {d.attention.length === 0 ? (
            <div className="flex items-center gap-3 p-5"><IconTile icon={CheckCircle2} tone="green" /><div className="text-[14px] font-medium">Nothing to decide</div></div>
          ) : (
            <div className="max-h-[420px] divide-y overflow-y-auto [scrollbar-width:thin]">
              {d.attention.map((b, i) => (
                <Link key={b.id} to={`/admin/bookings/${b.id}`} style={{ animationDelay: `${i * 35}ms` }} className="row-in group flex items-center gap-3 px-5 py-3 hover:bg-neutral-50">
                  <Avatar name={b.customer_name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold">{b.customer_name}</div>
                    <div className="tabular text-[12px] text-muted-foreground">{b.ref} · pickup {shortDateTime(b.first_pickup)}</div>
                  </div>
                  <StatusBadge status={b.status} admin />
                  <ChevronRight className="h-4 w-4 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** Animated ring: how many of today's journeys are finished. */
function TodayRing({ done, total }) {
  const pct = total ? done / total : 0;
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div className="relative grid h-[148px] w-[148px] shrink-0 place-items-center">
      <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90">
        <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" />
        <circle cx="64" cy="64" r={R} fill="none" stroke="url(#ring)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} className="dash-ring" style={{ '--ring-c': C }} />
        <defs><linearGradient id="ring" x1="0" x2="1"><stop offset="0" stopColor="#FF710F" /><stop offset="1" stopColor="#FFB37A" /></linearGradient></defs>
      </svg>
      <div className="text-center">
        <div className="tabular font-heading text-[30px] font-semibold leading-none"><CountUp value={done} /><span className="text-white/35">/{total}</span></div>
        <div className="mt-1 text-[11.5px] text-white/55">done today</div>
      </div>
    </div>
  );
}

/** 24-hour strip with a dot per journey and a live "now" marker. */
function DayStrip({ legs, now }) {
  const pos = (h) => `${(h / 24) * 100}%`;
  const nowH = ukHour(now);
  return (
    <div className="px-5 pb-4 pt-5">
      <div className="relative h-10">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-neutral-100" />
        <div className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-orange-200 to-orange-400 transition-all duration-700" style={{ width: pos(nowH) }} />
        {legs.map((l, i) => {
          const done = l.status === 'completed';
          return (
            <Link key={l.id} to={`/admin/bookings/${l.booking_id}`} title={`${timeOnly(l.pickup_at)} · ${l.lead_passenger}`} style={{ left: pos(ukHour(l.pickup_at)), animationDelay: `${300 + i * 60}ms` }}
              className={cn('pop-in absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-white transition hover:scale-125',
                done ? 'bg-emerald-500' : !l.driver_name ? 'bg-orange-500' : 'bg-ink')} />
          );
        })}
        <div className="absolute top-0 h-full -translate-x-1/2" style={{ left: pos(nowH) }}>
          <div className="mx-auto h-full w-[2px] rounded-full bg-red-500" />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-red-500 px-1 text-[10px] font-semibold text-white">now</div>
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10.5px] tabular text-muted-foreground">
        {['00', '06', '12', '18', '24'].map((h) => <span key={h}>{h}:00</span>)}
      </div>
    </div>
  );
}
