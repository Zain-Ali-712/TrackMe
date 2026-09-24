import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, PhoneCall, Target, Flame, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { fetchLeadStats, fetchMonthHabitData } from '@/lib/api';
import LeadsTrendChart from '@/components/dashboard/LeadsTrendChart';
import UpcomingAppointments from '@/components/dashboard/UpcomingAppointments';
import { cn } from '@/lib/utils';

export default function DashboardHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [habitStats, setHabitStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Timeframe toggles for goals
  const [leadGoalPeriod, setLeadGoalPeriod] = useState<'week' | 'month'>('week');
  const [callGoalPeriod, setCallGoalPeriod] = useState<'week' | 'month'>('week');

  const [isDark, setIsDark] = useState(() => 
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  useEffect(() => {
    loadStats();
    const handleLeadCreated = () => loadStats();
    window.addEventListener('leadCreated', handleLeadCreated);
    return () => window.removeEventListener('leadCreated', handleLeadCreated);
  }, []);

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
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
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-56 bg-muted rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-72 bg-muted rounded-2xl" />
          <div className="lg:col-span-1 h-72 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  // Leads data
  const totalLeads = stats.leads?.total ?? 0;
  const leadCurrent = leadGoalPeriod === 'week' ? (stats.leads?.thisWeek ?? 0) : (stats.leads?.thisMonth ?? 0);
  const leadGoal = leadGoalPeriod === 'week' ? 60 : 250;
  const leadPct = Math.min(100, Math.round((leadCurrent / leadGoal) * 100));

  // Calls data
  const totalCalls = stats.calls?.total ?? 0;
  const callCurrent = callGoalPeriod === 'week' ? (stats.calls?.thisWeek ?? 0) : (stats.calls?.thisMonth ?? 0);
  const callGoal = callGoalPeriod === 'week' ? 50 : 200;
  const callPct = Math.min(100, Math.round((callCurrent / callGoal) * 100));

  // Habits data
  const habitStreak = habitStats?.streakCount ?? 0;
  const todayScore = habitStats?.todayScore ?? 0;
  const todayDone = habitStats?.overallStats?.todayCompletedCount ?? 0;
  const totalHabitsCount = habitStats?.overallStats?.todayTotalHabits ?? (habitStats?.habits?.length ?? 22);
  const monthProgress = habitStats?.overallStats?.monthlyProgressPercent ?? 0;

  const habitCurrent = todayScore;
  const habitGoal = 80; // 80% goal
  const habitProgressRatio = Math.min(100, Math.round((habitCurrent / habitGoal) * 100));

  // Circular Progress Gauge Geometry
  const radius = 48;
  const circumference = 2 * Math.PI * radius; // ~301.59
  const leadStrokeDashoffset = circumference - (leadPct / 100) * circumference;
  const callStrokeDashoffset = circumference - (callPct / 100) * circumference;
  const habitStrokeDashoffset = circumference - (habitProgressRatio / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* ROW 1: COMPACT TOTALS (4 Cards: Leads, Cold Calls, Habit Streak, Today's Habits) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Leads Pipeline */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Leads</p>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none mt-0.5">
                {totalLeads}
              </h3>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 font-medium pl-2 border-l border-slate-100 dark:border-slate-800">
            <div>Week: <strong className="text-slate-900 dark:text-white tabular-nums">{stats.leads?.thisWeek ?? 0}</strong></div>
            <div>Month: <strong className="text-slate-900 dark:text-white tabular-nums">{stats.leads?.thisMonth ?? 0}</strong></div>
          </div>
        </div>

        {/* Card 2: Total Cold Calls Made */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
              <PhoneCall className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Cold Calls</p>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none mt-0.5">
                {totalCalls}
              </h3>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 font-medium pl-2 border-l border-slate-100 dark:border-slate-800">
            <div>Week: <strong className="text-slate-900 dark:text-white tabular-nums">{stats.calls?.thisWeek ?? 0}</strong></div>
            <div>Month: <strong className="text-slate-900 dark:text-white tabular-nums">{stats.calls?.thisMonth ?? 0}</strong></div>
          </div>
        </div>

        {/* Card 3: Active Habit Streak */}
        <div 
          onClick={() => navigate('/dashboard/habits')}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex items-center justify-between cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
              <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Habit Streak</p>
                <ArrowUpRight className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none mt-0.5">
                {habitStreak} <span className="text-xs font-bold text-slate-400">Days</span>
              </h3>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 font-medium pl-2 border-l border-slate-100 dark:border-slate-800">
            <div>Target: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">≥80%</strong></div>
            <div className="text-[10px] text-slate-400">Sun Exempt</div>
          </div>
        </div>

        {/* Card 4: Today's Habit Score */}
        <div 
          onClick={() => navigate('/dashboard/habits')}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex items-center justify-between cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center shrink-0">
              <Target className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Today's Habits</p>
                <ArrowUpRight className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none mt-0.5">
                {todayScore}%
              </h3>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 font-medium pl-2 border-l border-slate-100 dark:border-slate-800">
            <div>Done: <strong className="text-slate-900 dark:text-white tabular-nums">{todayDone}</strong></div>
            <div className="text-[10px] text-slate-400">of {totalHabitsCount}</div>
          </div>
        </div>
      </div>

      {/* ROW 2: PROMINENT GOAL TARGET CARDS (3 Columns: Leads, Cold Calls, Habits) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* BIG CARD 1: Leads Goal Target */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.06)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Leads Intake Goal</h4>
                <p className="text-[10px] text-slate-400 font-medium">Pipeline acquisition milestone</p>
              </div>
            </div>

            {/* Week vs Month Switcher (Vertical & Compact) */}
            <div className="flex flex-col p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setLeadGoalPeriod('week')}
                className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded transition-all text-center',
                  leadGoalPeriod === 'week'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                This Week
              </button>
              <button
                onClick={() => setLeadGoalPeriod('month')}
                className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded transition-all text-center',
                  leadGoalPeriod === 'month'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                This Month
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between my-3 gap-3">
            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                {leadCurrent} <span className="text-base text-slate-400 font-bold">/ {leadGoal}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {leadGoalPeriod === 'week' ? 'Weekly target: 60 leads' : 'Monthly target: 250 leads'}
              </p>
              <div className="pt-2">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border',
                  leadPct >= 100
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                )}>
                  {leadPct >= 100 ? 'Goal Completed!' : `${leadGoal - leadCurrent} more leads needed`}
                </span>
              </div>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className={cn(
                    'transition-all duration-700 ease-out',
                    isDark ? 'stroke-slate-100' : 'stroke-slate-900'
                  )}
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={leadStrokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
                  {leadPct}%
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Goal</span>
              </div>
            </div>
          </div>
        </div>

        {/* BIG CARD 2: Cold Calls Goal Target */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.06)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <PhoneCall className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Cold Calls Goal</h4>
                <p className="text-[10px] text-slate-400 font-medium">Outreach volume benchmark</p>
              </div>
            </div>

            {/* Week vs Month Switcher (Vertical & Compact) */}
            <div className="flex flex-col p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setCallGoalPeriod('week')}
                className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded transition-all text-center',
                  callGoalPeriod === 'week'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                This Week
              </button>
              <button
                onClick={() => setCallGoalPeriod('month')}
                className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded transition-all text-center',
                  callGoalPeriod === 'month'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                This Month
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between my-3 gap-3">
            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                {callCurrent} <span className="text-base text-slate-400 font-bold">/ {callGoal}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {callGoalPeriod === 'week' ? 'Weekly target: 50 calls' : 'Monthly target: 200 calls'}
              </p>
              <div className="pt-2">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border',
                  callPct >= 100
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-900/40'
                )}>
                  {callPct >= 100 ? 'Goal Completed!' : `${callGoal - callCurrent} more calls needed`}
                </span>
              </div>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="stroke-emerald-500 dark:stroke-emerald-400 transition-all duration-700 ease-out"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={callStrokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
                  {callPct}%
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Goal</span>
              </div>
            </div>
          </div>
        </div>

        {/* BIG CARD 3: Habits Routine Momentum (Today Only) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.06)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                <Flame className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Habits Momentum</h4>
                <p className="text-[10px] text-slate-400 font-medium">Routine discipline milestone</p>
              </div>
            </div>

            {/* Static Today Badge (No Switcher) */}
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
              Today
            </span>
          </div>

          <div className="flex items-center justify-between my-3 gap-3">
            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                {habitCurrent}% <span className="text-base text-slate-400 font-bold">/ 80%</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Streak benchmark: 80% daily score
              </p>
              <div className="pt-2">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border',
                  habitCurrent >= 80
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-900/40'
                )}>
                  {habitCurrent >= 80 ? 'Streak Target Met!' : `${80 - habitCurrent}% needed for streak`}
                </span>
              </div>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="stroke-amber-500 dark:stroke-amber-400 transition-all duration-700 ease-out"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={habitStrokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
                  {habitProgressRatio}%
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Goal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3: CHARTS & UPCOMING APPOINTMENTS */}
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
