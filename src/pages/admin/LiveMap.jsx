// Live dispatch map: every active chauffeur on one map with their current job, plus the journeys
// that still need a chauffeur (with the nearest free chauffeurs) — so assigning is quick.
// Positions come from the driver app (every ~30 s on duty, every ~5 s during a journey).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Car, Clock, Crosshair, MapPin, Navigation, Radio, UserCheck } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '@/lib/api';
import { relative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Avatar, PageHeader, PageLoader, Tabs } from '@/components/common';

const STYLE = 'https://tiles.openfreemap.org/styles/positron';
const UK = [-2.117, 52.806];
const LIVE = ['on_the_way', 'arrived', 'started'];
const JOB_LABEL = { assigned: 'Assigned', on_the_way: 'On the way to pickup', arrived: 'Waiting at pickup', started: 'Passenger on board' };

const miles = (a, b) => {
  const R = 3958.8; const r = (x) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat); const dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const hm = (iso) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const initials = (n = '') => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/** on_job (orange) · on_duty (green, sharing) · offline (grey, no recent position) */
function stateOf(d) {
  if (d.job && LIVE.includes(d.job.status)) return 'on_job';
  if (d.position) return 'on_duty';
  return 'offline';
}
const STATE = {
  on_job: { label: 'On a journey', dot: 'bg-orange-500', pill: 'bg-orange-50 text-orange-700', marker: '#FF710F' },
  on_duty: { label: 'On duty', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700', marker: '#10B981' },
  offline: { label: 'Not sharing', dot: 'bg-neutral-300', pill: 'bg-neutral-100 text-neutral-500', marker: '#9CA3AF' },
};

export default function LiveMap() {
  const { data, isLoading } = useQuery({ queryKey: ['live-map'], queryFn: () => api.get('/admin/live-map'), refetchInterval: 10000 });
  const [tab, setTab] = useState('drivers');
  const [focus, setFocus] = useState(null);
  const drivers = useMemo(() => (data?.drivers || []).map((d) => ({ ...d, state: stateOf(d) }))
    .sort((a, b) => ['on_job', 'on_duty', 'offline'].indexOf(a.state) - ['on_job', 'on_duty', 'offline'].indexOf(b.state)), [data]);
  const unassigned = data?.unassigned || [];
  const counts = { on_job: drivers.filter((d) => d.state === 'on_job').length, on_duty: drivers.filter((d) => d.state === 'on_duty').length };

  return (
    <div>
      <PageHeader icon={Radio} title="Live map" subtitle={`${counts.on_job} on a journey · ${counts.on_duty} on duty · ${unassigned.length} journey${unassigned.length === 1 ? '' : 's'} need a chauffeur`} />
      {isLoading ? <PageLoader /> : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <DispatchMap drivers={drivers} unassigned={unassigned} focus={focus} />
          <div className="card-surface flex max-h-[calc(100vh-190px)] min-h-[420px] flex-col overflow-hidden">
            <div className="border-b p-3">
              <Tabs value={tab} onChange={setTab} items={[
                { id: 'drivers', label: `Chauffeurs (${drivers.length})`, icon: UserCheck },
                { id: 'jobs', label: `Need a chauffeur (${unassigned.length})`, icon: MapPin },
              ]} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {tab === 'drivers' ? (
                drivers.length ? drivers.map((d) => (
                  <button key={d.id} type="button" onClick={() => d.position && setFocus({ lat: d.position.lat, lng: d.position.lng, at: Date.now() })}
                    className={cn('flex w-full items-start gap-3 border-b px-4 py-3 text-left transition hover:bg-neutral-50', !d.position && 'cursor-default')}>
                    <span className="relative"><Avatar name={d.name} dark /><span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white', STATE[d.state].dot)} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13.5px] font-semibold text-ink">{d.name}</span>
                        <span className={cn('flex-shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold', STATE[d.state].pill)}>{STATE[d.state].label}</span>
                      </span>
                      {d.job ? (
                        <Link to={`/admin/bookings/${d.job.booking_id}`} onClick={(e) => e.stopPropagation()} className="mt-0.5 block truncate text-[12px] text-muted-foreground hover:text-ink">
                          <span className="font-semibold text-ink">{d.job.ref}</span> · {JOB_LABEL[d.job.status]} · {hm(d.job.pickup_at)}
                        </Link>
                      ) : <span className="mt-0.5 block text-[12px] text-muted-foreground">{d.driver_availability === 'available' ? 'Free — no journey assigned' : 'Marked unavailable'}</span>}
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-400"><Clock className="h-3 w-3" />{d.position ? `Seen ${relative(d.position.updated_at)}` : 'No location in the last 10 min'}</span>
                    </span>
                  </button>
                )) : <p className="p-6 text-center text-sm text-muted-foreground">No active chauffeurs.</p>
              ) : (
                unassigned.length ? unassigned.map((j) => {
                  const at = j.pickup_lat != null ? { lat: j.pickup_lat, lng: j.pickup_lng } : null;
                  const near = at ? drivers.filter((d) => d.position && d.state !== 'on_job' && d.driver_availability === 'available')
                    .map((d) => ({ ...d, mi: miles(at, d.position) })).sort((a, b) => a.mi - b.mi).slice(0, 3) : [];
                  return (
                    <div key={j.id} className="border-b px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <button type="button" onClick={() => at && setFocus({ ...at, at: Date.now() })} className="min-w-0 text-left">
                          <div className="text-[13.5px] font-semibold text-ink">{j.ref} <span className="font-normal text-muted-foreground">· {hm(j.pickup_at)}</span></div>
                          <div className="truncate text-[12px] text-muted-foreground">{j.pickup} → {j.destination || 'As directed'}</div>
                        </button>
                        <Link to={`/admin/bookings/${j.booking_id}`} className="flex-shrink-0 rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-black">Assign</Link>
                      </div>
                      {near.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {near.map((d) => <span key={d.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><Navigation className="h-3 w-3" />{d.name.split(' ')[0]} · {d.mi < 10 ? d.mi.toFixed(1) : Math.round(d.mi)} mi</span>)}
                        </div>
                      )}
                      {at && !near.length && <div className="mt-1.5 text-[11px] text-neutral-400">No free chauffeur sharing location nearby</div>}
                    </div>
                  );
                }) : <p className="p-6 text-center text-sm text-muted-foreground">Every confirmed journey in the next 3 days has a chauffeur.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DispatchMap({ drivers, unassigned, focus }) {
  const box = useRef(null);
  const map = useRef(null);
  const lib = useRef(null);
  const markers = useRef(new Map());
  const fitted = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    import('maplibre-gl').then(({ default: maplibregl }) => {
      if (dead || !box.current) return;
      lib.current = maplibregl;
      const m = new maplibregl.Map({ container: box.current, style: STYLE, center: UK, zoom: 6, attributionControl: { compact: true } });
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.current = m;
      m.on('load', () => setReady(true));
    });
    return () => { dead = true; map.current?.remove(); map.current = null; markers.current.clear(); };
  }, []);

  // Draw / move markers on every refresh.
  useEffect(() => {
    const m = map.current; const maplibregl = lib.current;
    if (!ready || !m || !maplibregl) return;
    const seen = new Set();
    const place = (key, lngLat, build, update) => {
      seen.add(key);
      let mk = markers.current.get(key);
      if (!mk) { mk = new maplibregl.Marker({ element: build(), anchor: 'center' }).setLngLat(lngLat).addTo(m); markers.current.set(key, mk); }
      else mk.setLngLat(lngLat);
      update?.(mk.getElement());
    };
    for (const d of drivers) {
      if (!d.position) continue;
      place(`d${d.id}`, [d.position.lng, d.position.lat], () => {
        const el = document.createElement('div');
        el.className = 'dispatch-car';
        return el;
      }, (el) => {
        el.style.setProperty('--c', STATE[d.state].marker);
        el.innerHTML = `<span>${initials(d.name)}</span>${d.state === 'on_job' ? '<i></i>' : ''}`;
        el.title = `${d.name} — ${STATE[d.state].label}${d.job ? ` · ${d.job.ref}` : ''}`;
      });
    }
    for (const j of unassigned) {
      if (j.pickup_lat == null) continue;
      place(`j${j.id}`, [j.pickup_lng, j.pickup_lat], () => {
        const el = document.createElement('div');
        el.className = 'dispatch-job';
        return el;
      }, (el) => { el.title = `${j.ref} needs a chauffeur — ${hm(j.pickup_at)}`; });
    }
    for (const [key, mk] of markers.current) if (!seen.has(key)) { mk.remove(); markers.current.delete(key); }
    // First time: frame everything we know about.
    if (!fitted.current && seen.size) {
      fitted.current = true;
      const b = new maplibregl.LngLatBounds();
      for (const mk of markers.current.values()) b.extend(mk.getLngLat());
      m.fitBounds(b, { padding: 70, maxZoom: 13, duration: 0 });
    }
  }, [drivers, unassigned, ready]);

  useEffect(() => { if (focus && map.current) map.current.flyTo({ center: [focus.lng, focus.lat], zoom: 14, duration: 900 }); }, [focus]);

  const recentre = () => {
    const m = map.current; const maplibregl = lib.current;
    if (!m || !maplibregl || !markers.current.size) return;
    const b = new maplibregl.LngLatBounds();
    for (const mk of markers.current.values()) b.extend(mk.getLngLat());
    m.fitBounds(b, { padding: 70, maxZoom: 13, duration: 700 });
  };

  return (
    <div className="card-surface relative h-[calc(100vh-190px)] min-h-[420px] overflow-hidden p-0">
      <div ref={box} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
        {['on_job', 'on_duty'].map((k) => <span key={k} className="flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-semibold shadow-sm"><span className={cn('h-2.5 w-2.5 rounded-full', STATE[k].dot)} />{STATE[k].label}</span>)}
        <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-semibold shadow-sm"><span className="h-2.5 w-2.5 rounded-[3px] bg-ink" />Needs a chauffeur</span>
      </div>
      <button type="button" onClick={recentre} className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[12px] font-semibold shadow-md hover:bg-neutral-50"><Crosshair className="h-3.5 w-3.5" />Show all</button>
      {!drivers.some((d) => d.position) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-14 mx-auto w-fit rounded-full bg-ink/90 px-4 py-2 text-[12px] text-white shadow-lg"><Car className="mr-1.5 inline h-3.5 w-3.5" />No chauffeur is sharing their location right now — they appear when the driver app is open and on duty.</div>
      )}
    </div>
  );
}
