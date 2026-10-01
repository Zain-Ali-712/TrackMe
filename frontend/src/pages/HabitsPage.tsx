import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Flame, 
  CalendarDays,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  fetchMonthHabitData, 
  createHabit, 
  updateHabit, 
  deleteHabit, 
  toggleHabitLog, 
  updateDailyMetric 
} from '@/lib/api';
import {
  computeAllDailyScores,
  computeStreakCount,
  computeMajorHabitsStats,
  STREAK_THRESHOLD
} from '@/lib/habitScoring';
import HabitGrid from '@/components/habits/HabitGrid';
import HabitProgressGauge from '@/components/habits/HabitProgressGauge';
import MajorHabitsGrid from '@/components/habits/MajorHabitsGrid';
import HabitDailyChart from '@/components/habits/HabitDailyChart';
import HabitScoreChart from '@/components/habits/HabitScoreChart';
import NutritionFitnessSection from '@/components/habits/NutritionFitnessSection';
import HabitFormDialog from '@/components/habits/HabitFormDialog';
import toast from 'react-hot-toast';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function HabitsPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12
  
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<any | null>(null);

  useEffect(() => {
    loadMonthData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const loadMonthData = async (year: number, month: number) => {
    try {
      setIsLoading(true);
      const res = await fetchMonthHabitData(year, month);
      setData(res);
    } catch (error) {
      console.error('Failed to load habit data', error);
      toast.error('Failed to load habit tracker data');
    } finally {
      setIsLoading(false);
    }
  };

  // Optimistic Toggle Checkbox
  const handleToggleHabit = async (
    habitId: string,
    day: number,
    dateStr: string,
    currentVal: boolean
  ) => {
    if (!data) return;

    // The backend enforces the same rule; this avoids firing a doomed request.
    if (dateStr < (data.latestEditableDate || '')) {
      toast.error('Only today and yesterday can be edited');
      return;
    }

    const newVal = !currentVal;

    // 1. Optimistic Local State Update
    const prevLogsMap = { ...data.logsMap };
    const updatedLogsMap = {
      ...data.logsMap,
      [habitId]: {
        ...(data.logsMap[habitId] || {}),
        [day]: newVal
      }
    };

    // Recalculate each habit count
    const updatedEachHabitStats = data.eachHabitStats.map((stat: any) => {
      if (stat.habitId === habitId) {
        const newCount = stat.count + (newVal ? 1 : -1);
        return {
          ...stat,
          count: Math.max(0, newCount),
          progressPercent: Math.round((Math.max(0, newCount) / data.daysInMonth) * 100)
        };
      }
      return stat;
    });

    // Compute updated daily scores and counts
    const updatedDailyScores = computeAllDailyScores(
      data.habits,
      updatedLogsMap,
      data.daysInMonth,
      selectedYear,
      selectedMonth
    );

    const updatedDailyStats = data.dailyStats.map((ds: any) => {
      const match = updatedDailyScores.find(s => s.day === ds.day);
      const newCount = ds.day === day ? ds.completedCount + (newVal ? 1 : -1) : ds.completedCount;
      return {
        ...ds,
        completedCount: Math.max(0, newCount),
        percent: data.habits.length > 0 ? Math.round((Math.max(0, newCount) / data.habits.length) * 100) : 0,
        score: match ? match.score : 0,
        isSunday: match ? match.isSunday : false
      };
    });

    const isCurrentMonth = data.overallStats.isCurrentMonth;
    const todayDay = data.overallStats.todayDay;
    const newStreak = computeStreakCount(updatedDailyStats, isCurrentMonth, todayDay || 1);
    const todayMatch = updatedDailyStats.find((d: any) => d.day === todayDay);
    const newTodayScore = todayMatch ? todayMatch.score : 0;

    const elapsedDays = isCurrentMonth ? Math.max(1, todayDay) : data.daysInMonth;
    const newMajorHabitsStats = computeMajorHabitsStats(data.habits, updatedLogsMap, elapsedDays);

    const totalDiff = newVal ? 1 : -1;
    const newTotalCompleted = Math.max(0, data.overallStats.totalCompleted + totalDiff);
    const newMonthlyProgress = data.overallStats.totalPossible > 0 
      ? Number(((newTotalCompleted / data.overallStats.totalPossible) * 100).toFixed(1)) 
      : 0;

    const isToday = isCurrentMonth && day === todayDay;
    const newTodayCount = isToday 
      ? Math.max(0, data.overallStats.todayCompletedCount + totalDiff) 
      : data.overallStats.todayCompletedCount;

    setData({
      ...data,
      logsMap: updatedLogsMap,
      eachHabitStats: updatedEachHabitStats,
      dailyStats: updatedDailyStats,
      streakCount: newStreak,
      todayScore: newTodayScore,
      majorHabitsStats: newMajorHabitsStats,
      overallStats: {
        ...data.overallStats,
        totalCompleted: newTotalCompleted,
        monthlyProgressPercent: newMonthlyProgress,
        todayCompletedCount: newTodayCount
      }
    });

    // 2. Network Sync
    try {
      await toggleHabitLog(habitId, dateStr, newVal);
    } catch (error) {
      // Revert if network call fails
      setData((prev: any) => ({ ...prev, logsMap: prevLogsMap }));
      toast.error('Failed to sync habit status');
    }
  };

  const handleUpdateSleep = async (dateStr: string, sleepHours: number) => {
    try {
      await updateDailyMetric({ date: dateStr, sleepHours });
      
      const dayNum = parseInt(dateStr.split('-')[2], 10);
      setData((prev: any) => {
        if (!prev) return prev;
        const updatedDailyStats = prev.dailyStats.map((ds: any) => {
          if (ds.day === dayNum) {
            return { ...ds, sleepHours };
          }
          return ds;
        });
        return { ...prev, dailyStats: updatedDailyStats };
      });
      toast.success('Sleep hours updated');
    } catch (error) {
      toast.error('Failed to save sleep metric');
    }
  };

  const handleUpdateMetric = async (updateData: {
    date: string;
    calories?: number;
    protein?: number;
    workoutStatus?: string;
  }) => {
    try {
      await updateDailyMetric(updateData);
      
      const dayNum = parseInt(updateData.date.split('-')[2], 10);
      setData((prev: any) => {
        if (!prev) return prev;
        const prevMetric = prev.metricsMap?.[dayNum] || {};
        const updatedMetric = {
          ...prevMetric,
          ...(updateData.calories !== undefined && { calories: updateData.calories }),
          ...(updateData.protein !== undefined && { protein: updateData.protein }),
          ...(updateData.workoutStatus !== undefined && { workoutStatus: updateData.workoutStatus }),
        };

        const updatedMetricsMap = {
          ...prev.metricsMap,
          [dayNum]: updatedMetric
        };

        // Also update last7DaysNutrition for real-time reactivity
        const updatedLast7 = (prev.last7DaysNutrition || []).map((d: any) => {
          if (d.date === updateData.date) {
            const cal = updateData.calories !== undefined ? updateData.calories : d.calories;
            const prot = updateData.protein !== undefined ? updateData.protein : d.protein;
            const ws = updateData.workoutStatus !== undefined ? updateData.workoutStatus : d.workoutStatus;
            return {
              ...d,
              calories: cal,
              protein: prot,
              workoutStatus: ws,
              isMetCalories: cal > 2400,
              isMetProtein: prot >= 80
            };
          }
          return d;
        });

        return {
          ...prev,
          metricsMap: updatedMetricsMap,
          last7DaysNutrition: updatedLast7
        };
      });

      // Reload full month data to refresh exact scores, counts, and logs in background
      loadMonthData(selectedYear, selectedMonth);

      if (updateData.calories !== undefined) {
        if (updateData.calories > 2400) {
          toast.success(`Calories surplus logged: ${updateData.calories} kcal (>2400 Target Met!)`);
        } else if (updateData.calories > 0) {
          toast(`Calories logged: ${updateData.calories} kcal (${2401 - updateData.calories} kcal to target)`, { icon: 'ℹ️' });
        }
      } else if (updateData.protein !== undefined) {
        if (updateData.protein >= 80) {
          toast.success(`Protein logged: ${updateData.protein}g (≥80g Target Met!)`);
        } else if (updateData.protein > 0) {
          toast(`Protein logged: ${updateData.protein}g (${80 - updateData.protein}g to target)`, { icon: 'ℹ️' });
        }
      } else if (updateData.workoutStatus) {
        if (updateData.workoutStatus === 'workout') {
          toast.success('Workout logged (+1 routine completed)');
        } else if (updateData.workoutStatus === 'rest') {
          toast.success('Rest day logged (+1 routine completed)');
        } else {
          toast('Workout / rest status cleared', { icon: '⚪' });
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update metric');
    }
  };

  const handleCreateOrUpdateHabit = async (formData: any) => {
    try {
      if (editingHabit) {
        await updateHabit(editingHabit._id, formData);
        toast.success('Habit updated');
      } else {
        await createHabit(formData);
        toast.success('Habit created');
      }
      setIsFormOpen(false);
      setEditingHabit(null);
      loadMonthData(selectedYear, selectedMonth);
    } catch (error) {
      toast.error('Failed to save habit');
    }
  };

  const handleDeleteHabit = async (id: string) => {
    try {
      await deleteHabit(id);
      toast.success('Habit removed');
      setIsFormOpen(false);
      setEditingHabit(null);
      loadMonthData(selectedYear, selectedMonth);
    } catch (error) {
      toast.error('Failed to delete habit');
    }
  };

  const jumpToToday = () => {
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    setSelectedYear(curYear);
    setSelectedMonth(curMonth);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Month & Year Selection Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)]">
        {/* Month Pills Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
          {MONTH_SHORT.map((m, idx) => {
            const mNum = idx + 1;
            const isSelected = selectedMonth === mNum;
            const isCurrentMonth = now.getFullYear() === selectedYear && (now.getMonth() + 1) === mNum;

            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(mNum)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border",
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm shadow-slate-900/10 font-bold"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800"
                )}
              >
                <span>{m}</span>
                {isCurrentMonth && (
                  <span className={cn(
                    "ml-1.5 w-1.5 h-1.5 rounded-full inline-block",
                    isSelected ? "bg-emerald-400" : "bg-blue-600"
                  )} />
                )}
              </button>
            );
          })}
        </div>

        {/* Year & Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-auto">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="h-8.5 px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            {[2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            onClick={jumpToToday}
            className="h-8.5 px-3 text-xs gap-1.5 border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
          >
            <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
            <span>Today</span>
          </Button>

          <Button
            onClick={() => { setEditingHabit(null); setIsFormOpen(true); }}
            className="h-8.5 px-3.5 text-xs font-semibold gap-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Habit</span>
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="p-12 text-center text-slate-400 font-medium animate-pulse space-y-4">
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Top Section Layout (Matching Image 3 Sketch):
              Left: Streak Count & Today's Score (2 stacked cards in single col)
              Center: 8 Major Habit Cards (2 cols x 4 rows)
              Right: Monthly Execution Circular Gauge
          */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Left Column: 2 Compact Cards (Single Column) */}
            <div className="lg:col-span-3 flex flex-col justify-between gap-3.5">
              {/* Card 1: Streak Count */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)] flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Streak Count
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Flame className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                      {data.streakCount ?? 0}
                    </h3>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Days Streak
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                    Maintains on ≥{STREAK_THRESHOLD}% (Sunday exempt)
                  </p>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <span className={cn(
                    "font-bold px-2 py-0.5 rounded-full text-[10px]",
                    (data.streakCount || 0) > 0
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  )}>
                    {(data.streakCount || 0) > 0 ? 'Active Streak' : `Target: ≥${STREAK_THRESHOLD}% Today`}
                  </span>
                </div>
              </div>

              {/* Card 2: Today's Score */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)] flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Today's Score
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Target className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                      {data.todayScore ?? 0}%
                    </h3>
                    <span className="text-xs font-semibold text-slate-400">
                      / {data.overallStats?.todayCompletedCount ?? 0} routines done
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-2">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        (data.todayScore || 0) >= STREAK_THRESHOLD ? "bg-emerald-500" : "bg-blue-600"
                      )}
                      style={{ width: `${Math.min(100, data.todayScore || 0)}%` }}
                    />
                  </div>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Goal Status:</span>
                  <span className={cn(
                    "font-bold px-2 py-0.5 rounded-full text-[10px]",
                    (data.todayScore || 0) >= STREAK_THRESHOLD
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  )}>
                    {(data.todayScore || 0) >= STREAK_THRESHOLD
                      ? `Streak Safe (≥${STREAK_THRESHOLD}%)`
                      : `${STREAK_THRESHOLD - (data.todayScore || 0)}% to Streak`}
                  </span>
                </div>
              </div>
            </div>

            {/* Center Section: 8 Major Habit Cards in 2x4 Grid */}
            <div className="lg:col-span-6 flex flex-col">
              <MajorHabitsGrid 
                stats={data.majorHabitsStats && data.majorHabitsStats.length > 0 
                  ? data.majorHabitsStats 
                  : computeMajorHabitsStats(
                      data.habits || [], 
                      data.logsMap || {}, 
                      data.overallStats?.isCurrentMonth ? (data.overallStats?.todayDay || 1) : data.daysInMonth
                    )
                } 
              />
            </div>

            {/* Right Column: Monthly Execution Ring Gauge */}
            <div className="lg:col-span-3 flex flex-col">
              <HabitProgressGauge
                completedPercent={data.overallStats.monthlyProgressPercent}
                completedCount={data.overallStats.totalCompleted}
                totalPossible={data.overallStats.totalPossible}
              />
            </div>
          </div>

          {/* Section: The Spreadsheet Habit Tracker Matrix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear} Habit Matrix
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daily checklist with instant automated scoring. Scores ≥{STREAK_THRESHOLD}% maintain your streak.
                </p>
              </div>
            </div>

            <HabitGrid
              year={selectedYear}
              month={selectedMonth}
              daysInMonth={data.daysInMonth}
              habits={data.habits}
              logsMap={data.logsMap}
              metricsMap={data.metricsMap}
              eachHabitStats={data.eachHabitStats}
              dailyStats={data.dailyStats}
              dailyLeadActivity={data.dailyLeadActivity}
              latestEditableDate={data.latestEditableDate}
              onToggleHabit={handleToggleHabit}
              onUpdateSleep={handleUpdateSleep}
              onUpdateMetric={handleUpdateMetric}
              onEditHabit={(h) => { setEditingHabit(h); setIsFormOpen(true); }}
              onAddHabit={() => { setEditingHabit(null); setIsFormOpen(true); }}
            />
          </div>

          {/* Section: Visual Graphs (Daily Progress Bars + Daily Habits Score Rhythm) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <HabitDailyChart 
              data={data.dailyStats} 
              totalHabits={data.habits.length} 
            />
            <HabitScoreChart 
              data={data.dailyStats} 
            />
          </div>

          {/* Section: Nutrition & Fitness Performance (7-Day Calories/Protein Chart + Workout vs Rest Days Table) */}
          <NutritionFitnessSection data={data.last7DaysNutrition || []} />
        </>
      )}

      {/* Habit Create / Edit Modal Dialog */}
      <HabitFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateOrUpdateHabit}
        onDelete={handleDeleteHabit}
        habit={editingHabit}
      />
    </div>
  );
}
