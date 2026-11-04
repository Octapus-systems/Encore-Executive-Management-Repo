import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, CircleDollarSign, FileText, Link2, Plus, Receipt, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { PAYMENT_ARRANGEMENT, PAYMENT_STATUS, dateOnly, gbp, shortDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ROW_TINT, CountUp, IconTile, Segmented, thCls, Empty, Field, Modal, PageHeader, PageLoader, PaymentBadge, PrimaryButton, SelectInput, StatusBadge, TextInput, useAction } from '@/components/common';
import { InvoiceStatus } from '@/pages/shared';
import { Button } from '@/components/ui/button';

export function Payments() {
  const { data, isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => api.get('/admin/payments') });
  const [filter, setFilter] = useState('outstanding');
  const nav = useNavigate();
  if (isLoading) return <PageLoader />;
  const rows = data.filter((r) => filter === 'all' || (filter === 'outstanding' ? !['paid'].includes(r.payment_status) : r.payment_status === filter));
  const sum = (s) => data.filter((r) => r.payment_status === s).reduce((t, r) => t + (r.total || 0) - (r.received || 0), 0);
  return (
    <div>
      <PageHeader icon={Receipt} title="Payments" subtitle="Who still owes, and what has been paid."
        actions={<Segmented value={['outstanding', 'all', 'paid'].includes(filter) ? filter : ''} onChange={setFilter} options={[['outstanding', 'Outstanding'], ['paid', 'Paid'], ['all', 'All']]} />} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['unpaid', CircleDollarSign, 'amber'], ['link_sent', Link2, 'blue'], ['invoiced', Send, 'violet'], ['overdue', AlertTriangle, 'red']].map(([s, Icon, tone], i) => {
          const n = data.filter((r) => r.payment_status === s).length;
          return (
            <button key={s} onClick={() => setFilter(s)} style={{ animationDelay: `${i * 50}ms` }}
              className={cn('card-surface lift animate-rise group flex items-center gap-3 p-4 text-left', filter === s && 'border-ink/80 ring-1 ring-ink/80')}>
              <IconTile icon={Icon} tone={n ? tone : 'grey'} />
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-muted-foreground">{PAYMENT_STATUS[s].label}</div>
                <div className="flex items-baseline gap-1.5"><CountUp value={n} className="font-heading text-[24px] font-semibold leading-tight text-ink" /><span className="tabular truncate text-[12px] text-muted-foreground">{gbp(sum(s))}</span></div>
              </div>
            </button>
          );
        })}
      </div>
      {!rows.length ? <Empty icon={Receipt} title="Nothing here" /> : (
        <div className="overflow-hidden card-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead className={thCls}><tr><th className="px-5 py-2.5 font-medium">Booking</th><th className="px-4 py-2.5 font-medium">Customer</th><th className="px-4 py-2.5 font-medium">Terms</th><th className="px-4 py-2.5 font-medium">Journey</th><th className="px-4 py-2.5 text-right font-medium">Price</th><th className="px-4 py-2.5 text-right font-medium">Received</th><th className="px-4 py-2.5 font-medium">Payment</th></tr></thead>
              <tbody className="divide-y">
                {rows.map((r, i) => (
                  <tr key={r.id} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} className={cn('row-in cursor-pointer transition-colors', (ROW_TINT[PAYMENT_STATUS[r.payment_status]?.tone] || ROW_TINT.grey).row)} onClick={() => nav(`/admin/bookings/${r.id}`)}>
                    <td className={cn('tabular px-5 py-3 font-semibold', (ROW_TINT[PAYMENT_STATUS[r.payment_status]?.tone] || ROW_TINT.grey).edge)}>{r.ref}<div className="text-xs font-normal text-muted-foreground">{shortDateTime(r.first_pickup)}</div></td>
                    <td className="px-4 py-3">{r.customer_name}<div className="text-xs text-muted-foreground">{r.organisation_name}</div></td>
                    <td className="px-4 py-3 text-xs">{PAYMENT_ARRANGEMENT[r.payment_arrangement]}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} admin /></td>
                    <td className="tabular px-4 py-3 text-right font-semibold">{r.total != null ? gbp(r.total) : '—'}</td>
                    <td className="tabular px-4 py-3 text-right text-muted-foreground">{gbp(r.received)}</td>
                    <td className="px-4 py-3"><PaymentBadge status={r.payment_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function Invoices() {
  const { data, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => api.get('/account/invoices') });
  const [open, setOpen] = useState(false);
  const upd = useAction(({ id, ...b }) => api.patch(`/admin/invoices/${id}`, b), { success: 'Invoice updated.', invalidate: ['invoices', 'payments'] });
  return (
    <div>
      <PageHeader icon={FileText} title="Invoices" subtitle="One monthly invoice per corporate account."
        actions={<Button onClick={() => setOpen(true)}><Plus />New invoice</Button>} />
      {isLoading ? <PageLoader /> : !data.length ? <Empty icon={FileText} title="No invoices yet" /> : (
        <div className="divide-y card-surface">
          {data.map((i, k) => (
            <div key={i.id} style={{ animationDelay: `${Math.min(k, 12) * 30}ms` }} className="row-in group flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-neutral-50/60">
              <Link to={`/admin/invoices/${i.id}`} className="flex min-w-0 items-center gap-3">
                <IconTile icon={FileText} tone={i.status === 'paid' ? 'green' : i.status === 'overdue' ? 'red' : 'grey'} />
                <div className="min-w-0">
                  <div className="font-semibold">{i.organisation_name} <span className="tabular font-normal text-muted-foreground">· {i.number}</span></div>
                  <div className="text-xs text-muted-foreground">{dateOnly(i.period_start)} – {dateOnly(new Date(new Date(i.period_end).getTime() - 1))} · due {dateOnly(i.due_date)}</div>
                </div>
              </Link>
              <div className="flex items-center gap-3">
                <span className="tabular font-heading font-semibold">{gbp(i.total)}</span>
                <SelectInput className="h-9 w-32 text-sm" value={i.status} onChange={(e) => upd.mutate({ id: i.id, status: e.target.value })}>
                  <option value="issued">Issued</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="void">Void</option>
                </SelectInput>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && <InvoiceModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function InvoiceModal({ onClose }) {
  const nav = useNavigate();
  const orgs = useQuery({ queryKey: ['organisations'], queryFn: () => api.get('/admin/organisations') });
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 0);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [f, setF] = useState({ organisation_id: '', from: iso(first), to: iso(now > last ? now : last), notes: '' });
  const [excluded, setExcluded] = useState([]);
  const ready = f.organisation_id && f.from && f.to;
  const eligible = useQuery({ queryKey: ['eligible', f.organisation_id, f.from, f.to], enabled: !!ready, queryFn: () => api.get(`/admin/invoices/eligible?organisation_id=${f.organisation_id}&from=${f.from}&to=${f.to}`) });
  const items = (eligible.data || []).filter((i) => !excluded.includes(i.id));
  const create = useAction((b) => api.post('/admin/invoices', b), { success: 'Invoice issued — corporate users notified.', invalidate: ['invoices', 'payments'], onSuccess: (inv) => nav(`/admin/invoices/${inv.id}`) });
  return (
    <Modal open onOpenChange={onClose} wide title="New consolidated invoice" description="Includes completed journeys in the period that are not already invoiced or paid."
      footer={<PrimaryButton loading={create.isPending} disabled={!items.length} onClick={() => create.mutate({ ...f, organisation_id: Number(f.organisation_id), booking_ids: items.map((i) => i.id) })}>Issue invoice · {gbp(items.reduce((s, i) => s + (i.total || 0), 0))}</PrimaryButton>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Corporate account"><SelectInput value={f.organisation_id} onChange={(e) => setF({ ...f, organisation_id: e.target.value })}><option value="">Choose…</option>{(orgs.data || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</SelectInput></Field>
        <Field label="From"><TextInput type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
        <Field label="To"><TextInput type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
      </div>
      {ready && (eligible.isLoading ? <PageLoader /> : !eligible.data.length ? <p className="text-sm text-muted-foreground">No eligible journeys in this period.</p> : (
        <div className="divide-y rounded-xl border">
          {eligible.data.map((i) => (
            <label key={i.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#FF5A1F]" checked={!excluded.includes(i.id)} onChange={(e) => setExcluded(e.target.checked ? excluded.filter((x) => x !== i.id) : [...excluded, i.id])} />
              <span className="flex-1"><b>{i.ref}</b> · {i.lead_passenger} · {shortDateTime(i.pickup_at)}</span>
              <span className={cn('font-semibold', i.total == null && 'text-red-600')}>{i.total != null ? gbp(i.total) : 'No price'}</span>
            </label>
          ))}
        </div>
      ))}
      <Field label="Notes on invoice (optional)"><TextInput value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
    </Modal>
  );
}
