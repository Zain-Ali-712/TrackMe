import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, MapPin, Plus, Trash2, Coffee, Trophy, Flame, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { fetchDailyGoals, createDailyGoal, updateDailyGoal, deleteDailyGoal } from '@/lib/api';
import { isBreakDay } from '@/lib/habitScoring';
import { useChartTheme, ChartTooltipCard } from '@/lib/chartTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import DailyHistory from './DailyHistory';
import { LOCATIONS, todayStr, yesterdayStr, addDays, longDate, shortDate, formatTime, DONE_CLASSES } from './goalUtils';

interface DailyGoal {
  _id: string;
  date: string;
  text: string;
  time: string;
  location: string;
  done: boolean;
}

const sortGoals = (a: DailyGoal, b: DailyGoal) =>
  (a.time || '99:99').localeCompare(b.time || '99:99') || a.text.localeCompare(b.text);

export default function DailyGoals() {
  const theme = useChartTheme();
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(todayStr());
  const [text, setText] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const today = todayStr();
  const yesterday = yesterdayStr();
  const isBreak = isBreakDay(day);

  useEffect(() => {
    fetchDailyGoals()
      .then((res) => setGoals(res.goals || []))
      .catch(() => toast.error('Could not load daily goals'))
      .finally(() => setLoading(false));
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, DailyGoal[]>();
    for (const g of goals) {
      if (!map.has(g.date)) map.set(g.date, []);
      map.get(g.date)!.push(g);
    }
    for (const list of map.values()) list.sort(sortGoals);
    return map;
  }, [goals]);

  const dayGoals = byDate.get(day) || [];
  const doneCount = dayGoals.filter((g) => g.done).length;

  const addGoal = async () => {
    const value = text.trim();
    if (!value || saving) return;
    setSaving(true);
    try {
      const created = await createDailyGoal({ date: day, text: value, time, location });
      setGoals((prev) => [...prev, created]);
      setText('');
      setTime('');
    } catch (err: any) {
      toast.error(err?.message || 'Could not add the goal');
    } finally {
      setSaving(false);
    }
  };

  const toggleGoal = async (goal: DailyGoal) => {
    setGoals((prev) => prev.map((g) => (g._id === goal._id ? { ...g, done: !goal.done } : g)));
    try {
      await updateDailyGoal(goal._id, { done: !goal.done });
    } catch (err: any) {
      setGoals((prev) => prev.map((g) => (g._id === goal._id ? goal : g)));
      toast.error(err?.message || 'Could not update the goal');
    }
  };

  const removeGoal = async (goal: DailyGoal) => {
    setGoals((prev) => prev.filter((g) => g._id !== goal._id));
    try {
      await deleteDailyGoal(goal._id);
    } catch (err: any) {
      setGoals((prev) => [...prev, goal]);
      toast.error(err?.message || 'Could not delete the goal');
    }
  };

  // ---------- stats ----------
  const stats = useMemo(() => {
    const dayStats = (date: string) => {
      const list = byDate.get(date) || [];
      return { total: list.length, done: list.filter((g) => g.done).length };
    };
    const window = (days: number) => {
      let total = 0;
      let done = 0;
      for (let i = 1; i <= days; i++) {
        const s = dayStats(addDays(today, -i));
        total += s.total;
        done += s.done;
      }
      return total ? Math.round((done / total) * 100) : 0;
    };
    let perfect30 = 0;
    for (let i = 1; i <= 30; i++) {
      const s = dayStats(addDays(today, -i));
      if (s.total && s.done === s.total) perfect30 += 1;
    }
    // Perfect-day streak: consecutive finished days where every goal was met.
    let streak = 0;
    for (let i = 1; i <= 365; i++) {
      const d = addDays(today, -i);
      if (isBreakDay(d)) continue;
      const s = dayStats(d);
      if (s.total && s.done === s.total) streak += 1;
      else break;
    }
    let best: { date: string; done: number; total: number } | null = null;
    for (const [date, list] of byDate) {
      const done = list.filter((g) => g.done).length;
      if (!done) continue;
      if (!best || done > best.done || (done === best.done && done / list.length > best.done / best.total)) {
        best = { date, done, total: list.length };
      }
    }
    const chart = Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, i - 13);
      const s = dayStats(d);
      return {
        date: d,
        label: shortDate(d).split(',')[0],
        pct: s.total ? Math.round((s.done / s.total) * 100) : 0,
        ...s,
        isBreak: isBreakDay(d),
      };
    });
    return { last7: window(7), last30: window(30), perfect30, streak, best, chart, totalWritten: goals.length };
  }, [byDate, goals.length, today]);

  const pastDates = [...byDate.keys()].filter((d) => d < today && d !== day).sort().reverse();

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Write + check */}
        <section className="surface p-5 sm:p-6 min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-medium text-slate-900 dark:text-slate-50">{longDate(day)}</h2>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isBreak
                  ? 'Break Sunday. Nothing is tracked today.'
                  : dayGoals.length
                  ? `${doneCount} of ${dayGoals.length} met`
                  : 'Write what you will get done today, then tick each one by the end of the day.'}
              </p>
            </div>
            <div role="radiogroup" aria-label="Day" className="flex p-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
              {[{ d: today, label: 'Today' }, { d: yesterday, label: 'Yesterday' }].map((o) => (
                <button
                  key={o.d}
                  role="radio"
                  aria-checked={day === o.d}
                  onClick={() => setDay(o.d)}
                  className={cn(
                    'px-3 h-7 rounded text-xs font-medium transition-colors',
                    day === o.d ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-card' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {isBreak ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-10 text-center">
              <Coffee className="h-6 w-6 text-slate-400" />
              <p className="mt-2 text-[13px] font-medium text-slate-700 dark:text-slate-200">Break day</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Every other Sunday is off. Enjoy it.</p>
            </div>
          ) : (
            <>
              {/* Add */}
              <form
                className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                onSubmit={(e) => {
                  e.preventDefault();
                  addGoal();
                }}
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What will you get done?"
                  aria-label="Goal"
                  className="h-9 text-[13px]"
                  maxLength={500}
                />
                <TimePicker value={time} onChange={setTime} />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  aria-label="Location"
                  className="h-9 rounded-lg border border-input bg-white dark:bg-slate-900 px-2.5 text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-clay-500/70 focus:ring-[3px] focus:ring-clay-500/15"
                >
                  <option value="">Location</option>
                  {LOCATIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <Button type="submit" size="sm" className="h-9 text-xs" disabled={!text.trim() || saving}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </form>

              {/* List */}
              <ul className="mt-4 divide-y divide-slate-200/70 dark:divide-slate-800">
                {loading && <li className="py-6 text-center text-xs text-slate-400">Loading goals</li>}
                {!loading && dayGoals.length === 0 && (
                  <li className="py-8 text-center text-[13px] text-slate-500 dark:text-slate-400">
                    No goals yet for this day.
                  </li>
                )}
                {dayGoals.map((goal) => (
                  <li key={goal._id} className="group flex items-center gap-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleGoal(goal)}
                      aria-label={goal.done ? `Mark "${goal.text}" as not done` : `Mark "${goal.text}" as done`}
                      className={cn(
                        'grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border transition-colors',
                        goal.done ? DONE_CLASSES : 'border-slate-300 dark:border-slate-600 hover:border-slate-500'
                      )}
                    >
                      {goal.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </button>
                    <span className={cn('flex-1 min-w-0 text-[13.5px] [overflow-wrap:anywhere]', goal.done ? 'text-slate-400 line-through decoration-slate-300 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100')}>
                      {goal.text}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {goal.time && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                          <Clock className="h-3 w-3" />{formatTime(goal.time)}
                        </span>
                      )}
                      {goal.location && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-clay-50 dark:bg-clay-950/50 px-1.5 py-0.5 text-[11px] text-clay-700 dark:text-clay-300">
                          <MapPin className="h-3 w-3" />{goal.location}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeGoal(goal)}
                        aria-label={`Delete "${goal.text}"`}
                        className="rounded-md p-1 text-slate-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>

              {dayGoals.length > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-[#2da44e] dark:bg-[#2ea043] transition-[width] duration-500" style={{ width: `${(doneCount / dayGoals.length) * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                    Writing goals ticks itself in Habits (1%). Meeting Goals earns up to 4% from how many you meet.
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        {/* Stats */}
        <section className="surface p-5 sm:p-6 min-w-0">
          <h3 className="font-display text-lg font-medium text-slate-900 dark:text-slate-50">How you're doing</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat icon={Target} label="Last 7 days" value={`${stats.last7}%`} hint="of goals met" />
            <Stat icon={Target} label="Last 30 days" value={`${stats.last30}%`} hint="of goals met" />
            <Stat icon={Flame} label="Perfect streak" value={`${stats.streak}`} hint={stats.streak === 1 ? 'day, all goals met' : 'days, all goals met'} />
            <Stat icon={Trophy} label="Perfect days" value={`${stats.perfect30}`} hint="in the last 30 days" />
          </div>
          {stats.best && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Best day: <span className="font-medium text-slate-800 dark:text-slate-100">{shortDate(stats.best.date)}</span>, {stats.best.done} of {stats.best.total} goals met
            </p>
          )}
          <div className="mt-4 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid {...theme.grid} />
                <XAxis dataKey="label" {...theme.axis} tick={{ ...theme.axis.tick, fontSize: 9.5 }} interval={1} />
                <YAxis {...theme.axis} domain={[0, 100]} unit="%" width={44} tickCount={3} />
                <Tooltip
                  cursor={theme.barCursor}
                  content={({ active, payload }: any) =>
                    active && payload?.length ? (
                      <ChartTooltipCard
                        title={shortDate(payload[0].payload.date)}
                        rows={[{ label: payload[0].payload.isBreak ? 'Break day' : 'Met', value: payload[0].payload.isBreak ? '-' : `${payload[0].payload.done} / ${payload[0].payload.total}` }]}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="pct" radius={[3, 3, 0, 0]} maxBarSize={16}>
                  {stats.chart.map((c) => (
                    <Cell key={c.date} fill={c.pct >= 100 ? (theme.isDark ? '#56d364' : '#116329') : theme.isDark ? '#2ea043' : '#2da44e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Share of each day's goals met, last 14 days. {stats.totalWritten} goals written in total.</p>
        </section>
      </div>

      <DailyHistory dates={pastDates} byDate={byDate} />
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint: string }) {
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

const SELECT_CLASSES =
  'h-9 rounded-lg border border-input bg-white dark:bg-slate-900 px-2.5 text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-clay-500/70 focus:ring-[3px] focus:ring-clay-500/15';

// 5 AM through 11 PM, then midnight to 4 AM for late nights.
const HOURS = [...Array.from({ length: 19 }, (_, i) => i + 5), 0, 1, 2, 3, 4];
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`;

/** Pick an hour, then :00 or :30. Stores "HH:MM" (24-hour). */
export function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value ? value.split(':') : ['', ''];
  const setHour = (hour: string) => onChange(hour === '' ? '' : `${hour.padStart(2, '0')}:${m || '00'}`);
  const setMinute = (minute: string) => h && onChange(`${h}:${minute}`);

  return (
    <div className="flex items-center gap-1">
      <select value={h ? String(Number(h)) : ''} onChange={(e) => setHour(e.target.value)} aria-label="Hour" className={cn(SELECT_CLASSES, 'w-full sm:w-[92px]')}>
        <option value="">Time</option>
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>{hourLabel(hour)}</option>
        ))}
      </select>
      {h && (
        <div role="radiogroup" aria-label="Minutes" className="flex h-9 shrink-0 rounded-lg border border-input p-0.5">
          {['00', '30'].map((minute) => (
            <button
              key={minute}
              type="button"
              role="radio"
              aria-checked={m === minute}
              onClick={() => setMinute(minute)}
              className={cn(
                'px-2 rounded-md text-xs font-medium tabular-nums transition-colors',
                m === minute ? 'bg-clay-600 text-white dark:bg-clay-500 dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              :{minute}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

