import { useState } from 'react';
import { Check, ChevronDown, Clock, MapPin, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, formatTime, todayStr } from './goalUtils';

interface HistoryGoal {
  _id: string;
  date: string;
  text: string;
  time: string;
  location: string;
  done: boolean;
}

const WEEKS_SHOWN = 3;

/** Monday of the week a "YYYY-MM-DD" falls in. */
function weekStart(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay(); // 0 = Sunday
  return addDays(dateStr, day === 0 ? -6 : 1 - day);
}

const parts = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return {
    weekday: date.toLocaleDateString([], { weekday: 'short' }),
    month: date.toLocaleDateString([], { month: 'short' }),
    day: d
  };
};

function weekTitle(start: string) {
  const thisWeek = weekStart(todayStr());
  if (start === thisWeek) return 'This week';
  if (start === addDays(thisWeek, -7)) return 'Last week';
  const a = parts(start);
  const b = parts(addDays(start, 6));
  return a.month === b.month ? `${a.month} ${a.day} – ${b.day}` : `${a.month} ${a.day} – ${b.month} ${b.day}`;
}

const rateColor = (pct: number) =>
  pct === 100 ? 'bg-[#116329] dark:bg-[#56d364]' : pct >= 60 ? 'bg-[#2da44e] dark:bg-[#2ea043]' : pct > 0 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-slate-300 dark:bg-slate-600';

/** Past days' goals, grouped by week, newest first. */
export default function DailyHistory({ dates, byDate }: { dates: string[]; byDate: Map<string, HistoryGoal[]> }) {
  const [showAll, setShowAll] = useState(false);

  const weeks: { start: string; dates: string[] }[] = [];
  for (const date of dates) {
    const start = weekStart(date);
    const last = weeks[weeks.length - 1];
    if (last?.start === start) last.dates.push(date);
    else weeks.push({ start, dates: [date] });
  }
  const shown = showAll ? weeks : weeks.slice(0, WEEKS_SHOWN);

  return (
    <section>
      <h3 className="font-display text-lg font-medium text-slate-900 dark:text-slate-50 mb-3">History</h3>
      {weeks.length === 0 ? (
        <p className="surface p-6 text-center text-[13px] text-slate-500 dark:text-slate-400">Past days will show up here.</p>
      ) : (
        <div className="space-y-6">
          {shown.map((week) => {
            const all = week.dates.flatMap((d) => byDate.get(d) || []);
            const met = all.filter((g) => g.done).length;
            const pct = all.length ? Math.round((met / all.length) * 100) : 0;
            const perfectDays = week.dates.filter((d) => (byDate.get(d) || []).every((g) => g.done)).length;
            return (
              <div key={week.start}>
                <header className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h4 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{weekTitle(week.start)}</h4>
                  <div className="flex items-center gap-2 text-[11.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="h-1.5 w-20 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                      <span className={cn('block h-full rounded-full', rateColor(pct))} style={{ width: `${pct}%` }} />
                    </span>
                    <span>{met}/{all.length} met · {pct}%</span>
                    {perfectDays > 0 && (
                      <span className="inline-flex items-center gap-1 text-[#116329] dark:text-[#56d364]">
                        <Trophy className="h-3 w-3" /> {perfectDays} perfect {perfectDays === 1 ? 'day' : 'days'}
                      </span>
                    )}
                  </div>
                </header>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {week.dates.map((date) => (
                    <DayCard key={date} date={date} goals={byDate.get(date) || []} />
                  ))}
                </div>
              </div>
            );
          })}
          {weeks.length > WEEKS_SHOWN && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="mx-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05]"
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', showAll && 'rotate-180')} />
              {showAll ? 'Show fewer weeks' : `Show ${weeks.length - WEEKS_SHOWN} older ${weeks.length - WEEKS_SHOWN === 1 ? 'week' : 'weeks'}`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function DayCard({ date, goals }: { date: string; goals: HistoryGoal[] }) {
  const done = goals.filter((g) => g.done).length;
  const pct = goals.length ? Math.round((done / goals.length) * 100) : 0;
  const perfect = goals.length > 0 && done === goals.length;
  const p = parts(date);

  return (
    <article className={cn('surface p-3.5 flex flex-col', perfect && 'ring-1 ring-[#2da44e]/30 dark:ring-[#2ea043]/30')}>
      <header className="flex items-center gap-3">
        <div className="w-11 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-center bg-white dark:bg-slate-900">
          <div className={cn('text-[9.5px] font-semibold uppercase tracking-wide py-px text-white', perfect ? 'bg-[#116329] dark:bg-[#2ea043]' : 'bg-slate-500 dark:bg-slate-600')}>
            {p.weekday}
          </div>
          <div className="font-display text-lg leading-7 text-slate-900 dark:text-slate-50 tabular-nums">{p.day}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200">{p.month} {p.day}</span>
            {perfect ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <Trophy className="h-3 w-3" /> All met
              </span>
            ) : (
              <span className="text-[11.5px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">{done}/{goals.length}</span>
            )}
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className={cn('h-full rounded-full', rateColor(pct))} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>

      <ul className="mt-3 space-y-1.5">
        {goals.map((g) => (
          <li
            key={g._id}
            className={cn(
              'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs',
              g.done
                ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/70 border-emerald-200/80 dark:from-emerald-950/40 dark:to-emerald-900/20 dark:border-emerald-800/60'
                : 'bg-slate-50 border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-800'
            )}
          >
            <div className="min-w-0 flex-1">
              <p className={cn('font-medium leading-snug [overflow-wrap:anywhere]', g.done ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-400 dark:text-slate-500')}>
                {g.text}
              </p>
              {(g.time || g.location) && (
                <p className={cn('mt-px flex flex-wrap items-center gap-x-2 text-[10px] tabular-nums', g.done ? 'text-emerald-700/70 dark:text-emerald-300/60' : 'text-slate-400 dark:text-slate-500')}>
                  {g.time && (
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTime(g.time)}
                    </span>
                  )}
                  {g.location && (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {g.location}
                    </span>
                  )}
                </p>
              )}
            </div>
            {g.done ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                <Check className="h-2.5 w-2.5" strokeWidth={3} /> Done
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Missed
              </span>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
