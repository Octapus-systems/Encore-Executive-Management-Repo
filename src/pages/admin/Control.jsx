import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, Bell, Building, CalendarCog, CreditCard, Mail, MessageSquare, Search, Settings as SettingsIcon, ShieldCheck, Smartphone, Timer, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { ACTIVITY_LABEL, shortDateTime } from '@/lib/format';
import { Avatar, Empty, IconTile, Segmented, Banner, Field, PageHeader, PageLoader, Panel, PrimaryButton, SelectInput, TextArea, TextInput, useAction } from '@/components/common';
import { ActivityDetail, DeliveryChips } from '@/pages/admin/BookingDetail';
import { Button } from '@/components/ui/button';

export function MessagesLog() {
  const [params, setParams] = useSearchParams();
  const failed = params.get('failed');
  const { data, isLoading } = useQuery({ queryKey: ['notification-log', failed], queryFn: () => api.get(`/admin/notifications${failed ? '?failed=1' : ''}`) });
  return (
    <div>
      <PageHeader icon={MessageSquare} title="Notifications" subtitle="Every message sent to customers and drivers, and whether it arrived."
        actions={<Segmented value={failed ? 'failed' : 'all'} onChange={(v) => setParams(v === 'failed' ? { failed: 1 } : {})} options={[['all', 'All'], ['failed', 'Not delivered']]} />} />
      {isLoading ? <PageLoader /> : !data.length ? <Empty icon={Bell} title={failed ? 'Everything was delivered' : 'No messages yet'} /> : (
        <div className="divide-y card-surface">
          {data.map((n, i) => (
            <div key={n.id} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} className="row-in grid gap-2 px-5 py-3 text-sm md:grid-cols-[auto_1fr_auto] md:items-center">
              <IconTile icon={n.recipient_role === 'driver' ? UserCheck : Bell} tone={n.recipient_role === 'driver' ? 'dark' : 'grey'} className="hidden md:grid" />
              <div className="min-w-0">
                <div className="font-semibold">{n.title} {n.ref && <Link className="ml-1 text-xs text-primary" to={`/admin/bookings/${n.booking_id}`}>{n.ref}</Link>}</div>
                <div className="truncate text-muted-foreground">{n.body}</div>
                <div className="text-xs text-muted-foreground">To {n.recipient} ({n.recipient_role}) · {shortDateTime(n.created_at)}{n.read_at ? ' · read in app' : ''}</div>
              </div>
              <DeliveryChips deliveries={n.deliveries} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActivityLog() {
  const { data, isLoading } = useQuery({ queryKey: ['activity'], queryFn: () => api.get('/admin/activity') });
  const [q, setQ] = useState('');
  const rows = (data || []).filter((a) => !q || JSON.stringify(a).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader icon={Activity} title="Activity" subtitle="Who changed what, and when."
        actions={<div className="relative w-64"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><TextInput className="h-9 pl-9" placeholder="Search ref, person, action" value={q} onChange={(e) => setQ(e.target.value)} /></div>} />
      {isLoading ? <PageLoader /> : (
        <div className="divide-y card-surface">
          {rows.map((a, i) => (
            <div key={a.id} style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }} className="row-in grid gap-2 px-5 py-3 text-sm md:grid-cols-[auto_1fr_auto] md:items-center">
              <Avatar name={a.actor_name || 'System'} dark={!!a.actor_name} className="hidden md:grid" />
              <div className="min-w-0">
                <span className="font-semibold capitalize">{ACTIVITY_LABEL(a.action)}</span>
                {a.ref && <Link className="ml-2 text-xs font-semibold text-primary" to={`/admin/bookings/${a.booking_id}`}>{a.ref}</Link>}
                {!a.ref && <span className="ml-2 text-xs text-muted-foreground">{a.entity} #{a.entity_id}</span>}
                {a.detail && <ActivityDetail detail={a.detail} />}
              </div>
              <div className="text-xs text-muted-foreground md:text-right"><div className="font-medium text-ink">{a.actor_name || 'System'}</div>{shortDateTime(a.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const NUMERIC = [
  ['default_job_minutes', 'Default journey duration (minutes)', 'Used for conflict detection when a leg has no planned duration.'],
  ['turnaround_minutes', 'Turnaround buffer (minutes)', 'Added after each journey before the driver/vehicle is free.'],
  ['reminder_minutes_before', 'Pickup reminder (minutes before)', 'Usually 60.'],
  ['quote_validity_hours', 'Quotation validity (hours)', ''],
  ['invoice_due_days', 'Invoice due (days)', ''],
  ['max_drivers', 'Active driver limit', 'Per your plan.'],
  ['max_admins', 'Management user limit', 'Per your plan.'],
];

const BOOKING_FIELDS = [
  ['stops', 'Extra pickups / stops'], ['passenger_names', 'Other passenger names'], ['luggage', 'Luggage counts'],
  ['child_seats', 'Child seats'], ['accessibility_needs', 'Accessibility needs'], ['preferred_category', 'Preferred vehicle'],
  ['flight_number', 'Flight number (airport)'], ['special_instructions', 'Special instructions'], ['sensitive_notes', 'Private notes for chauffeur'],
];
function SectionTitle({ icon: Icon, tone, children }) {
  return <span className="flex items-center gap-2.5"><IconTile icon={Icon} tone={tone} className="!h-8 !w-8 !rounded-lg [&_svg]:!h-4 [&_svg]:!w-4" />{children}</span>;
}

const OnOff = (props) => <SelectInput {...props}><option value="on">On</option><option value="off">Off</option></SelectInput>;

export function Settings() {
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/admin/settings') });
  const [f, setF] = useState(null);
  useEffect(() => { if (data) setF({ ...data, vehicle_categories: JSON.parse(data.vehicle_categories || '[]').join('\n'), booking_fields: JSON.parse(data.booking_fields || '{}') }); }, [data]);
  const save = useAction((b) => api.put('/admin/settings', b), { success: 'Settings saved.', invalidate: ['settings', 'public-settings'] });
  if (isLoading || !f) return <PageLoader />;
  const bind = (k) => ({ value: f[k] ?? '', onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  const submit = () => save.mutate({ ...f, vehicle_categories: JSON.stringify(f.vehicle_categories.split('\n').map((s) => s.trim()).filter(Boolean)), booking_fields: JSON.stringify(f.booking_fields) });
  const toggleField = (k) => setF({ ...f, booking_fields: { ...f.booking_fields, [k]: f.booking_fields[k] === false } });
  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="How Encore runs day to day." />
      <div className="sticky top-16 z-20 -mx-1 flex items-center justify-between gap-3 rounded-[14px] border bg-white/85 px-4 py-2.5 shadow-[0_8px_24px_-12px_rgba(16,16,20,.18)] backdrop-blur-xl">
        <span className="text-[13px] text-muted-foreground">Changes apply after you save.</span>
        <PrimaryButton loading={save.isPending} onClick={submit}>Save changes</PrimaryButton>
      </div>
      <Panel title={<SectionTitle icon={Building} tone="dark">Company & dispatch</SectionTitle>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name"><TextInput {...bind('company_name')} /></Field>
          <Field label="Operating base"><TextInput {...bind('base_location')} /></Field>
          <Field label="Dispatcher name"><TextInput {...bind('dispatcher_name')} /></Field>
          <Field label="Dispatcher phone (drivers & customers call this)"><TextInput {...bind('dispatcher_phone')} /></Field>
          <Field label="Dispatcher WhatsApp"><TextInput {...bind('dispatcher_whatsapp')} /></Field>
          <Field label="Invoice number prefix"><TextInput {...bind('invoice_prefix')} /></Field>
        </div>
      </Panel>
      <Panel title={<SectionTitle icon={ShieldCheck} tone="green">Who can join</SectionTitle>}>
        <Field label="How customers join">
          <SelectInput {...bind('admission_mode')}>
            <option value="invitation">Invitation only</option>
            <option value="approval">Registration approved by management</option>
            <option value="both">Both — invitations and approved registrations</option>
          </SelectInput>
        </Field>
      </Panel>
      <Panel title={<SectionTitle icon={CalendarCog} tone="blue">Booking rules</SectionTitle>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum notice (hours before pickup)" hint="Customers can't request journeys sooner than this. Staff bookings may override. 0 = off."><TextInput type="number" min="0" step="0.5" {...bind('min_notice_hours')} /></Field>
          <Field label="Minimum hourly hire (hours)" hint="Applies to 'as directed' hourly bookings. Staff may override."><TextInput type="number" min="0" step="0.5" {...bind('hourly_min_hours')} /></Field>
          <Field label="Flight number required for airport transfers"><OnOff {...bind('flight_number_required')} /></Field>
          <Field label="Start Journey available (minutes before pickup)" hint="Chauffeurs can't press 'On the way' earlier than this. Dispatch can always update. 0 = any time."><TextInput type="number" min="0" {...bind('start_window_minutes')} /></Field>
        </div>
        <div className="mt-5">
          <div className="mb-2 text-sm font-semibold">Fields shown on the customer booking form</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {BOOKING_FIELDS.map(([k, l]) => (
              <label key={k} className="flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-[13px] transition hover:border-neutral-300 has-[:checked]:border-orange-300 has-[:checked]:bg-orange-50/50">
                <input type="checkbox" className="h-4 w-4 accent-[#FF5A1F]" checked={f.booking_fields[k] !== false} onChange={() => toggleField(k)} />{l}
              </label>
            ))}
          </div>
        </div>
      </Panel>
      <Panel title={<SectionTitle icon={CreditCard} tone="amber">Payment rules</SectionTitle>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New bookings default to" hint="Corporate account bookings always use monthly invoicing.">
            <SelectInput {...bind('default_payment_arrangement')}><option value="pay_before">Pay before the journey (preferred)</option><option value="pay_after">Pay after the journey</option></SelectInput>
          </Field>
          <Field label="When payment is outstanding on a pay-before booking" hint="Exception: change that booking's arrangement to 'pay after' — the change is recorded in its history.">
            <SelectInput {...bind('payment_rule')}><option value="before_start">Block the journey from starting</option><option value="before_assignment">Block driver assignment</option><option value="off">Don't block</option></SelectInput>
          </Field>
        </div>
      </Panel>
      <Panel title={<SectionTitle icon={Smartphone} tone="violet">Customer sign-in</SectionTitle>}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Book without signing in first" hint="Customers verify their mobile at the end."><OnOff {...bind('guest_booking')} /></Field>
          <Field label="Mobile number + code sign-in"><OnOff {...bind('otp_login')} /></Field>
          <Field label="Send codes by" hint="Demo mode until an SMS/WhatsApp provider is connected."><SelectInput {...bind('otp_channel')}><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></SelectInput></Field>
        </div>
      </Panel>
      <Panel title={<SectionTitle icon={Timer} tone="grey">Timings & limits</SectionTitle>}>
        <div className="grid gap-4 sm:grid-cols-2">
          {NUMERIC.map(([k, l, h]) => <Field key={k} label={l} hint={h}><TextInput type="number" min="0" {...bind(k)} /></Field>)}
        </div>
      </Panel>
      <Panel title={<SectionTitle icon={ShieldCheck} tone="grey">Policies & vehicles</SectionTitle>}>
        <div className="grid gap-4">
          <Field label="Cancellation policy shown to customers" hint="Fees, refunds and no-show rules, in plain words."><TextArea rows={3} {...bind('cancellation_policy')} /></Field>
          <Field label="Vehicle categories (one per line)"><TextArea rows={4} {...bind('vehicle_categories')} /></Field>
        </div>
      </Panel>
      <Panel title={<SectionTitle icon={Mail} tone="brand">Notification channels</SectionTitle>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp" hint="Needs WhatsApp Business set up on the server."><SelectInput {...bind('channel_whatsapp')}><option value="on">On</option><option value="off">Off</option></SelectInput></Field>
          <Field label="Email" hint="Provider to be agreed"><SelectInput {...bind('channel_email')}><option value="on">On</option><option value="off">Off</option></SelectInput></Field>
        </div>
      </Panel>
    </div>
  );
}
