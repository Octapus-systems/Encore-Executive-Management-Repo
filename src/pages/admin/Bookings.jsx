import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Archive, CalendarClock, Car, CheckCircle2, ChevronRight, ClipboardList,
  Clock, ExternalLink, FileText, Filter, Inbox, Navigation, Plane, Plus,
  RefreshCw, Search, Sparkles, User, UserCheck, UserPlus, Users, X
} from 'lucide-react';
import { api } from '@/lib/api';
import { JOURNEY_TYPES, STATUS, gbp, shortDateTime } from '@/lib/format';
import { ROW_TINT, CountUp, ErrorState, IconTile, PageHeader, PageLoader, PaymentBadge, Pill, SelectInput, TextInput } from '@/components/common';
import { cn } from '@/lib/utils';

// Primary workflow tabs
const TABS = [
  { id: 'all',         label: 'All Bookings',   icon: ClipboardList, badgeColor: 'bg-neutral-800 text-white',       statuses: [] },
  { id: 'requests',    label: 'New Requests',   icon: Inbox,         badgeColor: 'bg-amber-500 text-white',         statuses: ['pending', 'under_review', 'clarification_needed', 'change_requested'] },
  { id: 'quoted',      label: 'Quoted',         icon: FileText,      badgeColor: 'bg-blue-600 text-white',          statuses: ['quote_sent', 'quote_accepted'] },
  { id: 'to_assign',   label: 'To Assign',      icon: UserPlus,      badgeColor: 'bg-violet-600 text-white',        statuses: ['confirmed'] },
  { id: 'assigned',    label: 'Assigned',       icon: UserCheck,     badgeColor: 'bg-cyan-600 text-white',          statuses: ['driver_assigned'] },
  { id: 'in_progress', label: 'On Route',       icon: Navigation,    badgeColor: 'bg-orange-500 text-white',        statuses: ['on_the_way', 'arrived', 'started'] },
  { id: 'completed',   label: 'Completed',      icon: CheckCircle2,  badgeColor: 'bg-emerald-600 text-white',       statuses: ['completed'] },
  { id: 'closed',      label: 'Archive',        icon: Archive,       badgeColor: 'bg-neutral-600 text-white',       statuses: ['closed', 'rejected', 'cancelled_customer', 'cancelled_management', 'expired', 'no_show', 'quote_declined'] },
];

const STATUS_BADGE = {
  pending:              { label: 'Pending Review',    tone: 'amber' },
  under_review:         { label: 'Under Review',      tone: 'amber' },
  clarification_needed: { label: 'Clarification',     tone: 'amber' },
  change_requested:     { label: 'Change Requested',  tone: 'amber' },
  quote_sent:           { label: 'Quote Sent',        tone: 'blue' },
  quote_accepted:       { label: 'Quote Accepted',    tone: 'blue' },
  confirmed:            { label: 'Needs Chauffeur',   tone: 'violet' },
  driver_assigned:      { label: 'Assigned',          tone: 'blue' },
  on_the_way:           { label: 'Chauffeur En Route',tone: 'brand' },
  arrived:              { label: 'Arrived at Pickup', tone: 'brand' },
  started:              { label: 'Passenger Onboard', tone: 'amber' },
  completed:            { label: 'Completed',         tone: 'green' },
  closed:               { label: 'Closed',            tone: 'grey' },
  rejected:             { label: 'Rejected',          tone: 'red' },
  cancelled_customer:   { label: 'Cancelled by Client', tone: 'red' },
  cancelled_management: { label: 'Cancelled by Admin',  tone: 'red' },
  expired:              { label: 'Expired',           tone: 'grey' },
  no_show:              { label: 'No Show',           tone: 'red' },
  quote_declined:       { label: 'Quote Declined',    tone: 'red' },
};

export default function Bookings() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  // Determine initial tab from either 'tab' or 'status' param
  const initialTab = useMemo(() => {
    const t = params.get('tab');
    if (t && TABS.some((tab) => tab.id === t)) return t;
    const s = params.get('status');
    if (s) {
      const match = TABS.find((tab) => tab.statuses.includes(s) || (tab.statuses.length && tab.statuses.join(',') === s));
      if (match) return match.id;
    }
    return 'all';
  }, []);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [q, setQ] = useState(params.get('q') || '');
  const [sort, setSort] = useState('created');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [org, setOrg] = useState('');
  const [vehicle, setVehicle] = useState('');

  // Sync tab changes with URL search params safely
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const nextParams = new URLSearchParams(params);
    if (tabId === 'all') {
      nextParams.delete('tab');
      nextParams.delete('status');
    } else {
      nextParams.set('tab', tabId);
      nextParams.delete('status');
    }
    setParams(nextParams, { replace: true });
  };

  const qs = new URLSearchParams({
    ...(q && { q }),
    sort,
    ...(from && { from: new Date(from).toISOString() }),
    ...(to && { to: new Date(new Date(to).getTime() + 86400000).toISOString() }),
    ...(org && { organisation_id: org }),
    ...(vehicle && { vehicle_id: vehicle }),
  }).toString();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['bookings', 'admin', qs],
    queryFn: () => api.get(`/bookings?${qs}`),
    refetchInterval: 10000,
  });

  const orgs = useQuery({ queryKey: ['organisations'], queryFn: () => api.get('/admin/organisations') });
  const vehicles = useQuery({ queryKey: ['vehicles'], queryFn: () => api.get('/admin/vehicles') });

  const allBookings = data || [];

  // Filter bookings according to active tab
  const filteredBookings = useMemo(() => {
    const currentTabDef = TABS.find((t) => t.id === activeTab);
    if (!currentTabDef || currentTabDef.id === 'all' || !currentTabDef.statuses.length) {
      return allBookings;
    }
    return allBookings.filter((b) => currentTabDef.statuses.includes(b.status));
  }, [allBookings, activeTab]);

  // Counts for each tab
  const tabCounts = useMemo(() => {
    const counts = {};
    for (const t of TABS) {
      if (t.id === 'all') {
        counts[t.id] = allBookings.length;
      } else {
        counts[t.id] = allBookings.filter((b) => t.statuses.includes(b.status)).length;
      }
    }
    return counts;
  }, [allBookings]);

  // Executive summary counts
  const needsActionCount = tabCounts['requests'] + tabCounts['to_assign'];
  const onRoadCount = tabCounts['in_progress'];
  const completedCount = tabCounts['completed'];

  const kpis = [
    { id: 'requests', label: 'Needs action', value: needsActionCount, hint: 'review or assign', icon: Inbox, tone: 'amber' },
    { id: 'in_progress', label: 'Live on road', value: onRoadCount, hint: 'right now', icon: Navigation, tone: 'brand', live: true },
    { id: 'completed', label: 'Completed', value: completedCount, hint: 'delivered', icon: CheckCircle2, tone: 'green' },
  ];
  const activeLabel = TABS.find((t) => t.id === activeTab)?.label;
  const hasFilters = q || from || to || org;
  const clearFilters = () => { setQ(''); setFrom(''); setTo(''); setOrg(''); };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Bookings"
        subtitle="Review requests, send quotes and assign chauffeurs."
        actions={
          <span className="inline-flex h-8 items-center gap-2 rounded-full bg-emerald-50 px-3 text-[12px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15" title="Updates automatically every few seconds">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
            {isFetching ? 'Syncing' : 'Live'}
          </span>
        }
      />

      {/* KPIs: icon-led, tap to filter */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kpis.map((k, i) => (
          <button key={k.id} type="button" onClick={() => handleTabChange(k.id)} style={{ animationDelay: `${i * 60}ms` }}
            className={cn('card-surface lift animate-rise group flex items-center gap-4 p-4 text-left',
              activeTab === k.id && 'border-ink/80 ring-1 ring-ink/80')}>
            <IconTile icon={k.icon} tone={k.tone} live={k.live} />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-muted-foreground">{k.label}</div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <CountUp value={k.value} className="font-heading text-[26px] font-semibold leading-none tracking-tight text-ink" />
                <span className="truncate text-[12px] text-muted-foreground">{k.hint}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Workflow tabs + toolbar + table in one card */}
      <div className="card-surface overflow-hidden">
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b px-3 pt-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tabCounts[tab.id] || 0;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => handleTabChange(tab.id)}
                className={cn('relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 pb-3 pt-2 text-[13px] font-medium transition-colors active:!scale-100',
                  isActive ? 'text-ink' : 'text-muted-foreground hover:text-ink')}>
                <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'opacity-60')} />
                {tab.label}
                <span className={cn('tabular inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold transition-colors',
                  isActive ? 'bg-ink text-white' : 'bg-neutral-100 text-neutral-500')}>{count}</span>
                {isActive && <span className="tab-ink absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 p-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <TextInput className="h-9 border-transparent bg-neutral-100/70 pl-9 shadow-none hover:border-transparent focus:bg-white"
              placeholder="Search reference, customer, passenger or postcode" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button type="button" onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-400 hover:text-neutral-700"><X className="h-4 w-4" /></button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[138px] text-[13px]" title="Pickup from" />
            <span className="text-xs text-muted-foreground">to</span>
            <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[138px] text-[13px]" title="Pickup to" />
            <SelectInput value={org} onChange={(e) => setOrg(e.target.value)} className="h-9 w-40 text-[13px]">
              <option value="">All accounts</option>
              {(orgs.data || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </SelectInput>
            <SelectInput value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 w-36 text-[13px]">
              <option value="created">Newest first</option>
              <option value="pickup">Pickup: soonest</option>
              <option value="pickup_desc">Pickup: latest</option>
              <option value="customer">Customer name</option>
            </SelectInput>
            {hasFilters && <button type="button" onClick={clearFilters} className="h-9 rounded-[10px] px-2.5 text-[13px] font-medium text-primary hover:bg-orange-50">Clear</button>}
          </div>
        </div>

        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <div className="p-4"><ErrorState error={error} /></div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-t py-16 text-center">
            <div className="float-y"><IconTile icon={ClipboardList} tone="grey" size="lg" /></div>
            <h3 className="mt-4 text-[15px] font-semibold text-ink">Nothing in {activeLabel}</h3>
            <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
              {activeTab !== 'all' ? 'No bookings have this status right now.' : 'No bookings match your search or filters.'}
            </p>
            {activeTab !== 'all' && (
              <button type="button" onClick={() => handleTabChange('all')} className="mt-4 h-9 rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-white hover:bg-ink/85">
                View all bookings ({allBookings.length})
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border-t">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b bg-neutral-50/60 text-[12px] text-muted-foreground">
                    <th className="py-2.5 pl-5 pr-3 font-medium">Booking</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Passenger</th>
                    <th className="px-3 py-2.5 font-medium">Route</th>
                    <th className="px-3 py-2.5 font-medium">Pickup</th>
                    <th className="px-3 py-2.5 font-medium">Chauffeur</th>
                    <th className="px-3 py-2.5 text-right font-medium">Fare</th>
                    <th className="w-10 py-2.5 pr-4" />
                  </tr>
                </thead>
                <tbody key={activeTab} className="divide-y divide-black/[0.05]">
                  {filteredBookings.map((b, i) => {
                    const st = STATUS_BADGE[b.status] || { label: b.status, tone: 'grey' };
                    const stopsList = b.stops ? (Array.isArray(b.stops) ? b.stops : JSON.parse(b.stops || '[]')) : [];
                    const JT = b.journey_type === 'airport' || /airport/i.test(b.pickup + b.destination) ? Plane : Car;
                    return (
                      <tr key={b.id} onClick={() => navigate(`/admin/bookings/${b.id}`)} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                        className={cn('row-in group cursor-pointer transition-colors', (ROW_TINT[st.tone] || ROW_TINT.grey).row)}>
                        <td className={cn('py-3.5 pl-5 pr-3', (ROW_TINT[st.tone] || ROW_TINT.grey).edge)}>
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-neutral-100 text-neutral-600 transition group-hover:bg-ink group-hover:text-white"><JT className="h-4 w-4" /></span>
                            <div>
                              <Link to={`/admin/bookings/${b.id}`} onClick={(e) => e.stopPropagation()} className="tabular font-semibold text-ink hover:text-primary">{b.ref}</Link>
                              <div className="whitespace-nowrap text-[12px] text-muted-foreground">{JOURNEY_TYPES[b.journey_type] || 'Standard'}{b.is_return ? ' · Return' : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5"><Pill tone={st.tone}>{st.label}</Pill></td>
                        <td className="px-3 py-3.5">
                          <div className="whitespace-nowrap font-medium text-ink">{b.lead_passenger || b.customer_name}</div>
                          <div className={cn('whitespace-nowrap text-[12px]', b.organisation_name ? 'font-medium text-primary' : 'text-muted-foreground')}>{b.organisation_name || b.customer_name}</div>
                        </td>
                        <td className="max-w-[260px] px-3 py-3.5">
                          <div className="relative space-y-1 pl-4">
                            <span className="absolute left-[3px] top-[8px] h-[calc(100%-16px)] w-px bg-gradient-to-b from-emerald-400 to-neutral-300" />
                            <div className="relative truncate text-ink" title={b.pickup}><span className="absolute -left-4 top-[5px] h-[7px] w-[7px] rounded-full bg-emerald-500 ring-2 ring-white" />{b.pickup}</div>
                            {stopsList.length > 0 && <div className="text-[11px] font-medium text-amber-700">+{stopsList.length} stop{stopsList.length === 1 ? '' : 's'}</div>}
                            <div className="relative truncate text-muted-foreground" title={b.destination}><span className="absolute -left-4 top-[5px] h-[7px] w-[7px] rounded-[2px] bg-ink ring-2 ring-white" />{b.destination || 'As directed'}</div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5">
                          <div className="flex items-center gap-1.5 font-medium text-ink"><CalendarClock className="h-3.5 w-3.5 text-neutral-400" /><span className="tabular">{shortDateTime(b.first_pickup)}</span></div>
                        </td>
                        <td className="px-3 py-3.5">
                          {b.drivers ? (
                            <div className="flex items-center gap-2">
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 text-[10px] font-semibold text-white">{b.drivers.split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}</span>
                              <div className="min-w-0"><div className="truncate font-medium text-ink">{b.drivers}</div><div className="truncate text-[12px] text-muted-foreground">{b.vehicles}</div></div>
                            </div>
                          ) : (
                            <Link to={`/admin/bookings/${b.id}`} onClick={(e) => e.stopPropagation()}
                              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-2.5 text-[12px] font-medium text-neutral-600 hover:border-primary hover:bg-orange-50 hover:text-primary">
                              <UserPlus className="h-3.5 w-3.5" />Assign
                            </Link>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-right">
                          {b.total != null ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="tabular font-semibold text-ink">{gbp(b.total)}</span>
                              <PaymentBadge status={b.payment_status} />
                            </div>
                          ) : <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground"><Clock className="h-3 w-3" />Quote pending</span>}
                        </td>
                        <td className="py-3.5 pr-4 text-right">
                          <ChevronRight className="ml-auto h-4 w-4 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t px-5 py-3 text-[12px] text-muted-foreground">
              <span>Showing <b className="font-semibold text-ink">{filteredBookings.length}</b> of {allBookings.length}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
