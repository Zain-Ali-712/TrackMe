import { useEffect, useState } from 'react';
import { Plus, Check, Pencil, Trash2, Lock, AlarmClock, Loader2, RotateCcw, Play, ArrowRight, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchPlans, createPlan, updatePlan, deletePlan } from '@/lib/api';
import { MiniMarkdown, toggleChecklistLine, checklistProgress } from '@/lib/miniMarkdown';
import RichTextEditor from '@/components/common/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TimePicker } from './DailyGoals';
import { addDays, todayStr, DONE_CLASSES } from './goalUtils';

export interface Plan {
  _id: string;
  title: string;
  content: string;
  startAt?: string;
  startedAt?: string;
  /** End time; null only for plans made before start/end times, until it is set once. */
  deadline: string | null;
  done: boolean;
  doneAt?: string;
  createdAt?: string;
}

/** Fired after any plan changes so the app-wide lock can re-check. */
export const PLANS_CHANGED_EVENT = 'trackme:plans-changed';
const announce = () => window.dispatchEvent(new Event(PLANS_CHANGED_EVENT));

const ms = (iso?: string | null) => (iso ? new Date(iso).getTime() : NaN);

/** Why a plan locks the app right now, or null. Mirrors planLockReason on the server. */
export function planLockReason(plan: Plan, now = Date.now()): 'overdue' | 'not_started' | null {
  if (plan.done) return null;
  if (plan.deadline && ms(plan.deadline) <= now) return 'overdue';
  if (!plan.startedAt && plan.startAt && ms(plan.startAt) <= now) return 'not_started';
  return null;
}

export type PlanStatus = 'scheduled' | 'not_started' | 'ongoing' | 'overdue' | 'done' | 'done_late';

export function planStatus(plan: Plan, now = Date.now()): PlanStatus {
  if (plan.done) return plan.deadline && plan.doneAt && ms(plan.doneAt) > ms(plan.deadline) ? 'done_late' : 'done';
  const lock = planLockReason(plan, now);
  if (lock) return lock;
  return plan.startedAt ? 'ongoing' : 'scheduled';
}

/** The next moment that matters: the start until it's started, then the end. */
export const nextMoment = (plan: Plan) => (!plan.startedAt && plan.startAt ? plan.startAt : plan.deadline || plan.startAt || null);

export const deadlineLabel = (iso: string) =>
  new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function relative(span: number) {
  const mins = Math.round(Math.abs(span) / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ${mins % 60 ? `${mins % 60}m` : ''}`.trim();
  return `${Math.floor(hours / 24)} days`;
}

const toLocalDate = (date: string, time: string) => {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
};

const DATE_INPUT =
  'h-9 rounded-lg border border-input bg-white dark:bg-slate-900 px-2.5 text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-clay-500/70 focus:ring-[3px] focus:ring-clay-500/15 disabled:opacity-50';

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

  const save = async (plan: Plan, data: { title?: string; content?: string; done?: boolean; started?: boolean; deadline?: string }) => {
    const stamp = new Date().toISOString();
    replace({
      ...plan,
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.deadline !== undefined && { deadline: data.deadline }),
      ...(data.started !== undefined && { startedAt: data.started ? plan.startedAt || stamp : undefined }),
      ...(data.done !== undefined && { done: data.done, doneAt: data.done ? stamp : undefined, startedAt: plan.startedAt || (data.done ? stamp : undefined) }),
    });
    try {
      replace(await updatePlan(plan._id, data));
      if (data.done !== undefined || data.started !== undefined || data.deadline !== undefined) announce();
      return true;
    } catch (err: any) {
      replace(plan);
      toast.error(err?.message || 'Could not update the plan');
      return false;
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

  const active = plans.filter((p) => !p.done).sort((a, b) => ms(nextMoment(a)) - ms(nextMoment(b)));
  const blocking = active.filter((p) => planLockReason(p, now));
  const shown = locked ? blocking : active;
  const done = plans.filter((p) => p.done).sort((a, b) => ms(b.doneAt) - ms(a.doneAt));
  const count = (s: PlanStatus) => plans.filter((p) => planStatus(p, now) === s).length;
  const notStarted = blocking.filter((p) => planLockReason(p, now) === 'not_started').length;
  const overdue = blocking.length - notStarted;

  return (
    <div className="space-y-5">
      {locked && blocking.length > 0 && (
        <div role="alert" className="surface border-rose-300/80 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-4 sm:p-5 flex gap-3">
          <Lock className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div>
            <p className="font-display text-lg font-medium text-rose-900 dark:text-rose-100">
              {[overdue && `${overdue} past ${overdue === 1 ? 'its' : 'their'} end time`, notStarted && `${notStarted} not started on time`].filter(Boolean).join(' · ')}
            </p>
            <p className="text-[13px] text-rose-800/80 dark:text-rose-200/80 mt-0.5">
              Everything else is hidden until each plan below is started, or finished if its end time has passed.
            </p>
          </div>
        </div>
      )}

      {!locked && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Pill label="Scheduled" value={count('scheduled')} />
            <Pill label="Ongoing" value={count('ongoing')} tone="clay" />
            <Pill label="Done on time" value={count('done')} tone="green" />
            <Pill label="Done late" value={count('done_late')} tone="rose" />
          </div>
          {!creating && (
            <Button size="sm" className="h-9 text-xs" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" /> New plan
            </Button>
          )}
        </div>
      )}

      {creating && !locked && (
        <PlanEditor
          onCancel={() => setCreating(false)}
          onSaved={(plan) => {
            setPlans((list) => [...list, plan]);
            setCreating(false);
            announce();
          }}
        />
      )}

      {shown.length === 0 && !creating && (
        <p className="surface p-10 text-center text-[13px] text-slate-500 dark:text-slate-400">
          No upcoming plans. Add what you mean to do, with a start and an end time you'll be held to.
        </p>
      )}

      <div className={cn('grid gap-4 items-start', !locked && 'md:grid-cols-2')}>
        {shown.map((plan) =>
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
              onStart={() => save(plan, { started: true })}
              onDone={() => save(plan, { done: true })}
              onSetEnd={(deadline) => save(plan, { deadline })}
              onEdit={() => setEditingId(plan._id)}
              onDelete={() => remove(plan)}
            />
          )
        )}
      </div>

      {!locked && done.length > 0 && (
        <section className="surface p-5">
          <h3 className="font-display text-lg font-medium text-slate-900 dark:text-slate-50">Recently done</h3>
          <ul className="mt-3 grid gap-x-6 md:grid-cols-2">
            {done.map((plan) => {
              const late = planStatus(plan, now) === 'done_late';
              return (
                <li key={plan._id} className="group flex items-start gap-2.5 border-b border-slate-200/70 dark:border-slate-800 py-2.5">
                  <span className={cn('mt-[2px] grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border', DONE_CLASSES)}>
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] text-slate-700 dark:text-slate-200 [overflow-wrap:anywhere]">{plan.title}</span>
                    <span className={cn('block text-[11px]', late ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500')}>
                      {late ? 'Done late' : 'Done on time'}
                      {plan.doneAt && ` · ${deadlineLabel(plan.doneAt)}`}
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
        </section>
      )}
    </div>
  );
}

function Pill({ label, value, tone }: { label: string; value: number; tone?: 'clay' | 'green' | 'rose' }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[12px] text-slate-600 dark:text-slate-300">
      {label}
      <span
        className={cn(
          'font-display text-[15px] leading-none tabular-nums',
          tone === 'clay' ? 'text-clay-700 dark:text-clay-300' : tone === 'green' ? 'text-[#116329] dark:text-[#56d364]' : tone === 'rose' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-50'
        )}
      >
        {value}
      </span>
    </span>
  );
}

const STATUS_STYLE: Record<PlanStatus, string> = {
  scheduled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  not_started: 'bg-rose-600 text-white dark:bg-rose-500',
  ongoing: 'bg-clay-100 text-clay-800 dark:bg-clay-500/15 dark:text-clay-300',
  overdue: 'bg-rose-600 text-white dark:bg-rose-500',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  done_late: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
};

function statusText(plan: Plan, status: PlanStatus, now: number) {
  switch (status) {
    case 'scheduled':
      return plan.startAt ? `Starts in ${relative(ms(plan.startAt) - now)}` : 'Scheduled';
    case 'not_started':
      return `Not started · ${relative(now - ms(plan.startAt))} late`;
    case 'ongoing':
      return plan.deadline ? `Ongoing · ends in ${relative(ms(plan.deadline) - now)}` : 'Ongoing';
    case 'overdue':
      return `Overdue by ${relative(now - ms(plan.deadline))}`;
    default:
      return status === 'done' ? 'Done' : 'Done late';
  }
}

function PlanCard({
  plan,
  now,
  onToggleCheck,
  onStart,
  onDone,
  onSetEnd,
  onEdit,
  onDelete,
}: {
  plan: Plan;
  now: number;
  onToggleCheck: (line: number) => void;
  onStart: () => void;
  onDone: () => void;
  onSetEnd: (deadline: string) => Promise<boolean>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = planStatus(plan, now);
  const blocking = status === 'not_started' || status === 'overdue';
  const progress = checklistProgress(plan.content);
  const started = !!plan.startedAt;
  const span = plan.deadline && plan.startAt ? ms(plan.deadline) - ms(plan.startAt) : 0;
  const elapsed = span > 0 ? Math.min(100, Math.max(0, ((now - ms(plan.startAt)) / span) * 100)) : 0;

  return (
    <article className={cn('surface group flex flex-col p-5 sm:p-6', blocking && 'border-rose-300 dark:border-rose-900 ring-1 ring-rose-200/70 dark:ring-rose-900/50')}>
      <header className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_STYLE[status])}>
            {status === 'ongoing' ? <Play className="h-3 w-3" /> : <AlarmClock className="h-3 w-3" />}
            {statusText(plan, status, now)}
          </span>
          <h3 className="mt-2 font-display text-xl font-medium leading-snug text-slate-900 dark:text-slate-50 [overflow-wrap:anywhere]">{plan.title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
          <button type="button" onClick={onEdit} aria-label={`Edit "${plan.title}"`} title="Edit text" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {!blocking && (
            <button type="button" onClick={onDelete} aria-label={`Delete "${plan.title}"`} title="Delete" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-600 dark:text-slate-300">
          <span className={cn(status === 'not_started' && 'text-rose-600 dark:text-rose-400 font-medium')}>
            <span className="text-slate-400 dark:text-slate-500">Start </span>
            {plan.startAt ? deadlineLabel(plan.startAt) : '—'}
          </span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className={cn(status === 'overdue' && 'text-rose-600 dark:text-rose-400 font-medium')}>
            <span className="text-slate-400 dark:text-slate-500">End </span>
            {plan.deadline ? deadlineLabel(plan.deadline) : <span className="text-amber-700 dark:text-amber-400">not set yet</span>}
          </span>
        </div>
        {started && span > 0 && (
          <div className="mt-2 h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden" title={`${Math.round(elapsed)}% of the time used`}>
            <div className={cn('h-full rounded-full', elapsed >= 100 ? 'bg-rose-500' : elapsed > 75 ? 'bg-amber-500' : 'bg-clay-500')} style={{ width: `${elapsed}%` }} />
          </div>
        )}
        {plan.startedAt && <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">Started {deadlineLabel(plan.startedAt)}</p>}
      </div>

      {!plan.deadline && <SetEndTime plan={plan} onSave={onSetEnd} />}

      {plan.content.trim() && <MiniMarkdown content={plan.content} onToggleChecklist={onToggleCheck} className="mt-4" />}

      <footer className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11.5px] tabular-nums text-slate-500 dark:text-slate-400">{progress.total > 0 && `${progress.done}/${progress.total} steps`}</span>
        <div className="flex gap-2">
          {!started && (
            <Button size="sm" className={cn('h-8 text-xs', status === 'not_started' && 'bg-rose-600 hover:bg-rose-700 text-white')} onClick={onStart}>
              <Play className="h-3.5 w-3.5 mr-1" /> Mark started
            </Button>
          )}
          <Button
            size="sm"
            variant={started ? 'default' : 'outline'}
            className={cn('h-8 text-xs', status === 'overdue' && 'bg-rose-600 hover:bg-rose-700 text-white')}
            onClick={onDone}
          >
            <Check className="h-3.5 w-3.5 mr-1" strokeWidth={2.5} /> Mark done
          </Button>
        </div>
      </footer>
    </article>
  );
}

/** For plans made before start/end times: set the end time once. */
function SetEndTime({ plan, onSave }: { plan: Plan; onSave: (deadline: string) => Promise<boolean> }) {
  const [date, setDate] = useState(addDays(todayStr(), 1));
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!date || !time) return toast.error('Pick the end date and time');
    const end = toLocalDate(date, time);
    if (end.getTime() <= Date.now() || (plan.startAt && end.getTime() <= ms(plan.startAt))) {
      return toast.error('The end time has to be in the future and after the start');
    }
    if (!window.confirm(`End time: ${deadlineLabel(end.toISOString())}.\n\nIt can't be changed afterwards. Save it?`)) return;
    setBusy(true);
    await onSave(end.toISOString());
    setBusy(false);
  };

  return (
    <div className="mt-3 rounded-xl border border-amber-300/70 bg-amber-50/70 dark:border-amber-800/60 dark:bg-amber-950/20 p-3">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-800 dark:text-amber-300">
        <CalendarClock className="h-3.5 w-3.5" /> This plan needs an end time (set once, can't be changed)
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input type="date" value={date} min={todayStr()} onChange={(e) => setDate(e.target.value)} aria-label="End date" className={DATE_INPUT} />
        <TimePicker value={time} onChange={setTime} />
        <Button size="sm" className="h-9 text-xs" onClick={submit} disabled={busy}>
          {busy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Set end time
        </Button>
      </div>
    </div>
  );
}

function PlanEditor({ initial, onCancel, onSaved }: { initial?: Plan; onCancel: () => void; onSaved: (plan: Plan) => void }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [startNow, setStartNow] = useState(false);
  const [startDate, setStartDate] = useState(todayStr());
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState(addDays(todayStr(), 1));
  const [endTime, setEndTime] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return toast.error('Give the plan a heading');
    setBusy(true);
    try {
      if (initial) {
        onSaved(await updatePlan(initial._id, { title: title.trim(), content }));
        return;
      }
      if (!startNow && (!startDate || !startTime)) throw new Error('Pick when you will start, or choose "Starting now"');
      if (!endDate || !endTime) throw new Error('Pick when it should be finished');
      const start = startNow ? new Date() : toLocalDate(startDate, startTime);
      const end = toLocalDate(endDate, endTime);
      if (!startNow && start.getTime() <= Date.now()) throw new Error('The start time has to be in the future, or choose "Starting now"');
      if (end.getTime() <= start.getTime()) throw new Error('The end time has to be after the start time');
      const msg = `Start: ${startNow ? 'now' : deadlineLabel(start.toISOString())}\nEnd: ${deadlineLabel(end.toISOString())}\n\nThese times can't be changed later. The app locks if the start passes before you mark it started, or the end passes before it's done. Save the plan?`;
      if (!window.confirm(msg)) {
        setBusy(false);
        return;
      }
      onSaved(await createPlan({ title: title.trim(), content, startNow, startAt: startNow ? undefined : start.toISOString(), deadline: end.toISOString() }));
    } catch (err: any) {
      toast.error(err?.message || 'Could not save the plan');
      setBusy(false);
    }
  };

  return (
    <article className="surface p-5 sm:p-6 space-y-3 md:col-span-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Plan heading" aria-label="Plan heading" className="h-10 font-display text-lg" maxLength={200} autoFocus />

      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder={'What exactly needs doing.\n- [ ] First step'}
        rows={5}
        ariaLabel="Plan details"
        textareaClassName="min-h-[120px]"
      />

      {initial ? (
        <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          <Lock className="h-3.5 w-3.5" /> Times are fixed: {initial.startAt ? deadlineLabel(initial.startAt) : '—'} → {initial.deadline ? deadlineLabel(initial.deadline) : 'end not set'}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">Start</p>
              <label className="flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} className="h-3.5 w-3.5 accent-clay-600" />
                Starting now
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={startDate} min={todayStr()} disabled={startNow} onChange={(e) => setStartDate(e.target.value)} aria-label="Start date" className={DATE_INPUT} />
              {!startNow && <TimePicker value={startTime} onChange={setStartTime} />}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3">
            <p className="mb-2 text-[12px] font-medium text-slate-600 dark:text-slate-300">End</p>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={endDate} min={todayStr()} onChange={(e) => setEndDate(e.target.value)} aria-label="End date" className={DATE_INPUT} />
              <TimePicker value={endTime} onChange={setEndTime} />
            </div>
          </div>
          <p className="sm:col-span-2 text-[11.5px] text-slate-500 dark:text-slate-400">
            Both times are fixed once saved. Mark the plan started by its start time and done by its end time, or the app locks until you do.
          </p>
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
