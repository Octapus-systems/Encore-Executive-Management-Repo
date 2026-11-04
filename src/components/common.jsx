import { forwardRef, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PAYMENT_STATUS, STATUS } from '@/lib/format';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function Logo({ dark = false, className }) {
  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <img src="/images/logo.svg" alt="Encore" className="h-9 w-9 object-contain" />
      <div className="leading-none">
        <div className={cn('font-heading text-[15px] font-bold tracking-wide', dark ? 'text-white' : 'text-ink')}>ENCORE</div>
        <div className={cn('text-[10px] font-semibold tracking-[0.22em]', dark ? 'text-white/60' : 'text-muted-foreground')}>EXECUTIVE</div>
      </div>
    </div>
  );
}

export const TONES = {
  amber: { box: 'bg-amber-50 text-amber-800 ring-amber-600/15', dot: 'bg-amber-500' },
  blue: { box: 'bg-sky-50 text-sky-800 ring-sky-600/15', dot: 'bg-sky-500' },
  violet: { box: 'bg-violet-50 text-violet-800 ring-violet-600/15', dot: 'bg-violet-500' },
  green: { box: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15', dot: 'bg-emerald-500' },
  brand: { box: 'bg-orange-50 text-orange-800 ring-orange-600/20', dot: 'bg-orange-500 animate-pulse' },
  dark: { box: 'bg-neutral-900 text-white ring-neutral-900', dot: 'bg-white' },
  grey: { box: 'bg-neutral-50 text-neutral-600 ring-neutral-500/15', dot: 'bg-neutral-400' },
  red: { box: 'bg-red-50 text-red-700 ring-red-600/15', dot: 'bg-red-500' },
};

export function Pill({ tone = 'grey', children, className, dot = true }) {
  const t = TONES[tone] || TONES.grey;
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ring-1 ring-inset', t.box, className)}>
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', t.dot)} />}{children}
    </span>
  );
}

export function StatusBadge({ status, admin = false, className }) {
  const s = STATUS[status] || { label: status, tone: 'grey' };
  return <Pill tone={s.tone} className={className}>{admin ? s.admin : s.label}</Pill>;
}

export function PaymentBadge({ status }) {
  const s = PAYMENT_STATUS[status] || { label: status, tone: 'grey' };
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function Spinner({ className }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-muted-foreground', className)} />;
}

export function PageLoader() {
  return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="h-7 w-7" /></div>;
}

export function ErrorState({ error }) {
  return <div className="rounded-[14px] border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error?.message || 'Something went wrong.'}</div>;
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed bg-white/60 px-6 py-12 text-center">
      {Icon && <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-surface ring-1 ring-black/[0.05]"><Icon className="h-5 w-5 text-muted-foreground" /></div>}
      <div className="font-heading text-[15px] font-semibold">{title}</div>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, className, icon, tone = 'dark' }) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3.5">
      {icon && <IconTile icon={icon} tone={tone} className="hidden sm:grid" />}
      <div className="min-w-0">
        <h1 className="font-heading text-[26px] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-muted-foreground">{subtitle}</p>}
      </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className, bodyClassName }) {
  return (
    <section className={cn('card-surface', className)}>
      {(title || actions) && (
        <div className="flex min-h-[52px] items-center justify-between gap-3 border-b px-5 py-3">
          <h2 className="font-heading text-[14px] font-semibold tracking-tight">{title}</h2>
          {actions}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function KV({ label, children, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[12px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words text-sm text-ink">{children ?? '—'}</div>
    </div>
  );
}

export function Field({ label, error, hint, children, className, required }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-sm font-medium text-ink">{label}{required && <span className="text-primary"> *</span>}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

const inputCls = 'block w-full rounded-[10px] border border-input bg-white px-3.5 text-[14px] text-ink shadow-[0_1px_2px_rgba(16,16,20,.04)] transition placeholder:text-muted-foreground/80 hover:border-neutral-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:bg-neutral-50 disabled:text-muted-foreground';

export const TextInput = forwardRef(function TextInput({ className, invalid, ...props }, ref) {
  return <input ref={ref} className={cn(inputCls, 'h-10', invalid && 'border-red-400', className)} {...props} />;
});

export const TextArea = forwardRef(function TextArea({ className, invalid, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(inputCls, 'py-2.5', invalid && 'border-red-400', className)} {...props} />;
});

export const SelectInput = forwardRef(function SelectInput({ className, invalid, children, ...props }, ref) {
  return <select ref={ref} className={cn(inputCls, 'h-10 pr-8', invalid && 'border-red-400', className)} {...props}>{children}</select>;
});

export function PrimaryButton({ className, loading, children, ...props }) {
  return (
    <Button className={cn('h-10 rounded-[10px] px-4 text-[14px] font-semibold shadow-[0_1px_2px_rgba(16,16,20,.08),inset_0_1px_0_rgba(255,255,255,.18)]', className)} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="animate-spin" />}{children}
    </Button>
  );
}

export function Stat({ label, value, tone, to, icon: Icon }) {
  const body = (
    <div className={cn('card-surface p-4 transition', to && 'hover:border-neutral-300')}>
      <div className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
        {label}{Icon && <Icon className="h-4 w-4 opacity-60" />}
      </div>
      <div className={cn('tabular mt-2 font-heading text-[28px] font-semibold tracking-tight', tone === 'alert' && Number(value) > 0 ? 'text-primary' : 'text-ink')}>{value}</div>
    </div>
  );
  return body;
}

/** Mutation with toast feedback, field errors and query invalidation. */
export function useAction(fn, { success, invalidate = [], onSuccess, onError } = {}) {
  const qc = useQueryClient();
  const [fields, setFields] = useState({});
  const m = useMutation({
    mutationFn: fn,
    onMutate: () => setFields({}),
    onSuccess: (data, vars) => {
      if (success) toast.success(typeof success === 'function' ? success(data, vars) : success);
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] }));
      onSuccess?.(data, vars);
    },
    onError: (err, vars) => {
      setFields(err.fields || {});
      if (onError?.(err, vars) !== true) toast.error(err.message);
    },
  });
  return { ...m, fields, setFields };
}

export function Modal({ open, onOpenChange, title, description, children, footer, wide }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-h-[92vh] overflow-y-auto rounded-[18px] border-black/[0.06] shadow-[0_24px_64px_-12px_rgba(16,16,20,.25)]', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter className="gap-2">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export function Banner({ tone = 'amber', icon: Icon, title, children, className }) {
  const styles = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    blue: 'border-sky-200 bg-sky-50 text-sky-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    red: 'border-red-200 bg-red-50 text-red-800',
    dark: 'border-neutral-800 bg-neutral-900 text-white',
  };
  return (
    <div className={cn('flex gap-3 rounded-[14px] border p-4', styles[tone], className)}>
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="min-w-0 text-sm">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
    </div>
  );
}

const TILE = {
  grey: 'bg-neutral-100 text-neutral-700',
  amber: 'bg-amber-100/70 text-amber-700',
  brand: 'bg-orange-100/80 text-orange-600',
  green: 'bg-emerald-100/70 text-emerald-700',
  blue: 'bg-sky-100/70 text-sky-700',
  violet: 'bg-violet-100/70 text-violet-700',
  red: 'bg-red-100/70 text-red-600',
  dark: 'bg-ink text-white',
};

/** Rounded icon tile — the visual anchor for cards, KPIs and empty states. */
export function IconTile({ icon: Icon, tone = 'grey', live, size = 'md', className }) {
  return (
    <span className={cn('relative grid shrink-0 place-items-center transition-transform duration-300 group-hover:scale-105',
      size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl', TILE[tone], className)}>
      {live && <span className="absolute inset-0 animate-ping rounded-xl bg-orange-400/25 [animation-duration:2.2s]" />}
      <Icon className={cn('relative', size === 'lg' ? 'h-6 w-6' : 'h-5 w-5')} strokeWidth={1.9} />
    </span>
  );
}

/** Number that counts up to its value when it first appears or changes. */
export function CountUp({ value = 0, className, format = (n) => n }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const start = from.current;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(target); from.current = target; return; }
    let raf; const t0 = performance.now(); const dur = 700;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(start + (target - start) * e));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={cn('tabular', className)}>{format(shown)}</span>;
}

/** Underline tabs with optional icons and counts. items: [{ id, label, icon, count }] */
export function Tabs({ items, value, onChange, className }) {
  return (
    <div className={cn('no-scrollbar mb-5 flex gap-1 overflow-x-auto border-b', className)}>
      {items.map(({ id, label, icon: Icon, count }) => {
        const on = value === id;
        return (
          <button key={id} type="button" onClick={() => onChange(id)}
            className={cn('relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 pb-3 pt-1 text-[13.5px] font-medium transition-colors active:!scale-100', on ? 'text-ink' : 'text-muted-foreground hover:text-ink')}>
            {Icon && <Icon className={cn('h-4 w-4', on ? 'text-primary' : 'opacity-60')} />}{label}
            {count != null && <span className={cn('tabular inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold', on ? 'bg-ink text-white' : 'bg-neutral-100 text-neutral-500')}>{count}</span>}
            {on && <span className="tab-ink absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}

/** Pill-shaped two/three-way switch. options: [[value, label, Icon?]] */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-[10px] bg-neutral-100 p-0.5">
      {options.map(([v, l, Icon]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition active:!scale-100', value === v ? 'bg-white text-ink shadow-[0_1px_2px_rgba(16,16,20,.08)]' : 'text-muted-foreground hover:text-ink')}>
          {Icon && <Icon className="h-3.5 w-3.5" />}{l}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name = '', className, dark }) {
  const ini = name.replace(/\(.*\)/, '').trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold', dark ? 'bg-gradient-to-br from-neutral-700 to-neutral-900 text-white' : 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-800', className)}>{ini || '?'}</span>;
}

/** Card for a record in a grid (vehicle, operator, account). Whole card opens the editor. */
export function EntityCard({ icon, tone = 'grey', title, subtitle, badge, children, onClick, i = 0, aside }) {
  return (
    <div role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} onKeyDown={(e) => onClick && e.key === 'Enter' && onClick()}
      style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
      className={cn('card-surface animate-rise group flex flex-col p-4 text-left', onClick && 'lift cursor-pointer')}>
      <div className="flex items-start gap-3">
        {icon && <IconTile icon={icon} tone={tone} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate font-heading text-[15px] font-semibold text-ink">{title}</div>
            {badge}
          </div>
          {subtitle && <div className="mt-0.5 truncate text-[13px] text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
      {aside}
    </div>
  );
}

export const thCls = 'border-b bg-neutral-50/60 text-left text-[12px] font-medium text-muted-foreground';

/** Small "more actions" menu. items: [{ label, icon, onClick, danger, divider }] — falsy entries skipped. */
export function MoreMenu({ items, label = 'More actions' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-[10px] border border-input bg-white text-neutral-600 shadow-[0_1px_2px_rgba(16,16,20,.04)] hover:border-neutral-300 hover:text-ink">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </button>
      {open && (
        <div role="menu" className="animate-rise absolute right-0 top-[calc(100%+6px)] z-50 w-52 rounded-xl border border-black/[0.06] bg-white p-1 shadow-[0_16px_40px_-12px_rgba(16,16,20,.28)]">
          {items.filter(Boolean).map((it, i) => it.divider ? <div key={i} className="my-1 h-px bg-neutral-100" /> : (
            <button key={i} role="menuitem" type="button" onClick={() => { setOpen(false); it.onClick(); }}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium active:!scale-100', it.danger ? 'text-red-600 hover:bg-red-50' : 'text-ink hover:bg-neutral-100')}>
              {it.icon && <it.icon className="h-4 w-4 opacity-70" />}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Light row tint + coloured left edge, keyed by tone. Apply `row` to <tr>, `edge` to first <td>. */
export const ROW_TINT = {
  amber: { row: 'bg-amber-50/45 hover:bg-amber-50', edge: 'shadow-[inset_3px_0_0_#f59e0b]' },
  blue: { row: 'bg-sky-50/45 hover:bg-sky-50', edge: 'shadow-[inset_3px_0_0_#0ea5e9]' },
  violet: { row: 'bg-violet-50/45 hover:bg-violet-50', edge: 'shadow-[inset_3px_0_0_#8b5cf6]' },
  green: { row: 'bg-emerald-50/35 hover:bg-emerald-50', edge: 'shadow-[inset_3px_0_0_#10b981]' },
  brand: { row: 'bg-orange-50/60 hover:bg-orange-50', edge: 'shadow-[inset_3px_0_0_#f97316]' },
  red: { row: 'bg-red-50/40 hover:bg-red-50', edge: 'shadow-[inset_3px_0_0_#ef4444]' },
  grey: { row: 'bg-white hover:bg-neutral-50 [&_td]:text-neutral-500', edge: 'shadow-[inset_3px_0_0_#d4d4d8]' },
  dark: { row: 'bg-white hover:bg-neutral-50', edge: 'shadow-[inset_3px_0_0_#18181b]' },
};
