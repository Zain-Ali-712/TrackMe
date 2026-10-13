import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check } from 'lucide-react';
import { fetchLeadStats, fetchMonthHabitData } from '@/lib/api';
import LeadsTrendChart from '@/components/dashboard/LeadsTrendChart';
import UpcomingAppointments from '@/components/dashboard/UpcomingAppointments';
import { cn } from '@/lib/utils';
import { useChartTheme } from '@/lib/chartTheme';
import { STREAK_THRESHOLD } from '@/lib/habitScoring';

type Period = 'week' | 'month';

export default function DashboardHome() {
  const navigate = useNavigate();
  const theme = useChartTheme();
  const [stats, setStats] = useState<any>(null);
  const [habitStats, setHabitStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leadGoalPeriod, setLeadGoalPeriod] = useState<Period>('week');
  const [callGoalPeriod, setCallGoalPeriod] = useState<Period>('week');

  useEffect(() => {
    loadStats();
    const handleLeadCreated = () => loadStats();
    window.addEventListener('leadCreated', handleLeadCreated);
    return () => window.removeEventListener('leadCreated', handleLeadCreated);
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const [leadData, habitData] = await Promise.all([
        fetchLeadStats().catch(err => {
          console.error('Failed to load lead stats', err);
          return null;
        }),
        fetchMonthHabitData(now.getFullYear(), now.getMonth() + 1).catch(err => {
          console.error('Failed to load habit stats', err);
          return null;
        })
      ]);
      setStats(leadData);
      setHabitStats(habitData);
    } catch (error) {
      console.error('Failed to load dashboard stats', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Loading dashboard">
        <div className="h-[116px] bg-slate-200/50 dark:bg-slate-900 rounded-2xl" />
        <div className="h-[220px] bg-slate-200/50 dark:bg-slate-900 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-80 bg-slate-200/50 dark:bg-slate-900 rounded-2xl" />
          <div className="h-80 bg-slate-200/50 dark:bg-slate-900 rounded-2xl" />
        </div>
      </div>
    );
  }

  const leadCurrent = leadGoalPeriod === 'week' ? (stats.leads?.thisWeek ?? 0) : (stats.leads?.thisMonth ?? 0);
  const leadGoal = leadGoalPeriod === 'week' ? (stats.leads?.weekGoal ?? 60) : (stats.leads?.monthGoal ?? 250);
  const callCurrent = callGoalPeriod === 'week' ? (stats.calls?.thisWeek ?? 0) : (stats.calls?.thisMonth ?? 0);
  const callGoal = callGoalPeriod === 'week' ? (stats.calls?.weekGoal ?? 50) : (stats.calls?.monthGoal ?? 200);

  const habitStreak = habitStats?.streakCount ?? 0;
  const todayScore = habitStats?.todayScore ?? 0;
  const todayDone = habitStats?.overallStats?.todayCompletedCount ?? 0;
  const totalHabitsCount = habitStats?.overallStats?.todayTotalHabits ?? (habitStats?.habits?.length ?? 0);

  const headline = [
    { label: 'Total leads', value: stats.leads?.total ?? 0, detail: `${stats.leads?.thisWeek ?? 0} this week, ${stats.leads?.thisMonth ?? 0} this month` },
    { label: 'Cold calls', value: stats.calls?.total ?? 0, detail: `${stats.calls?.thisWeek ?? 0} this week, ${stats.calls?.thisMonth ?? 0} this month` },
    { label: 'Habit streak', value: habitStreak, unit: habitStreak === 1 ? 'day' : 'days', detail: `Days at or above ${STREAK_THRESHOLD}%, Sundays exempt`, to: '/dashboard/habits' },
    { label: "Today's habits", value: todayScore, unit: '%', detail: `${todayDone} of ${totalHabitsCount} done`, to: '/dashboard/habits', accent: true },
  ];

  return (
    <div className="space-y-5">
      {/* Headline numbers */}
      <section className="surface grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-200/70 dark:divide-slate-800 overflow-hidden">
        {headline.map((item) => {
          const body = (
            <>
              <p className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {item.label}
                {item.to && <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </p>
              <p className={cn(
                'font-display text-[34px] leading-none mt-2 tabular-nums',
                item.accent ? 'text-clay-700 dark:text-clay-300' : 'text-slate-900 dark:text-slate-50'
              )}>
                {item.value}
                {item.unit && <span className="text-lg text-slate-400 dark:text-slate-500 ml-1">{item.unit}</span>}
              </p>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2 truncate">{item.detail}</p>
            </>
          );
          return item.to ? (
            <button key={item.label} onClick={() => navigate(item.to!)} className="group text-left px-5 py-4 sm:px-6 sm:py-5 hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.02] transition-colors">
              {body}
            </button>
          ) : (
            <div key={item.label} className="px-5 py-4 sm:px-6 sm:py-5">{body}</div>
          );
        })}
      </section>

      {/* Goals */}
      <section className="surface p-5 sm:p-6" aria-labelledby="goals-heading">
        <h2 id="goals-heading" className="font-display text-xl font-medium text-slate-900 dark:text-slate-50">Goals</h2>
        <div className="mt-5 grid gap-6 lg:grid-cols-3 lg:gap-8">
          <GoalBar
            label="Leads added"
            current={leadCurrent}
            goal={leadGoal}
            unit="leads"
            color={theme.colors.clay}
            period={leadGoalPeriod}
            onPeriodChange={setLeadGoalPeriod}
          />
          <GoalBar
            label="Cold calls"
            current={callCurrent}
            goal={callGoal}
            unit="calls"
            color={theme.colors.blue}
            period={callGoalPeriod}
            onPeriodChange={setCallGoalPeriod}
          />
          <GoalBar
            label="Habit score today"
            current={todayScore}
            goal={STREAK_THRESHOLD}
            unit="%"
            suffix="%"
            color={theme.colors.green}
            caption="Hit the target to keep the streak"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <LeadsTrendChart data={stats.trends || []} />
        </div>
        <div className="lg:col-span-1">
          <UpcomingAppointments appointments={stats.upcomingAppointments || []} />
        </div>
      </div>
    </div>
  );
}

function GoalBar({
  label,
  current,
  goal,
  unit,
  suffix = '',
  color,
  period,
  onPeriodChange,
  caption,
}: {
  label: string;
  current: number;
  goal: number;
  unit: string;
  suffix?: string;
  color: string;
  period?: Period;
  onPeriodChange?: (p: Period) => void;
  caption?: string;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  const done = current >= goal;
  const remaining = Math.max(0, goal - current);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{label}</h3>
        {period && onPeriodChange ? (
          <div role="radiogroup" aria-label={`${label} period`} className="flex p-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
            {(['week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                role="radio"
                aria-checked={period === p}
                onClick={() => onPeriodChange(p)}
                className={cn(
                  'px-2 h-6 rounded text-[11px] font-medium transition-colors',
                  period === p
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-card'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                {p === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 h-6 flex items-center">Today</span>
        )}
      </div>

      <p className="mt-3 flex items-baseline gap-1.5 tabular-nums">
        <span className="font-display text-[32px] leading-none text-slate-900 dark:text-slate-50">{current}{suffix}</span>
        <span className="text-sm text-slate-400 dark:text-slate-500">/ {goal}{suffix}</span>
      </p>

      <div
        className="mt-3 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct}% of goal`}
      >
        <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>

      <p className={cn('mt-2 text-[11.5px] flex items-center gap-1', done ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-400')}>
        {done ? (
          <><Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Goal reached</>
        ) : (
          <>{pct}% there, {remaining}{suffix ? suffix : ` ${unit}`} to go{caption ? `. ${caption}` : ''}</>
        )}
      </p>
    </div>
  );
}
