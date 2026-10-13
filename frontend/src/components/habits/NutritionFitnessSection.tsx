import React, { useState } from 'react';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Dumbbell, Moon, ShieldCheck, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChartTheme, ChartTooltipCard } from '@/lib/chartTheme';

const CALORIE_TARGET = 2400;
const PROTEIN_TARGET = 80;

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
  const theme = useChartTheme();
  const [chartView, setChartView] = useState<'7days' | 'month'>('7days');

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

  const NutritionTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item: DayNutritionData = payload[0].payload;
    const cal = item.calories || 0;
    const prot = item.protein || 0;
    return (
      <ChartTooltipCard
        title={`${item.weekday}, day ${item.day}`}
        rows={[
          { label: 'Calories', value: cal > 0 ? `${cal.toLocaleString()} kcal` : 'Not logged', color: theme.colors.clay },
          { label: 'Protein', value: prot > 0 ? `${prot} g` : 'Not logged', color: theme.colors.green },
        ]}
        footer={
          <span className="flex flex-col gap-0.5">
            <span>{cal > CALORIE_TARGET ? 'Calorie target met' : cal > 0 ? `${CALORIE_TARGET + 1 - cal} kcal under target` : `Calorie target above ${CALORIE_TARGET}`}</span>
            <span>{prot >= PROTEIN_TARGET ? 'Protein target met' : prot > 0 ? `${PROTEIN_TARGET - prot} g under target` : `Protein target ${PROTEIN_TARGET} g`}</span>
          </span>
        }
      />
    );
  };

  const xKey = chartView === 'month' ? 'day' : 'weekday';
  const barSize = chartView === 'month' ? 12 : 26;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* Left: calories and protein, one scale each */}
      <section className="lg:col-span-7 surface p-5 sm:p-6 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-medium text-slate-900 dark:text-slate-50">Nutrition</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
              {chartView === '7days' ? 'Last 7 days' : monthName}. Targets: over {CALORIE_TARGET.toLocaleString()} kcal and {PROTEIN_TARGET} g protein
            </p>
          </div>
          {monthData.length > 0 && (
            <div role="radiogroup" aria-label="Nutrition range" className="flex p-0.5 rounded-md bg-slate-100 dark:bg-slate-800 self-start">
              {([['7days', '7 days'], ['month', 'Month']] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={chartView === value}
                  onClick={() => setChartView(value)}
                  className={cn(
                    'px-2.5 h-6 rounded text-[11px] font-medium transition-colors',
                    chartView === value
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-card'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <MetricPanel
          label="Calories"
          color={theme.colors.clay}
          summary={`avg ${avgCalories.toLocaleString()} kcal, target met ${calorieGoalDays}/${activeChartData.length} days`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeChartData} margin={{ top: 6, right: 8, left: -2, bottom: 0 }} syncId="nutrition">
              <CartesianGrid {...theme.grid} />
              <XAxis dataKey={xKey} {...theme.axis} hide />
              <YAxis {...theme.axis} width={52} domain={[0, (max: number) => Math.max(3000, Math.ceil(max / 500) * 500)]} tickCount={4} />
              <Tooltip content={<NutritionTooltip />} cursor={theme.barCursor} />
              <ReferenceLine y={CALORIE_TARGET} stroke={theme.ink.axis} strokeDasharray="4 4" strokeWidth={1.25} />
              <Bar dataKey="calories" name="Calories" fill={theme.colors.clay} radius={[4, 4, 0, 0]} maxBarSize={barSize} />
            </BarChart>
          </ResponsiveContainer>
        </MetricPanel>

        <MetricPanel
          label="Protein"
          color={theme.colors.green}
          summary={`avg ${avgProtein} g, target met ${proteinGoalDays}/${activeChartData.length} days`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeChartData} margin={{ top: 6, right: 8, left: -2, bottom: 0 }} syncId="nutrition">
              <CartesianGrid {...theme.grid} />
              <XAxis dataKey={xKey} {...theme.axis} />
              <YAxis {...theme.axis} width={52} domain={[0, (max: number) => Math.max(120, Math.ceil(max / 20) * 20)]} tickCount={4} unit="g" />
              <Tooltip content={<NutritionTooltip />} cursor={theme.barCursor} />
              <ReferenceLine y={PROTEIN_TARGET} stroke={theme.ink.axis} strokeDasharray="4 4" strokeWidth={1.25} />
              <Bar dataKey="protein" name="Protein" fill={theme.colors.green} radius={[4, 4, 0, 0]} maxBarSize={barSize} />
            </BarChart>
          </ResponsiveContainer>
        </MetricPanel>
      </section>

      {/* Right: Monthly Workout & Rest Days (Strictly for Current Selected Month) */}
      <section className="lg:col-span-5 surface p-5 sm:p-6 flex flex-col justify-between">
        <div>
          {/* Header: Displays exact selected month */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display text-xl font-medium text-slate-900 dark:text-slate-50">Training</h3>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {monthName} {year}
              </p>
            </div>
            
            <div className="text-right">
              <span className="font-display text-[26px] leading-none text-slate-900 dark:text-slate-50 tabular-nums">
                {activeStreakAdherence}%
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Days logged
              </p>
            </div>
          </div>

          {/* Quick Stats Badges for Current Month */}
          <div className="grid grid-cols-3 divide-x divide-slate-200/70 dark:divide-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-800 mb-4 mt-2">
            <div className="p-2.5 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Workouts
              </span>
              <span className="font-display text-xl text-emerald-700 dark:text-emerald-400 tabular-nums">
                {workoutDaysCount} 
              </span>
            </div>

            <div className="p-2.5 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Rest days
              </span>
              <span className="font-display text-xl text-slate-800 dark:text-slate-100 tabular-nums">
                {restDaysCount} 
              </span>
            </div>

            <div className="p-2.5 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Skipped
              </span>
              <span className="font-display text-xl text-rose-600 dark:text-rose-400 tabular-nums">
                {skippedDaysCount} 
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
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
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
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-clay-600 dark:text-clay-400 shrink-0" />
          <span>Rest days earn task credit. Skipped days remain unmarked for honest tracking.</span>
        </div>
      </section>
    </div>
  );
}

function MetricPanel({ label, color, summary, children }: { label: string; color: string; summary: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: color }} />
          {label}
        </span>
        <span className="text-[11.5px] text-slate-500 dark:text-slate-400 tabular-nums">{summary}</span>
      </div>
      <div className="h-[118px] w-full">{children}</div>
    </div>
  );
}
