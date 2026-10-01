import React from 'react';
import { Check, Edit2, Plus, Flame, Lock, Dumbbell, Moon, X, UtensilsCrossed, Activity } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn, getHabitIcon } from '@/lib/utils';
import { STREAK_THRESHOLD } from '@/lib/habitScoring';
import toast from 'react-hot-toast';

interface HabitGridProps {
  year: number;
  month: number;
  daysInMonth: number;
  habits: any[];
  logsMap: Record<string, Record<number, boolean>>;
  metricsMap?: Record<number, { sleepHours: number; notes: string; calories?: number; protein?: number; workoutStatus?: string }>;
  eachHabitStats: any[];
  dailyStats: any[];
  dailyLeadActivity?: { leadsByDay: Record<number, number>; callsByDay: Record<number, number> };
  /** Oldest date that may still be toggled — today and yesterday. From the API. */
  latestEditableDate?: string;
  onToggleHabit: (habitId: string, day: number, dateStr: string, currentVal: boolean) => void;
  onUpdateSleep?: (dateStr: string, hours: number) => void;
  onUpdateMetric?: (data: { date: string; calories?: number; protein?: number; workoutStatus?: string }) => void;
  onEditHabit: (habit: any) => void;
  onAddHabit: () => void;
}

export default function HabitGrid({
  year,
  month,
  daysInMonth,
  habits,
  logsMap,
  metricsMap,
  eachHabitStats,
  dailyStats,
  dailyLeadActivity,
  latestEditableDate,
  onToggleHabit,
  onUpdateMetric,
  onEditHabit,
  onAddHabit
}: HabitGridProps) {
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const todayDay = now.getDate();

  // Habits can only be changed for today and yesterday; older days are frozen
  // and future days cannot be logged. The API sends the lower bound.
  const editableFrom = latestEditableDate || '';
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const dateFor = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isEditableDay = (dateStr: string) =>
    editableFrom !== '' && dateStr >= editableFrom && dateStr <= todayStr;

  const isPastMonth = !isCurrentMonth;

  // Compute weeks grouping
  const weeks: Array<{ weekNum: number; days: number[] }> = [];
  let currentWeek: number[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    const d = new Date(year, month - 1, day);
    if (d.getDay() === 0 || day === daysInMonth) {
      weeks.push({ weekNum: weeks.length + 1, days: [...currentWeek] });
      currentWeek = [];
    }
  }

  const weekdaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col">
      {/* Scrollable Spreadsheet Container */}
      <div className="overflow-x-auto relative scrollbar-thin">
        <table className="w-full border-collapse text-left select-none text-xs">
          <thead>
            {/* Row 1: Week Group Headers */}
            <tr className="bg-slate-100/90 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-b border-slate-200/80 dark:border-slate-800">
              {/* Sticky Left Corner Header */}
              <th className="sticky left-0 z-30 bg-slate-100/95 dark:bg-slate-900 px-4 py-2.5 font-bold tracking-wider uppercase text-[10px] min-w-[230px] max-w-[230px] border-r border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">Daily Routines</span>
                  <button
                    onClick={onAddHabit}
                    className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
                    title="Add Habit"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </th>

              {/* Week Spanning Headers */}
              {weeks.map((week) => (
                <th
                  key={week.weekNum}
                  colSpan={week.days.length}
                  className="px-2 py-1.5 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-slate-200/60 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90"
                >
                  Week {week.weekNum}
                </th>
              ))}

              {/* Sticky Right Column Header */}
              <th
                colSpan={2}
                className="sticky right-0 z-30 bg-slate-100/95 dark:bg-slate-900 px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-800 min-w-[170px]"
              >
                Routine Momentum
              </th>
            </tr>

            {/* Row 2: Weekday and Day Numbers */}
            <tr className="bg-slate-50 dark:bg-slate-900/95 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-center">
              <th className="sticky left-0 z-30 bg-slate-50 dark:bg-slate-900 px-4 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 text-left">
                Checklist
              </th>

              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dayDate = new Date(year, month - 1, day);
                const weekday = weekdaysShort[dayDate.getDay()];
                const isToday = isCurrentMonth && day === todayDay;
                const isSunday = dayDate.getDay() === 0;

                return (
                  <th
                    key={day}
                    className={cn(
                      "min-w-[34px] w-[34px] p-1 font-bold transition-colors border-r border-slate-200/50 dark:border-slate-800",
                      isToday
                        ? "bg-blue-50/90 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                        : isSunday
                        ? "bg-amber-50/40 dark:bg-amber-950/25 text-amber-700 dark:text-amber-400"
                        : "dark:text-slate-400"
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "text-[9px] font-semibold uppercase tracking-tight",
                        isSunday ? "text-amber-600 dark:text-amber-400 font-bold" : "opacity-75 dark:text-slate-400"
                      )}>
                        {weekday}
                      </span>
                      <span
                        className={cn(
                          "text-xs tabular-nums mt-0.5 w-5 h-5 rounded-full flex items-center justify-center font-bold",
                          isToday 
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-xs" 
                            : "dark:text-slate-200"
                        )}
                      >
                        {day}
                      </span>
                    </div>
                  </th>
                );
              })}

              <th className="sticky right-[100px] z-30 bg-slate-50 dark:bg-slate-900 px-2 py-2 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 w-[60px]">
                Checks
              </th>
              <th className="sticky right-0 z-30 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 min-w-[110px]">
                Completion
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {/* Habit Rows */}
            {habits.map((habit) => {
              const hId = habit._id.toString();
              const habitStat = eachHabitStats.find((s) => s.habitId === hId) || {
                count: 0,
                progressPercent: 0
              };
              const HabitIcon = getHabitIcon(habit.name, habit.icon);

              const habitLower = (habit.name || '').toLowerCase();
              const isCalorieHabit = habitLower.includes('calorie');
              const isProteinHabit = habitLower.includes('protein');
              const isWorkoutHabit = habitLower.includes('workout');
              const isLeadHabit = habitLower.includes('lead');
              const isColdCallHabit = habitLower.includes('coldcall') || habitLower.includes('cold call');

              return (
                <tr key={hId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 group transition-colors">
                  {/* Sticky Habit Name Column with Lucide Icon (NO EMOJIS) */}
                  <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50/90 dark:bg-slate-900 dark:group-hover:bg-slate-800/90 px-3.5 py-2 font-medium text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <div 
                          className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          style={{ color: habit.color || undefined }}
                        >
                          <HabitIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                        <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {habit.name}
                        </span>
                      </div>
                      <button
                        onClick={() => onEditHabit(habit)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity"
                        title="Edit Habit"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>

                  {/* Days Checkbox Matrix */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const isChecked = Boolean(logsMap[hId] && logsMap[hId][day]);
                    const isToday = isCurrentMonth && day === todayDay;
                    const isSunday = new Date(year, month - 1, day).getDay() === 0;
                    const dateStr = dateFor(day);
                    const isEditable = !isPastMonth && isEditableDay(dateStr);

                    // 1. Special Case: Calories Habit Input (target > 2400 kcal)
                    if (isCalorieHabit) {
                      const currentCal = metricsMap?.[day]?.calories || 0;
                      return (
                        <td
                          key={day}
                          className={cn(
                            "w-[34px] min-w-[34px] p-0.5 text-center border-r border-slate-100 dark:border-slate-800/60 transition-colors",
                            isToday ? "bg-blue-50/40 dark:bg-blue-950/20" : isSunday ? "dark:bg-amber-950/10" : ""
                          )}
                        >
                          <input
                            type="number"
                            min={0}
                            max={9999}
                            step={50}
                            placeholder="cal"
                            disabled={!isEditable}
                            defaultValue={currentCal > 0 ? currentCal : ''}
                            key={`cal-${day}-${currentCal}`}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              if (val !== currentCal && onUpdateMetric) {
                                onUpdateMetric({ date: dateStr, calories: val });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className={cn(
                              "w-[30px] h-6 text-[9px] font-black text-center rounded transition-all border outline-none px-0.5 shadow-2xs",
                              isChecked
                                ? "bg-emerald-500 text-white border-emerald-600 dark:border-emerald-400 placeholder:text-emerald-100"
                                : currentCal > 0
                                ? "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700"
                                : "bg-slate-50/60 border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800",
                              !isEditable && "opacity-55 cursor-not-allowed"
                            )}
                            title={
                              currentCal > 0
                                ? `${currentCal} kcal (${currentCal > 2400 ? 'Surplus Met >2400' : 'Under 2400 Target'})`
                                : isEditable ? 'Enter calories (Target: > 2400 kcal)' : 'Day locked'
                            }
                          />
                        </td>
                      );
                    }

                    // 2. Special Case: Protein Habit Input (target >= 80g)
                    if (isProteinHabit) {
                      const currentProt = metricsMap?.[day]?.protein || 0;
                      return (
                        <td
                          key={day}
                          className={cn(
                            "w-[34px] min-w-[34px] p-0.5 text-center border-r border-slate-100 dark:border-slate-800/60 transition-colors",
                            isToday ? "bg-blue-50/40 dark:bg-blue-950/20" : isSunday ? "dark:bg-amber-950/10" : ""
                          )}
                        >
                          <input
                            type="number"
                            min={0}
                            max={500}
                            step={5}
                            placeholder="g"
                            disabled={!isEditable}
                            defaultValue={currentProt > 0 ? currentProt : ''}
                            key={`prot-${day}-${currentProt}`}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              if (val !== currentProt && onUpdateMetric) {
                                onUpdateMetric({ date: dateStr, protein: val });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className={cn(
                              "w-[30px] h-6 text-[9px] font-black text-center rounded transition-all border outline-none px-0.5 shadow-2xs",
                              isChecked
                                ? "bg-emerald-500 text-white border-emerald-600 dark:border-emerald-400 placeholder:text-emerald-100"
                                : currentProt > 0
                                ? "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700"
                                : "bg-slate-50/60 border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800",
                              !isEditable && "opacity-55 cursor-not-allowed"
                            )}
                            title={
                              currentProt > 0
                                ? `${currentProt}g (${currentProt >= 80 ? 'Target Met ≥80g' : 'Under 80g Target'})`
                                : isEditable ? 'Enter protein in grams (Target: ≥ 80g)' : 'Day locked'
                            }
                          />
                        </td>
                      );
                    }

                    // 3. Special Case: Workout / Rest Habit Dropdown
                    if (isWorkoutHabit) {
                      const workoutStatus = metricsMap?.[day]?.workoutStatus || (isChecked ? 'workout' : '');

                      return (
                        <td
                          key={day}
                          className={cn(
                            "w-[34px] min-w-[34px] p-1 text-center border-r border-slate-100 dark:border-slate-800/60 transition-colors",
                            isToday ? "bg-blue-50/40 dark:bg-blue-950/20" : isSunday ? "dark:bg-amber-950/10" : ""
                          )}
                        >
                          {isEditable ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    "w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-all duration-150 border cursor-pointer outline-none shadow-2xs",
                                    workoutStatus === 'workout'
                                      ? "bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-500 dark:text-white dark:border-emerald-400 dark:shadow-[0_0_8px_rgba(16,185,129,0.35)]"
                                      : workoutStatus === 'rest'
                                      ? "bg-slate-400 dark:bg-slate-600 text-white border-slate-500 dark:border-slate-500"
                                      : "border-slate-250 bg-slate-50/50 hover:border-slate-400 hover:bg-white dark:bg-slate-800/80 dark:border-slate-700 dark:hover:border-slate-500 dark:hover:bg-slate-700/80"
                                  )}
                                  title={
                                    workoutStatus === 'workout'
                                      ? 'Workout Day (Click to change)'
                                      : workoutStatus === 'rest'
                                      ? 'Rest Day (Counts as completed task. Click to change)'
                                      : 'Click to select Workout or Rest Day'
                                  }
                                >
                                  {workoutStatus === 'workout' && <Dumbbell className="h-3.5 w-3.5 stroke-[2.5]" />}
                                  {workoutStatus === 'rest' && <Moon className="h-3.5 w-3.5 stroke-[2.5]" />}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="w-36 p-1 text-xs z-50">
                                <DropdownMenuItem
                                  onClick={() => onUpdateMetric && onUpdateMetric({ date: dateStr, workoutStatus: 'workout' })}
                                  className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer py-1.5"
                                >
                                  <Dumbbell className="h-3.5 w-3.5" />
                                  <span>Workout (Green)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onUpdateMetric && onUpdateMetric({ date: dateStr, workoutStatus: 'rest' })}
                                  className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer py-1.5"
                                >
                                  <Moon className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Rest Day (Grey)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onUpdateMetric && onUpdateMetric({ date: dateStr, workoutStatus: 'none' })}
                                  className="flex items-center gap-2 text-slate-400 hover:text-rose-500 cursor-pointer text-[11px] py-1 border-t border-slate-100 dark:border-slate-800 mt-1"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Skip / Clear</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <div
                              className={cn(
                                "w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-all duration-150 border opacity-55 saturate-[0.85] cursor-not-allowed",
                                workoutStatus === 'workout'
                                  ? "bg-emerald-500 text-white border-emerald-600 dark:border-emerald-400"
                                  : workoutStatus === 'rest'
                                  ? "bg-slate-400 dark:bg-slate-600 text-white border-slate-500 dark:border-slate-500"
                                  : "border-slate-250 bg-slate-50/50 dark:bg-slate-800/80 dark:border-slate-700"
                              )}
                              title="This day is locked."
                            >
                              {workoutStatus === 'workout' && <Dumbbell className="h-3.5 w-3.5 stroke-[2.5]" />}
                              {workoutStatus === 'rest' && <Moon className="h-3.5 w-3.5 stroke-[2.5]" />}
                            </div>
                          )}
                        </td>
                      );
                    }

                    // 4. Default Habit Checkbox (with Lead Generation & Cold Call Safeguards)
                    return (
                      <td
                        key={day}
                        onClick={() => {
                          if (!isEditable) return;

                          // Validation checks for Lead generation and Coldcall habits
                          if (!isChecked) {
                            if (isLeadHabit) {
                              const count = dailyLeadActivity?.leadsByDay?.[day] || 0;
                              if (count === 0) {
                                toast.error(`Cannot check 'Lead generation': No new leads added for ${dateStr}. Please add at least 1 lead in Leads first.`);
                                return;
                              }
                            }
                            if (isColdCallHabit) {
                              const count = dailyLeadActivity?.callsByDay?.[day] || 0;
                              if (count === 0) {
                                toast.error(`Cannot check 'Coldcall / Practice': No cold calls logged for ${dateStr}. Please log at least 1 call in Leads first.`);
                                return;
                              }
                            }
                          }

                          onToggleHabit(hId, day, dateStr, isChecked);
                        }}
                        title={
                          isEditable
                            ? undefined
                            : isPastMonth
                            ? 'This month has passed. Habits can only be changed for today and yesterday.'
                            : dateStr > todayStr
                            ? 'This day has not happened yet.'
                            : 'This day is locked. Habits can only be changed for today and yesterday.'
                        }
                        className={cn(
                          "w-[34px] min-w-[34px] p-1 text-center border-r border-slate-100 dark:border-slate-800/60 transition-colors",
                          isToday
                            ? "bg-blue-50/40 dark:bg-blue-950/20"
                            : isSunday
                            ? "dark:bg-amber-950/10"
                            : "",
                          isEditable
                            ? "cursor-pointer"
                            : "cursor-not-allowed",
                          isEditable
                            ? isChecked
                              ? "hover:opacity-90"
                              : "hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                            : ""
                        )}
                      >
                        <div
                          className={cn(
                            "w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-all duration-150 border",
                            isEditable && "cursor-pointer",
                            !isEditable && "opacity-55 saturate-[0.85]",
                            isChecked
                              ? "bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-500 dark:text-white dark:border-emerald-400 dark:shadow-[0_0_8px_rgba(16,185,129,0.35)] scale-100"
                              : "border-slate-250 bg-slate-50/50 hover:border-slate-400 hover:bg-white dark:bg-slate-800/80 dark:border-slate-700 dark:hover:border-slate-500 dark:hover:bg-slate-700/80",
                            !isEditable && "hover:border-slate-250 hover:bg-slate-50/50 dark:hover:bg-slate-800/80 dark:hover:border-slate-700"
                          )}
                        >
                          {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </td>
                    );
                  })}

                  {/* Sticky Right: Count */}
                  <td className="sticky right-[100px] z-20 bg-white group-hover:bg-slate-50/90 dark:bg-slate-900 dark:group-hover:bg-slate-800/90 px-2 py-2 text-center text-xs font-bold text-slate-800 dark:text-slate-200 border-l border-slate-200 dark:border-slate-800 tabular-nums">
                    {habitStat.count}
                  </td>

                  {/* Sticky Right: Progress Bar */}
                  <td className="sticky right-0 z-20 bg-white group-hover:bg-slate-50/90 dark:bg-slate-900 dark:group-hover:bg-slate-800/90 px-3 py-2 border-l border-slate-100 dark:border-slate-800 min-w-[110px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-300"
                          style={{ width: `${habitStat.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tabular-nums w-8 text-right">
                        {habitStat.progressPercent}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Bottom Row 1: Daily Completed Habit Count */}
            <tr className="bg-slate-50/90 dark:bg-slate-900/95 font-bold border-t-2 border-slate-200 dark:border-slate-700">
              <td className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Habits Completed</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Total</span>
                </div>
              </td>

              {dailyStats.map((stat) => (
                <td
                  key={stat.day}
                  className={cn(
                    "w-[34px] min-w-[34px] p-1 text-center border-r border-slate-200/50 dark:border-slate-800 tabular-nums text-xs",
                    stat.completedCount > 0
                      ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                      : "text-slate-400 dark:text-slate-600"
                  )}
                >
                  {stat.completedCount}
                </td>
              ))}

              <td className="sticky right-[100px] z-20 bg-slate-100 dark:bg-slate-900 px-2 py-2 text-center text-xs font-black text-emerald-600 dark:text-emerald-400 border-l border-slate-200 dark:border-slate-700 tabular-nums">
                {dailyStats.reduce((acc, curr) => acc + curr.completedCount, 0)}
              </td>
              <td className="sticky right-0 z-20 bg-slate-100 dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">
                Total Checks
              </td>
            </tr>

            {/* Bottom Row 2: Daily Habit Score (%) */}
            <tr className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 text-xs font-semibold">
              <td className="sticky left-0 z-20 bg-white dark:bg-slate-900 px-4 py-2 text-slate-700 dark:text-slate-300 font-bold border-r border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Flame className="h-3.5 w-3.5" />
                  <span>Daily Habit Score</span>
                </div>
              </td>

              {dailyStats.map((stat) => {
                const score = stat.score || 0;
                const isMet = score >= STREAK_THRESHOLD;
                const isSun = stat.isSunday;

                return (
                  <td
                    key={stat.day}
                    className={cn(
                      "w-[34px] min-w-[34px] p-1 text-center border-r border-slate-100 dark:border-slate-800/60 text-[11px] tabular-nums font-extrabold",
                      isMet
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40"
                        : isSun
                        ? "text-amber-600 dark:text-amber-400 dark:bg-amber-950/20"
                        : "text-slate-400 dark:text-slate-600"
                    )}
                    title={isMet ? `Goal Met: ${score}% (Streak Active)` : isSun ? `Sunday: ${score}% (Streak Safe)` : `Score: ${score}%`}
                  >
                    {score > 0 ? `${score}%` : '-'}
                  </td>
                );
              })}

              <td className="sticky right-[100px] z-20 bg-white dark:bg-slate-900 px-2 py-2 text-center text-xs font-black text-slate-900 dark:text-white border-l border-slate-200 dark:border-slate-800 tabular-nums">
                {(() => {
                  const logged = dailyStats.filter(s => (s.score || 0) > 0);
                  return logged.length > 0 ? `${Math.round(logged.reduce((a, c) => a + c.score, 0) / logged.length)}%` : '0%';
                })()}
              </td>
              <td className="sticky right-0 z-20 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-semibold text-slate-400 border-l border-slate-200 dark:border-slate-800">
                Avg Score
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend: explains cells, workout options, and locked status */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <Dumbbell className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          Workout (Green)
        </span>
        <span className="flex items-center gap-1.5">
          <Moon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
          Rest Day (Grey - counts as completed task)
        </span>
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <UtensilsCrossed className="h-3 w-3 text-orange-500" />
          Calories: &gt;2400 kcal | Protein: &ge;80g (auto-ticks)
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border border-slate-250 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/80" />
          Not done / Skipped
        </span>
        {!isPastMonth && (
          <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
            <Lock className="h-3 w-3" />
            Locked — only today and yesterday can be edited
            {editableFrom && (
              <span className="tabular-nums">({editableFrom} onward)</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
