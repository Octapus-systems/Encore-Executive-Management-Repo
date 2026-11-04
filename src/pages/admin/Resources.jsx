import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Accessibility, Baby, Briefcase, Car, Eye, EyeOff, ImagePlus, Luggage, Images, Mail, Pencil, Phone, Plus, RefreshCw, RotateCcw, Star, Trash2, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { usePublicSettings } from '@/lib/auth';
import { Avatar, EntityCard, Empty, Field, Modal, PageHeader, thCls, PageLoader, Pill, PrimaryButton, SelectInput, TextArea, TextInput, useAction } from '@/components/common';
import { Button } from '@/components/ui/button';

const VSTATUS = { available: 'green', unavailable: 'amber', retired: 'grey' };

// ---------------- Fleet ----------------
export function Fleet() {
  const { data, isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: () => api.get('/admin/vehicles') });
  const [edit, setEdit] = useState(null);
  return (
    <div>
      <PageHeader icon={Car} title="Fleet" subtitle="Your vehicles. Only available ones can be assigned."
        actions={<Button onClick={() => setEdit({})}><Plus />Add vehicle</Button>} />
      {isLoading ? <PageLoader /> : !data.length ? <Empty icon={Car} title="No vehicles yet" /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((v, i) => (
            <EntityCard key={v.id} i={i} icon={Car} tone={v.status === 'available' ? 'dark' : 'grey'} onClick={() => setEdit(v)}
              title={`${v.make} ${v.model}`} subtitle={`${v.colour} · ${v.category}`}
              cover={<VehicleCover v={v} />}
              badge={<span className="shrink-0 rounded-md border border-neutral-900 bg-yellow-300 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide">{v.registration}</span>}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5" title="Seats"><Users className="h-3.5 w-3.5" />{v.seats} seats</span>
                <span className="inline-flex items-center gap-1.5" title="Large cases"><Luggage className="h-3.5 w-3.5" />{v.luggage_capacity} cases</span>
                {v.child_seat_capable ? <span className="inline-flex items-center gap-1.5"><Baby className="h-3.5 w-3.5" />Child seats</span> : null}
                {v.accessible ? <span className="inline-flex items-center gap-1.5 text-sky-700"><Accessibility className="h-3.5 w-3.5" />Accessible</span> : null}
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <Pill tone={VSTATUS[v.status]} className="capitalize">{v.status}</Pill>
                {v.upcoming_jobs > 0 ? <span className="text-[12px] font-medium text-orange-700">{v.upcoming_jobs} active job{v.upcoming_jobs > 1 ? 's' : ''}</span> : <Pencil className="h-3.5 w-3.5 text-neutral-300 transition group-hover:text-neutral-600" />}
              </div>
            </EntityCard>
          ))}
        </div>
      )}
      {edit && <VehicleModal v={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

// Cars we have studio artwork for (the same pictures the customer app shows on its cards).
const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const DEFAULT_CARDS = { mercedesbenzsclass: 's-class', mercedesbenzeclass: 'e-class', mercedesbenzvclass: 'v-class', rangeroversport: 'range-rover' };
const defaultCard = (v) => { const k = DEFAULT_CARDS[norm(`${v.make} ${v.model}`)]; return k ? `/images/fleet/${k}.jpg` : null; };
const galleryOf = (v) => { try { const g = JSON.parse(v.gallery || '[]'); return Array.isArray(g) ? g : []; } catch { return []; } };
/** The picture on the vehicle's card: chosen card image, else the studio artwork, else the first gallery photo. */
const cardOf = (v) => v.card_photo_url || defaultCard(v) || galleryOf(v)[0] || null;

/** Picture strip on top of a fleet card. */
function VehicleCover({ v }) {
  const src = cardOf(v);
  const count = galleryOf(v).length;
  return (
    <div className="relative -mx-4 -mt-4 mb-3 h-36 overflow-hidden rounded-t-[14px] bg-gradient-to-br from-neutral-900 to-neutral-800">
      {src
        ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        : <div className="grid h-full place-items-center text-center text-white/45"><div><ImagePlus className="mx-auto h-7 w-7" /><div className="mt-1 text-[12px] font-medium">Add a photo</div></div></div>}
      <span className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold backdrop-blur ${Number(v.show_in_app ?? 1) ? 'bg-emerald-500/90 text-white' : 'bg-black/60 text-white/80'}`}>
        {Number(v.show_in_app ?? 1) ? <><Eye className="h-3 w-3" />In customer app</> : <><EyeOff className="h-3 w-3" />Hidden</>}
      </span>
      {count > 0 && <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur"><Images className="h-3 w-3" />{count} in gallery</span>}
    </div>
  );
}

/** Shrink a chosen image in the browser (max 1600 px, JPEG) so uploads stay small and fast. */
async function prepareImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Choose a JPG, PNG or WebP photo.');
  const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('That image could not be read.')); i.src = URL.createObjectURL(file); });
  const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.85));
  if (!blob || blob.size > 4 * 1024 * 1024) throw new Error('That photo is too large — try a smaller one.');
  return blob;
}

/** Object URL for a Blob, revoked when it goes away. */
function useBlobUrl(blob) {
  const [u, setU] = useState(null);
  useEffect(() => {
    if (!blob) { setU(null); return undefined; }
    const x = URL.createObjectURL(blob); setU(x);
    return () => URL.revokeObjectURL(x);
  }, [blob]);
  return u;
}

function SectionLabel({ title, hint }) {
  return <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="text-sm font-medium text-ink">{title}</span><span className="text-right text-xs text-muted-foreground">{hint}</span></div>;
}

/** Card image: the main picture on the vehicle's card. Change it, or go back to the default. */
function CardImagePicker({ shown, label, canReset, pending, onPick, onReset, busy }) {
  const input = useRef(null);
  const preview = useBlobUrl(pending);
  const src = preview || shown;
  const choose = async (file) => { if (!file) return; try { onPick(await prepareImage(file)); } catch (e) { toast.error(e.message); } };
  return (
    <div className="sm:col-span-2">
      <SectionLabel title="Card image" hint="The main picture on this car's card in the customer app" />
      <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files?.[0]); }}
        className="relative h-44 overflow-hidden rounded-[14px] border bg-gradient-to-br from-neutral-900 to-neutral-800">
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : (
          <button type="button" onClick={() => input.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-center text-white/60 active:!scale-100">
            <ImagePlus className="h-6 w-6" /><span className="text-[13px] font-semibold">Upload a card image</span>
            <span className="text-[12px] text-white/45">A side view on a dark background looks best</span>
          </button>
        )}
        {src && <span className="absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">{label}</span>}
        {src && (
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2.5">
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/95 px-2.5 text-[12.5px] font-semibold text-ink hover:bg-white"><RefreshCw className="h-3.5 w-3.5" />Change card image</button>
            {canReset && <button type="button" disabled={busy} onClick={onReset} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/95 px-2.5 text-[12.5px] font-semibold text-neutral-700 hover:bg-white"><RotateCcw className="h-3.5 w-3.5" />Use default</button>}
          </div>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </div>
  );
}

function Thumb({ src, isCard, isNew, onRemove, onMakeCard, busy }) {
  return (
    <div className="group relative aspect-[4/3] overflow-hidden rounded-[12px] border bg-neutral-100">
      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      {(isCard || isNew) && <span className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold text-white ${isCard ? 'bg-primary' : 'bg-black/60'}`}>{isCard ? 'Card image' : 'New'}</span>}
      <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 transition sm:opacity-0 sm:group-hover:opacity-100">
        {!isCard && <button type="button" disabled={busy} onClick={onMakeCard} title="Use as card image" className="grid h-7 w-7 place-items-center rounded-md bg-white/95 text-ink hover:bg-white"><Star className="h-3.5 w-3.5" /></button>}
        <button type="button" disabled={busy} onClick={onRemove} title="Remove from gallery" className="grid h-7 w-7 place-items-center rounded-md bg-white/95 text-red-600 hover:bg-white"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}
function PendingThumb({ blob, ...rest }) {
  const u = useBlobUrl(blob);
  return u ? <Thumb src={u} {...rest} /> : null;
}

/** Gallery: extra photos on the car's page in the customer app. Several can be added at once. */
function GalleryEditor({ saved, adds, cardUrl, cardBlob, onAdd, onRemoveSaved, onRemoveNew, onMakeCard, busy }) {
  const input = useRef(null);
  const [drag, setDrag] = useState(false);
  const total = saved.length + adds.length;
  const choose = async (files) => {
    for (const file of [...(files || [])].slice(0, Math.max(0, 12 - total))) {
      try { onAdd(await prepareImage(file)); } catch (e) { toast.error(e.message); }
    }
  };
  return (
    <div className="sm:col-span-2">
      <SectionLabel title={`Gallery${total ? ` · ${total}` : ''}`} hint="Shown on the car's page in the customer app · up to 12" />
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files); }}
        className={`grid grid-cols-3 gap-2 rounded-[14px] border-2 border-dashed p-2 transition sm:grid-cols-4 ${drag ? 'border-primary bg-orange-50' : 'border-neutral-200 bg-neutral-50'}`}>
        {saved.map((u) => <Thumb key={u} src={u} isCard={!cardBlob && u === cardUrl} busy={busy} onRemove={() => onRemoveSaved(u)} onMakeCard={() => onMakeCard(u)} />)}
        {adds.map((b, i) => <PendingThumb key={i} blob={b} isNew isCard={b === cardBlob} busy={busy} onRemove={() => onRemoveNew(b)} onMakeCard={() => onMakeCard(b)} />)}
        {total < 12 && (
          <button type="button" onClick={() => input.current?.click()} className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-neutral-300 bg-white text-center text-muted-foreground hover:border-primary hover:text-primary active:!scale-100">
            <Plus className="h-5 w-5" /><span className="text-[12px] font-semibold">Add photos</span>
          </button>
        )}
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { choose(e.target.files); e.target.value = ''; }} />
      </div>
    </div>
  );
}

function VehicleModal({ v, onClose }) {
  const { data: s } = usePublicSettings();
  const [f, setF] = useState({ registration: '', make: '', model: '', colour: '', category: s?.vehicle_categories?.[0] || '', seats: 3, luggage_capacity: 2, child_seat_capable: 1, accessible: 0, status: 'available', notes: '', description: '', show_in_app: 1, ...v });
  // Photo changes wait here until Save (a new vehicle needs its id first).
  const [card, setCard] = useState(undefined);   // undefined = unchanged · null = default · string = saved photo url · Blob = new photo
  const [adds, setAdds] = useState([]);           // new gallery photos (Blobs)
  const [removed, setRemoved] = useState([]);     // saved gallery photos to remove
  const savedGallery = galleryOf(v).filter((u) => !removed.includes(u));
  const curCard = card === undefined ? (v.card_photo_url && !removed.includes(v.card_photo_url) ? v.card_photo_url : null) : card;
  const cardBlob = curCard instanceof Blob ? curCard : null;
  const def = defaultCard(f);
  const shown = typeof curCard === 'string' ? curCard : def || savedGallery[0] || null;
  const label = cardBlob ? 'New — saves with the vehicle' : typeof curCard === 'string' ? 'Custom card image' : def ? 'Default picture' : 'First gallery photo';
  const save = useAction(async (body) => {
    const saved = v.id ? await api.patch(`/admin/vehicles/${v.id}`, body) : await api.post('/admin/vehicles', body);
    const id = saved.id;
    for (const u of removed) await api.del(`/admin/vehicles/${id}/photo?url=${encodeURIComponent(u)}`);
    let cardUrl = typeof curCard === 'string' ? curCard : null;
    for (const b of adds) {
      const r = await api.upload(`/admin/vehicles/${id}/photo`, b);
      if (b === cardBlob) cardUrl = galleryOf(r).at(-1);
    }
    if (cardBlob && !adds.includes(cardBlob)) await api.upload(`/admin/vehicles/${id}/photo?kind=card`, cardBlob);
    else if (card !== undefined) await api.put(`/admin/vehicles/${id}/card`, { url: cardUrl });
    return saved;
  }, {
    success: v.id ? 'Vehicle updated.' : 'Vehicle added.', invalidate: ['vehicles'],
    onSuccess: (r) => { if (r.warning) toast.warning(r.warning, { duration: 8000 }); onClose(); },
  });
  const bind = (k) => ({ value: f[k] ?? '', onChange: (e) => setF({ ...f, [k]: e.target.value }), invalid: !!save.fields[k] });
  return (
    <Modal open onOpenChange={onClose} title={v.id ? `Edit ${v.registration}` : 'Add vehicle'} footer={<PrimaryButton loading={save.isPending} onClick={() => save.mutate({ ...f, seats: Number(f.seats), luggage_capacity: Number(f.luggage_capacity) })}>Save</PrimaryButton>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <CardImagePicker shown={shown} label={label} pending={cardBlob} canReset={!!curCard} busy={save.isPending}
          onPick={(b) => setCard(b)} onReset={() => setCard(null)} />
        <GalleryEditor saved={savedGallery} adds={adds} cardUrl={typeof curCard === 'string' ? curCard : null} cardBlob={cardBlob} busy={save.isPending}
          onAdd={(b) => setAdds((a) => [...a, b])}
          onRemoveSaved={(u) => { setRemoved((r) => [...r, u]); if (curCard === u) setCard(null); }}
          onRemoveNew={(b) => { setAdds((a) => a.filter((x) => x !== b)); if (cardBlob === b) setCard(undefined); }}
          onMakeCard={(x) => setCard(x)} />
        <Field label="Registration" error={save.fields.registration}><TextInput {...bind('registration')} onChange={(e) => setF({ ...f, registration: e.target.value.toUpperCase() })} /></Field>
        <Field label="Status"><SelectInput {...bind('status')}><option value="available">Available</option><option value="unavailable">Unavailable</option><option value="retired">Retired</option></SelectInput></Field>
        <Field label="Make" error={save.fields.make}><TextInput {...bind('make')} /></Field>
        <Field label="Model" error={save.fields.model}><TextInput {...bind('model')} /></Field>
        <Field label="Colour"><TextInput {...bind('colour')} /></Field>
        <Field label="Category" error={save.fields.category}><SelectInput {...bind('category')}>{(s?.vehicle_categories || []).concat(f.category && !(s?.vehicle_categories || []).includes(f.category) ? [f.category] : []).map((c) => <option key={c}>{c}</option>)}</SelectInput></Field>
        <Field label="Passenger seats" error={save.fields.seats}><TextInput type="number" min="1" {...bind('seats')} /></Field>
        <Field label="Luggage capacity (large cases)"><TextInput type="number" min="0" {...bind('luggage_capacity')} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#FF5A1F]" checked={!!Number(f.child_seat_capable)} onChange={(e) => setF({ ...f, child_seat_capable: e.target.checked ? 1 : 0 })} />Child seats can be fitted</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#FF5A1F]" checked={!!Number(f.accessible)} onChange={(e) => setF({ ...f, accessible: e.target.checked ? 1 : 0 })} />Accessible vehicle</label>
        <Field label="Description for customers" hint="Shown on the car's page in the customer app" className="sm:col-span-2"><TextArea rows={2} placeholder="e.g. Quiet, spacious cabin with reclining rear seats — ideal for airport runs." {...bind('description')} /></Field>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[12px] border px-3.5 py-3 text-sm sm:col-span-2">
          <span><span className="block font-medium text-ink">Show in the customer app</span><span className="block text-xs text-muted-foreground">Turn off to keep this vehicle internal (still assignable). Retired vehicles are always hidden.</span></span>
          <input type="checkbox" className="h-5 w-5 accent-[#FF5A1F]" checked={!!Number(f.show_in_app ?? 1)} onChange={(e) => setF({ ...f, show_in_app: e.target.checked ? 1 : 0 })} />
        </label>
        <Field label="Internal notes" hint="Management only" className="sm:col-span-2"><TextArea rows={2} {...bind('notes')} /></Field>
      </div>
    </Modal>
  );
}

// ---------------- Drivers ----------------
export function Drivers() {
  const { data, isLoading } = useQuery({ queryKey: ['drivers'], queryFn: () => api.get('/admin/drivers') });
  const [edit, setEdit] = useState(null);
  const toggle = useAction(({ id, ...body }) => api.patch(`/admin/drivers/${id}`, body), { success: 'Driver updated.', invalidate: ['drivers'] });
  return (
    <div>
      <PageHeader icon={Users} title="Drivers" subtitle="Chauffeurs only see the journeys you assign them."
        actions={<div className="flex gap-2"><Button variant="outline" onClick={() => setEdit({ driver_type: 'temporary' })}><Plus />Temporary driver</Button><Button onClick={() => setEdit({})}><Plus />Add driver</Button></div>} />
      {isLoading ? <PageLoader /> : !data.length ? <Empty icon={Users} title="No drivers yet" /> : (
        <div className="overflow-hidden card-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead className={thCls}><tr><th className="px-5 py-2.5 font-medium">Driver</th><th className="px-4 py-2.5 font-medium">Contact</th><th className="px-4 py-2.5 font-medium">Availability</th><th className="px-4 py-2.5 font-medium">Jobs</th><th className="px-4 py-2.5 font-medium">Rating</th><th className="px-4 py-2.5 font-medium">Account</th><th className="w-10" /></tr></thead>
              <tbody className="divide-y">
                {data.map((d, i) => (
                  <tr key={d.id} onClick={() => setEdit(d)} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} className="row-in group cursor-pointer hover:bg-neutral-50/80">
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={d.name} dark /><div><div className="flex items-center gap-2 font-semibold">{d.name}{d.driver_type === 'temporary' && <Pill tone={d.access_expires_at && new Date(d.access_expires_at) < new Date() ? 'red' : 'blue'}>Temporary</Pill>}</div><div className="text-xs text-muted-foreground">{d.driver_type === 'temporary' && d.access_expires_at ? `Access until ${new Date(d.access_expires_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : d.licence_number || 'Licence not recorded'}</div></div></div></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-neutral-400" />{d.phone}</div><div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{d.email}</div></td>
                    <td className="px-4 py-3">
                      <button title="Tap to switch" onClick={(e) => { e.stopPropagation(); toggle.mutate({ id: d.id, driver_availability: d.driver_availability === 'available' ? 'unavailable' : 'available' }); }}>
                        <Pill tone={d.driver_availability === 'available' ? 'green' : 'amber'} className="capitalize">{d.driver_availability}</Pill>
                      </button>
                    </td>
                    <td className="tabular px-4 py-3 font-medium">{d.upcoming_jobs || <span className="text-neutral-300">0</span>}</td>
                    <td className="px-4 py-3">{d.rating_count ? <span className="inline-flex items-center gap-1 font-semibold" title={`${d.rating_count} rating${d.rating_count > 1 ? 's' : ''}`}><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(d.rating_avg).toFixed(1)}<span className="text-xs font-normal text-muted-foreground">({d.rating_count})</span></span> : <span className="text-xs text-neutral-300">No ratings</span>}</td>
                    <td className="px-4 py-3"><Pill tone={d.status === 'active' ? 'green' : 'red'} className="capitalize">{d.status}</Pill></td>
                    <td className="pr-4 text-right"><Pencil className="ml-auto h-3.5 w-3.5 text-neutral-300 transition group-hover:text-neutral-600" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <RecentReviews />
      {edit && <DriverModal d={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

/** Latest customer ratings across all chauffeurs (low ratings stand out). */
function RecentReviews() {
  const { data = [] } = useQuery({ queryKey: ['reviews'], queryFn: () => api.get('/admin/reviews') });
  if (!data.length) return null;
  return (
    <div className="mt-6">
      <div className="mb-2.5 flex items-center gap-2 text-[15px] font-semibold text-ink"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />Customer ratings</div>
      <div className="grid gap-3 md:grid-cols-2">
        {data.slice(0, 12).map((r) => (
          <Link key={r.id} to={`/admin/bookings/${r.booking_id}`} className={`card-surface block p-4 transition hover:shadow-md ${r.rating <= 3 ? 'ring-1 ring-red-200 bg-red-50/40' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-4 w-4 ${n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`} />)}</span>
              <span className="text-xs text-muted-foreground">{r.ref}</span>
            </div>
            {r.comment && <p className="mt-2 text-[13px] text-ink">“{r.comment}”</p>}
            <div className="mt-2 text-xs text-muted-foreground">{r.customer_name} → {r.driver_name || 'No chauffeur recorded'}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DriverModal({ d, onClose }) {
  const toLocal = (iso) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
  const temporary = d.driver_type === 'temporary';
  const [f, setF] = useState({ name: '', email: '', phone: '', licence_number: '', notes: '', password: '', status: 'active', driver_availability: 'available', ...d, ...(d.id ? { password: '' } : {}), access_expires_at: toLocal(d.access_expires_at || (temporary ? new Date(Date.now() + 7 * 86400000).toISOString() : '')) });
  const save = useAction((body) => (d.id ? api.patch(`/admin/drivers/${d.id}`, body) : api.post('/admin/drivers', body)), { success: 'Saved.', invalidate: ['drivers'], onSuccess: onClose });
  const bind = (k) => ({ value: f[k] ?? '', onChange: (e) => setF({ ...f, [k]: e.target.value }), invalid: !!save.fields[k] });
  const expiry = temporary && f.access_expires_at ? new Date(f.access_expires_at).toISOString() : undefined;
  const body = d.id
    ? { name: f.name, phone: f.phone, licence_number: f.licence_number, notes: f.notes, status: f.status, driver_availability: f.driver_availability, ...(f.password ? { password: f.password } : {}), ...(temporary ? { access_expires_at: expiry } : {}) }
    : { ...f, access_expires_at: expiry };
  return (
    <Modal open onOpenChange={onClose} title={d.id ? `Edit ${d.name}` : temporary ? 'Add temporary driver' : 'Add driver'} description={d.id ? undefined : temporary ? 'For cover when the regular fleet is unavailable. They see only the journeys you assign, and their sign-in stops working after the end date.' : 'Share the email and temporary password with the driver so they can sign in.'}
      footer={<PrimaryButton loading={save.isPending} onClick={() => save.mutate(body)}>Save</PrimaryButton>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" error={save.fields.name}><TextInput {...bind('name')} /></Field>
        <Field label="Mobile" error={save.fields.phone}><TextInput type="tel" {...bind('phone')} /></Field>
        {!d.id && <Field label="Email (sign-in)" error={save.fields.email}><TextInput type="email" {...bind('email')} /></Field>}
        <Field label={d.id ? 'Reset password (optional)' : 'Temporary password'} error={save.fields.password}><TextInput type="text" autoComplete="new-password" {...bind('password')} /></Field>
        <Field label="Driving licence no."><TextInput {...bind('licence_number')} /></Field>
        {temporary && <Field label="Access ends" error={save.fields.access_expires_at} hint="Extend or shorten any time"><TextInput type="datetime-local" {...bind('access_expires_at')} /></Field>}
        {d.id && <Field label="Availability"><SelectInput {...bind('driver_availability')}><option value="available">Available</option><option value="unavailable">Unavailable</option></SelectInput></Field>}
        {d.id && <Field label="Account"><SelectInput {...bind('status')}><option value="active">Active</option><option value="suspended">Suspended</option></SelectInput></Field>}
        <Field label="Notes" className="sm:col-span-2"><TextArea rows={2} {...bind('notes')} /></Field>
      </div>
    </Modal>
  );
}

// ---------------- External operators ----------------
export function Operators() {
  const { data, isLoading } = useQuery({ queryKey: ['operators'], queryFn: () => api.get('/admin/operators') });
  const [edit, setEdit] = useState(null);
  return (
    <div>
      <PageHeader icon={Briefcase} title="External cover" subtitle="Partner operators for busy days. They don't sign in."
        actions={<Button onClick={() => setEdit({})}><Plus />Add operator</Button>} />
      {isLoading ? <PageLoader /> : !data.length ? <Empty icon={Briefcase} title="No operators recorded" /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((o, i) => (
            <EntityCard key={o.id} i={i} icon={Briefcase} tone={o.active ? 'violet' : 'grey'} onClick={() => setEdit(o)}
              title={o.name} subtitle={o.contact_name} badge={<Pill tone={o.active ? 'green' : 'grey'}>{o.active ? 'Active' : 'Inactive'}</Pill>}>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
                {o.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{o.phone}</span>}
                {o.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{o.email}</span>}
              </div>
              {o.notes && <p className="mt-2 text-[12px] text-muted-foreground">{o.notes}</p>}
            </EntityCard>
          ))}
        </div>
      )}
      {edit && <OperatorModal o={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function OperatorModal({ o, onClose }) {
  const [f, setF] = useState({ name: '', contact_name: '', phone: '', email: '', notes: '', active: 1, ...o });
  const save = useAction((body) => (o.id ? api.patch(`/admin/operators/${o.id}`, body) : api.post('/admin/operators', body)), { success: 'Saved.', invalidate: ['operators'], onSuccess: onClose });
  const bind = (k) => ({ value: f[k] ?? '', onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  return (
    <Modal open onOpenChange={onClose} title={o.id ? `Edit ${o.name}` : 'Add operator'} footer={<PrimaryButton loading={save.isPending} onClick={() => save.mutate({ ...f, active: Number(f.active) })}>Save</PrimaryButton>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Business name" error={save.fields.name}><TextInput {...bind('name')} /></Field>
        <Field label="Contact name"><TextInput {...bind('contact_name')} /></Field>
        <Field label="Phone"><TextInput {...bind('phone')} /></Field>
        <Field label="Email"><TextInput {...bind('email')} /></Field>
        {o.id && <Field label="Status"><SelectInput {...bind('active')}><option value={1}>Active</option><option value={0}>Inactive</option></SelectInput></Field>}
        <Field label="Notes" className="sm:col-span-2"><TextArea rows={2} {...bind('notes')} /></Field>
      </div>
    </Modal>
  );
}
