import { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, StickyNote, Trophy, Loader2, Mountain, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchDreams, createDream, updateDream, deleteDream, addDreamImage, deleteDreamImage } from '@/lib/api';
import { PhotoGallery, PhotoManager, type EditablePhoto } from './DreamPhotos';
import MultiNotesDialog, { getNotesCount } from '@/components/common/MultiNotesDialog';
import { MiniMarkdown, toggleChecklistLine, checklistProgress } from '@/lib/miniMarkdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/components/common/RichTextEditor';
import { cn } from '@/lib/utils';

interface Dream {
  _id: string;
  title: string;
  images?: string[]; // photo ids, the first is the cover
  content: string;
  notes: string;
  achievedAt?: string | null;
  createdAt: string;
}

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';

type DreamFields = { title: string; content: string };

/**
 * Save a goal and its photos: text first, then removed photos go, new ones
 * upload one by one (each request stays small), and the order sets the cover.
 */
async function persistDream(initial: Dream | undefined, fields: DreamFields, photos: EditablePhoto[], onStep: (text: string) => void): Promise<Dream> {
  const dream: Dream = initial ? await updateDream(initial._id, fields) : await createDream(fields);
  const keep = new Set(photos.filter((p) => p.id).map((p) => p.id));
  for (const old of initial?.images || []) {
    if (!keep.has(old)) await deleteDreamImage(dream._id, old);
  }
  const ids: string[] = [];
  const fresh = photos.filter((p) => !p.id).length;
  let uploaded = 0;
  let failed = 0;
  for (const photo of photos) {
    if (photo.id) {
      ids.push(photo.id);
      continue;
    }
    onStep(`Uploading photo ${++uploaded} of ${fresh}`);
    try {
      ids.push((await addDreamImage(dream._id, photo.data!))._id);
    } catch {
      failed += 1;
    }
  }
  if (failed) toast.error(`${failed} photo${failed === 1 ? '' : 's'} could not be uploaded`);
  return ids.length || initial?.images?.length ? updateDream(dream._id, { images: ids }) : dream;
}

/** Columns for the masonry grid: 1 on phones, 2 from tablets up, so cards stay large. */
function useColumnCount() {
  const get = () => (window.innerWidth >= 768 ? 2 : 1);
  const [cols, setCols] = useState(get);
  useEffect(() => {
    const onResize = () => setCols(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return cols;
}

export default function DreamGoals() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const cols = useColumnCount();

  useEffect(() => {
    fetchDreams()
      .then(setDreams)
      .catch(() => toast.error('Could not load your 5-year goals'))
      .finally(() => setLoading(false));
  }, []);

  const replace = (saved: Dream) => setDreams((prev) => prev.map((d) => (d._id === saved._id ? saved : d)));

  const save = async (id: string, changes: Partial<Dream> & { achieved?: boolean }) => {
    const saved = await updateDream(id, changes);
    replace(saved);
    return saved;
  };

  const remove = async (dream: Dream) => {
    if (!window.confirm(`Delete "${dream.title}"? Its photo, text and notes go with it.`)) return;
    setDreams((prev) => prev.filter((d) => d._id !== dream._id));
    try {
      await deleteDream(dream._id);
    } catch (err: any) {
      setDreams((prev) => [...prev, dream]);
      toast.error(err?.message || 'Could not delete the goal');
    }
  };

  // Cards fill columns left to right, so each new row starts right under the card above it.
  const items: Array<{ key: string; node: React.ReactNode }> = [];
  if (creating) {
    items.push({
      key: 'new',
      node: (
        <DreamEditor
          onCancel={() => setCreating(false)}
          onSave={async (fields, photos, onStep) => {
            const created = await persistDream(undefined, fields, photos, onStep);
            setDreams((prev) => [...prev, created]);
            setCreating(false);
          }}
        />
      ),
    });
  }
  dreams.forEach((dream) =>
    items.push({
      key: dream._id,
      node: (
        <DreamCard
          dream={dream}
          onSave={(changes) => save(dream._id, changes)}
          onSaveAll={async (fields, photos, onStep) => replace(await persistDream(dream, fields, photos, onStep))}
          onDelete={() => remove(dream)}
          onOpenNotes={() => setNotesFor(dream._id)}
        />
      ),
    })
  );
  const columns: Array<typeof items> = Array.from({ length: cols }, () => []);
  items.forEach((item, i) => columns[i % cols].push(item));

  const notesDream = dreams.find((d) => d._id === notesFor) || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-medium text-slate-900 dark:text-slate-50">The next five years</h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            {dreams.length
              ? `${dreams.filter((d) => d.achievedAt).length} of ${dreams.length} achieved`
              : 'Give each big goal a photo, a few lines and a checklist of steps.'}
          </p>
        </div>
        {!creating && (
          <Button size="sm" className="h-9 text-xs" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New goal
          </Button>
        )}
      </div>

      {loading ? (
        <div className="surface p-10 text-center text-[13px] text-slate-500 dark:text-slate-400" aria-busy="true">Loading goals</div>
      ) : items.length === 0 ? (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="surface w-full flex flex-col items-center justify-center py-16 text-center hover:border-clay-300 dark:hover:border-clay-800 transition-colors"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-clay-50 text-clay-600 dark:bg-clay-950/50 dark:text-clay-400">
            <Mountain className="h-5 w-5" />
          </span>
          <span className="mt-3 font-display text-lg text-slate-900 dark:text-slate-50">Add your first 5-year goal</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Photo, title, and the steps to get there</span>
        </button>
      ) : (
        <div className="flex items-start gap-5">
          {columns.map((col, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col gap-5">
              {col.map((item) => <div key={item.key}>{item.node}</div>)}
            </div>
          ))}
        </div>
      )}

      <MultiNotesDialog
        open={!!notesDream}
        onClose={() => setNotesFor(null)}
        title={`Notes: ${notesDream?.title || ''}`}
        subtitle={notesDream ? `Goal written ${fmt(notesDream.createdAt)}` : undefined}
        initialNotesRaw={notesDream?.notes}
        fallbackDate={notesDream?.createdAt}
        onSave={async (serialized) => {
          if (!notesDream) return;
          try {
            await save(notesDream._id, { notes: serialized });
          } catch (err: any) {
            toast.error(err?.message || 'Could not save the note');
          }
        }}
      />
    </div>
  );
}

function DreamCard({
  dream,
  onSave,
  onSaveAll,
  onDelete,
  onOpenNotes,
}: {
  dream: Dream;
  onSave: (changes: Partial<Dream> & { achieved?: boolean }) => Promise<Dream>;
  onSaveAll: SaveDream;
  onDelete: () => void;
  onOpenNotes: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const progress = checklistProgress(dream.content);
  const notesCount = getNotesCount(dream.notes);

  if (editing) {
    return (
      <DreamEditor
        initial={dream}
        onCancel={() => setEditing(false)}
        onSave={async (fields, photos, onStep) => {
          await onSaveAll(fields, photos, onStep);
          setEditing(false);
        }}
      />
    );
  }

  const toggleCheck = async (line: number) => {
    try {
      await onSave({ content: toggleChecklistLine(dream.content, line) });
    } catch (err: any) {
      toast.error(err?.message || 'Could not update the checklist');
    }
  };

  const toggleAchieved = async () => {
    try {
      await onSave({ achieved: !dream.achievedAt });
      if (!dream.achievedAt) toast.success('Goal achieved. Well done.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not update the goal');
    }
  };

  return (
    <article className="group surface overflow-hidden">
      <PhotoGallery ids={dream.images || []} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-xl leading-tight font-medium text-slate-900 dark:text-slate-50 [overflow-wrap:anywhere]">{dream.title}</h3>
          <div className="flex shrink-0 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
            <IconBtn label="Edit goal" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="Delete goal" onClick={onDelete} danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
          </div>
        </div>
        <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span>Written {fmt(dream.createdAt)}</span>
          {dream.achievedAt && <span className="font-medium text-[#116329] dark:text-[#56d364]">Achieved {fmt(dream.achievedAt)}</span>}
        </p>

        {dream.content && (
          <MiniMarkdown content={dream.content} onToggleChecklist={toggleCheck} className="mt-3" />
        )}

        {progress.total > 0 && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-[#2da44e] dark:bg-[#2ea043]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{progress.done} of {progress.total} steps done</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/70 dark:border-slate-800 pt-3">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onOpenNotes}>
            <StickyNote className="h-3.5 w-3.5 mr-1.5" /> Notes{notesCount ? ` (${notesCount})` : ''}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-7 text-xs ml-auto', dream.achievedAt && 'text-[#116329] dark:text-[#56d364]')}
            onClick={toggleAchieved}
          >
            {dream.achievedAt ? <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> : <Trophy className="h-3.5 w-3.5 mr-1.5" />}
            {dream.achievedAt ? 'Not achieved yet' : 'Mark achieved'}
          </Button>
        </div>
      </div>
    </article>
  );
}

type SaveDream = (fields: DreamFields, photos: EditablePhoto[], onStep: (text: string) => void) => Promise<void>;

function DreamEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Dream;
  onSave: SaveDream;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [photos, setPhotos] = useState<EditablePhoto[]>(() => (initial?.images || []).map((id) => ({ key: id, id })));
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Give the goal a title');
      return;
    }
    setBusy(true);
    try {
      await onSave({ title: title.trim(), content }, photos, setStep);
    } catch (err: any) {
      toast.error(err?.message || 'Could not save the goal');
    } finally {
      setBusy(false);
      setStep('');
    }
  };

  return (
    <article className="surface overflow-hidden ring-2 ring-clay-500/30">
      <PhotoManager photos={photos} onChange={setPhotos} />


      <div className="p-4 sm:p-5 space-y-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goal title" aria-label="Goal title" className="h-10 font-display text-lg" maxLength={200} autoFocus={!initial} />

        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder={'Why it matters, and the steps to get there.\n- [ ] First step'}
          rows={6}
          ariaLabel="Goal details"
          textareaClassName="min-h-[140px]"
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            {step || 'Save goal'}
          </Button>
        </div>
      </div>
    </article>
  );
}

function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors',
        danger ? 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40' : 'hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100'
      )}
    >
      {children}
    </button>
  );
}
