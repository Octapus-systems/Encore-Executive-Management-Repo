import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bell, CalendarPlus, CheckCheck, CheckCircle2, ChevronRight, MessageSquare, Phone, User, UserPlus, XCircle } from 'lucide-react';
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
  const unread = data?.filter((n) => !n.read_at).length || 0;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader icon={Bell} title="Alerts" subtitle={unread ? `${unread} unread · newest first` : 'You are all caught up.'}
        actions={unread > 0 && <Button variant="outline" onClick={() => readAll.mutate()}><CheckCheck />Mark all read</Button>} />
      {isLoading ? <PageLoader /> : !data?.length ? <Empty icon={Bell} title="No alerts yet" /> : (
        <div className="overflow-hidden card-surface divide-y">
          {data.map((n) => {
            const k = alertKind(n);
            return (
              <Link key={n.id} onClick={() => open(n)} className={cn('group flex items-start gap-3.5 px-4 py-3.5 transition hover:bg-neutral-50', !n.read_at && 'bg-orange-50/40')}
                to={n.booking_id ? `/admin/bookings/${n.booking_id}` : '/admin/customers'} state={{ from: '/admin/inbox', fromLabel: 'Alerts' }}>
                <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', k.tone)}><k.icon className="h-[18px] w-[18px]" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className={cn('truncate text-[14.5px] text-ink', n.read_at ? 'font-medium' : 'font-semibold')}>{n.title}</div>
                    <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">{relative(n.created_at)}{!n.read_at && <span className="h-2 w-2 rounded-full bg-primary" />}</div>
                  </div>
                  {(n.customer_name || n.customer_phone) && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px]">
                      {n.customer_name && <span className="inline-flex items-center gap-1 font-medium text-ink"><User className="h-3.5 w-3.5 text-muted-foreground" />{n.customer_name}</span>}
                      {n.customer_phone && (
                        <span role="link" tabIndex={0} title="Call" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `tel:${n.customer_phone}`; }}
                          className="inline-flex cursor-pointer items-center gap-1 font-medium text-primary hover:underline">
                          <Phone className="h-3.5 w-3.5" />{n.customer_phone}
                        </span>
                      )}
                    </div>
                  )}
                  {n.body && <div className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{n.body}</div>}
                </div>
                <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-500" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function alertKind(n) {
  const t = `${n.event || ''} ${n.title || ''}`.toLowerCase();
  if (t.includes('cancel')) return { icon: XCircle, tone: 'bg-red-50 text-red-600' };
  if (t.includes('accept') || t.includes('paid') || t.includes('payment')) return { icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' };
  if (t.includes('declin') || t.includes('change')) return { icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600' };
  if (t.includes('access') || t.includes('registration')) return { icon: UserPlus, tone: 'bg-violet-50 text-violet-600' };
  if (t.includes('message')) return { icon: MessageSquare, tone: 'bg-sky-50 text-sky-600' };
  if (t.includes('request')) return { icon: CalendarPlus, tone: 'bg-orange-50 text-orange-600' };
  return { icon: Bell, tone: 'bg-neutral-100 text-neutral-600' };
}
