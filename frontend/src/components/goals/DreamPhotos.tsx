import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Star, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchDreamImage } from '@/lib/api';
import { cn } from '@/lib/utils';

export const MAX_PHOTOS = 12;

/** A photo in the editor: already saved (id) or picked just now (data). */
export interface EditablePhoto {
  key: string;
  id?: string;
  data?: string;
}

/** Resize a photo in the browser so it uploads small (max 1280px, JPEG). */
export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That image could not be read.'));
      el.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A saved photo, fetched by id (each one once per visit). */
export function DreamPhoto({ imageId, data, className }: { imageId?: string; data?: string; className?: string }) {
  const [src, setSrc] = useState(data || '');
  useEffect(() => {
    if (data) {
      setSrc(data);
      return;
    }
    if (!imageId) return;
    let alive = true;
    setSrc('');
    fetchDreamImage(imageId)
      .then((value) => alive && setSrc(value))
      .catch(() => {
        /* leave the placeholder */
      });
    return () => {
      alive = false;
    };
  }, [imageId, data]);

  if (!src) return <div className={cn('animate-pulse bg-slate-100 dark:bg-slate-800', className)} aria-hidden />;
  return <img src={src} alt="" className={cn('object-cover', className)} loading="lazy" />;
}

/** Left / right buttons, counter and dots laid over a photo. */
function SwapControls({ index, count, onChange }: { index: number; count: number; onChange: (index: number) => void }) {
  if (count < 2) return null;
  const go = (step: number) => onChange((index + step + count) % count);
  const arrow =
    'absolute top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-900 shadow-md ring-1 ring-black/5 hover:bg-white hover:scale-105 active:scale-95 transition dark:bg-slate-900/90 dark:text-slate-50 dark:ring-white/10 dark:hover:bg-slate-900';
  return (
    <>
      <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className={cn(arrow, 'left-3')}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => go(1)} aria-label="Next photo" className={cn(arrow, 'right-3')}>
        <ChevronRight className="h-5 w-5" />
      </button>
      <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm">
        {index + 1}/{count}
      </span>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/30 px-2 py-1 backdrop-blur-sm">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            aria-label={`Show photo ${i + 1}`}
            className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/90')}
          />
        ))}
      </div>
    </>
  );
}

/** The card's photo: the cover by default, with buttons to swap through the rest. */
export function PhotoGallery({ ids }: { ids: string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  if (ids.length === 0) return null;

  return (
    <div className="relative">
      <DreamPhoto imageId={ids[Math.min(index, ids.length - 1)]} className="block w-full aspect-[16/10]" />
      <SwapControls index={Math.min(index, ids.length - 1)} count={ids.length} onChange={setIndex} />
    </div>
  );
}

/** Editor strip: add several photos, pick the cover (first), remove any. */
export function PhotoManager({ photos, onChange }: { photos: EditablePhoto[]; onChange: (photos: EditablePhoto[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return toast.error(`Up to ${MAX_PHOTOS} photos per goal`);
    setBusy(true);
    const added: EditablePhoto[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      try {
        added.push({ key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`, data: await compressImage(file) });
      } catch (err: any) {
        toast.error(err?.message || 'Could not use that photo');
      }
    }
    if (files.length > room) toast.error(`Only the first ${room} added; a goal holds up to ${MAX_PHOTOS} photos`);
    onChange([...photos, ...added]);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const [view, setView] = useState(0);
  const shown = Math.min(view, Math.max(photos.length - 1, 0));

  const makeCover = (key: string) => {
    const photo = photos.find((p) => p.key === key)!;
    onChange([photo, ...photos.filter((p) => p.key !== key)]);
    setView(0);
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
      {photos.length > 0 ? (
        <div className="relative">
          <DreamPhoto imageId={photos[shown].id} data={photos[shown].data} className="block w-full aspect-[16/10]" />
          <SwapControls index={shown} count={photos.length} onChange={setView} />
          {shown === 0 ? (
            <span className="absolute left-3 top-3 rounded-full bg-clay-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow">Cover</span>
          ) : (
            <button
              type="button"
              onClick={() => makeCover(photos[shown].key)}
              className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-semibold text-slate-900 shadow-md hover:bg-white dark:bg-slate-900/90 dark:text-slate-50"
            >
              <Star className="h-3.5 w-3.5" /> Make cover
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-40 w-full flex-col items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 hover:text-clay-700 dark:hover:text-clay-300 transition-colors"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-xs font-medium">{busy ? 'Preparing photos' : 'Add photos (you can pick several)'}</span>
        </button>
      )}

      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-2.5">
          {photos.map((photo, i) => (
            <div
              key={photo.key}
              className={cn(
                'group/thumb relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2',
                i === 0 ? 'border-clay-500' : 'border-transparent',
                i === shown && 'ring-2 ring-slate-900/70 ring-offset-1 dark:ring-white/80 dark:ring-offset-slate-900'
              )}
            >
              <button type="button" onClick={() => setView(i)} aria-label={`Show photo ${i + 1}`} className="block h-full w-full">
                <DreamPhoto imageId={photo.id} data={photo.data} className="h-full w-full" />
              </button>
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-clay-600 px-1 text-[9px] font-semibold uppercase tracking-wide text-white">Cover</span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(photo.key)}
                  title="Make cover"
                  aria-label={`Make photo ${i + 1} the cover`}
                  className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded bg-black/50 text-white opacity-0 group-hover/thumb:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <Star className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(photos.filter((p) => p.key !== photo.key))}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded bg-black/50 text-white opacity-0 group-hover/thumb:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid h-16 w-20 shrink-0 place-items-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:border-clay-400 hover:text-clay-700 dark:hover:text-clay-300"
              aria-label="Add photos"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
