import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Archive, CalendarClock, Car, CheckCircle2, ClipboardList, FileText, Inbox, Navigation, Search, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { JOURNEY_TYPES, STATUS, gbp, shortDateTime } from '@/lib/format';
import { Empty, ErrorState, PageHeader, PageLoader, PaymentBadge, SelectInput, TextInput } from '@/components/common';
import { cn } from '@/lib/utils';

const STAGES = [
  { label: 'Requests',      hint: 'Waiting for quote',  icon: Inbox,         statuses: ['pending','under_review','clarification_needed','change_requested'], tile: 'bg-amber-100 text-amber-950',   row: 'bg-amber-50  hover:bg-amber-100',  border: 'border-l-amber-500',  pill: 'bg-amber-200 text-amber-900'   },
  { label: 'In progress',   hint: 'On the road now',    icon: Navigation,    statuses: ['on_the_way','arrived','started'],                                    tile: 'bg-orange-500 text-white',      row: 'bg-orange-50 hover:bg-orange-100', border: 'border-l-orange-500', pill: 'bg-orange-200 text-orange-900'  },
  { label: 'To assign',     hint: 'Need a chauffeur',   icon: UserPlus,      statuses: ['confirmed'],                                                         tile: 'bg-violet-100 text-violet-950', row: 'bg-violet-50 hover:bg-violet-100', border: 'border-l-violet-500', pill: 'bg-violet-200 text-violet-900'  },
  { label: 'Quoted',        hint: 'With the customer',  icon: FileText,      statuses: ['quote_sent','quote_accepted'],                                       tile: 'bg-blue-100 text-blue-950',     row: 'bg-blue-50   hover:bg-blue-100',   border: 'border-l-blue-500',   pill: 'bg-blue-200 text-blue-900'     },
  { label: 'Assigned',      hint: 'Chauffeur set',      icon: Car,           statuses: ['driver_assigned'],                                                   tile: 'bg-cyan-100 text-cyan-950',     row: 'bg-cyan-50   hover:bg-cyan-100',   border: 'border-l-cyan-500',   pill: 'bg-cyan-200 text-cyan-900'     },
  { label: 'Completed',     hint: 'Journey finished',   icon: CheckCircle2,  statuses: ['completed'],                                                         tile: 'bg-emerald-100 text-emerald-950',row:'bg-emerald-50 hover:bg-emerald-100',border:'border-l-emerald-500',pill: 'bg-emerald-200 text-emerald-900'},
  { label: 'Closed/ended',  hint: 'Closed or cancelled',icon: Archive,       statuses: ['closed','rejected','cancelled_customer','cancelled_management','expired','no_show','quote_declined'], tile: 'bg-neutral-200 text-neutral-900', row: 'bg-neutral-100 hover:bg-neutral-200', border: 'border-l-neutral-400', pill: 'bg-neutral-300 text-neutral-800' },
];
const keyOf = (st) => st.statuses.join(',');
const stageOf = (status) => STAGES.find((st) => st.statuses.includes(status)) ?? STAGES[STAGES.length - 1];

function Tile({ label, hint, icon: I, count, tone, active, big, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex min-h-[96px] flex-col justify-between rounded-2xl p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-[.98]', tone, active && 'ring-2 ring-ink ring-offset-2')}>
      <span className="flex items-start justify-between gap-1">
        <span className="text-xs font-semibold leading-tight tracking-wide uppercase opacity-80">{label}</span>
        <I className="h-4 w-4 shrink-0 opacity-60" />
      </span>
      <span>
        <span className={cn('block font-heading font-extrabold leading-none tabular-nums', big ? 'text-5xl' : 'text-3xl')}>{count}</span>
        <span className="mt-1 block text-[11px] opacity-65">{hint}</span>
      </span>
    </button>
  );
}

export default function Bookings() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const [q, setQ]           = useState(params.get('q') || '');
  const [sort, setSort]     = useState('created');
  const [from, setFrom]     = useState('');
  const [to, setTo]         = useState('');
  const [org, setOrg]       = useState('');
  const [vehicle, setVehicle] = useState('');

  const qs = new URLSearchParams({
    ...(q && { q }), sort,
    ...(from && { from: new Date(from).toISOString() }),
    ...(to   && { to:   new Date(new Date(to).getTime() + 86400000).toISOString() }),
    ...(org  && { organisation_id: org }),
    ...(vehicle && { vehicle_id: vehicle }),
  }).toString();

  const { data, isLoading, error } = useQuery({ queryKey: ['bookings','admin',qs], queryFn: () => api.get(`/bookings?${qs}`), refetchInterval: 10000 });
  const orgs     = useQuery({ queryKey: ['organisations'], queryFn: () => api.get('/admin/organisations') });
  const vehicles = useQuery({ queryKey: ['vehicles'],      queryFn: () => api.get('/admin/vehicles') });

  const all    = data || [];
  const count  = (st) => all.filter((b) => st.statuses.includes(b.status)).length;
  const wanted = status ? status.split(',') : null;
  const shown  = wanted ? all.filter((b) => wanted.includes(b.status)) : all;
  const pick   = (key) => setParams(key && key !== status ? { status: key } : {});

  return (
    <div>
      <PageHeader title="Bookings" subtitle="Search, filter and act on every request and journey." />

      {/* Summary tiles */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
        {STAGES.map((st, i) => (
          <Tile key={st.label} {...st} tone={st.tile} big={i === 0} count={count(st)} active={status === keyOf(st)} onClick={() => pick(keyOf(st))} />
        ))}
        <Tile label="All" hint="Show everything" icon={ClipboardList} tone="bg-ink text-white" count={all.length} active={!status} onClick={() => pick('')} />
      </div>

      {/* Filters */}
      <div className="mb-4 grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <TextInput className="pl-9" placeholder="Ref, passenger, customer, address" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="Pickup from" />
        <TextInput type="date" value={to}   onChange={(e) => setTo(e.target.value)}   title="Pickup to" />
        <SelectInput value={org}     onChange={(e) => setOrg(e.target.value)}>
          <option value="">All organisations</option>
          {(orgs.data || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </SelectInput>
        <SelectInput value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
          <option value="">All vehicles</option>
          {(vehicles.data || []).map((v) => <option key={v.id} value={v.id}>{v.registration}</option>)}
        </SelectInput>
        <SelectInput value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="created">Newest bookings</option>
          <option value="pickup">Pickup: soonest</option>
          <option value="pickup_desc">Pickup: latest</option>
          <option value="status">Status</option>
          <option value="customer">Customer</option>
        </SelectInput>
      </div>

      {/* Table */}
      {isLoading ? <PageLoader /> : error ? <ErrorState error={error} /> : shown.length === 0 ? (
        <Empty icon={ClipboardList} title="No bookings match" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pl-5 pr-3 text-left">Ref</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Customer</th>
                <th className="px-3 py-3 text-left">Route</th>
                <th className="px-3 py-3 text-left">Pickup</th>
                <th className="px-3 py-3 text-left">Chauffeur</th>
                <th className="px-3 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((b) => {
                const st = stageOf(b.status);
                return (
                  <tr key={b.id} className={cn('border-l-[3px] transition-colors', st.row, st.border)}>
                    <td className="py-3 pl-5 pr-3">
                      <Link to={`/admin/bookings/${b.id}`} className="font-heading font-bold text-ink hover:text-primary hover:underline">
                        {b.ref}
                      </Link>
                      <div className="text-xs text-muted-foreground">{JOURNEY_TYPES[b.journey_type]}{b.is_return ? ' · return' : ''}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', st.pill)}>
                        {STATUS[b.status]?.admin || b.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-ink">{b.customer_name}</div>
                      {b.organisation_name && <div className="text-xs text-muted-foreground">{b.organisation_name}</div>}
                    </td>
                    <td className="max-w-[220px] px-3 py-3">
                      <div className="truncate text-ink">{b.pickup}</div>
                      <div className="truncate text-xs text-muted-foreground">→ {b.destination}</div>
                    </td>
                    <td className="px-3 py-3 text-nowrap">
                      <div className="flex items-center gap-1.5 text-ink">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0 opacity-50" />
                        {shortDateTime(b.first_pickup)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {b.drivers
                        ? <><div className="text-ink">{b.drivers}</div><div className="text-xs text-muted-foreground">{b.vehicles}</div></>
                        : <span className="text-xs text-muted-foreground italic">None assigned</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {b.total != null && (
                        <>
                          <div className="font-bold text-ink">{gbp(b.total)}</div>
                          <div className="flex justify-end"><PaymentBadge status={b.payment_status} /></div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
