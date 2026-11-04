import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Crown, KeyRound, Lock, Pencil, Plus, ShieldCheck, Trash2, UserCog, Wand2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateOnly } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Avatar, Field, IconTile, Modal, PageHeader, PageLoader, Pill, PrimaryButton, SelectInput, TextInput, thCls, useAction } from '@/components/common';
import { Button } from '@/components/ui/button';

const ROLES = {
  admin: { label: 'Admin', tone: 'dark', icon: Crown, can: ['Add admins and managers', 'Edit, suspend and change roles', 'Delete users'] },
  manager: { label: 'Manager', tone: 'blue', icon: ShieldCheck, can: ['Add managers', 'Run bookings, fleet and payments'], cannot: ['Delete users or change roles'] },
};

const randomPassword = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const a = new Uint32Array(12); crypto.getRandomValues(a);
  return Array.from(a, (n) => c[n % c.length]).join('');
};

export default function Team() {
  const { user } = useAuth();
  const myRole = user?.staff_role || 'admin';
  const isAdmin = myRole === 'admin';
  const { data, isLoading } = useQuery({ queryKey: ['staff'], queryFn: () => api.get('/admin/staff') });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  return (
    <div className="space-y-6">
      <PageHeader icon={UserCog} title="Team" subtitle="People who can sign in to the Command Center."
        actions={<Button onClick={() => setAdding(true)}><Plus />Add user</Button>} />

      {/* What each role can do */}
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(ROLES).map(([k, r], i) => (
          <div key={k} style={{ animationDelay: `${i * 60}ms` }} className={cn('card-surface animate-rise flex gap-4 p-4', myRole === k && 'border-ink/70 ring-1 ring-ink/70')}>
            <IconTile icon={r.icon} tone={r.tone} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-semibold">{r.label}{myRole === k && <span className="rounded-md bg-ink px-1.5 text-[11px] font-semibold text-white">You</span>}</div>
              <ul className="mt-1.5 space-y-1 text-[13px]">
                {r.can.map((t) => <li key={t} className="flex items-center gap-2 text-muted-foreground"><Check className="h-3.5 w-3.5 text-emerald-600" />{t}</li>)}
                {(r.cannot || []).map((t) => <li key={t} className="flex items-center gap-2 text-muted-foreground"><Lock className="h-3.5 w-3.5 text-neutral-400" />{t}</li>)}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? <PageLoader /> : (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-[13px]">
              <thead className={thCls}><tr>
                <th className="px-5 py-2.5 font-medium">User</th><th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium">Added</th><th className="w-24" />
              </tr></thead>
              <tbody className="divide-y">
                {data.map((s, i) => {
                  const r = ROLES[s.staff_role] || ROLES.admin;
                  const me = s.id === user?.id;
                  return (
                    <tr key={s.id} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} className="row-in group hover:bg-neutral-50/70">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} dark={s.staff_role !== 'manager'} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 font-semibold">{s.name}{me && <span className="rounded-md bg-neutral-100 px-1.5 text-[11px] font-semibold text-neutral-600">You</span>}</div>
                            <div className="truncate text-[12px] text-muted-foreground">{s.email}{s.phone ? ` · ${s.phone}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Pill tone={r.tone}>{r.label}</Pill></td>
                      <td className="px-4 py-3"><Pill tone={s.status === 'active' ? 'green' : 'red'} className="capitalize">{s.status}</Pill></td>
                      <td className="tabular px-4 py-3 text-muted-foreground">{dateOnly(s.created_at)}</td>
                      <td className="pr-4 text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100">
                            <button type="button" title="Edit" onClick={() => setEditing(s)} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-ink"><Pencil className="h-4 w-4" /></button>
                            {!me && <button type="button" title="Delete" onClick={() => setDeleting(s)} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!isAdmin && <div className="flex items-center gap-2 border-t bg-neutral-50/60 px-5 py-3 text-[12.5px] text-muted-foreground"><Lock className="h-3.5 w-3.5" />Only admins can edit or delete users.</div>}
        </div>
      )}

      {adding && <AddUser isAdmin={isAdmin} onClose={() => setAdding(false)} />}
      {editing && <EditUser s={editing} self={editing.id === user?.id} onClose={() => setEditing(null)} />}
      {deleting && <DeleteUser s={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}

function RolePicker({ value, onChange, isAdmin, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(ROLES).map(([k, r]) => {
        const locked = disabled || (!isAdmin && k === 'admin');
        return (
          <button key={k} type="button" disabled={locked} onClick={() => onChange(k)}
            className={cn('flex items-center gap-2.5 rounded-[12px] border p-3 text-left transition active:!scale-[.99] disabled:cursor-not-allowed disabled:opacity-45',
              value === k ? 'border-ink ring-1 ring-ink' : 'hover:border-neutral-300')}>
            <IconTile icon={r.icon} tone={value === k ? r.tone : 'grey'} className="!h-9 !w-9" />
            <div><div className="text-[13.5px] font-semibold">{r.label}</div><div className="text-[11.5px] text-muted-foreground">{k === 'admin' ? 'Full control' : 'Can’t delete users'}</div></div>
            {locked && !disabled && <Lock className="ml-auto h-3.5 w-3.5 text-neutral-400" />}
          </button>
        );
      })}
    </div>
  );
}

function AddUser({ isAdmin, onClose }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', password: randomPassword(), staff_role: 'manager' });
  const save = useAction((b) => api.post('/admin/staff', b), { success: (u) => `${u.name} added. Share their email and password with them.`, invalidate: ['staff'], onSuccess: onClose });
  const bind = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }), invalid: !!save.fields[k] });
  return (
    <Modal open onOpenChange={onClose} title="Add a user" description="They sign in to the Command Center with this email and password."
      footer={<PrimaryButton loading={save.isPending} onClick={() => save.mutate(f)}>Add user</PrimaryButton>}>
      <div className="grid gap-4">
        <div><div className="mb-1.5 text-sm font-medium text-ink">Role</div><RolePicker value={f.staff_role} onChange={(v) => setF({ ...f, staff_role: v })} isAdmin={isAdmin} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" required error={save.fields.name}><TextInput {...bind('name')} /></Field>
          <Field label="Mobile"><TextInput type="tel" {...bind('phone')} /></Field>
          <Field label="Email (sign-in)" required error={save.fields.email} className="sm:col-span-2"><TextInput type="email" autoComplete="off" {...bind('email')} /></Field>
          <Field label="Temporary password" required hint="At least 8 characters. They can change it later." className="sm:col-span-2">
            <div className="flex gap-2">
              <TextInput className="font-mono" autoComplete="new-password" {...bind('password')} />
              <Button type="button" variant="outline" className="h-10 shrink-0" onClick={() => setF({ ...f, password: randomPassword() })}><Wand2 />New</Button>
            </div>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function EditUser({ s, self, onClose }) {
  const [f, setF] = useState({ name: s.name, phone: s.phone || '', staff_role: s.staff_role || 'admin', status: s.status, password: '' });
  const save = useAction((b) => api.patch(`/admin/staff/${s.id}`, b), { success: 'User updated.', invalidate: ['staff'], onSuccess: onClose });
  const bind = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  const body = { name: f.name, phone: f.phone, staff_role: f.staff_role, status: f.status, ...(f.password ? { password: f.password } : {}) };
  return (
    <Modal open onOpenChange={onClose} title={`Edit ${s.name}`} description={s.email}
      footer={<PrimaryButton loading={save.isPending} onClick={() => save.mutate(body)}>Save</PrimaryButton>}>
      <div className="grid gap-4">
        <div><div className="mb-1.5 text-sm font-medium text-ink">Role</div><RolePicker value={f.staff_role} onChange={(v) => setF({ ...f, staff_role: v })} isAdmin disabled={self} />{self && <div className="mt-1 text-xs text-muted-foreground">You can’t change your own role.</div>}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name"><TextInput {...bind('name')} /></Field>
          <Field label="Mobile"><TextInput type="tel" {...bind('phone')} /></Field>
          <Field label="Access"><SelectInput disabled={self} {...bind('status')}><option value="active">Active</option><option value="suspended">Suspended</option></SelectInput></Field>
          <Field label={<span className="inline-flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />Reset password</span>} hint="Leave empty to keep it.">
            <div className="flex gap-2"><TextInput className="font-mono" autoComplete="new-password" {...bind('password')} /><Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Generate" onClick={() => setF({ ...f, password: randomPassword() })}><Wand2 /></Button></div>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function DeleteUser({ s, onClose }) {
  const del = useAction(() => api.del(`/admin/staff/${s.id}`), { success: `${s.name} deleted.`, invalidate: ['staff'], onSuccess: onClose });
  return (
    <Modal open onOpenChange={onClose} title={`Delete ${s.name}?`}
      description="They can no longer sign in, and their email becomes free to reuse. Their name stays on past bookings and history. This can’t be undone."
      footer={<><Button variant="outline" onClick={onClose}>Keep user</Button><Button className="bg-red-600 hover:bg-red-700" disabled={del.isPending} onClick={() => del.mutate()}><Trash2 />Delete user</Button></>}>
      <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3 ring-1 ring-red-100">
        <Avatar name={s.name} /><div className="min-w-0"><div className="font-semibold">{s.name}</div><div className="truncate text-[12px] text-muted-foreground">{s.email}</div></div>
      </div>
    </Modal>
  );
}
