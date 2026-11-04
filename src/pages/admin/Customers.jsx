import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Check, Copy, KeyRound, Mail, Plus, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import { api } from '@/lib/api';
import { dateOnly } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Avatar, EntityCard, IconTile, Tabs, thCls, Empty, Field, Modal, PageHeader, PageLoader, Pill, PrimaryButton, SelectInput, TextArea, TextInput, useAction } from '@/components/common';
import { Button } from '@/components/ui/button';

const TABS = [{ id: 'customers', label: 'Customers', icon: Users }, { id: 'organisations', label: 'Corporate accounts', icon: Building2 }, { id: 'invitations', label: 'Invitations', icon: Mail }, { id: 'staff', label: 'Team', icon: KeyRound }];

export default function Customers() {
  const [tab, setTab] = useState('customers');
  return (
    <div>
      <PageHeader icon={Building2} title="Customers" subtitle="Who can book, and which company they belong to." />
      <Tabs items={TABS} value={tab} onChange={setTab} />
      {tab === 'customers' && <CustomerList />}
      {tab === 'organisations' && <Organisations />}
      {tab === 'invitations' && <Invitations />}
      {tab === 'staff' && <Staff />}
    </div>
  );
}


function CustomerList() {
  const { data, isLoading } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/admin/customers') });
  const orgs = useQuery({ queryKey: ['organisations'], queryFn: () => api.get('/admin/organisations') });
  const upd = useAction(({ id, ...b }) => api.patch(`/admin/customers/${id}`, b), { success: 'Customer updated.', invalidate: ['customers', 'dashboard', 'customer-options'] });
  if (isLoading) return <PageLoader />;
  const pending = data.filter((c) => c.status === 'pending');
  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <div className="animate-rise rounded-[14px] border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-4">
          <div className="mb-3 flex items-center gap-3"><IconTile icon={ShieldCheck} tone="brand" live /><div><div className="font-semibold text-ink">{pending.length} waiting for approval</div><div className="text-[13px] text-muted-foreground">Approve to let them book.</div></div></div>
          <div className="space-y-2">
            {pending.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-black/[0.05]">
                <div className="flex min-w-0 items-center gap-3"><Avatar name={c.name} /><div className="min-w-0"><div className="font-semibold">{c.name}</div><div className="truncate text-[13px] text-muted-foreground">{c.email} · {c.phone}{c.notes ? ` · ${c.notes}` : ''}</div></div></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => upd.mutate({ id: c.id, status: 'rejected' })}><X />Reject</Button>
                  <Button size="sm" onClick={() => upd.mutate({ id: c.id, status: 'active' })}><Check />Approve</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="overflow-hidden card-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead className={thCls}><tr><th className="px-5 py-2.5 font-medium">Customer</th><th className="px-4 py-2.5 font-medium">Contact</th><th className="px-4 py-2.5 font-medium">Company</th><th className="px-4 py-2.5 font-medium">Bookings</th><th className="px-4 py-2.5 font-medium">Access</th></tr></thead>
            <tbody className="divide-y">
              {data.filter((c) => c.status !== 'pending').map((c, i) => (
                <tr key={c.id} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} className="row-in hover:bg-neutral-50/60">
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={c.name} /><div><div className="font-semibold">{c.name}</div><div className="text-xs text-muted-foreground">since {dateOnly(c.created_at)}</div></div></div></td>
                  <td className="px-4 py-3">{c.email}<div className="text-xs text-muted-foreground">{c.phone}</div></td>
                  <td className="px-4 py-3">
                    <SelectInput className="h-9 text-sm" value={c.organisation_id || ''} onChange={(e) => upd.mutate({ id: c.id, organisation_id: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">Private customer</option>{(orgs.data || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </SelectInput>
                  </td>
                  <td className="tabular px-4 py-3 font-medium">{c.bookings}</td>
                  <td className="px-4 py-3">
                    <SelectInput className="h-9 w-36 text-sm" value={c.status} onChange={(e) => upd.mutate({ id: c.id, status: e.target.value })}>
                      <option value="active">Active</option><option value="suspended">Suspended</option><option value="rejected">Rejected</option>
                    </SelectInput>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Organisations() {
  const { data, isLoading } = useQuery({ queryKey: ['organisations'], queryFn: () => api.get('/admin/organisations') });
  const [edit, setEdit] = useState(null);
  return (
    <div>
      <div className="mb-3 flex justify-end"><Button onClick={() => setEdit({})}><Plus />Add corporate account</Button></div>
      {isLoading ? <PageLoader /> : !data.length ? <Empty icon={Building2} title="No corporate accounts" /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((o, i) => (
            <EntityCard key={o.id} i={i} icon={Building2} tone={o.status === 'active' ? 'blue' : 'grey'} onClick={() => setEdit(o)}
              title={o.name} subtitle={o.payment_terms} badge={<Pill tone={o.status === 'active' ? 'green' : 'grey'} className="capitalize">{o.status}</Pill>}>
              <div className="grid grid-cols-2 gap-2 border-t pt-3 text-[12.5px]">
                <div><div className="tabular font-heading text-lg font-semibold text-ink">{o.users}</div><div className="text-muted-foreground">users</div></div>
                <div><div className="tabular font-heading text-lg font-semibold text-ink">{o.bookings}</div><div className="text-muted-foreground">bookings</div></div>
              </div>
              {o.billing_email && <div className="mt-2 flex items-center gap-1.5 truncate text-[12px] text-muted-foreground"><Mail className="h-3.5 w-3.5" />{o.billing_email}</div>}
            </EntityCard>
          ))}
        </div>
      )}
      {edit && <OrgModal o={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function OrgModal({ o, onClose }) {
  const [f, setF] = useState({ name: '', billing_email: '', billing_address: '', payment_terms: 'Monthly consolidated invoice, 30 days', status: 'active', ...o });
  const save = useAction((b) => (o.id ? api.patch(`/admin/organisations/${o.id}`, b) : api.post('/admin/organisations', b)), { success: 'Saved.', invalidate: ['organisations'], onSuccess: onClose });
  const bind = (k) => ({ value: f[k] ?? '', onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  return (
    <Modal open onOpenChange={onClose} title={o.id ? `Edit ${o.name}` : 'New corporate account'} footer={<PrimaryButton loading={save.isPending} onClick={() => save.mutate(f)}>Save</PrimaryButton>}>
      <div className="grid gap-3">
        <Field label="Organisation name" error={save.fields.name}><TextInput {...bind('name')} /></Field>
        <Field label="Billing email"><TextInput type="email" {...bind('billing_email')} /></Field>
        <Field label="Billing address"><TextArea rows={2} {...bind('billing_address')} /></Field>
        <Field label="Agreed account terms" hint="Shown to corporate users and on invoices"><TextInput {...bind('payment_terms')} /></Field>
        {o.id && <Field label="Status"><SelectInput {...bind('status')}><option value="active">Active</option><option value="inactive">Inactive</option></SelectInput></Field>}
      </div>
    </Modal>
  );
}

function Invitations() {
  const { data, isLoading } = useQuery({ queryKey: ['invitations'], queryFn: () => api.get('/admin/invitations') });
  const orgs = useQuery({ queryKey: ['organisations'], queryFn: () => api.get('/admin/organisations') });
  const [f, setF] = useState({ email: '', name: '', organisation_id: '' });
  const copy = (path) => { navigator.clipboard?.writeText(`${window.location.origin}${path}`); toast.success('Invitation link copied.'); };
  const create = useAction((b) => api.post('/admin/invitations', b), { invalidate: ['invitations'], onSuccess: (r) => { copy(r.link); setF({ email: '', name: '', organisation_id: '' }); } });
  const revoke = useAction((id) => api.del(`/admin/invitations/${id}`), { success: 'Invitation revoked.', invalidate: ['invitations'] });
  return (
    <div className="space-y-4">
      <div className="card-surface p-5 ">
        <div className="mb-4 flex items-center gap-3"><IconTile icon={UserPlus} tone="brand" /><div><div className="font-semibold text-ink">Invite a customer</div><div className="text-[13px] text-muted-foreground">We copy a sign-up link for you to send. It lasts 14 days.</div></div></div>
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
          <Field label="Email" error={create.fields.email}><TextInput type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Name"><TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Corporate account"><SelectInput value={f.organisation_id} onChange={(e) => setF({ ...f, organisation_id: e.target.value })}><option value="">Private customer</option>{(orgs.data || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</SelectInput></Field>
          <PrimaryButton loading={create.isPending} onClick={() => create.mutate({ ...f, organisation_id: f.organisation_id ? Number(f.organisation_id) : null })}>Create link</PrimaryButton>
        </div>
      </div>
      {isLoading ? <PageLoader /> : !data.length ? <Empty icon={Mail} title="No invitations yet" /> : (
        <div className="divide-y card-surface">
          {data.map((i) => {
            const expired = i.expires_at && new Date(i.expires_at) < new Date();
            return (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-3"><Avatar name={i.name || i.email} /><div className="min-w-0"><div className="truncate font-semibold">{i.email}</div><div className="text-xs text-muted-foreground">{i.organisation_name || 'Private'} · created {dateOnly(i.created_at)}</div></div></div>
                <div className="flex items-center gap-2">
                  <Pill tone={i.used_at ? 'green' : expired ? 'grey' : 'amber'}>{i.used_at ? 'Accepted' : expired ? 'Expired' : 'Open'}</Pill>
                  {!i.used_at && !expired && <><Button size="sm" variant="ghost" title="Copy link" onClick={() => copy(`/invite/${i.token}`)}><Copy />Copy</Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => revoke.mutate(i.id)}>Revoke</Button></>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Staff() {
  const { data, isLoading } = useQuery({ queryKey: ['staff'], queryFn: () => api.get('/admin/staff') });
  const [f, setF] = useState(null);
  const create = useAction((b) => api.post('/admin/staff', b), { success: 'Management user added.', invalidate: ['staff'], onSuccess: () => setF(null) });
  const upd = useAction(({ id, ...b }) => api.patch(`/admin/staff/${id}`, b), { success: 'Updated.', invalidate: ['staff'] });
  return (
    <div>
      <div className="mb-3 flex justify-end"><Button onClick={() => setF({ name: '', email: '', phone: '', password: '' })}><Plus />Add team member</Button></div>
      {isLoading ? <PageLoader /> : (
        <div className="divide-y card-surface">
          {data.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div className="flex items-center gap-3"><Avatar name={s.name} dark /><div><div className="font-semibold">{s.name}</div><div className="text-xs text-muted-foreground">{s.email}</div></div></div>
              <SelectInput className="h-9 w-36 text-sm" value={s.status} onChange={(e) => upd.mutate({ id: s.id, status: e.target.value })}><option value="active">Active</option><option value="suspended">Suspended</option></SelectInput>
            </div>
          ))}
        </div>
      )}
      {f && (
        <Modal open onOpenChange={() => setF(null)} title="Add team member" description="Management users have full Command Center access." footer={<PrimaryButton loading={create.isPending} onClick={() => create.mutate(f)}>Add</PrimaryButton>}>
          <div className="grid gap-3 sm:grid-cols-2">
            {['name', 'email', 'phone', 'password'].map((k) => <Field key={k} label={k === 'password' ? 'Temporary password' : k[0].toUpperCase() + k.slice(1)}><TextInput value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>)}
          </div>
        </Modal>
      )}
    </div>
  );
}
