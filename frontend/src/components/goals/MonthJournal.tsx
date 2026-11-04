import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Trash2, Award, Pencil, Loader2, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { createAchievement, updateAchievement, deleteAchievement, saveMonthlyJournal } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/components/common/RichTextEditor';
import { MiniMarkdown, toggleChecklistLine, checklistProgress } from '@/lib/miniMarkdown';
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
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
      <RichTextEditor
        value={value}
        onChange={change}
        onBlur={flush}
        rows={rows}
        autoFocus={autoFocus}
        maxLength={50000}
        ariaLabel="Monthly journal"
        preview="toggle"
        placeholder="How did this month go? What went well, what didn't, what you learned, what to change next month…"
        textareaClassName="text-[13.5px] leading-relaxed"
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
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const replace = (next: Achievement) => onChange((list) => list.map((x) => (x._id === next._id ? next : x)));

  const toggleCheck = async (a: Achievement, line: number) => {
    const details = toggleChecklistLine(a.details, line);
    replace({ ...a, details });
    try {
      replace(await updateAchievement(a._id, { details }));
    } catch (err: any) {
      replace(a);
      toast.error(err?.message || 'Could not update the checklist');
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
    <div className="space-y-2.5">
      {canAdd &&
        (adding ? (
          <AchievementEditor
            onCancel={() => setAdding(false)}
            onSaved={(created) => {
              onChange((list) => [created, ...list]);
              setAdding(false);
              setOpenId(created._id);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-3.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:border-clay-400 hover:text-clay-700 dark:hover:text-clay-300 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add achievement
          </button>
        ))}

      {achievements.length === 0 && !adding && (
        <p className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
          {canAdd ? 'No achievements yet this month. Add one when something big happens.' : 'No achievements this month.'}
        </p>
      )}

      {achievements.map((a) =>
        editingId === a._id ? (
          <AchievementEditor
            key={a._id}
            initial={a}
            onCancel={() => setEditingId(null)}
            onSaved={(next) => {
              replace(next);
              setEditingId(null);
            }}
          />
        ) : (
          <AchievementCard
            key={a._id}
            achievement={a}
            open={openId === a._id}
            onToggle={() => setOpenId((id) => (id === a._id ? null : a._id))}
            onToggleCheck={(line) => toggleCheck(a, line)}
            onEdit={() => {
              setEditingId(a._id);
              setOpenId(a._id);
            }}
            onDelete={() => remove(a)}
          />
        )
      )}
    </div>
  );
}

function AchievementCard({
  achievement: a,
  open,
  onToggle,
  onToggleCheck,
  onEdit,
  onDelete
}: {
  achievement: Achievement;
  open: boolean;
  onToggle: () => void;
  onToggleCheck: (line: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasDetails = !!a.details.trim();
  const progress = checklistProgress(a.details);
  return (
    <article
      className={cn(
        'rounded-xl border bg-white dark:bg-slate-900 transition-colors',
        open ? 'border-slate-300 dark:border-slate-700 shadow-card' : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      )}
    >
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 px-3.5 py-3 text-left">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-clay-50 text-clay-600 dark:bg-clay-500/10 dark:text-clay-400">
          <Award className="h-4 w-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-display text-[15.5px] font-medium leading-snug text-slate-900 dark:text-slate-50 [overflow-wrap:anywhere]">{a.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {shortDate(a.date)}
            </span>
            {progress.total > 0 && <span className="tabular-nums">{progress.done}/{progress.total} done</span>}
            {!hasDetails && <span className="text-slate-400 dark:text-slate-500">No notes yet</span>}
          </span>
        </span>
        <ChevronDown className={cn('mt-1.5 h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-slate-200/70 dark:border-slate-800 px-3.5 pb-3 pt-3">
          {hasDetails ? (
            <MiniMarkdown content={a.details} onToggleChecklist={onToggleCheck} />
          ) : (
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Nothing written about this yet.</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{a.detailsUpdatedAt ? `Notes edited ${editedLabel(a.detailsUpdatedAt)}` : ''}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> {hasDetails ? 'Edit' : 'Write notes'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                onClick={onDelete}
                aria-label={`Delete "${a.title}"`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function AchievementEditor({ initial, onCancel, onSaved }: { initial?: Achievement; onCancel: () => void; onSaved: (a: Achievement) => void }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [details, setDetails] = useState(initial?.details || '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return toast.error('Write the achievement first');
    setBusy(true);
    try {
      onSaved(
        initial
          ? await updateAchievement(initial._id, { title: title.trim(), details })
          : await createAchievement({ title: title.trim(), details, date: todayStr() })
      );
    } catch (err: any) {
      toast.error(err?.message || 'Could not save the achievement');
      setBusy(false);
    }
  };

  return (
    <article className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-3.5 sm:p-4 space-y-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What did you achieve?"
        aria-label="Achievement"
        className="h-10 font-display text-[16px]"
        maxLength={300}
        autoFocus
      />
      <RichTextEditor
        value={details}
        onChange={setDetails}
        placeholder={'What happened, how it felt, what it took to get here…\n- [ ] Anything to follow up'}
        rows={5}
        maxLength={20000}
        ariaLabel="Achievement notes"
        textareaClassName="min-h-[110px]"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11.5px] text-slate-500 dark:text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" />
          {initial ? `Added ${shortDate(initial.date)}` : `Will be dated ${shortDate(todayStr())}`}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            {initial ? 'Save changes' : 'Save achievement'}
          </Button>
        </div>
      </div>
    </article>
  );
}
