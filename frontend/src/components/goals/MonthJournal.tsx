import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Trash2, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { createAchievement, updateAchievement, deleteAchievement, saveMonthlyJournal } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { shortDate, todayStr } from './goalUtils';

export interface Achievement {
  _id: string;
  month: string;
  date: string;
  title: string;
  details: string;
  detailsUpdatedAt?: string;
}
export interface MonthlyJournalEntry {
  month: string;
  content: string;
  updatedAt?: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Keeps a text value in sync with the server: saves shortly after typing stops, and on blur. */
function useAutosave(initial: string, save: (value: string) => Promise<unknown>) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<SaveState>('idle');
  const saved = useRef(initial);
  const latest = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = async () => {
    clearTimeout(timer.current);
    const next = latest.current;
    if (next === saved.current) return;
    setState('saving');
    try {
      await saveRef.current(next);
      saved.current = next;
      setState(latest.current === next ? 'saved' : 'idle');
    } catch (err: any) {
      setState('error');
      toast.error(err?.message || 'Could not save');
    }
  };

  const change = (next: string) => {
    setValue(next);
    latest.current = next;
    setState('idle');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  };

  // Don't lose the last few keystrokes when the editor closes.
  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return { value, change, flush, state };
}

const editedLabel = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';

function SaveStatus({ state, editedAt }: { state: SaveState; editedAt?: string }) {
  const text =
    state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : state === 'error' ? 'Not saved' : editedAt ? `Last edited ${editedLabel(editedAt)}` : '';
  return (
    <span aria-live="polite" className={cn('text-[11px]', state === 'error' ? 'text-rose-600' : 'text-slate-400 dark:text-slate-500')}>
      {text}
    </span>
  );
}

/* --------------------------------- Journal --------------------------------- */

export function JournalEditor({
  month,
  journal,
  onSaved,
  rows = 12,
  autoFocus
}: {
  month: string;
  journal: MonthlyJournalEntry | null;
  onSaved: (journal: MonthlyJournalEntry) => void;
  rows?: number;
  autoFocus?: boolean;
}) {
  const { value, change, flush, state } = useAutosave(journal?.content || '', async (content) => {
    const saved = await saveMonthlyJournal(month, content);
    onSaved(saved);
  });
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div>
      <Textarea
        value={value}
        onChange={(e) => change(e.target.value)}
        onBlur={flush}
        rows={rows}
        autoFocus={autoFocus}
        maxLength={50000}
        aria-label="Monthly journal"
        placeholder="How did this month go? What went well, what didn't, what you learned, what to change next month…"
        className="text-[13.5px] leading-relaxed resize-y"
      />
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <SaveStatus state={state} editedAt={journal?.updatedAt} />
        <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">{words} {words === 1 ? 'word' : 'words'}</span>
      </div>
    </div>
  );
}

/* ------------------------------- Achievements ------------------------------- */

export function AchievementList({
  achievements,
  onChange,
  canAdd
}: {
  achievements: Achievement[];
  onChange: (update: (list: Achievement[]) => Achievement[]) => void;
  canAdd?: boolean;
}) {
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const add = async () => {
    const value = title.trim();
    if (!value || adding) return;
    setAdding(true);
    try {
      const created: Achievement = await createAchievement({ title: value, date: todayStr() });
      onChange((list) => [created, ...list]);
      setTitle('');
      setOpenId(created._id);
    } catch (err: any) {
      toast.error(err?.message || 'Could not add the achievement');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (a: Achievement) => {
    if (!window.confirm(`Delete "${a.title}" and its notes?`)) return;
    onChange((list) => list.filter((x) => x._id !== a._id));
    try {
      await deleteAchievement(a._id);
    } catch (err: any) {
      onChange((list) => [...list, a].sort((x, y) => y.date.localeCompare(x.date)));
      toast.error(err?.message || 'Could not delete the achievement');
    }
  };

  return (
    <div>
      {canAdd && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Something worth remembering today" aria-label="Achievement" className="h-9 text-[13px]" maxLength={300} />
          <Button type="submit" size="sm" className="h-9 text-xs" disabled={!title.trim() || adding}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </form>
      )}

      <ul className={cn('space-y-2', canAdd && 'mt-4')}>
        {achievements.length === 0 && (
          <li className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
            {canAdd ? 'No achievements yet this month. Add one when something big happens.' : 'No achievements this month.'}
          </li>
        )}
        {achievements.map((a) => (
          <AchievementItem
            key={a._id}
            achievement={a}
            open={openId === a._id}
            onToggle={() => setOpenId((id) => (id === a._id ? null : a._id))}
            onSaved={(next) => onChange((list) => list.map((x) => (x._id === next._id ? next : x)))}
            onDelete={() => remove(a)}
          />
        ))}
      </ul>
    </div>
  );
}

function AchievementItem({
  achievement: a,
  open,
  onToggle,
  onSaved,
  onDelete
}: {
  achievement: Achievement;
  open: boolean;
  onToggle: () => void;
  onSaved: (a: Achievement) => void;
  onDelete: () => void;
}) {
  const preview = a.details.trim().split('\n')[0];
  return (
    <li className={cn('group rounded-xl border transition-colors', open ? 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-850' : 'border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700')}>
      <div className="flex items-center gap-2 pr-1.5">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex flex-1 min-w-0 items-start gap-2.5 px-3 py-2.5 text-left">
          <Award className="mt-[1px] h-4 w-4 shrink-0 text-clay-600 dark:text-clay-400" />
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] font-medium text-slate-800 dark:text-slate-100 [overflow-wrap:anywhere]">{a.title}</span>
            <span className="mt-0.5 block text-[11.5px] text-slate-500 dark:text-slate-400">
              {shortDate(a.date)}
              {!open && preview && <span className="text-slate-400 dark:text-slate-500"> · {preview.length > 70 ? `${preview.slice(0, 70)}…` : preview}</span>}
            </span>
          </span>
          <ChevronDown className={cn('mt-[2px] h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete "${a.title}"`}
          className="rounded-md p-1 text-slate-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && <AchievementDetails achievement={a} onSaved={onSaved} />}
    </li>
  );
}

function AchievementDetails({ achievement: a, onSaved }: { achievement: Achievement; onSaved: (a: Achievement) => void }) {
  const { value, change, flush, state } = useAutosave(a.details, async (details) => {
    onSaved(await updateAchievement(a._id, { details }));
  });
  return (
    <div className="px-3 pb-3">
      <Textarea
        value={value}
        onChange={(e) => change(e.target.value)}
        onBlur={flush}
        rows={5}
        autoFocus={!a.details}
        maxLength={20000}
        aria-label={`Notes for "${a.title}"`}
        placeholder="What happened, how it felt, what it took to get here…"
        className="text-[13px] resize-y"
      />
      <div className="mt-1.5">
        <SaveStatus state={state} editedAt={a.detailsUpdatedAt} />
      </div>
    </div>
  );
}
