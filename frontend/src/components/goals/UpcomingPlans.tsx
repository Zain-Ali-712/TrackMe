import { useEffect, useRef, useState } from 'react';
import { Plus, Check, Pencil, Trash2, Lock, AlarmClock, Bold, Italic, List, ListChecks, Loader2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchPlans, createPlan, updatePlan, deletePlan } from '@/lib/api';
import { MiniMarkdown, toggleChecklistLine, checklistProgress, applyFormat } from '@/lib/miniMarkdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { TimePicker } from './DailyGoals';
import { addDays, todayStr, DONE_CLASSES } from './goalUtils';

export interface Plan {
  _id: string;
  title: string;
  content: string;
  deadline: string;
  done: boolean;
  doneAt?: string;
  createdAt?: string;
}

/** Fired after any plan changes so the app-wide lock can re-check. */
export const PLANS_CHANGED_EVENT = 'trackme:plans-changed';
const announce = () => window.dispatchEvent(new Event(PLANS_CHANGED_EVENT));

export const isOverdue = (plan: Plan, now = Date.now()) => !plan.done && new Date(plan.deadline).getTime() <= now;

const deadlineLabel = (iso: string) =>
  new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function relative(ms: number) {
  const mins = Math.round(Math.abs(ms) / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ${mins % 60 ? `${mins % 60}m` : ''}`.trim();
  return `${Math.floor(hours / 24)} days`;
}

export default function UpcomingPlans({ locked }: { locked?: boolean }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetchPlans()
      .then((list) => setPlans(list || []))
      .catch(() => toast.error('Could not load plans'))
      .finally(() => setLoading(false));
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  const replace = (next: Plan) => setPlans((list) => list.map((p) => (p._id === next._id ? next : p)));

  const save = async (plan: Plan, data: { title?: string; content?: string; done?: boolean }) => {
    replace({ ...plan, ...data, doneAt: data.done ? new Date().toISOString() : data.done === false ? undefined : plan.doneAt });
    try {
      replace(await updatePlan(plan._id, data));
      if (data.done !== undefined) announce();
    } catch (err: any) {
      replace(plan);
      toast.error(err?.message || 'Could not update the plan');
    }
  };

  const remove = async (plan: Plan) => {
    if (!window.confirm(`Delete "${plan.title}"?`)) return;
    setPlans((list) => list.filter((p) => p._id !== plan._id));
    try {
      await deletePlan(plan._id);
      announce();
    } catch (err: any) {
      setPlans((list) => [...list, plan]);
      toast.error(err?.message || 'Could not delete the plan');
    }
  };

  if (loading) {
    return <div className="surface p-10 text-center text-[13px] text-slate-500 dark:text-slate-400" aria-busy="true">Loading plans</div>;
  }

  const active = plans
    .filter((p) => !p.done)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const overdue = active.filter((p) => isOverdue(p, now));
  const done = plans
    .filter((p) => p.done)
    .sort((a, b) => new Date(b.doneAt || b.deadline).getTime() - new Date(a.doneAt || a.deadline).getTime());

  return (
    <div className="space-y-5">
      {locked && overdue.length > 0 && (
        <div role="alert" className="surface border-rose-300/80 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-4 sm:p-5 flex gap-3">
          <Lock className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div>
            <p className="font-display text-lg font-medium text-rose-900 dark:text-rose-100">
              {overdue.length === 1 ? 'A plan is past its deadline' : `${overdue.length} plans are past their deadline`}
            </p>
            <p className="text-[13px] text-rose-800/80 dark:text-rose-200/80 mt-0.5">
              Everything else is hidden until you finish {overdue.length === 1 ? 'it' : 'them'} and mark {overdue.length === 1 ? 'it' : 'them'} done.
            </p>
          </div>
        </div>
      )}

      <div className={cn('grid gap-5 items-start', !locked && 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]')}>
        <section className="space-y-3 min-w-0">
          {!locked && (
            creating ? (
              <PlanEditor
                onCancel={() => setCreating(false)}
                onSaved={(plan) => {
                  setPlans((list) => [...list, plan]);
                  setCreating(false);
                  announce();
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="surface flex w-full items-center justify-center gap-2 p-4 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-clay-700 dark:hover:text-clay-300 transition-colors"
              >
                <Plus className="h-4 w-4" /> New plan
              </button>
            )
          )}

          {active.length === 0 && !creating && (
            <p className="surface p-8 text-center text-[13px] text-slate-500 dark:text-slate-400">
              No upcoming plans. Add what you mean to get done, with a deadline you'll be held to.
            </p>
          )}

          {(locked ? overdue : active).map((plan) =>
            editingId === plan._id ? (
              <PlanEditor
                key={plan._id}
                initial={plan}
                onCancel={() => setEditingId(null)}
                onSaved={(next) => {
                  replace(next);
                  setEditingId(null);
                }}
              />
            ) : (
              <PlanCard
                key={plan._id}
                plan={plan}
                now={now}
                onToggleCheck={(line) => save(plan, { content: toggleChecklistLine(plan.content, line) })}
                onDone={() => save(plan, { done: true })}
                onEdit={() => setEditingId(plan._id)}
                onDelete={() => remove(plan)}
              />
            )
          )}
        </section>

        {!locked && (
          <section className="surface p-5 min-w-0">
            <h3 className="font-display text-lg font-medium text-slate-900 dark:text-slate-50">How you've kept to plans</h3>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Upcoming" value={active.length - overdue.length} />
              <MiniStat label="Done on time" value={done.filter((p) => p.doneAt && new Date(p.doneAt) <= new Date(p.deadline)).length} />
              <MiniStat label="Done late" value={done.filter((p) => p.doneAt && new Date(p.doneAt) > new Date(p.deadline)).length} />
            </div>
            <h4 className="mt-5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Recently done</h4>
            {done.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Finished plans show up here.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-200/70 dark:divide-slate-800">
                {done.map((plan) => {
                  const late = plan.doneAt && new Date(plan.doneAt) > new Date(plan.deadline);
                  return (
                    <li key={plan._id} className="group flex items-start gap-2.5 py-2">
                      <span className={cn('mt-[2px] grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border', DONE_CLASSES)}>
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] text-slate-700 dark:text-slate-200 [overflow-wrap:anywhere]">{plan.title}</span>
                        <span className={cn('block text-[11px]', late ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500')}>
                          {late ? 'Done late' : 'Done on time'} · due {deadlineLabel(plan.deadline)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => save(plan, { done: false })}
                        title="Mark as not done"
                        aria-label={`Mark "${plan.title}" as not done`}
                        className="rounded-md p-1 text-slate-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-slate-700 dark:hover:text-slate-200 transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 p-2.5">
      <p className="font-display text-2xl leading-none text-slate-900 dark:text-slate-50 tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function PlanCard({
  plan,
  now,
  onToggleCheck,
  onDone,
  onEdit,
  onDelete
}: {
  plan: Plan;
  now: number;
  onToggleCheck: (line: number) => void;
  onDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const left = new Date(plan.deadline).getTime() - now;
  const overdue = left <= 0;
  const soon = !overdue && left < 3 * 3600000;
  const progress = checklistProgress(plan.content);

  return (
    <article className={cn('surface group p-4 sm:p-5', overdue && 'border-rose-300 dark:border-rose-900 ring-1 ring-rose-200/70 dark:ring-rose-900/50')}>
      <header className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-medium leading-snug text-slate-900 dark:text-slate-50 [overflow-wrap:anywhere]">{plan.title}</h3>
          <p
            className={cn(
              'mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px]',
              overdue ? 'text-rose-600 dark:text-rose-400 font-medium' : soon ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            <AlarmClock className="h-3.5 w-3.5" />
            <span>Due {deadlineLabel(plan.deadline)}</span>
            <span aria-hidden>·</span>
            <span>{overdue ? `overdue by ${relative(left)}` : `in ${relative(left)}`}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
          <button type="button" onClick={onEdit} aria-label={`Edit "${plan.title}"`} title="Edit text" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {!overdue && (
            <button type="button" onClick={onDelete} aria-label={`Delete "${plan.title}"`} title="Delete" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      {plan.content.trim() && <MiniMarkdown content={plan.content} onToggleChecklist={onToggleCheck} className="mt-3" />}

      <footer className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[11.5px] tabular-nums text-slate-500 dark:text-slate-400">
          {progress.total > 0 && `${progress.done}/${progress.total} steps`}
        </span>
        <Button size="sm" className={cn('h-8 text-xs', overdue && 'bg-rose-600 hover:bg-rose-700 text-white')} onClick={onDone}>
          <Check className="h-3.5 w-3.5 mr-1" strokeWidth={2.5} /> Mark done
        </Button>
      </footer>
    </article>
  );
}

function PlanEditor({ initial, onCancel, onSaved }: { initial?: Plan; onCancel: () => void; onSaved: (plan: Plan) => void }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [date, setDate] = useState(addDays(todayStr(), 1));
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const format = (kind: 'bold' | 'italic' | 'bullet' | 'check') => {
    const el = areaRef.current;
    if (!el) return;
    const result = applyFormat(content, el.selectionStart, el.selectionEnd, kind);
    setContent(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
  };

  const submit = async () => {
    if (!title.trim()) return toast.error('Give the plan a heading');
    setBusy(true);
    try {
      if (initial) {
        onSaved(await updatePlan(initial._id, { title: title.trim(), content }));
      } else {
        if (!date || !time) throw new Error('Pick a deadline date and time');
        const [y, m, d] = date.split('-').map(Number);
        const [hh, mm] = time.split(':').map(Number);
        const deadline = new Date(y, m - 1, d, hh, mm);
        if (deadline.getTime() <= Date.now()) throw new Error('The deadline has to be in the future');
        const label = deadline.toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        if (!window.confirm(`Deadline: ${label}.\n\nYou won't be able to change it, and the app locks if it passes before you're done. Save the plan?`)) {
          setBusy(false);
          return;
        }
        onSaved(await createPlan({ title: title.trim(), content, deadline: deadline.toISOString() }));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not save the plan');
      setBusy(false);
    }
  };

  return (
    <article className="surface p-4 sm:p-5 space-y-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Plan heading" aria-label="Plan heading" className="h-10 font-display text-lg" maxLength={200} autoFocus />

      <div className="rounded-lg border border-input overflow-hidden focus-within:border-clay-500/70 focus-within:ring-[3px] focus-within:ring-clay-500/15">
        <div className="flex items-center gap-0.5 border-b border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-1.5 py-1">
          <ToolBtn label="Bold" onClick={() => format('bold')}><Bold className="h-3.5 w-3.5" /></ToolBtn>
          <ToolBtn label="Italic" onClick={() => format('italic')}><Italic className="h-3.5 w-3.5" /></ToolBtn>
          <ToolBtn label="Bullet list" onClick={() => format('bullet')}><List className="h-3.5 w-3.5" /></ToolBtn>
          <ToolBtn label="Checklist" onClick={() => format('check')}><ListChecks className="h-3.5 w-3.5" /></ToolBtn>
        </div>
        <Textarea
          ref={areaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={'What exactly needs doing.\n- [ ] First step'}
          rows={5}
          aria-label="Plan details"
          className="border-0 rounded-none focus-visible:ring-0 text-[13px] resize-y min-h-[120px]"
        />
      </div>

      {content.trim() && (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-850 p-3">
          <p className="mb-1.5 text-[10.5px] font-medium text-slate-400">Preview</p>
          <MiniMarkdown content={content} />
        </div>
      )}

      {initial ? (
        <p className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          <Lock className="h-3.5 w-3.5" /> Deadline is fixed: {deadlineLabel(initial.deadline)}
        </p>
      ) : (
        <div>
          <p className="mb-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300">Deadline (can't be changed later)</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Deadline date"
              className="h-9 rounded-lg border border-input bg-white dark:bg-slate-900 px-2.5 text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-clay-500/70 focus:ring-[3px] focus:ring-clay-500/15"
            />
            <TimePicker value={time} onChange={setTime} />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button size="sm" className="h-8 text-xs" onClick={submit} disabled={busy}>
          {busy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
          {initial ? 'Save changes' : 'Save plan'}
        </Button>
      </div>
    </article>
  );
}

function ToolBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50"
    >
      {children}
    </button>
  );
}
