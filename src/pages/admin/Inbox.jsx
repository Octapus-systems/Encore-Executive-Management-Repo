import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCheck, ExternalLink, MessageCircle, MessagesSquare, Phone, Search, Send, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { shortDateTime, timeOnly } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Avatar, PageHeader, PageLoader, Segmented, StatusBadge, TextInput, useAction } from '@/components/common';

const TZ = 'Europe/London';
const QUICK = [
  'Thank you — we’re looking into this now.',
  'Your chauffeur is on the way.',
  'Could you confirm the exact pickup address, please?',
  'Your booking is confirmed. See you then!',
];
const KIND = { clarification_request: 'Asked for details', quote_change: 'Asked for a change', quote_decline: 'Declined quote', quote_accept: 'Accepted quote' };

const dayKey = (v) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(v));
function dayLabel(v) {
  const k = dayKey(v), today = dayKey(new Date()), yest = dayKey(Date.now() - 86400000);
  if (k === today) return 'Today';
  if (k === yest) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(v));
}
function ago(v) {
  const s = (Date.now() - new Date(String(v).includes('T') ? v : `${v}Z`).getTime()) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
const utc = (v) => (String(v).includes('T') ? v : `${String(v).replace(' ', 'T')}Z`);

export default function Inbox() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('b');
  const [filter, setFilter] = useState('waiting');
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['conversations'], queryFn: () => api.get('/admin/conversations'), refetchInterval: 8000 });

  const all = data || [];
  const waitingCount = all.filter((c) => c.waiting > 0).length;
  const list = useMemo(() => all
    .filter((c) => filter === 'all' || c.waiting > 0)
    .filter((c) => !q || `${c.ref} ${c.customer_name} ${c.lead_passenger} ${c.organisation_name || ''} ${c.last_body}`.toLowerCase().includes(q.toLowerCase())), [all, filter, q]);

  // Open the first waiting conversation automatically on wide screens.
  useEffect(() => {
    if (!selected && list.length && window.innerWidth >= 1024) setParams({ b: String(list[0].id) }, { replace: true });
  }, [selected, list.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (id) => setParams(id ? { b: String(id) } : {});

  return (
    <div>
      <PageHeader icon={MessagesSquare} title="Messages" subtitle="Reply to customers. They see your reply in the app straight away."
        actions={<Segmented value={filter} onChange={setFilter} options={[['waiting', `Needs reply${waitingCount ? ` · ${waitingCount}` : ''}`], ['all', 'All']]} />} />

      {isLoading ? <PageLoader /> : (
        <div className="card-surface grid h-[calc(100vh-210px)] min-h-[520px] overflow-hidden lg:grid-cols-[340px_1fr]">
          {/* Conversation list */}
          <aside className={cn('flex min-h-0 flex-col border-r', selected && 'hidden lg:flex')}>
            <div className="border-b p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <TextInput className="h-9 border-transparent bg-neutral-100/70 pl-9 shadow-none focus:bg-white" placeholder="Search name, booking, message" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
              {list.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-16 text-center">
                  <div className="float-y grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCheck className="h-6 w-6" /></div>
                  <div className="mt-3 text-[14px] font-semibold">{filter === 'waiting' ? 'All replied' : 'No messages yet'}</div>
                  <div className="text-[12.5px] text-muted-foreground">{filter === 'waiting' ? 'Nobody is waiting for an answer.' : 'Customer messages will appear here.'}</div>
                  {filter === 'waiting' && all.length > 0 && <button type="button" onClick={() => setFilter('all')} className="mt-3 text-[13px] font-medium text-primary">See all conversations</button>}
                </div>
              ) : list.map((c, i) => {
                const active = String(c.id) === selected;
                return (
                  <button key={c.id} type="button" onClick={() => open(c.id)} style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                    className={cn('row-in relative flex w-full items-start gap-3 border-b border-neutral-100 px-4 py-3 text-left transition-colors active:!scale-100',
                      active ? 'bg-orange-50/70' : 'hover:bg-neutral-50')}>
                    {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
                    <div className="relative">
                      <Avatar name={c.customer_name} />
                      {c.waiting > 0 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-primary ring-2 ring-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn('truncate text-[13.5px]', c.waiting ? 'font-semibold text-ink' : 'font-medium text-ink/80')}>{c.organisation_name || c.customer_name}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{ago(utc(c.last_at))}</span>
                      </div>
                      <div className="tabular text-[11.5px] text-muted-foreground">{c.ref} · {c.lead_passenger}</div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={cn('line-clamp-1 flex-1 text-[12.5px]', c.waiting ? 'text-ink' : 'text-muted-foreground')}>
                          {c.last_role === 'admin' && <span className="text-muted-foreground">You: </span>}{c.last_body}
                        </span>
                        {c.waiting > 0 && <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">{c.waiting}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Thread */}
          <section className={cn('min-h-0', !selected && 'hidden lg:block')}>
            {selected ? <Thread key={selected} id={selected} onBack={() => open(null)} /> : (
              <div className="grid h-full place-items-center text-center">
                <div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-neutral-100 text-neutral-500"><MessageCircle className="h-6 w-6" /></div>
                  <div className="mt-3 text-[14px] font-semibold">Pick a conversation</div></div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Thread({ id, onBack }) {
  const qc = useQueryClient();
  const { data: b, isLoading } = useQuery({ queryKey: ['booking', id, 'admin'], queryFn: () => api.get(`/bookings/${id}`), refetchInterval: 6000 });
  const [text, setText] = useState('');
  const scroller = useRef(null);
  const input = useRef(null);
  const send = useAction((body) => api.post(`/bookings/${id}/messages`, { body }), {
    onSuccess: (nb) => { qc.setQueryData(['booking', id, 'admin'], nb.booking || nb); setText(''); qc.invalidateQueries({ queryKey: ['conversations'] }); input.current?.focus(); },
  });
  const msgs = b?.messages || [];
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }); }, [msgs.length]);
  useEffect(() => { qc.invalidateQueries({ queryKey: ['conversations'] }); }, [msgs.length, qc]);

  if (isLoading || !b) return <PageLoader />;
  const submit = (e) => { e?.preventDefault(); const t = text.trim(); if (t && !send.isPending) send.mutate(t); };

  let lastDay = null;
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <button type="button" onClick={onBack} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-neutral-100 lg:hidden" aria-label="Back"><ArrowLeft className="h-4 w-4" /></button>
        <Avatar name={b.customer.name} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{b.customer.name}{b.organisation ? <span className="font-normal text-muted-foreground"> · {b.organisation.name}</span> : null}</div>
          <div className="tabular truncate text-[12px] text-muted-foreground">{b.ref} · {b.lead_passenger} · pickup {shortDateTime(b.legs?.[0]?.pickup_at)}</div>
        </div>
        <StatusBadge status={b.status} admin className="hidden sm:inline-flex" />
        {b.customer.phone && <a href={`tel:${b.customer.phone}`} title={`Call ${b.customer.phone}`} className="grid h-9 w-9 place-items-center rounded-[10px] border text-neutral-600 hover:bg-neutral-50 hover:text-ink"><Phone className="h-4 w-4" /></a>}
        <Link to={`/admin/bookings/${b.id}`} title="Open booking" className="grid h-9 w-9 place-items-center rounded-[10px] border text-neutral-600 hover:bg-neutral-50 hover:text-ink"><ExternalLink className="h-4 w-4" /></Link>
      </div>

      {/* Messages */}
      <div ref={scroller} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,rgba(16,16,20,.045)_1px,transparent_0)] bg-[length:18px_18px] px-4 py-5 [scrollbar-width:thin]">
        {msgs.length === 0 && <div className="py-10 text-center text-[13px] text-muted-foreground">No messages yet. Say hello below.</div>}
        {msgs.map((m) => {
          const mine = m.author_role === 'admin';
          const d = dayKey(utc(m.created_at));
          const sep = d !== lastDay; lastDay = d;
          return (
            <div key={m.id}>
              {sep && <div className="my-3 flex justify-center"><span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-[0_1px_2px_rgba(16,16,20,.08)]">{dayLabel(utc(m.created_at))}</span></div>}
              <div className={cn('animate-rise flex', mine ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[78%] rounded-2xl px-3.5 py-2 text-[13.5px] shadow-[0_1px_2px_rgba(16,16,20,.06)]',
                  mine ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md bg-white text-ink ring-1 ring-black/[0.05]')}>
                  {KIND[m.kind] && <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-primary">{KIND[m.kind]}</div>}
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className={cn('mt-1 flex items-center justify-end gap-1 text-[10.5px]', mine ? 'text-white/50' : 'text-muted-foreground')}>
                    {mine ? (m.author_name || 'Encore') : m.author_name} · {timeOnly(utc(m.created_at))}{mine && <CheckCheck className="h-3 w-3" />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="border-t bg-white p-3">
        <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
          <Zap className="mt-1.5 h-3.5 w-3.5 shrink-0 text-primary" />
          {QUICK.map((t) => (
            <button key={t} type="button" onClick={() => { setText(t); input.current?.focus(); }}
              className="shrink-0 rounded-full border px-2.5 py-1 text-[12px] text-neutral-600 transition hover:border-primary hover:bg-orange-50 hover:text-ink active:!scale-95">{t}</button>
          ))}
        </div>
        <form onSubmit={submit} className="flex items-end gap-2">
          <textarea ref={input} rows={1} value={text} onChange={(e) => setText(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
            placeholder={`Reply to ${b.customer.name.split(' ')[0]}…  (Enter to send, Shift+Enter for new line)`}
            className="max-h-36 min-h-[42px] flex-1 resize-none rounded-[12px] border border-input bg-white px-3.5 py-2.5 text-[14px] outline-none transition placeholder:text-muted-foreground/80 focus:border-primary focus:ring-4 focus:ring-primary/10"
            style={{ height: Math.min(144, 42 + (text.split('\n').length - 1) * 20) }} />
          <button type="submit" disabled={!text.trim() || send.isPending} aria-label="Send"
            className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] bg-primary text-white shadow-[0_6px_16px_-6px_rgba(255,113,15,.8)] transition hover:bg-primary/90 disabled:bg-neutral-200 disabled:shadow-none">
            <Send className={cn('h-4 w-4', send.isPending && 'animate-pulse')} />
          </button>
        </form>
        <div className="mt-1.5 text-[11px] text-muted-foreground">Sent in the customer app, and by WhatsApp when it's set up.</div>
      </div>
    </div>
  );
}
