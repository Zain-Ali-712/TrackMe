import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, AlertTriangle, ChevronRight, Clock, Play } from 'lucide-react';
import { fetchPlans } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PLANS_CHANGED_EVENT, deadlineLabel, relative, nextMoment, planStatus, type Plan } from '@/components/goals/UpcomingPlans';

const URGENT_MS = 3 * 3600000; // under 3 hours left: red warning
const SOON_MS = 24 * 3600000; // under a day left: amber
const MAX_SHOWN = 5;

/** Dashboard box listing the next unfinished plans, flagging the ones about to hit their deadline. */
export default function UpcomingPlansCard() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const load = () =>
      fetchPlans()
        .then((list: Plan[]) => setPlans((list || []).filter((p) => !p.done)))
        .catch(() => setPlans((prev) => prev ?? []));
    load();
    const tick = setInterval(() => setNow(Date.now()), 30000);
    window.addEventListener(PLANS_CHANGED_EVENT, load);
    return () => {
      clearInterval(tick);
      window.removeEventListener(PLANS_CHANGED_EVENT, load);
    };
  }, []);

  const timeOf = (p: Plan) => new Date(nextMoment(p) || 0).getTime();
  const upcoming = (plans || []).slice().sort((a, b) => timeOf(a) - timeOf(b));
  const urgentCount = upcoming.filter((p) => timeOf(p) - now < URGENT_MS).length;

  const openPlansTab = () => {
    try {
      localStorage.setItem('trackme_goals_tab', 'plans');
    } catch {
      /* optional */
    }
  };

  return (
    <section className="surface flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-4">
        <div>
          <h3 className="font-display text-xl font-medium text-slate-900 dark:text-slate-50">Upcoming plans</h3>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Next starts and end times you set</p>
        </div>
        <span
          className={cn(
            'text-[11px] font-semibold min-w-[1.5rem] h-6 px-2 flex items-center justify-center gap-1 rounded-md tabular-nums',
            urgentCount > 0
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              : 'bg-clay-50 text-clay-700 dark:bg-clay-950/50 dark:text-clay-300'
          )}
          title={urgentCount > 0 ? `${urgentCount} due within 3 hours` : undefined}
        >
          {urgentCount > 0 && <AlertTriangle className="h-3 w-3" />}
          {upcoming.length}
        </span>
      </div>

      <div className="border-t border-slate-200/70 dark:border-slate-800">
        {plans === null ? (
          <div className="p-6 text-center text-[13px] text-slate-400" aria-busy="true">Loading plans</div>
        ) : upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-7 text-center">
            <span className="grid place-items-center h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
              <AlarmClock className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">No upcoming plans</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[220px]">Add one from Goals, Upcoming Plans.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200/60 dark:divide-slate-800">
            {upcoming.slice(0, MAX_SHOWN).map((plan) => {
              const left = timeOf(plan) - now;
              const urgent = left < URGENT_MS;
              const soon = !urgent && left < SOON_MS;
              const status = planStatus(plan, now);
              const when =
                status === 'not_started'
                  ? 'Start it now!'
                  : status === 'overdue'
                    ? 'Overdue'
                    : status === 'scheduled'
                      ? `Starts in ${relative(left)}${urgent ? '!' : ''}`
                      : plan.deadline
                        ? `Ongoing · ends in ${relative(left)}${urgent ? '!' : ''}`
                        : 'Ongoing · end time not set';
              return (
                <li
                  key={plan._id}
                  className={cn('px-5 sm:px-6 py-3 flex items-center gap-3', urgent && 'bg-rose-50/80 dark:bg-rose-950/25')}
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                      urgent
                        ? 'bg-rose-600 text-white dark:bg-rose-500'
                        : soon
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    )}
                  >
                    {urgent ? <AlertTriangle className="h-4 w-4" /> : status === 'ongoing' ? <Play className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[13px] font-semibold truncate', urgent ? 'text-rose-800 dark:text-rose-200' : 'text-slate-900 dark:text-slate-50')}>
                      {plan.title}
                    </p>
                    <p
                      className={cn(
                        'text-xs truncate tabular-nums',
                        urgent ? 'text-rose-600 dark:text-rose-400 font-medium' : soon ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                      )}
                    >
                      {when}
                      {nextMoment(plan) && ` · ${deadlineLabel(nextMoment(plan) as string)}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {upcoming.length > MAX_SHOWN && (
          <p className="px-5 sm:px-6 pb-3 text-[11.5px] text-slate-500 dark:text-slate-400">+{upcoming.length - MAX_SHOWN} more</p>
        )}
      </div>

      <Link
        to="/dashboard/goals"
        onClick={openPlansTab}
        className="flex items-center justify-center gap-1 px-4 py-3 text-xs font-medium text-clay-700 dark:text-clay-300 border-t border-slate-200/70 dark:border-slate-800 hover:bg-clay-50/60 dark:hover:bg-clay-950/20 transition-colors"
      >
        All plans
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
