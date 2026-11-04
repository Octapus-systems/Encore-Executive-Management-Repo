import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock, Columns3, Navigation, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { STATUS, timeOnly } from '@/lib/format';
import { Avatar, Empty, IconTile, PageHeader, PageLoader, Segmented } from '@/components/common';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const START_HOUR = 0;
const END_HOUR = 24;
const HOUR_PX = 56;
const DAY_MS = 86400000;

/** Event colours by status tone: soft fill, strong left edge, readable text. */
const TONE = {
  amber: 'bg-amber-50 border-amber-400 text-amber-950 hover:bg-amber-100',
  blue: 'bg-sky-50 border-sky-400 text-sky-950 hover:bg-sky-100',
  violet: 'bg-violet-50 border-violet-400 text-violet-950 hover:bg-violet-100',
  green: 'bg-emerald-50 border-emerald-500 text-emerald-950 hover:bg-emerald-100',
  brand: 'bg-orange-50 border-orange-500 text-orange-950 hover:bg-orange-100',
  dark: 'bg-neutral-100 border-neutral-700 text-neutral-900 hover:bg-neutral-200',
  grey: 'bg-neutral-50 border-neutral-300 text-neutral-500 hover:bg-neutral-100',
  red: 'bg-red-50 border-red-300 text-red-800/80 line-through decoration-red-300 hover:bg-red-100',
};
const LEGEND = [['amber', 'To review', 'bg-amber-400'], ['blue', 'Quoted / assigned', 'bg-sky-400'], ['violet', 'Needs chauffeur', 'bg-violet-400'], ['brand', 'On the road', 'bg-orange-500'], ['green', 'Done', 'bg-emerald-500']];

const toneOf = (l) => (l.status === 'confirmed' ? 'violet' : l.status === 'driver_assigned' ? 'blue' : STATUS[l.status]?.tone || 'grey');
// All times are shown in UK time (the business runs in the UK), whatever the viewer's computer zone.
// Calendar days are plain dates held as UTC-midnight Date objects.
const TZ = 'Europe/London';
const ukFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function uk(v) {
  const p = Object.fromEntries(ukFmt.formatToParts(new Date(v)).map((x) => [x.type, x.value]));
  return { key: `${p.year}-${p.month}-${p.day}`, h: Number(p.hour), m: Number(p.minute) };
}
const dayKey = (d) => d.toISOString().slice(0, 10);
const sameDay = (v, d) => uk(v).key === dayKey(d);
function ukToday() { const k = uk(new Date()).key; return new Date(`${k}T00:00:00Z`); }
function startOfWeek(d) { return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY_MS); }
const startOfDay = (d) => d;
const fmtDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtWeekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' });
const fmtLong = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

/** Place overlapping journeys side by side: returns [{ l, top, height, col, cols }]. */
function layoutDay(items) {
  const ev = items.map((l) => {
    const t = uk(l.pickup_at);
    const mins = (t.h - START_HOUR) * 60 + t.m;
    const dur = Math.max(30, l.est_minutes || 60);
    return { l, start: mins, end: mins + dur };
  }).sort((a, b) => a.start - b.start);
  const out = [];
  let cluster = [], clusterEnd = -1;
  const flush = () => {
    const cols = [];
    cluster.forEach((e) => {
      let c = cols.findIndex((end) => end <= e.start);
      if (c === -1) { c = cols.length; cols.push(0); }
      cols[c] = e.end; e.col = c;
    });
    cluster.forEach((e) => out.push({ ...e, cols: cols.length }));
    cluster = []; clusterEnd = -1;
  };
  ev.forEach((e) => { if (cluster.length && e.start >= clusterEnd) flush(); cluster.push(e); clusterEnd = Math.max(clusterEnd, e.end); });
  if (cluster.length) flush();
  return out.map((e) => ({ ...e, top: Math.max(0, e.start) / 60 * HOUR_PX, height: Math.max(26, (e.end - Math.max(0, e.start)) / 60 * HOUR_PX - 2) }));
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  return now;
}

export default function Calendar() {
  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(() => ukToday());
  const now = useNow();

  const start = view === 'day' ? startOfDay(anchor) : startOfWeek(anchor);
  const span = view === 'day' ? 1 : 7;
  const end = new Date(start.getTime() + span * DAY_MS);
  const days = useMemo(() => Array.from({ length: span }, (_, i) => new Date(start.getTime() + i * DAY_MS)), [start.getTime(), span]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', start.toISOString(), span],
    // Fetch a little either side, then bucket by UK date.
    queryFn: () => api.get(`/admin/calendar?from=${new Date(start.getTime() - DAY_MS / 4).toISOString()}&to=${new Date(end.getTime() + DAY_MS / 4).toISOString()}`),
    refetchInterval: 10000,
  });
  const legs = useMemo(() => (data || []).filter((l) => days.some((d) => sameDay(l.pickup_at, d))), [data, days]);
  const todayDay = ukToday();

  const shift = (dir) => setAnchor(new Date(anchor.getTime() + dir * span * DAY_MS));
  const onToday = days.some((d) => dayKey(d) === dayKey(todayDay));
  const label = view === 'day' ? fmtLong.format(start) : `${fmtDay.format(start)} – ${fmtDay.format(new Date(end.getTime() - 1))} ${start.getUTCFullYear()}`;

  const unassigned = legs.filter((l) => !l.driver_name && !l.registration && !['red', 'grey'].includes(toneOf(l))).length;
  const todayCount = legs.filter((l) => sameDay(l.pickup_at, todayDay)).length;
  const live = legs.filter((l) => ['on_the_way', 'arrived', 'started'].includes(l.status)).length;

  return (
    <div>
      <PageHeader icon={CalendarDays} title="Calendar" subtitle="Every journey at a glance. Tap one to open it."
        actions={<Segmented value={view} onChange={setView} options={[['week', 'Week', Columns3], ['day', 'Day', CalendarRange], ['drivers', 'Drivers', Users]]} />} />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Previous" onClick={() => shift(-1)}><ChevronLeft /></Button>
          <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Next" onClick={() => shift(1)}><ChevronRight /></Button>
          {!(onToday && (view !== 'day' || dayKey(start) === dayKey(todayDay))) && <Button variant="outline" className="h-9" onClick={() => setAnchor(ukToday())}>Today</Button>}
          <h2 className="ml-1 font-heading text-[17px] font-semibold tracking-tight">{label}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip icon={CalendarDays} tone="dark" n={legs.length} label={view === 'day' ? 'journeys' : 'this week'} />
          {onToday && view !== 'day' && <Chip icon={Clock} tone="blue" n={todayCount} label="today" />}
          <Chip icon={Navigation} tone="brand" n={live} label="live" live={live > 0} muted={!live} />
          <Chip icon={AlertTriangle} tone="red" n={unassigned} label="no chauffeur" muted={!unassigned} />
        </div>
      </div>

      {isLoading ? <PageLoader /> : view === 'drivers' ? (
        <DriverLanes legs={legs} days={days} today={todayDay} />
      ) : (
        <TimeGrid legs={legs} days={days} now={now} today={todayDay} onPickDay={(d) => { setAnchor(d); setView('day'); }} single={view === 'day'} />
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted-foreground">
        {LEGEND.map(([k, l, dot]) => <span key={k} className="inline-flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-[3px]', dot)} />{l}</span>)}
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] border border-dashed border-orange-500" />No chauffeur yet</span>
        {view === 'week' && <span className="ml-auto hidden sm:inline">Tip: tap a date to see that day.</span>}
      </div>
    </div>
  );
}

function Chip({ icon: Icon, tone, n, label, live, muted }) {
  const tones = { dark: 'bg-neutral-100 text-neutral-700', blue: 'bg-sky-50 text-sky-700', brand: 'bg-orange-50 text-orange-700', red: 'bg-red-50 text-red-700' };
  return (
    <span className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium', muted ? 'bg-neutral-50 text-neutral-400' : tones[tone])}>
      <span className="relative flex">
        {live && <span className="absolute inset-0 animate-ping rounded-full bg-orange-400/50" />}
        <Icon className="relative h-3.5 w-3.5" />
      </span>
      <span className="tabular font-semibold">{n}</span>{label}
    </span>
  );
}

// ---------------- Week / Day time grid ----------------
function TimeGrid({ legs, days, now, today: todayDay, onPickDay, single }) {
  const isToday = (d) => dayKey(d) === dayKey(todayDay);
  const nowUk = uk(now);
  const scroller = useRef(null);
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const byDay = useMemo(() => days.map((d) => layoutDay(legs.filter((l) => sameDay(l.pickup_at, d)))), [legs, days]);

  // Open scrolled to the morning (or near now, if today is shown).
  useEffect(() => {
    const h = days.some(isToday) ? Math.max(START_HOUR, nowUk.h - 2) : 7;
    if (scroller.current) scroller.current.scrollTop = (h - START_HOUR) * HOUR_PX;
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const nowTop = ((nowUk.h - START_HOUR) * 60 + nowUk.m) / 60 * HOUR_PX;
  const cols = single ? 'grid-cols-[56px_1fr]' : 'grid-cols-[56px_repeat(7,minmax(118px,1fr))]';

  return (
    <div className="card-surface animate-rise overflow-hidden">
      <div className="overflow-x-auto">
        <div className={cn('min-w-full', !single && 'min-w-[900px]')}>
          {/* Day headers */}
          <div className={cn('grid border-b bg-white', cols)}>
            <div />
            {days.map((d, i) => {
              const today = isToday(d);
              const n = byDay[i].length;
              return (
                <button key={d.toISOString()} type="button" onClick={() => !single && onPickDay(d)} disabled={single}
                  className={cn('group flex items-center justify-center gap-2 border-l py-3 transition-colors active:!scale-100 disabled:cursor-default', !single && 'hover:bg-neutral-50', today && 'bg-orange-50/50')}>
                  <span className={cn('text-[12px] font-medium uppercase tracking-wide', today ? 'text-primary' : 'text-muted-foreground')}>{fmtWeekday.format(d)}</span>
                  <span className={cn('tabular grid h-8 w-8 place-items-center rounded-full font-heading text-[15px] font-semibold transition', today ? 'bg-primary text-white shadow-[0_4px_12px_-4px_rgba(255,113,15,.7)]' : 'text-ink group-hover:bg-neutral-100')}>{d.getUTCDate()}</span>
                  {n > 0 && <span className="tabular rounded-md bg-neutral-100 px-1.5 text-[11px] font-semibold text-neutral-600">{n}</span>}
                </button>
              );
            })}
          </div>

          {/* Hours */}
          <div ref={scroller} className="max-h-[calc(100vh-330px)] min-h-[420px] overflow-y-auto [scrollbar-width:thin]">
            <div className={cn('relative grid', cols)} style={{ height: hours.length * HOUR_PX }}>
              <div className="relative">
                {hours.map((h) => (
                  <div key={h} className="tabular absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground" style={{ top: (h - START_HOUR) * HOUR_PX }}>
                    {h === START_HOUR ? '' : `${String(h).padStart(2, '0')}:00`}
                  </div>
                ))}
              </div>
              {days.map((d, i) => {
                const today = isToday(d);
                const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
                return (
                  <div key={d.toISOString()} className={cn('relative border-l', today ? 'bg-orange-50/25' : weekend && 'bg-neutral-50/60')}>
                    {hours.map((h) => <div key={h} className="absolute inset-x-0 border-t border-neutral-100" style={{ top: (h - START_HOUR) * HOUR_PX }} />)}
                    {hours.map((h) => <div key={`h${h}`} className="absolute inset-x-0 border-t border-dashed border-neutral-100/70" style={{ top: (h - START_HOUR) * HOUR_PX + HOUR_PX / 2 }} />)}
                    {byDay[i].map((e, k) => <EventBlock key={e.l.id} e={e} i={k} single={single} />)}
                    {today && nowTop >= 0 && (
                      <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: nowTop }}>
                        <div className="relative h-[2px] bg-red-500">
                          <span className="absolute -left-1.5 -top-[5px] h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {legs.length === 0 && <div className="border-t py-6 text-center text-[13px] text-muted-foreground">No journeys in this period.</div>}
    </div>
  );
}

function EventBlock({ e, i, single }) {
  const { l } = e;
  const tone = toneOf(l);
  const noDriver = !l.driver_name && !l.registration && !['red', 'grey'].includes(tone);
  const w = 100 / e.cols;
  const roomy = e.height >= 54;
  return (
    <Link to={`/admin/bookings/${l.booking_id}`}
      title={`${timeOnly(l.pickup_at)} · ${l.ref} · ${l.lead_passenger}\n${l.pickup} → ${l.destination || 'As directed'}\n${l.driver_name || 'No chauffeur yet'}`}
      style={{ top: e.top + 1, height: e.height, left: `calc(${e.col * w}% + 3px)`, width: `calc(${w}% - 6px)`, animationDelay: `${Math.min(i, 10) * 40}ms` }}
      className={cn('animate-rise absolute z-10 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-[11.5px] leading-tight shadow-[0_1px_2px_rgba(16,16,20,.06)] transition hover:z-30 hover:shadow-[0_10px_24px_-10px_rgba(16,16,20,.35)]',
        TONE[tone], noDriver && 'border border-l-[3px] border-dashed border-orange-400')}>
      <div className="flex items-center justify-between gap-1">
        <span className="tabular font-semibold">{timeOnly(l.pickup_at)}</span>
        {noDriver ? <AlertTriangle className="h-3 w-3 shrink-0 text-orange-600" /> : l.driver_name && <Avatar name={l.driver_name} dark className="h-4 w-4 text-[7px]" />}
      </div>
      <div className="truncate font-medium">{l.lead_passenger}</div>
      {roomy && <div className="truncate opacity-70">{l.pickup}</div>}
      {roomy && single && <div className="truncate opacity-70">→ {l.destination || 'As directed'}</div>}
      {roomy && <div className="mt-0.5 truncate opacity-70">{l.driver_name || <span className="font-semibold text-orange-700">No chauffeur</span>}{l.registration ? ` · ${l.registration}` : ''}</div>}
    </Link>
  );
}

// ---------------- Driver lanes ----------------
function DriverLanes({ legs, days, today: todayDay }) {
  const isToday = (d) => dayKey(d) === dayKey(todayDay);
  const lanes = useMemo(() => {
    const m = new Map();
    legs.forEach((l) => {
      const k = l.driver_name || (l.registration ? `External · ${l.registration}` : 'No chauffeur yet');
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(l);
    });
    return [...m.entries()].sort(([a], [b]) => (a === 'No chauffeur yet' ? -1 : b === 'No chauffeur yet' ? 1 : a.localeCompare(b)));
  }, [legs]);

  if (!lanes.length) return <Empty icon={Users} title="No journeys this week">Nothing booked for any chauffeur in this period.</Empty>;

  return (
    <div className="card-surface animate-rise overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b bg-neutral-50/60 text-[12px] font-medium text-muted-foreground">
            <div className="px-4 py-2.5">Chauffeur</div>
            {days.map((d) => (
              <div key={d.toISOString()} className={cn('border-l px-3 py-2.5', isToday(d) && 'bg-orange-50 text-primary')}>
                {fmtWeekday.format(d)} <span className="tabular font-semibold text-ink">{d.getUTCDate()}</span>
              </div>
            ))}
          </div>
          {lanes.map(([name, items], r) => {
            const none = name === 'No chauffeur yet';
            return (
              <div key={name} style={{ animationDelay: `${r * 50}ms` }} className={cn('row-in grid grid-cols-[200px_repeat(7,1fr)] border-b last:border-0', none && 'bg-orange-50/40')}>
                <div className="flex items-center gap-3 px-4 py-3">
                  {none ? <IconTile icon={AlertTriangle} tone="brand" className="!h-9 !w-9" /> : <Avatar name={name} dark />}
                  <div className="min-w-0">
                    <div className={cn('truncate text-[13px] font-semibold', none ? 'text-orange-800' : 'text-ink')}>{name}</div>
                    <div className="text-[12px] text-muted-foreground">{items.length} journey{items.length === 1 ? '' : 's'}</div>
                  </div>
                </div>
                {days.map((d) => {
                  const dayItems = items.filter((l) => sameDay(l.pickup_at, d));
                  return (
                    <div key={d.toISOString()} className={cn('space-y-1 border-l p-1.5', isToday(d) && 'bg-orange-50/30')}>
                      {dayItems.map((l) => (
                        <Link key={l.id} to={`/admin/bookings/${l.booking_id}`} title={`${l.ref} · ${l.pickup} → ${l.destination || 'As directed'}`}
                          className={cn('block rounded-md border-l-[3px] px-2 py-1 text-[11.5px] leading-tight transition hover:-translate-y-px hover:shadow-[0_6px_16px_-8px_rgba(16,16,20,.3)]', TONE[toneOf(l)])}>
                          <div className="tabular font-semibold">{timeOnly(l.pickup_at)}</div>
                          <div className="truncate">{l.lead_passenger}</div>
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
