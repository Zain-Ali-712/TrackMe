import { useEffect, useState } from 'react';
import { Check, Plus, Trash2, Zap, Trophy, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchMonthlyGoals, createMonthlyGoal, updateMonthlyGoal, deleteMonthlyGoal } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { monthLabel, DONE_CLASSES } from './goalUtils';

interface MonthlyGoal {
  _id: string;
  month: string;
  text: string;
  done: boolean;
}
interface AutoGoal {
  key: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  done: boolean;
}
interface MonthData {
  month: string;
  goals: MonthlyGoal[];
  auto: AutoGoal[];
}

const rateOf = (m: MonthData) => {
  const total = m.goals.length + m.auto.length;
  const done = m.goals.filter((g) => g.done).length + m.auto.filter((a) => a.done).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
};

export default function MonthlyGoals() {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMonthlyGoals(6)
      .then((res) => setMonths(res.months || []))
      .catch(() => toast.error('Could not load monthly goals'))
      .finally(() => setLoading(false));
  }, []);

  const current = months[0];
  const previous = months.slice(1).filter((m) => m.goals.length > 0 || m.auto.some((a) => a.current > 0));

  const setCurrentGoals = (update: (goals: MonthlyGoal[]) => MonthlyGoal[]) =>
    setMonths((prev) => prev.map((m, i) => (i === 0 ? { ...m, goals: update(m.goals) } : m)));

  const addGoal = async () => {
    const value = text.trim();
    if (!value || !current || saving) return;
    setSaving(true);
    try {
      const created = await createMonthlyGoal({ month: current.month, text: value });
      setCurrentGoals((goals) => [...goals, created]);
      setText('');
    } catch (err: any) {
      toast.error(err?.message || 'Could not add the goal');
    } finally {
      setSaving(false);
    }
  };

  const toggleGoal = async (goal: MonthlyGoal) => {
    setCurrentGoals((goals) => goals.map((g) => (g._id === goal._id ? { ...g, done: !goal.done } : g)));
    try {
      await updateMonthlyGoal(goal._id, { done: !goal.done });
    } catch (err: any) {
      setCurrentGoals((goals) => goals.map((g) => (g._id === goal._id ? goal : g)));
      toast.error(err?.message || 'Could not update the goal');
    }
  };

  const removeGoal = async (goal: MonthlyGoal) => {
    setCurrentGoals((goals) => goals.filter((g) => g._id !== goal._id));
    try {
      await deleteMonthlyGoal(goal._id);
    } catch (err: any) {
      setCurrentGoals((goals) => [...goals, goal]);
      toast.error(err?.message || 'Could not delete the goal');
    }
  };

  if (loading || !current) {
    return <div className="surface p-10 text-center text-[13px] text-slate-500 dark:text-slate-400" aria-busy="true">Loading monthly goals</div>;
  }

  const currentRate = rateOf(current);
  const bestPrevious = previous.reduce<MonthData | null>((best, m) => (!best || rateOf(m).pct > rateOf(best).pct ? m : best), null);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="surface p-5 sm:p-6 min-w-0">
          <h2 className="font-display text-2xl font-medium text-slate-900 dark:text-slate-50">{monthLabel(current.month)}</h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Your goals for the month, plus targets the app tracks for you.
          </p>

          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addGoal();
            }}
          >
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a goal for this month" aria-label="Monthly goal" className="h-9 text-[13px]" maxLength={500} />
            <Button type="submit" size="sm" className="h-9 text-xs" disabled={!text.trim() || saving}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </form>

          <ul className="mt-4 divide-y divide-slate-200/70 dark:divide-slate-800">
            {current.goals.length === 0 && (
              <li className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">No goals of your own yet this month.</li>
            )}
            {current.goals.map((goal) => (
              <li key={goal._id} className="group flex items-center gap-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleGoal(goal)}
                  aria-label={goal.done ? `Mark "${goal.text}" as not done` : `Mark "${goal.text}" as done`}
                  className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border transition-colors', goal.done ? DONE_CLASSES : 'border-slate-300 dark:border-slate-600 hover:border-slate-500')}
                >
                  {goal.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>
                <span className={cn('flex-1 min-w-0 text-[13.5px] [overflow-wrap:anywhere]', goal.done ? 'text-slate-400 line-through decoration-slate-300 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100')}>
                  {goal.text}
                </span>
                <button
                  type="button"
                  onClick={() => removeGoal(goal)}
                  aria-label={`Delete "${goal.text}"`}
                  className="rounded-md p-1 text-slate-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
            <Zap className="h-3.5 w-3.5 text-clay-600 dark:text-clay-400" /> Tracked automatically
          </h3>
          <div className="mt-2.5 space-y-3">
            {current.auto.map((a) => <AutoGoalRow key={a.key} goal={a} />)}
          </div>
        </section>

        <section className="surface p-5 sm:p-6 min-w-0">
          <h3 className="font-display text-lg font-medium text-slate-900 dark:text-slate-50">This month so far</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatBox icon={Target} label="Goals reached" value={`${currentRate.done}/${currentRate.total}`} hint={`${currentRate.pct}% of all goals`} />
            <StatBox icon={Check} label="Your goals" value={`${current.goals.filter((g) => g.done).length}/${current.goals.length}`} hint="ticked off" />
          </div>
          <h4 className="mt-5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Previous months</h4>
          {previous.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Earlier months will appear here.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {previous.map((m) => {
                const r = rateOf(m);
                return (
                  <li key={m.month}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-200">{monthLabel(m.month)}</span>
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">{r.done}/{r.total} · {r.pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-[#2da44e] dark:bg-[#2ea043]" style={{ width: `${r.pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {bestPrevious && (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Trophy className="h-3.5 w-3.5 text-clay-600 dark:text-clay-400" />
              Best month: <span className="font-medium text-slate-800 dark:text-slate-100">{monthLabel(bestPrevious.month)}</span> ({rateOf(bestPrevious).pct}%)
            </p>
          )}
        </section>
      </div>

      <section>
        <h3 className="font-display text-lg font-medium text-slate-900 dark:text-slate-50 mb-3">History</h3>
        {previous.length === 0 ? (
          <p className="surface p-6 text-center text-[13px] text-slate-500 dark:text-slate-400">Past months will show up here.</p>
        ) : (
          <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
            {previous.map((m) => {
              const r = rateOf(m);
              return (
                <article key={m.month} className="surface mb-4 break-inside-avoid p-4">
                  <header className="flex items-center justify-between gap-2">
                    <h4 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{monthLabel(m.month)}</h4>
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">{r.done}/{r.total}</span>
                  </header>
                  {m.goals.length > 0 && (
                    <ul className="mt-2.5 space-y-1.5">
                      {m.goals.map((g) => (
                        <li key={g._id} className="flex items-start gap-2 text-[12.5px]">
                          <span className={cn('mt-[2px] grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border', g.done ? DONE_CLASSES : 'border-slate-300 dark:border-slate-600')}>
                            {g.done && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          <span className={cn('[overflow-wrap:anywhere]', g.done ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400')}>{g.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 space-y-2 border-t border-slate-200/70 dark:border-slate-800 pt-3">
                    {m.auto.map((a) => <AutoGoalRow key={a.key} goal={a} compact />)}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function AutoGoalRow({ goal, compact }: { goal: AutoGoal; compact?: boolean }) {
  const pct = goal.target ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
  return (
    <div>
      <div className={cn('flex items-baseline justify-between gap-2', compact ? 'text-[11.5px]' : 'text-[13px]')}>
        <span className={cn('flex items-center gap-1.5', goal.done ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300')}>
          {goal.done && <Check className="h-3.5 w-3.5 text-[#116329] dark:text-[#56d364]" strokeWidth={3} />}
          {goal.label}
        </span>
        <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
          {goal.current}{goal.unit === '%' ? '%' : ''} / {goal.target}{goal.unit === '%' ? '%' : ` ${goal.unit}`}
        </span>
      </div>
      <div className={cn('mt-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden', compact ? 'h-1' : 'h-1.5')}>
        <div className={cn('h-full rounded-full transition-[width] duration-500', goal.done ? 'bg-[#116329] dark:bg-[#56d364]' : 'bg-[#2da44e] dark:bg-[#2ea043]')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5 text-clay-600 dark:text-clay-400" />{label}
      </p>
      <p className="font-display text-2xl leading-none mt-2 text-slate-900 dark:text-slate-50 tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{hint}</p>
    </div>
  );
}
