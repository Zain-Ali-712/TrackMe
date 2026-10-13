import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, Users, PhoneCall, Flame, ListChecks } from 'lucide-react';
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[168px] bg-slate-200/50 dark:bg-slate-900 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[200px] bg-slate-200/50 dark:bg-slate-900 rounded-2xl" />)}
        </div>
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

  const trends: { date: string; leads: number; calls: number }[] = stats.trends || [];

  // Last 7 days of habit scores, ending today
  const todayDay = new Date().getDate();
  const recentHabitDays: any[] = (habitStats?.dailyStats || [])
    .filter((d: any) => d.day <= todayDay)
    .slice(-7);

  return (
    <div className="space-y-5">
      {/* Headline stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total leads"
          value={stats.leads?.total ?? 0}
          color={theme.colors.clay}
          onOpen={() => navigate('/dashboard/leads')}
          footer={`${stats.leads?.thisWeek ?? 0} this week, ${stats.leads?.thisMonth ?? 0} this month`}
          visual={(setHint) => (
            <MiniBars
              values={trends.map((t) => t.leads)}
              labels={trends.map((t) => t.date)}
              color={theme.colors.clay}
              unit="lead"
              onHover={setHint}
            />
          )}
        />
        <StatCard
          icon={PhoneCall}
          label="Cold calls"
          value={stats.calls?.total ?? 0}
          color={theme.colors.blue}
          onOpen={() => navigate('/dashboard/leads')}
          footer={`${stats.calls?.thisWeek ?? 0} this week, ${stats.calls?.thisMonth ?? 0} this month`}
          visual={(setHint) => (
            <MiniBars
              values={trends.map((t) => t.calls)}
              labels={trends.map((t) => t.date)}
              color={theme.colors.blue}
              unit="call"
              onHover={setHint}
            />
          )}
        />
        <StatCard
          icon={Flame}
          label="Habit streak"
          value={habitStreak}
          unit={habitStreak === 1 ? 'day' : 'days'}
          color={theme.colors.green}
          onOpen={() => navigate('/dashboard/habits')}
          footer={`Last 7 days, target ${STREAK_THRESHOLD}%`}
          visual={(setHint) => <StreakDays days={recentHabitDays} todayDay={todayDay} color={theme.colors.green} onHover={setHint} />}
        />
        <StatCard
          icon={ListChecks}
          label="Today's habits"
          value={todayScore}
          unit="%"
          color={theme.colors.clay}
          accent
          onOpen={() => navigate('/dashboard/habits')}
          footer={`${todayDone} of ${totalHabitsCount} habits done`}
          visual={(setHint) => (
            <Segments done={todayDone} total={totalHabitsCount} color={theme.colors.clay} onHover={setHint} />
          )}
        />
      </div>

      {/* Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <GoalCard
          label="Leads goal"
          current={leadCurrent}
          goal={leadGoal}
          unit="leads"
          color={theme.colors.clay}
          period={leadGoalPeriod}
          onPeriodChange={setLeadGoalPeriod}
        />
        <GoalCard
          label="Cold calls goal"
          current={callCurrent}
          goal={callGoal}
          unit="calls"
          color={theme.colors.blue}
          period={callGoalPeriod}
          onPeriodChange={setCallGoalPeriod}
        />
        <GoalCard
          label="Habit score today"
          current={todayScore}
          goal={STREAK_THRESHOLD}
          unit="%"
          suffix="%"
          color={theme.colors.green}
          caption="Reach it to keep the streak"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <LeadsTrendChart data={trends} />
        </div>
        <div className="lg:col-span-1">
          <UpcomingAppointments appointments={stats.upcomingAppointments || []} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat cards                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  accent,
  footer,
  visual,
  onOpen,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  unit?: string;
  color: string;
  accent?: boolean;
  footer: string;
  visual: (setHint: (hint: string | null) => void) => React.ReactNode;
  onOpen: () => void;
}) {
  // Hovering the mini visual swaps the footer for that item's detail.
  const [hint, setHint] = useState<string | null>(null);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
      className="group relative surface overflow-clip p-4 sm:p-5 flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-clay-500/25"
    >
      {/* Soft wash in the card's color, brighter on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-[0.10] group-hover:opacity-[0.18] transition-opacity duration-300 blur-2xl"
        style={{ backgroundColor: color }}
      />

      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span
            className="grid place-items-center h-6 w-6 rounded-md"
            style={{ backgroundColor: `${color}1f`, color }}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          {label}
        </span>
        <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>

      <p className={cn(
        'relative font-display text-[36px] leading-none mt-3 tabular-nums',
        accent ? 'text-clay-700 dark:text-clay-300' : 'text-slate-900 dark:text-slate-50'
      )}>
        <CountUp value={value} />
        {unit && <span className="text-lg text-slate-400 dark:text-slate-500 ml-1">{unit}</span>}
      </p>

      <div className="relative mt-4 h-9" onClick={(e) => e.stopPropagation()}>
        {visual(setHint)}
      </div>

      <p className="relative mt-2 text-[11.5px] text-slate-500 dark:text-slate-400 truncate h-4" aria-live="polite">
        {hint ? <span className="text-slate-800 dark:text-slate-100 font-medium">{hint}</span> : footer}
      </p>
    </div>
  );
}

/** Animates a number up from zero once, on mount or when it changes. */
function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || value === 0) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const duration = 700;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

function MiniBars({
  values,
  labels,
  color,
  unit,
  onHover,
}: {
  values: number[];
  labels: string[];
  color: string;
  unit: string;
  onHover: (hint: string | null) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...values);

  if (values.length === 0) return <div className="h-full rounded-md bg-slate-100 dark:bg-slate-800" />;

  return (
    <div className="flex items-end gap-1 h-full" onMouseLeave={() => { setActive(null); onHover(null); }}>
      {values.map((v, i) => {
        const isLast = i === values.length - 1;
        const isActive = active === i;
        return (
          <button
            key={i}
            type="button"
            aria-label={`${labels[i]}: ${v} ${unit}${v === 1 ? '' : 's'}`}
            onMouseEnter={() => { setActive(i); onHover(`${labels[i]}: ${v} ${unit}${v === 1 ? '' : 's'}`); }}
            onFocus={() => { setActive(i); onHover(`${labels[i]}: ${v} ${unit}${v === 1 ? '' : 's'}`); }}
            onBlur={() => { setActive(null); onHover(null); }}
            className="flex-1 h-full flex items-end rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"
          >
            <span
              className="block w-full rounded-[3px] transition-all duration-300 origin-bottom"
              style={{
                height: `${Math.max(10, (v / max) * 100)}%`,
                backgroundColor: color,
                opacity: v === 0 ? 0.16 : isActive ? 1 : isLast ? 0.9 : active !== null ? 0.35 : 0.55,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

function StreakDays({
  days,
  todayDay,
  color,
  onHover,
}: {
  days: any[];
  todayDay: number;
  color: string;
  onHover: (hint: string | null) => void;
}) {
  if (days.length === 0) return <div className="h-full rounded-md bg-slate-100 dark:bg-slate-800" />;

  return (
    <div className="flex items-stretch gap-1 h-full" onMouseLeave={() => onHover(null)}>
      {days.map((d) => {
        const met = d.score >= STREAK_THRESHOLD;
        const isToday = d.day === todayDay;
        const exempt = !met && (d.isExempt || d.isSunday);
        const status = met ? 'target hit' : exempt ? 'exempt' : isToday ? 'in progress' : 'missed';
        const hint = `${d.weekday} ${d.day}: ${d.score}%, ${status}`;
        return (
          <button
            key={d.day}
            type="button"
            aria-label={hint}
            onMouseEnter={() => onHover(hint)}
            onFocus={() => onHover(hint)}
            onBlur={() => onHover(null)}
            className={cn(
              'flex-1 rounded-md flex flex-col items-center justify-center text-[9.5px] font-semibold leading-none transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30',
              met ? 'text-white' : exempt ? 'text-slate-400 border border-dashed border-slate-300 dark:border-slate-600' : 'text-slate-400 bg-slate-100 dark:bg-slate-800',
              isToday && !met && 'ring-1 ring-inset ring-slate-300 dark:ring-slate-600'
            )}
            style={met ? { backgroundColor: color } : undefined}
          >
            {met ? <Check className="h-3 w-3" strokeWidth={3} /> : d.weekday.charAt(0)}
          </button>
        );
      })}
    </div>
  );
}

function Segments({
  done,
  total,
  color,
  onHover,
}: {
  done: number;
  total: number;
  color: string;
  onHover: (hint: string | null) => void;
}) {
  const count = Math.max(total, 1);
  return (
    <div
      className="flex items-end gap-[3px] h-full"
      onMouseEnter={() => onHover(`${done} done, ${Math.max(0, total - done)} left today`)}
      onMouseLeave={() => onHover(null)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="flex-1 rounded-[2px] h-full transition-all duration-500"
          style={{
            backgroundColor: i < done ? color : undefined,
            transitionDelay: `${i * 18}ms`,
          }}
        >
          {i >= done && <span className="block h-full w-full rounded-[2px] bg-slate-100 dark:bg-slate-800" />}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Goal cards with progress rings                                      */
/* ------------------------------------------------------------------ */

function GoalCard({
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
    <section className="surface p-5 sm:p-6 flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-medium text-slate-900 dark:text-slate-50">{label}</h3>
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
          <span className="text-[11px] font-medium px-2 h-6 grid place-items-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Today</span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 flex-1">
        <div className="min-w-0">
          <p className="flex items-baseline gap-1.5 tabular-nums">
            <span className="font-display text-[38px] leading-none text-slate-900 dark:text-slate-50">{current}{suffix}</span>
            <span className="text-sm text-slate-400 dark:text-slate-500">/ {goal}{suffix}</span>
          </p>
          <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
            {period ? (period === 'week' ? 'This week' : 'This month') : caption}
          </p>
          <span
            className={cn(
              'mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium',
              done ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            )}
          >
            {done ? <><Check className="h-3 w-3" strokeWidth={2.5} /> Goal reached</> : `${remaining}${suffix || ` ${unit}`} to go`}
          </span>
        </div>

        <ProgressRing pct={pct} color={color} done={done} label={`${label}: ${pct}% of goal`} />
      </div>
    </section>
  );
}

function ProgressRing({ pct, color, done, label }: { pct: number; color: string; done: boolean; label: string }) {
  const size = 112;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Start empty, then fill so the ring animates in on load and on change.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(frame);
  }, [pct]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-slate-100 dark:stroke-slate-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (shown / 100) * circumference}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {done ? (
          <span className="grid place-items-center h-9 w-9 rounded-full text-white" style={{ backgroundColor: color }}>
            <Check className="h-5 w-5" strokeWidth={3} />
          </span>
        ) : (
          <>
            <span className="font-display text-2xl leading-none text-slate-900 dark:text-slate-50 tabular-nums">{pct}%</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">of goal</span>
          </>
        )}
      </div>
    </div>
  );
}
