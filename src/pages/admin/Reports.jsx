import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Coins, Download, FileSpreadsheet,
  Building2, Clock, Globe, Inbox, Minus, PoundSterling, Receipt, Route, User, UserCheck, Users, XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { JOURNEY_TYPES, STATUS, gbp } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Avatar, ErrorState, PageHeader, PageLoader, Segmented, SelectInput } from '@/components/common';
import { Button } from '@/components/ui/button';

// ---------- UK calendar maths (dates held as UTC-midnight Date objects) ----------
const TZ = 'Europe/London';
const DAY = 86400000;
const ukKey = (v) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(v));
const ukHour = (v) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date(v)));
const today = () => new Date(`${ukKey(new Date())}T00:00:00Z`);
/** The real instant of UK midnight on a calendar date (handles GMT/BST). */
function ukMidnight(d) {
  const guess = d.getTime();
  const shown = ukHour(guess); // 0 in winter, 1 in summer
  return new Date(guess - shown * 3600000);
}
function periodOf(kind, anchor) {
  const y = anchor.getUTCFullYear(), m = anchor.getUTCMonth();
  if (kind === 'daily') return [anchor, new Date(anchor.getTime() + DAY)];
  if (kind === 'weekly') { const s = new Date(anchor.getTime() - ((anchor.getUTCDay() + 6) % 7) * DAY); return [s, new Date(s.getTime() + 7 * DAY)]; }
  if (kind === 'monthly') return [new Date(Date.UTC(y, m, 1)), new Date(Date.UTC(y, m + 1, 1))];
  return [new Date(Date.UTC(y, 0, 1)), new Date(Date.UTC(y + 1, 0, 1))];
}
function shift(kind, anchor, dir) {
  const y = anchor.getUTCFullYear(), m = anchor.getUTCMonth(), d = anchor.getUTCDate();
  if (kind === 'daily') return new Date(anchor.getTime() + dir * DAY);
  if (kind === 'weekly') return new Date(anchor.getTime() + dir * 7 * DAY);
  if (kind === 'monthly') return new Date(Date.UTC(y, m + dir, Math.min(d, 28)));
  return new Date(Date.UTC(y + dir, m, 1));
}
const f = (o) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...o });
function periodLabel(kind, s, e) {
  const last = new Date(e.getTime() - DAY);
  if (kind === 'daily') return f({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(s);
  if (kind === 'weekly') return `${f({ day: 'numeric', month: 'short' }).format(s)} – ${f({ day: 'numeric', month: 'short', year: 'numeric' }).format(last)}`;
  if (kind === 'monthly') return f({ month: 'long', year: 'numeric' }).format(s);
  return String(s.getUTCFullYear());
}
function customLabel(s, e) {
  const last = new Date(e.getTime() - DAY);
  if (s.getTime() === last.getTime()) return f({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(s);
  const sameYear = s.getUTCFullYear() === last.getUTCFullYear();
  return `${f({ day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }).format(s)} – ${f({ day: 'numeric', month: 'short', year: 'numeric' }).format(last)}`;
}

/** From / To date pickers with quick presets. Dates are inclusive. */
function DateRange({ range, onChange, ok }) {
  const t = today();
  const y = t.getUTCFullYear(), m = t.getUTCMonth();
  const presets = [
    ['Last 7 days', isoDay(new Date(t.getTime() - 6 * DAY)), isoDay(t)],
    ['Last 30 days', isoDay(new Date(t.getTime() - 29 * DAY)), isoDay(t)],
    ['This month', isoDay(new Date(Date.UTC(y, m, 1))), isoDay(t)],
    ['Last month', isoDay(new Date(Date.UTC(y, m - 1, 1))), isoDay(new Date(Date.UTC(y, m, 0)))],
    ['Year to date', isoDay(new Date(Date.UTC(y, 0, 1))), isoDay(t)],
  ];
  const days = ok ? Math.round((new Date(range.to) - new Date(range.from)) / DAY) + 1 : 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 rounded-[10px] border bg-white px-3 py-1 shadow-[0_1px_2px_rgba(16,16,20,.04)] focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
        <span className="text-[12px] font-medium text-muted-foreground">From</span>
        <input type="date" value={range.from} max={range.to || undefined} onChange={(e) => onChange({ ...range, from: e.target.value })} className="h-7 bg-transparent text-[13.5px] font-medium text-ink outline-none" />
      </label>
      <span className="text-muted-foreground">→</span>
      <label className="flex items-center gap-2 rounded-[10px] border bg-white px-3 py-1 shadow-[0_1px_2px_rgba(16,16,20,.04)] focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
        <span className="text-[12px] font-medium text-muted-foreground">To</span>
        <input type="date" value={range.to} min={range.from || undefined} onChange={(e) => onChange({ ...range, to: e.target.value })} className="h-7 bg-transparent text-[13.5px] font-medium text-ink outline-none" />
      </label>
      {ok ? <span className="tabular rounded-full bg-neutral-100 px-2.5 py-1 text-[12px] font-medium text-neutral-600">{days} day{days === 1 ? '' : 's'}</span>
        : <span className="rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-medium text-red-600">{range.from && range.to && range.from > range.to ? '"From" must be before "To"' : 'Pick both dates (up to 3 years)'}</span>}
      <div className="flex flex-wrap gap-1">
        {presets.map(([l, a, b]) => (
          <button key={l} type="button" onClick={() => onChange({ from: a, to: b })}
            className={cn('h-7 rounded-full px-2.5 text-[12px] font-medium transition', range.from === a && range.to === b ? 'bg-ink text-white' : 'text-muted-foreground hover:bg-neutral-100 hover:text-ink')}>{l}</button>
        ))}
      </div>
    </div>
  );
}

const TITLES = { daily: 'Daily report', weekly: 'Weekly report', monthly: 'Monthly report', yearly: 'Yearly report', custom: 'Custom report' };
const PREV = { daily: 'yesterday', weekly: 'last week', monthly: 'last month', yearly: 'last year', custom: 'the previous period' };
const MAX_CUSTOM_DAYS = 3 * 366;
const isoDay = (d) => d.toISOString().slice(0, 10);

const CANCELLED = ['cancelled_customer', 'cancelled_management', 'rejected', 'no_show', 'expired', 'quote_declined'];
const DONE = ['completed', 'closed'];
const PRE = ['pending', 'under_review', 'clarification_needed', 'change_requested', 'quote_sent', 'quote_accepted'];
const STATUS_FILTERS = {
  all: { label: 'All statuses', match: () => true },
  requests: { label: 'Requests & quotes', match: (b) => PRE.includes(b.status) },
  upcoming: { label: 'Confirmed / upcoming', match: (b) => ['confirmed', 'driver_assigned'].includes(b.status) },
  live: { label: 'On the road', match: (b) => ['on_the_way', 'arrived', 'started'].includes(b.status) },
  completed: { label: 'Completed', match: (b) => DONE.includes(b.status) },
  cancelled: { label: 'Cancelled / no-show', match: (b) => CANCELLED.includes(b.status) },
};

export default function Reports() {
  const [kind, setKind] = useState('weekly');
  // Custom range: inclusive UK dates (yyyy-mm-dd). Defaults to the current month so far.
  const [range, setRange] = useState(() => { const t = today(); return { from: isoDay(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1))), to: isoDay(t) }; });
  const [anchor, setAnchor] = useState(today);
  const [scope, setScope] = useState('all'); // all | customer | driver
  const [subject, setSubject] = useState(''); // org:1 | cust:3 | drv:2
  const [statusF, setStatusF] = useState('all');
  const drivers = useQuery({ queryKey: ['drivers'], queryFn: () => api.get('/admin/drivers'), enabled: scope === 'driver' });
  const customers = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/admin/customers'), enabled: scope === 'customer' });
  const orgs = useQuery({ queryKey: ['organisations'], queryFn: () => api.get('/admin/organisations'), enabled: scope === 'customer' });
  const [skind, sid] = subject.split(':');
  const subjectQs = scope === 'all' || !sid ? '' : `&${{ org: 'organisation_id', cust: 'customer_id', drv: 'driver_id' }[skind]}=${sid}`;
  const rangeOk = range.from && range.to && range.from <= range.to && (new Date(range.to) - new Date(range.from)) / DAY < MAX_CUSTOM_DAYS;
  const [start, end] = kind === 'custom'
    ? (rangeOk ? [new Date(`${range.from}T00:00:00Z`), new Date(new Date(`${range.to}T00:00:00Z`).getTime() + DAY)] : periodOf('daily', today()))
    : periodOf(kind, anchor);
  const from = ukMidnight(start), to = ukMidnight(end);
  const label = kind === 'custom' ? customLabel(start, end) : periodLabel(kind, start, end);

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', from.toISOString(), to.toISOString(), subjectQs],
    queryFn: () => api.get(`/admin/reports?from=${from.toISOString()}&to=${to.toISOString()}${subjectQs}`),
    enabled: (scope === 'all' || !!sid) && (kind !== 'custom' || rangeOk),
  });
  // Status filter is applied here, on the period's bookings; comparisons with the previous period are dropped when filtered.
  const view = useMemo(() => (data ? { ...data, bookings: data.bookings.filter(STATUS_FILTERS[statusF].match), statusLabel: statusF === 'all' ? null : STATUS_FILTERS[statusF].label, previous: statusF === 'all' ? data.previous : null } : null), [data, statusF]);
  const r = useMemo(() => (view ? summarise(view, kind, start, end) : null), [view, kind, start.getTime(), end.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const isCurrent = anchor.getTime() === today().getTime() || (start <= today() && today() < end);
  const who = data?.subject?.name ? `${data.subject.name}-` : '';
  const fileName = `Encore-${TITLES[kind].replace(' ', '-')}-${who}${statusF !== 'all' ? `${STATUS_FILTERS[statusF].label}-` : ''}${label}`.replace(/[^\w]+/g, '-').replace(/-+$/, '');

  const downloadPdf = () => {
    const prev = document.title;
    document.title = fileName;
    window.print();
    setTimeout(() => { document.title = prev; }, 500);
  };
  const downloadCsv = () => {
    const head = ['Reference', 'Pickup (UK)', 'Customer', 'Company', 'Passenger', 'Journey type', 'From', 'To', 'Chauffeur', 'Vehicle', 'Status', 'Payment', 'Fare (GBP)', 'Received (GBP)'];
    const rows = view.bookings.map((b) => [b.ref, new Date(b.first_pickup).toLocaleString('en-GB', { timeZone: TZ }), b.customer_name, b.organisation_name || '', b.lead_passenger,
      JOURNEY_TYPES[b.journey_type] || b.journey_type, b.pickup, b.destination, b.drivers || b.operators || '', b.vehicles || '', STATUS[b.status]?.admin || b.status, b.payment_status,
      b.total ?? '', b.received ?? 0]);
    const csv = [head, ...rows].map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${fileName}.csv` });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <PageHeader icon={BarChart3} title="Reports" subtitle="Pick a period, check the numbers, then download."
          actions={<Segmented value={kind} onChange={(k) => { setKind(k); setAnchor(today()); }} options={[['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly'], ['custom', 'Custom', CalendarDays]]} />} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {kind === 'custom' ? (
              <DateRange range={range} onChange={setRange} ok={rangeOk} />
            ) : (<>
              <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Previous period" onClick={() => setAnchor(shift(kind, anchor, -1))}><ChevronLeft /></Button>
              <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Next period" onClick={() => setAnchor(shift(kind, anchor, 1))}><ChevronRight /></Button>
              {!isCurrent && <Button variant="outline" className="h-9" onClick={() => setAnchor(today())}>Current</Button>}
              <h2 className="ml-1 font-heading text-[17px] font-semibold tracking-tight">{label}</h2>
            </>)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!data} onClick={downloadCsv}><FileSpreadsheet />Excel (CSV)</Button>
            <Button disabled={!data} onClick={downloadPdf}><Download />Download PDF</Button>
          </div>
        </div>
        <div className="card-surface mt-4 flex flex-wrap items-center gap-3 p-3">
          <span className="pl-1 text-[13px] font-medium text-muted-foreground">Report for</span>
          <Segmented value={scope} onChange={(v) => { setScope(v); setSubject(''); }} options={[['all', 'Whole business', Globe], ['customer', 'A customer', User], ['driver', 'A chauffeur', UserCheck]]} />
          {scope === 'customer' && (
            <SelectInput className="h-9 w-72 text-[13px]" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">Choose a customer or company…</option>
              <optgroup label="Companies">{(orgs.data || []).map((o) => <option key={o.id} value={`org:${o.id}`}>{o.name}</option>)}</optgroup>
              <optgroup label="Customers">{(customers.data || []).filter((c) => c.status !== 'pending').map((c) => <option key={c.id} value={`cust:${c.id}`}>{c.name}{c.organisation_name ? ` · ${c.organisation_name}` : ''}</option>)}</optgroup>
            </SelectInput>
          )}
          <div className="order-last ml-auto flex items-center gap-2">
            <span className="text-[13px] font-medium text-muted-foreground">Status</span>
            <SelectInput className="h-9 w-48 text-[13px]" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
              {Object.entries(STATUS_FILTERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </SelectInput>
          </div>
          {scope === 'driver' && (
            <SelectInput className="h-9 w-64 text-[13px]" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">Choose a chauffeur…</option>
              {(drivers.data || []).map((d) => <option key={d.id} value={`drv:${d.id}`}>{d.name}{d.driver_type === 'temporary' ? ' (temporary)' : ''}</option>)}
            </SelectInput>
          )}
        </div>
      </div>

      {scope !== 'all' && !sid ? (
        <div className="card-surface flex flex-col items-center py-16 text-center print:hidden">
          <div className="float-y grid h-14 w-14 place-items-center rounded-2xl bg-neutral-100 text-neutral-500">{scope === 'driver' ? <UserCheck className="h-6 w-6" /> : <Users className="h-6 w-6" />}</div>
          <div className="mt-3 text-[15px] font-semibold">Choose {scope === 'driver' ? 'a chauffeur' : 'a customer or company'} above</div>
          <div className="text-[13px] text-muted-foreground">Their report for {label} appears here.</div>
        </div>
      ) : isLoading ? <PageLoader /> : error ? <ErrorState error={error} /> : (
        <ReportDocument kind={kind} label={label} data={view} r={r} />
      )}
    </div>
  );
}

// ---------- numbers ----------
function summarise(data, kind, start, end) {
  const all = data.bookings;
  const live = all.filter((b) => !CANCELLED.includes(b.status));
  const revenue = live.reduce((t, b) => t + (b.total || 0), 0);
  const priced = live.filter((b) => b.total != null);
  const outstanding = live.reduce((t, b) => t + Math.max(0, (b.total || 0) - (b.received || 0)), 0);
  const collected = data.cash.collected - data.cash.refunded;

  // Trend buckets
  let buckets;
  if (kind === 'daily') buckets = Array.from({ length: 24 }, (_, h) => ({ label: String(h).padStart(2, '0'), short: h % 3 === 0 ? String(h).padStart(2, '0') : '', match: (b) => ukHour(b.first_pickup) === h }));
  else if (kind === 'custom' && (end - start) / DAY > 62) {
    const months = [];
    for (let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); d < end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) months.push(d);
    buckets = months.map((d) => { const k = isoDay(d).slice(0, 7); return { label: f({ month: 'short', ...(months.length > 12 ? { year: '2-digit' } : {}) }).format(d), match: (b) => ukKey(b.first_pickup).slice(0, 7) === k }; });
  } else if (kind === 'yearly') buckets = Array.from({ length: 12 }, (_, m) => ({ label: f({ month: 'short' }).format(new Date(Date.UTC(2000, m, 1))), match: (b) => Number(ukKey(b.first_pickup).slice(5, 7)) === m + 1 }));
  else {
    const n = Math.round((end - start) / DAY);
    buckets = Array.from({ length: n }, (_, i) => {
      const d = new Date(start.getTime() + i * DAY); const k = d.toISOString().slice(0, 10);
      const custom = kind === 'custom';
      return { label: kind === 'weekly' || (custom && n <= 7) ? f({ weekday: 'short' }).format(d) : custom ? f({ day: 'numeric', month: 'short' }).format(d) : String(d.getUTCDate()), short: (kind === 'monthly' || (custom && n > 14)) && (i % (custom ? Math.ceil(n / 8) : 5) !== 0) ? '' : undefined, match: (b) => ukKey(b.first_pickup) === k };
    });
  }
  const trend = buckets.map((bk) => { const items = live.filter(bk.match); return { ...bk, count: items.length, revenue: items.reduce((t, b) => t + (b.total || 0), 0) }; });

  const group = (keyFn) => {
    const m = new Map();
    live.forEach((b) => keyFn(b).forEach((k) => { const g = m.get(k) || { name: k, count: 0, revenue: 0 }; g.count += 1; g.revenue += b.total || 0; m.set(k, g); }));
    return [...m.values()].sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  };
  return {
    all, live, revenue, collected, outstanding,
    journeys: live.length,
    completed: all.filter((b) => DONE.includes(b.status)).length,
    cancelled: all.length - live.length,
    awaiting: all.filter((b) => PRE.includes(b.status)).length,
    avgFare: priced.length ? priced.reduce((t, b) => t + b.total, 0) / priced.length : 0,
    requests: data.requests,
    trend,
    days: Math.round((end - start) / DAY),
    byType: group((b) => [JOURNEY_TYPES[b.journey_type] || 'Other']),
    byDriver: group((b) => (b.drivers ? b.drivers.split(',') : b.operators ? b.operators.split(',').map((o) => `${o} (external)`) : ['No chauffeur yet'])),
    byCustomer: group((b) => [b.organisation_name || b.customer_name]).slice(0, 8),
    prev: data.previous || { journeys: null, revenue: null },
  };
}

// ---------- the printable document ----------
const SUBJECT_TITLE = { driver: 'chauffeur report', customer: 'customer report', organisation: 'account report' };
function ReportDocument({ kind, label, data, r }) {
  const sub = data.subject;
  const isDriver = sub?.kind === 'driver';
  const isClient = sub && !isDriver;
  const title = sub ? (kind === 'custom' ? SUBJECT_TITLE[sub.kind].replace(/^./, (c) => c.toUpperCase()) : `${TITLES[kind].split(' ')[0]} ${SUBJECT_TITLE[sub.kind]}`) : (kind === 'custom' ? 'Period report' : TITLES[kind]);
  const hours = isDriver ? `${Math.floor(sub.minutes / 60)}h ${String(sub.minutes % 60).padStart(2, '0')}m` : null;
  const gen = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(data.generated_at));
  const completion = r.journeys ? Math.round((r.completed / r.journeys) * 100) : 0;
  const reportNo = `RPT-${ukKey(data.from).replace(/-/g, '')}-${kind[0].toUpperCase()}${sub ? `-${sub.kind[0].toUpperCase()}${sub.id}` : ''}`;
  const summary = r.all.length === 0
    ? `No journeys were recorded for ${sub ? sub.name : 'the business'} in this period.`
    : `${sub ? sub.name : 'The business'} had ${r.journeys} journey${r.journeys === 1 ? '' : 's'} worth ${gbp(r.revenue)} in this period${r.prev.revenue && r.prev.revenue !== r.revenue ? `, ${r.revenue > r.prev.revenue ? 'up' : 'down'} from ${gbp(r.prev.revenue)} ${PREV[kind]}` : ''}. ${r.completed} ${r.completed === 1 ? 'was' : 'were'} completed${r.cancelled ? ` and ${r.cancelled} cancelled or no-show` : ''}${!isDriver && r.outstanding > 0 ? `; ${gbp(r.outstanding)} is still to be collected` : ''}.`;
  return (
    <article className="report-paper animate-rise mx-auto max-w-[960px] overflow-hidden rounded-[18px] border bg-white shadow-[0_24px_60px_-30px_rgba(16,16,20,.35)] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      {/* Letterhead */}
      <header className="relative overflow-hidden bg-ink px-8 py-7 text-white">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/45 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/images/logo.svg" alt="" className="h-11 w-11" />
            <div className="leading-tight">
              <div className="font-heading text-[16px] font-bold tracking-wide">ENCORE</div>
              <div className="text-[10px] font-semibold tracking-[0.24em] text-white/60">EXECUTIVE</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-300">{title}</div>
            <div className="mt-1 font-heading text-[24px] font-semibold leading-tight">{label}</div>
            {data.statusLabel && <div className="mt-1.5 inline-flex rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-orange-200 ring-1 ring-inset ring-white/15">Status: {data.statusLabel}</div>}
            <div className="mt-1 text-[11.5px] text-white/50">Report no. <span className="tabular font-medium text-white/70">{reportNo}</span> · Generated {gen} · by {data.generated_by}</div>
          </div>
        </div>
      </header>
      <div className="h-1 bg-gradient-to-r from-primary via-orange-400 to-amber-300" />
      {sub && (
        <div className="flex flex-wrap items-center gap-4 border-b bg-neutral-50 px-8 py-4">
          {isDriver ? <Avatar name={sub.name} dark className="h-12 w-12 text-[14px]" /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-orange-100 text-orange-700">{sub.kind === 'organisation' ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}</div>}
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isDriver ? `Chauffeur${sub.driver_type === 'temporary' ? ' · temporary' : ''}` : sub.kind === 'organisation' ? 'Corporate account' : 'Customer'}</div>
            <div className="font-heading text-[19px] font-semibold leading-tight">{sub.name}</div>
          </div>
          <div className="ml-auto grid gap-x-8 gap-y-0.5 text-[12px] text-muted-foreground sm:grid-cols-2 print:grid-cols-2">
            {sub.phone && <span>Phone: <b className="font-medium text-ink">{sub.phone}</b></span>}
            {(sub.email || sub.billing_email) && <span>Email: <b className="font-medium text-ink">{sub.billing_email || sub.email}</b></span>}
            {isDriver && sub.licence_number && <span>Licence: <b className="font-mono font-medium text-ink">{sub.licence_number}</b></span>}
            {sub.payment_terms && <span>Terms: <b className="font-medium text-ink">{sub.payment_terms}</b></span>}
          </div>
        </div>
      )}

      <div className="space-y-8 px-8 py-7">
        {/* Executive summary */}
        <section className="break-inside-avoid rounded-[14px] border-l-4 border-primary bg-orange-50/40 px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Summary</div>
          <p className="mt-1 text-[14px] leading-relaxed text-ink">{summary}</p>
        </section>
        {/* Headline numbers */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4">
          <Kpi icon={Route} label={isDriver ? 'Journeys driven' : 'Journeys'} value={r.journeys} prev={r.prev.journeys} period={PREV[kind]} />
          <Kpi icon={PoundSterling} label={isDriver ? 'Fare value carried' : isClient ? 'Total spend' : 'Booked revenue'} value={r.revenue} money prev={r.prev.revenue} period={PREV[kind]} accent />
          {isDriver
            ? <Kpi icon={CheckCircle2} label="Legs completed" value={sub.legs_done} suffix={` / ${sub.legs}`} />
            : <Kpi icon={Coins} label={isClient ? 'Paid' : 'Payments received'} value={r.collected} money />}
          {isDriver
            ? <Kpi icon={Clock} label="Time on jobs" text={hours} />
            : <Kpi icon={Receipt} label={isClient ? 'Balance owed' : 'Still to collect'} value={r.outstanding} money warn={r.outstanding > 0} />}
        </section>
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4">
          <Mini icon={CheckCircle2} tone="text-emerald-600" label="Completed" value={`${r.completed}`} sub={`${completion}% of journeys`} />
          <Mini icon={XCircle} tone="text-red-500" label="Cancelled / no-show" value={`${r.cancelled}`} />
          {isDriver
            ? <Mini icon={Users} tone="text-sky-600" label="Different customers" value={`${r.byCustomer.length}`} />
            : <Mini icon={Inbox} tone="text-amber-600" label="New requests" value={`${r.requests}`} sub={`${r.awaiting} awaiting decision`} />}
          <Mini icon={PoundSterling} tone="text-ink" label="Average fare" value={gbp(r.avgFare)} />
        </section>

        {/* Trend */}
        <section className="break-inside-avoid">
          <SectionTitle title={kind === 'daily' ? 'Journeys by hour' : kind === 'yearly' || (kind === 'custom' && r.trend.length && r.trend.length < (r.days || 0)) ? 'Journeys by month' : 'Journeys by day'} note="Bar height = number of journeys · figure above = revenue" />
          <TrendChart trend={r.trend} />
        </section>

        {/* Breakdowns */}
        <section className="grid gap-6 md:grid-cols-2 print:grid-cols-2">
          <Breakdown title="By journey type" rows={r.byType} total={r.revenue} />
          {isDriver
            ? <Breakdown title="Customers driven" rows={r.byCustomer} total={r.revenue} />
            : <Breakdown title={isClient ? 'Chauffeurs used' : 'By chauffeur'} rows={r.byDriver} total={r.revenue} />}
        </section>
        {!sub && (
          <section className="break-inside-avoid">
            <Breakdown title="Top customers" rows={r.byCustomer} total={r.revenue} wide />
          </section>
        )}

        {/* Journey list */}
        <section>
          <SectionTitle title="All journeys in this period" note={`${r.all.length} booking${r.all.length === 1 ? '' : 's'}`} />
          {r.all.length === 0 ? (
            <div className="rounded-xl border border-dashed py-10 text-center text-[13px] text-muted-foreground">No journeys in this period.</div>
          ) : (
            <table className="w-full text-left text-[12px]">
              <thead><tr className="border-b-2 border-ink text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2 font-semibold">Ref</th><th className="py-2 pr-2 font-semibold">Pickup</th><th className="py-2 pr-2 font-semibold">Customer</th>
                <th className="py-2 pr-2 font-semibold">Route</th><th className="py-2 pr-2 font-semibold">Chauffeur</th><th className="py-2 pr-2 font-semibold">Status</th><th className="py-2 text-right font-semibold">Fare</th>
              </tr></thead>
              <tbody>
                {r.all.map((b, i) => (
                  <tr key={b.id} className={cn('break-inside-avoid border-b border-neutral-100', i % 2 === 1 && 'bg-neutral-50/70', CANCELLED.includes(b.status) && 'text-neutral-400')}>
                    <td className="tabular py-2 pr-2 font-semibold">{b.ref}</td>
                    <td className="tabular whitespace-nowrap py-2 pr-2">{new Date(b.first_pickup).toLocaleString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-2 pr-2">{b.organisation_name || b.customer_name}</td>
                    <td className="max-w-[220px] py-2 pr-2"><div className="truncate">{b.pickup}</div><div className="truncate text-muted-foreground">→ {b.destination || 'As directed'}</div></td>
                    <td className="py-2 pr-2">{b.drivers || b.operators || <span className="text-orange-600">—</span>}</td>
                    <td className="py-2 pr-2">{STATUS[b.status]?.admin || b.status}</td>
                    <td className="tabular py-2 text-right font-semibold">{b.total != null ? gbp(b.total) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t-2 border-ink font-semibold">
                <td colSpan={6} className="py-2.5">Total booked (excluding cancelled)</td><td className="tabular py-2.5 text-right">{gbp(r.revenue)}</td>
              </tr></tfoot>
            </table>
          )}
        </section>
      </div>

      <section className="grid break-inside-avoid grid-cols-2 gap-10 px-8 pb-8 pt-2 text-[12px]">
        {['Prepared by', 'Reviewed by'].map((t, i) => (
          <div key={t}>
            <div className="h-10 border-b border-neutral-300">{i === 0 && <span className="text-[13px] font-medium">{data.generated_by}</span>}</div>
            <div className="mt-1.5 flex justify-between text-muted-foreground"><span>{t}</span><span>Date</span></div>
          </div>
        ))}
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t bg-neutral-50 px-8 py-4 text-[11px] text-muted-foreground">
        <span>{data.company} · {reportNo} · Confidential — for internal use</span>
        <span>Times shown in UK time · Revenue = accepted quotations</span>
      </footer>
    </article>
  );
}

function Kpi({ icon: Icon, label, value, money, prev, period, accent, warn, suffix, text }) {
  const diff = prev != null ? value - prev : null;
  const pct = prev ? Math.round((diff / prev) * 100) : null;
  const Arrow = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  return (
    <div className={cn('break-inside-avoid rounded-[14px] border p-4', accent ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-white' : 'bg-white', warn && 'border-amber-200 bg-amber-50/50')}>
      <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground"><Icon className={cn('h-4 w-4', accent ? 'text-primary' : 'opacity-60')} />{label}</div>
      <div className="tabular mt-2 font-heading text-[26px] font-semibold leading-none tracking-tight">{text ?? (money ? gbp(value) : value)}{suffix && <span className="text-[16px] text-muted-foreground">{suffix}</span>}</div>
      {diff != null && (
        <div className={cn('mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium', diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-red-600' : 'text-muted-foreground')}>
          <Arrow className="h-3.5 w-3.5" />{diff === 0 ? 'Same as' : `${pct != null ? `${Math.abs(pct)}%` : money ? gbp(Math.abs(diff)) : Math.abs(diff)} ${diff > 0 ? 'up on' : 'down on'}`} {period}
        </div>
      )}
    </div>
  );
}

function Mini({ icon: Icon, tone, label, value, sub }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] bg-neutral-50 px-4 py-3 ring-1 ring-inset ring-black/[0.04]">
      <Icon className={cn('h-5 w-5 shrink-0', tone)} />
      <div className="min-w-0"><div className="tabular font-heading text-[17px] font-semibold leading-tight">{value}</div><div className="truncate text-[11.5px] text-muted-foreground">{label}{sub ? ` · ${sub}` : ''}</div></div>
    </div>
  );
}

function SectionTitle({ title, note }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 border-b pb-2">
      <h3 className="font-heading text-[14px] font-semibold uppercase tracking-[0.08em]">{title}</h3>
      {note && <span className="text-[11.5px] text-muted-foreground">{note}</span>}
    </div>
  );
}

function TrendChart({ trend }) {
  const max = Math.max(1, ...trend.map((t) => t.count));
  const H = 150;
  return (
    <div className="rounded-[14px] border bg-white p-4">
      <div className="flex h-[190px] items-end gap-[3px]">
        {trend.map((t, i) => {
          const h = (t.count / max) * H;
          return (
            <div key={i} className="group flex min-w-0 flex-1 flex-col items-center justify-end" title={`${t.label}: ${t.count} journey${t.count === 1 ? '' : 's'} · ${gbp(t.revenue)}`}>
              {t.count > 0 && trend.length <= 14 && <div className="tabular mb-1 text-[10px] font-semibold text-muted-foreground">{gbp(t.revenue).replace('.00', '')}</div>}
              <div className="relative w-full max-w-[44px] overflow-hidden rounded-t-[6px] bg-gradient-to-t from-primary to-orange-300 transition-all duration-700"
                style={{ height: Math.max(t.count ? 6 : 2, h), opacity: t.count ? 1 : 0.18 }}>
                {t.count > 0 && <span className="tabular absolute inset-x-0 top-1 text-center text-[10px] font-bold text-white">{h > 18 ? t.count : ''}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[3px] border-t pt-1.5">
        {trend.map((t, i) => <div key={i} className="min-w-0 flex-1 text-center text-[10px] text-muted-foreground">{t.short ?? t.label}</div>)}
      </div>
    </div>
  );
}

function Breakdown({ title, rows, total, wide }) {
  return (
    <div className="break-inside-avoid">
      <SectionTitle title={title} />
      {rows.length === 0 ? <div className="text-[12.5px] text-muted-foreground">Nothing to show.</div> : (
        <div className={cn('space-y-2.5', wide && 'grid gap-x-8 gap-y-2.5 space-y-0 md:grid-cols-2 print:grid-cols-2')}>
          {rows.map((g) => {
            const share = total ? (g.revenue / total) * 100 : 0;
            return (
              <div key={g.name}>
                <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="truncate font-medium">{g.name}</span>
                  <span className="tabular shrink-0 text-muted-foreground"><b className="font-semibold text-ink">{gbp(g.revenue)}</b> · {g.count} job{g.count === 1 ? '' : 's'}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-ink to-neutral-600 transition-all duration-700" style={{ width: `${Math.max(share, g.count ? 2 : 0)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
