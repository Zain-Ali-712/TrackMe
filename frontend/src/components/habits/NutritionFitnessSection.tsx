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
import { UtensilsCrossed, Dumbbell, Activity, CheckCircle2, XCircle, Moon, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayNutritionData {
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
}

export default function NutritionFitnessSection({ data = [] }: NutritionFitnessSectionProps) {
  const [isDark, setIsDark] = useState(() => 
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Compute 7-day averages & stats
  const totalDays = data.length || 7;
  const daysWithCalories = data.filter(d => (d.calories || 0) > 0);
  const avgCalories = daysWithCalories.length > 0 
    ? Math.round(daysWithCalories.reduce((sum, d) => sum + (d.calories || 0), 0) / daysWithCalories.length) 
    : 0;

  const daysWithProtein = data.filter(d => (d.protein || 0) > 0);
  const avgProtein = daysWithProtein.length > 0 
    ? Math.round(daysWithProtein.reduce((sum, d) => sum + (d.protein || 0), 0) / daysWithProtein.length) 
    : 0;

  const calorieGoalDays = data.filter(d => (d.calories || 0) > 2400).length;
  const proteinGoalDays = data.filter(d => (d.protein || 0) >= 80).length;

  const workoutDaysCount = data.filter(d => d.workoutStatus === 'workout').length;
  const restDaysCount = data.filter(d => d.workoutStatus === 'rest').length;
  const skippedDaysCount = data.filter(d => !d.workoutStatus || d.workoutStatus === 'none').length;
  const activeStreakAdherence = totalDays > 0 ? Math.round(((workoutDaysCount + restDaysCount) / totalDays) * 100) : 0;

  const CustomNutritionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: DayNutritionData = payload[0].payload;
      const cal = item.calories || 0;
      const prot = item.protein || 0;
      const calMet = cal > 2400;
      const protMet = prot >= 80;

      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 text-white p-3.5 rounded-xl shadow-xl min-w-[170px]">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            {item.weekday}, {item.date}
          </p>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <UtensilsCrossed className="h-3 w-3" /> Calories:
              </span>
              <span className="font-extrabold tabular-nums">
                {cal > 0 ? `${cal} kcal` : 'Not recorded'}
              </span>
            </div>
            <div className="text-[10px] pl-4 flex items-center gap-1">
              {calMet ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Surplus Met (&gt;2400)
                </span>
              ) : (
                <span className="text-slate-400">
                  Target: &gt;2400 kcal ({cal > 0 ? `${2401 - cal} kcal to goal` : 'pending'})
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Activity className="h-3 w-3" /> Protein:
              </span>
              <span className="font-extrabold tabular-nums">
                {prot > 0 ? `${prot}g` : 'Not recorded'}
              </span>
            </div>
            <div className="text-[10px] pl-4 flex items-center gap-1">
              {protMet ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Target Met (&ge;80g)
                </span>
              ) : (
                <span className="text-slate-400">
                  Target: &ge;80g ({prot > 0 ? `${80 - prot}g to goal` : 'pending'})
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* Left: Calories & Protein Chart (Last 7 Days) */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-all duration-200 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Nutrition Rhythm (Last 7 Days)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Calories Target &gt;2400 kcal &bull; Protein Target &ge;80g
                </p>
              </div>
            </div>

            {/* Quick Summary Chips */}
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-lg bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/60 text-orange-700 dark:text-orange-300 text-[11px] font-bold tabular-nums">
                Avg: {avgCalories} kcal
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold tabular-nums">
                Avg: {avgProtein}g
              </div>
            </div>
          </div>

          {/* Goal badges row */}
          <div className="flex flex-wrap items-center gap-3 mb-2 text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
              Calories ({calorieGoalDays}/7 days met)
            </span>
            <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Protein ({proteinGoalDays}/7 days met)
            </span>
          </div>
        </div>

        {/* The Dual Chart */}
        <div className="h-56 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 15, right: 10, left: -15, bottom: 5 }}
            >
              <defs>
                <linearGradient id="calBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity={0.7} />
                </linearGradient>
              </defs>

              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={isDark ? "#334155" : "#e2e8f0"} 
                vertical={false} 
                opacity={0.6}
              />

              <XAxis 
                dataKey="weekday" 
                tickLine={false} 
                axisLine={false}
                tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}
              />

              {/* Left Y-Axis for Calories */}
              <YAxis 
                yAxisId="left"
                domain={[0, (dataMax: number) => Math.max(3000, Math.ceil(dataMax / 500) * 500)]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#ea580c', fontWeight: 600 }}
                tickFormatter={(val) => `${val}`}
              />

              {/* Right Y-Axis for Protein */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, (dataMax: number) => Math.max(120, Math.ceil(dataMax / 20) * 20)]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#10b981', fontWeight: 600 }}
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
                  value: '2400 kcal', 
                  position: 'insideTopLeft', 
                  fill: '#f97316', 
                  fontSize: 9, 
                  fontWeight: 700 
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
                  fontWeight: 700 
                }} 
              />

              <Tooltip content={<CustomNutritionTooltip />} />

              {/* Calories Bar */}
              <Bar 
                yAxisId="left"
                dataKey="calories" 
                fill="url(#calBarGradient)" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={28}
              />

              {/* Protein Line */}
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="protein" 
                stroke="#10b981" 
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right: Workout vs Rest Days Visual Breakdown (Last 7 Days) */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-all duration-200 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Dumbbell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Workout &amp; Rest Days
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Last 7 days physical recovery &amp; training status
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

          {/* Quick Stats Badges */}
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

          {/* 7-Day Visual Table / Row Cards */}
          <div className="space-y-1.5 max-h-[175px] overflow-y-auto scrollbar-thin pr-0.5">
            {data.slice().reverse().map((dayData, idx) => {
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
                      {dayData.date}
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
                        <XCircle className="h-3 w-3 text-slate-400" /> Skipped / Off
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
