import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Phone, User } from 'lucide-react';
import { api } from '@/lib/api';
import { relative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Empty, PageHeader, PageLoader, useAction } from '@/components/common';
import { Button } from '@/components/ui/button';

export function InvoiceStatus({ status }) {
  const tone = { issued: 'bg-sky-100 text-sky-800', paid: 'bg-emerald-100 text-emerald-800', overdue: 'bg-red-100 text-red-700', void: 'bg-neutral-100 text-neutral-500', draft: 'bg-neutral-100 text-neutral-600' }[status];
  return <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize', tone)}>{status}</span>;
}

/** Management alerts: new requests, quote responses, cancellations, access requests. */
export function Alerts() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/account/notifications') });
  const readAll = useAction(() => api.post('/account/notifications/read-all'), { invalidate: ['notifications'] });
  const open = (n) => { if (!n.read_at) api.post(`/account/notifications/${n.id}/read`).then(() => qc.invalidateQueries({ queryKey: ['notifications'] })); };
  return (
    <div>
      <PageHeader title="Alerts" actions={data?.some((n) => !n.read_at) && <Button variant="outline" onClick={() => readAll.mutate()}>Mark all read</Button>} />
      {isLoading ? <PageLoader /> : !data?.length ? <Empty icon={Bell} title="No alerts yet" /> : (
        <div className="space-y-2">
          {data.map((n) => {
            const body = (
              <div className={cn('flex gap-3 card-surface p-4 ', !n.read_at && 'border-primary/40 bg-orange-50/50')}>
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-primary')} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2"><div className="font-semibold">{n.title}</div><div className="shrink-0 text-xs text-muted-foreground">{relative(n.created_at)}</div></div>
                  {(n.customer_name || n.customer_phone) && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                      {n.customer_name && <span className="inline-flex items-center gap-1 font-medium text-ink"><User className="h-3.5 w-3.5 text-primary" />{n.customer_name}</span>}
                      {n.customer_phone && (
                        <span role="link" tabIndex={0} title="Call" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `tel:${n.customer_phone}`; }}
                          className="inline-flex cursor-pointer items-center gap-1 font-medium text-primary hover:underline">
                          <Phone className="h-3.5 w-3.5" />{n.customer_phone}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-0.5 text-sm text-muted-foreground">{n.body}</div>
                </div>
              </div>
            );
            return n.booking_id
              ? <Link key={n.id} to={`/admin/bookings/${n.booking_id}`} onClick={() => open(n)} className="block">{body}</Link>
              : <Link key={n.id} to="/admin/customers" onClick={() => open(n)} className="block">{body}</Link>;
          })}
        </div>
      )}
    </div>
  );
}
