import React, { useState, useEffect } from 'react';
import { 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  ComposedChart
} from 'recharts';
import { UtensilsCrossed, Dumbbell, Activity, CheckCircle2, Moon, ShieldCheck, Flame, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DayNutritionData {
  date: string;
  day: number;
  weekday: string;
  calories: number;
  protein: number;
  workoutStatus: 'workout' | 'rest' | 'none' | '';
  isMetCalories: boolean;
  isMetProtein: boolean;
}

interface NutritionFitnessSectionProps {
  data: DayNutritionData[];
  monthData?: DayNutritionData[];
  monthName?: string;
  year?: number;
}

export default function NutritionFitnessSection({ 
  data = [], 
  monthData = [],
  monthName = 'This Month',
  year = new Date().getFullYear()
}: NutritionFitnessSectionProps) {
  const [isDark, setIsDark] = useState(() => 
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );
  const [chartView, setChartView] = useState<'7days' | 'month'>('7days');

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Use monthData if provided for the monthly workout/rest section; fallback to data
  const workoutSourceData = monthData.length > 0 ? monthData : data;

  // Compute stats for Workout & Rest Days (Strictly for the current month)
  const totalMonthDays = workoutSourceData.length || 1;
  const workoutDaysCount = workoutSourceData.filter(d => d.workoutStatus === 'workout').length;
  const restDaysCount = workoutSourceData.filter(d => d.workoutStatus === 'rest').length;
  const skippedDaysCount = workoutSourceData.filter(d => !d.workoutStatus || d.workoutStatus === 'none').length;
  const activeStreakAdherence = totalMonthDays > 0 
    ? Math.round(((workoutDaysCount + restDaysCount) / totalMonthDays) * 100) 
    : 0;

  // Active chart data (7 days or full month)
  const activeChartData = chartView === 'month' && monthData.length > 0 ? monthData : data;
  const daysWithCalories = activeChartData.filter(d => (d.calories || 0) > 0);
  const avgCalories = daysWithCalories.length > 0 
    ? Math.round(daysWithCalories.reduce((sum, d) => sum + (d.calories || 0), 0) / daysWithCalories.length) 
    : 0;

  const daysWithProtein = activeChartData.filter(d => (d.protein || 0) > 0);
  const avgProtein = daysWithProtein.length > 0 
    ? Math.round(daysWithProtein.reduce((sum, d) => sum + (d.protein || 0), 0) / daysWithProtein.length) 
    : 0;

  const calorieGoalDays = activeChartData.filter(d => (d.calories || 0) > 2400).length;
  const proteinGoalDays = activeChartData.filter(d => (d.protein || 0) >= 80).length;

  const CustomNutritionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: DayNutritionData = payload[0].payload;
      const cal = item.calories || 0;
      const prot = item.protein || 0;
      const calMet = cal > 2400;
      const protMet = prot >= 80;

      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 text-white p-3 rounded-xl shadow-xl min-w-[180px]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              {item.weekday}, Day {item.day}
            </span>
            <span className="text-[10px] text-slate-400 tabular-nums">{item.date}</span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-orange-400 font-semibold flex items-center gap-1 text-[11px]">
                  <UtensilsCrossed className="h-3 w-3" /> Calories:
                </span>
                <span className="font-extrabold tabular-nums">
                  {cal > 0 ? `${cal.toLocaleString()} kcal` : 'Not recorded'}
                </span>
              </div>
              <div className="text-[10px] pl-4 pt-0.5">
                {calMet ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Surplus Met (&gt;2400)
                  </span>
                ) : cal > 0 ? (
                  <span className="text-amber-400 font-medium">
                    {2401 - cal} kcal under 2400 target
                  </span>
                ) : (
                  <span className="text-slate-500">Pending target &gt;2400</span>
                )}
              </div>
            </div>

            <div className="pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between gap-3">
                <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                  <Activity className="h-3 w-3" /> Protein:
                </span>
                <span className="font-extrabold tabular-nums">
                  {prot > 0 ? `${prot}g` : 'Not recorded'}
                </span>
              </div>
              <div className="text-[10px] pl-4 pt-0.5">
                {protMet ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Target Met (&ge;80g)
                  </span>
                ) : prot > 0 ? (
                  <span className="text-amber-400 font-medium">
                    {80 - prot}g under 80g target
                  </span>
                ) : (
                  <span className="text-slate-500">Pending target &ge;80g</span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* Left: Elevated Modern Calories & Protein Rhythm Chart */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-all duration-200 flex flex-col justify-between">
        <div>
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200/60 dark:border-orange-900/60 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-2xs">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Nutrition Rhythm</span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/60">
                    {chartView === '7days' ? 'Last 7 Days' : `${monthName} Full`}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Target: Calories &gt;2400 kcal &bull; Protein &ge;80g
                </p>
              </div>
            </div>

            {/* View Switcher & Quick Summary Chips */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {monthData.length > 0 && (
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setChartView('7days')}
                    className={cn(
                      "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                      chartView === '7days'
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    )}
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('month')}
                    className={cn(
                      "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                      chartView === 'month'
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    )}
                  >
                    Month
                  </button>
                </div>
              )}

              <div className="px-2.5 py-1 rounded-lg bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/60 text-orange-700 dark:text-orange-300 text-[11px] font-bold tabular-nums">
                Avg: {avgCalories} kcal
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold tabular-nums">
                Avg: {avgProtein}g
              </div>
            </div>
          </div>

          {/* Goal badges row */}
          <div className="flex flex-wrap items-center gap-4 mb-2 text-[11px]">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block shadow-xs" />
              Calories ({calorieGoalDays}/{activeChartData.length} met)
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs" />
              Protein ({proteinGoalDays}/{activeChartData.length} met)
            </span>
          </div>
        </div>

        {/* The Sleek Dual Chart */}
        <div className="h-60 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={activeChartData}
              margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="calBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity={0.7} />
                </linearGradient>
              </defs>

              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={isDark ? "#334155" : "#e2e8f0"} 
                vertical={false} 
                opacity={0.5}
              />

              <XAxis 
                dataKey={chartView === 'month' ? 'day' : 'weekday'} 
                tickLine={false} 
                axisLine={false}
                tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}
              />

              {/* Left Y-Axis for Calories */}
              <YAxis 
                yAxisId="left"
                domain={[0, (dataMax: number) => Math.max(3000, Math.ceil(dataMax / 500) * 500)]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#ea580c', fontWeight: 700 }}
                tickFormatter={(val) => `${val}`}
              />

              {/* Right Y-Axis for Protein */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, (dataMax: number) => Math.max(120, Math.ceil(dataMax / 20) * 20)]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#10b981', fontWeight: 700 }}
                tickFormatter={(val) => `${val}g`}
              />

              {/* Target threshold lines */}
              <ReferenceLine 
                yAxisId="left" 
                y={2400} 
                stroke="#f97316" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ 
                  value: '2400 kcal target', 
                  position: 'insideTopLeft', 
                  fill: '#f97316', 
                  fontSize: 9, 
                  fontWeight: 800 
                }} 
              />
              <ReferenceLine 
                yAxisId="right" 
                y={80} 
                stroke="#10b981" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ 
                  value: '80g target', 
                  position: 'insideTopRight', 
                  fill: '#10b981', 
                  fontSize: 9, 
                  fontWeight: 800 
                }} 
              />

              <Tooltip content={<CustomNutritionTooltip />} />

              {/* Calories Bar with Rounded Corners and Gradient */}
              <Bar 
                yAxisId="left"
                dataKey="calories" 
                fill="url(#calBarGradient)" 
                radius={[5, 5, 0, 0]} 
                maxBarSize={chartView === 'month' ? 14 : 26}
              />

              {/* Protein Line with High-Contrast Dot Stylings */}
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="protein" 
                stroke="#10b981" 
                strokeWidth={2.75}
                dot={{ r: 3.5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 5.5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right: Monthly Workout & Rest Days (Strictly for Current Selected Month) */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-all duration-200 flex flex-col justify-between">
        <div>
          {/* Header: Displays exact selected month */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
                <Dumbbell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Workout &amp; Rest Days
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{monthName} {year} &bull; Monthly Record</span>
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {activeStreakAdherence}%
              </span>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Adherence
              </p>
            </div>
          </div>

          {/* Quick Stats Badges for Current Month */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                Workouts
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {workoutDaysCount} <span className="text-xs font-semibold text-emerald-600/70">days</span>
              </span>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                Rest Days
              </span>
              <span className="text-base font-black text-slate-700 dark:text-slate-200 tabular-nums">
                {restDaysCount} <span className="text-xs font-semibold text-slate-500">days</span>
              </span>
            </div>

            <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/50 rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                Skipped
              </span>
              <span className="text-base font-black text-rose-600 dark:text-rose-400 tabular-nums">
                {skippedDaysCount} <span className="text-xs font-semibold text-rose-500">days</span>
              </span>
            </div>
          </div>

          {/* Monthly Visual Table / Row Cards (in descending order: latest day first) */}
          <div className="space-y-1.5 max-h-[185px] overflow-y-auto scrollbar-thin pr-0.5">
            {workoutSourceData.slice().reverse().map((dayData) => {
              const isWorkout = dayData.workoutStatus === 'workout';
              const isRest = dayData.workoutStatus === 'rest';
              const isSkipped = !dayData.workoutStatus || dayData.workoutStatus === 'none';

              return (
                <div 
                  key={dayData.date}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs transition-colors",
                    isWorkout && "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/60",
                    isRest && "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700",
                    isSkipped && "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-400"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 dark:text-slate-200 w-10 text-[11px]">
                      {dayData.weekday}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                      Day {dayData.day} &bull; {dayData.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isWorkout && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                        <Dumbbell className="h-3 w-3" /> Workout
                      </span>
                    )}

                    {isRest && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        <Moon className="h-3 w-3" /> Rest Day
                      </span>
                    )}

                    {isSkipped && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        Skipped / Off
                      </span>
                    )}

                    <span className={cn(
                      "text-[10px] font-bold tabular-nums ml-1",
                      isWorkout || isRest ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                    )}>
                      {isWorkout || isRest ? '+1 Done' : '0'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Motivational Note */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span>Rest days earn task credit. Skipped days remain unmarked for honest tracking.</span>
        </div>
      </div>
    </div>
  );
}
