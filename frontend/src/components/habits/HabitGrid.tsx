import React, { useState, useEffect } from 'react';
import { Check, Edit2, Plus, Flame, Lock, Dumbbell, Moon, X, UtensilsCrossed, Activity, Sparkles, ShieldCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn, getHabitIcon } from '@/lib/utils';
import { STREAK_THRESHOLD, getHabitWeight, isPartnerFulfilledHabit } from '@/lib/habitScoring';
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

interface MetricCellProps {
  day: number;
  dateStr: string;
  currentVal: number;
  targetThreshold: number;
  targetComparison: 'greater' | 'greater_equal';
  unit: string;
  isMet: boolean;
  isEditable: boolean;
  isToday: boolean;
  isBelowGoal: boolean;
  label: string;
  icon: React.ReactNode;
  presets: number[];
  onSave: (val: number) => void;
}

function MetricInputCell({
  day,
  currentVal,
  targetThreshold,
  targetComparison,
  unit,
  isMet,
  isEditable,
  isToday,
  isBelowGoal,
  label,
  icon,
  presets,
  onSave
}: MetricCellProps) {
  const [valInput, setValInput] = useState(currentVal > 0 ? String(currentVal) : '');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setValInput(currentVal > 0 ? String(currentVal) : '');
  }, [currentVal]);

  const handleCommit = (num: number) => {
    onSave(num);
    setIsOpen(false);
  };

  const formattedDisplay = currentVal > 0 
    ? (currentVal >= 1000 ? `${(currentVal / 1000).toFixed(1)}k` : `${currentVal}`)
    : '';

  const tooltipText = currentVal > 0
    ? `${currentVal}${unit} (${isMet ? 'Target Met!' : 'Under Target'}) — Click to edit`
    : isEditable
    ? `Click to enter ${label} (Target: ${targetComparison === 'greater' ? '>' : '≥'} ${targetThreshold}${unit})`
    : 'Day locked';

  return (
    <td
      className={cn(
        "w-[34px] min-w-[34px] p-1 text-center border-r border-slate-100 dark:border-slate-800/60 transition-colors",
        isToday ? "bg-blue-50/40 dark:bg-blue-950/20" : isBelowGoal ? "bg-rose-50/25 dark:bg-rose-950/10" : ""
      )}
    >
      {isEditable ? (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-all duration-150 border cursor-pointer outline-none shadow-2xs relative",
                isMet
                  ? "bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-500 dark:text-white dark:border-emerald-400 dark:shadow-[0_0_8px_rgba(16,185,129,0.35)]"
                  : currentVal > 0
                  ? "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-700"
                  : "border-slate-250 bg-slate-50/50 hover:border-slate-400 hover:bg-white dark:bg-slate-800/80 dark:border-slate-700 dark:hover:border-slate-500 dark:hover:bg-slate-700/80"
              )}
              title={tooltipText}
            >
              {isMet ? (
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              ) : currentVal > 0 ? (
                <span className="text-[9px] font-black leading-none">{formattedDisplay}</span>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48 p-2.5 text-xs z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-100 text-[11px]">
              {icon}
              <span>{label}</span>
              <span className="text-[10px] text-slate-400 font-normal ml-auto">Day {day}</span>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  autoFocus
                  placeholder={`Count in ${unit}`}
                  value={valInput}
                  onChange={(e) => setValInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const num = parseFloat(valInput) || 0;
                      handleCommit(num);
                    }
                  }}
                  className="w-full h-7 px-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleCommit(parseFloat(valInput) || 0)}
                  className="px-2 h-7 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded font-bold text-[11px] shrink-0"
                >
                  Save
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[9px] font-semibold text-slate-400 mr-0.5">Quick:</span>
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setValInput(String(p));
                      handleCommit(p);
                    }}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 transition-colors"
                  >
                    {p}{unit}
                  </button>
                ))}
              </div>

              {currentVal > 0 && (
                <button
                  type="button"
                  onClick={() => handleCommit(0)}
                  className="w-full text-center text-[10px] text-rose-500 hover:text-rose-600 font-semibold pt-1 block cursor-pointer"
                >
                  Clear entry
                </button>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div
          className={cn(
            "w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-all duration-150 border opacity-55 saturate-[0.85] cursor-not-allowed",
            isMet
              ? "bg-emerald-500 text-white border-emerald-600 dark:border-emerald-400"
              : currentVal > 0
              ? "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-700"
              : "border-slate-250 bg-slate-50/50 dark:bg-slate-800/80 dark:border-slate-700"
          )}
          title="This day is locked."
        >
          {isMet ? (
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          ) : currentVal > 0 ? (
            <span className="text-[9px] font-black leading-none">{formattedDisplay}</span>
          ) : null}
        </div>
      )}
    </td>
  );
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
                const dayStat = dailyStats[day - 1];
                const isPastDay = isPastMonth || (isCurrentMonth && day < todayDay);
                const isBelowGoal = isPastDay && dayStat && dayStat.score < STREAK_THRESHOLD;
                const isExempt = dayStat?.isExempt;

                return (
                  <th
                    key={day}
                    className={cn(
                      "min-w-[34px] w-[34px] p-1 font-bold transition-colors border-r border-slate-200/50 dark:border-slate-800",
                      isToday
                        ? "bg-blue-50/90 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                        : isBelowGoal
                        ? isExempt
                          ? "bg-amber-50/60 dark:bg-amber-950/25 text-amber-700 dark:text-amber-400"
                          : "bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400"
                        : isSunday
                        ? "bg-amber-50/40 dark:bg-amber-950/25 text-amber-700 dark:text-amber-400"
                        : "dark:text-slate-400"
                    )}
                    title={
                      isBelowGoal
                        ? isExempt
                          ? `Day ${day} (${dayStat?.score || 0}%): Weekly Lowest Day — EXEMPT from breaking streak`
                          : `Day ${day} (${dayStat?.score || 0}%): Below ${STREAK_THRESHOLD}% goal`
                        : undefined
                    }
                  >
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "text-[9px] font-semibold uppercase tracking-tight flex items-center gap-0.5",
                        isBelowGoal && !isExempt ? "text-rose-600 dark:text-rose-400 font-extrabold" : isSunday ? "text-amber-600 dark:text-amber-400 font-bold" : "opacity-75 dark:text-slate-400"
                      )}>
                        {weekday}
                        {isExempt && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" title="Weekly Exempt Day" />}
                      </span>
                      <span
                        className={cn(
                          "text-xs tabular-nums mt-0.5 w-5 h-5 rounded-full flex items-center justify-center font-bold",
                          isToday 
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-xs" 
                            : isBelowGoal && !isExempt
                            ? "text-rose-600 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-900/40 font-black"
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
                  {/* Sticky Habit Name Column with Lucide Icon (NO EMOJIS) + Percentage Weightage */}
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
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Percentage weightage badge aligned on the right */}
                        <span 
                          className="px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-tight bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 tabular-nums"
                          title={`${getHabitWeight(habit.name)}% daily score weightage`}
                        >
                          {getHabitWeight(habit.name)}%
                        </span>
                        <button
                          onClick={() => onEditHabit(habit)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity"
                          title="Edit Habit"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Days Checkbox Matrix */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const isChecked = Boolean(logsMap[hId] && logsMap[hId][day]);
                    const isToday = isCurrentMonth && day === todayDay;
                    const isSunday = new Date(year, month - 1, day).getDay() === 0;
                    const dateStr = dateFor(day);
                    const isEditable = !isPastMonth && isEditableDay(dateStr);
                    const isPastDay = isPastMonth || (isCurrentMonth && day < todayDay);
                    const dayStat = dailyStats[day - 1];
                    const isBelowGoal = isPastDay && Boolean(dayStat && dayStat.score < STREAK_THRESHOLD);

                    // 1. Special Case: Calories Habit Input (> 2400 kcal)
                    if (isCalorieHabit) {
                      const currentCal = metricsMap?.[day]?.calories || 0;
                      return (
                        <MetricInputCell
                          key={day}
                          day={day}
                          dateStr={dateStr}
                          currentVal={currentCal}
                          targetThreshold={2400}
                          targetComparison="greater"
                          unit=" kcal"
                          isMet={isChecked || currentCal > 2400}
                          isEditable={isEditable}
                          isToday={isToday}
                          isBelowGoal={isBelowGoal}
                          label="Calories Surplus"
                          icon={<UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" />}
                          presets={[2450, 2600, 2800, 3000]}
                          onSave={(val) => {
                            if (onUpdateMetric) onUpdateMetric({ date: dateStr, calories: val });
                          }}
                        />
                      );
                    }

                    // 2. Special Case: Protein Habit Input (≥ 80g)
                    if (isProteinHabit) {
                      const currentProt = metricsMap?.[day]?.protein || 0;
                      return (
                        <MetricInputCell
                          key={day}
                          day={day}
                          dateStr={dateStr}
                          currentVal={currentProt}
                          targetThreshold={80}
                          targetComparison="greater_equal"
                          unit="g"
                          isMet={isChecked || currentProt >= 80}
                          isEditable={isEditable}
                          isToday={isToday}
                          isBelowGoal={isBelowGoal}
                          label="Protein Amount"
                          icon={<Activity className="h-3.5 w-3.5 text-emerald-500" />}
                          presets={[80, 90, 100, 120]}
                          onSave={(val) => {
                            if (onUpdateMetric) onUpdateMetric({ date: dateStr, protein: val });
                          }}
                        />
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
                            isToday ? "bg-blue-50/40 dark:bg-blue-950/20" : isBelowGoal ? "bg-rose-50/25 dark:bg-rose-950/10" : isSunday ? "dark:bg-amber-950/10" : ""
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

                    // 4. Default Habit Checkbox (with Grouped Partner Fulfilled & Lead Safeguards)
                    const isPartnerFulfilled = !isChecked && isPartnerFulfilledHabit(habit.name, day, logsMap, habits);

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
                          isPartnerFulfilled
                            ? 'Fulfilled via partner habit (Click to mark both completed)'
                            : isChecked
                            ? 'Completed'
                            : isEditable
                            ? 'Click to mark complete'
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
                            : isBelowGoal
                            ? "bg-rose-50/25 dark:bg-rose-950/10"
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
                              : isPartnerFulfilled
                              ? "bg-slate-200/90 dark:bg-slate-700/70 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:border-slate-400 shadow-2xs"
                              : "border-slate-250 bg-slate-50/50 hover:border-slate-400 hover:bg-white dark:bg-slate-800/80 dark:border-slate-700 dark:hover:border-slate-500 dark:hover:bg-slate-700/80",
                            !isEditable && "hover:border-slate-250 hover:bg-slate-50/50 dark:hover:bg-slate-800/80 dark:hover:border-slate-700"
                          )}
                        >
                          {isChecked ? (
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          ) : isPartnerFulfilled ? (
                            <Check className="h-3 w-3 stroke-[2.5] opacity-65 text-slate-500 dark:text-slate-300" />
                          ) : null}
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
                const isExempt = stat.isExempt;
                const isPastDay = isPastMonth || (isCurrentMonth && stat.day < todayDay);
                const isBelowGoal = isPastDay && !isMet;

                return (
                  <td
                    key={stat.day}
                    className={cn(
                      "w-[34px] min-w-[34px] p-1 text-center border-r border-slate-100 dark:border-slate-800/60 text-[11px] tabular-nums font-extrabold",
                      isMet
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40"
                        : isBelowGoal
                        ? isExempt
                          ? "text-amber-600 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/30"
                          : "text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40"
                        : "text-slate-400 dark:text-slate-600"
                    )}
                    title={
                      isMet
                        ? `Goal Met: ${score}% (Streak Active)`
                        : isBelowGoal
                        ? isExempt
                          ? `Exempt Day (${score}%): Lowest day of week — Streak preserved`
                          : `Below 80% Goal (${score}%) — Streak broken`
                        : `Score: ${score}%`
                    }
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
