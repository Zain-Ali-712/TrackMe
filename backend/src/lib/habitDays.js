/**
 * Everything needed to score any day: habits, their marks, and the activity
 * that fills in auto habits (leads, calls, daily goals). Loaded once per
 * request and kept in memory, so a month view and the all-time streak are
 * scored by exactly the same code.
 */
import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import Lead from '../models/Lead.js';
import DailyGoal from '../models/DailyGoal.js';
import { toDateString } from './dateRules.js';
import {
  calculateDailyHabitScore,
  computeContinuousStreak,
  isAutoHabit,
  autoKindFor,
  levelFromCount,
  isBreakDay,
  isV4Date,
  LEVEL,
  SCORING_V2_FROM
} from './habitScoring.js';

/** "YYYY-MM-DD" for the day after `dateStr`. */
export function nextDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toDateString(new Date(y, m - 1, d + 1));
}

/** True when a habit belongs to the routine on a given day. */
export function habitAppliesOn(habit, dateStr) {
  if (habit.retiredFrom && dateStr >= habit.retiredFrom) return false;
  return true;
}

/** Habits added after the level-based scoring began were not possible before they existed. */
function habitCountsTowardPossible(habit, dateStr) {
  if (!habitAppliesOn(habit, dateStr)) return false;
  const added = habit.createdAt ? toDateString(new Date(habit.createdAt)) : '';
  return !added || added < SCORING_V2_FROM || added <= dateStr;
}

const countBy = (items, dateOf) => {
  const map = new Map();
  for (const item of items) {
    const key = toDateString(new Date(dateOf(item)));
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
};

export async function loadScoringContext(habits) {
  const [logs, leads, calls, goals] = await Promise.all([
    HabitLog.find({ completed: true }).select('habit date value level').lean(),
    Lead.find().select('createdAt').lean(),
    Lead.find({ coldCalled: true }).select('coldCalledAt updatedAt createdAt').lean(),
    DailyGoal.find().select('date done').lean()
  ]);

  const logsByHabit = new Map(); // habitId -> Map(date -> log)
  let firstDate = null;
  for (const log of logs) {
    const id = log.habit.toString();
    if (!logsByHabit.has(id)) logsByHabit.set(id, new Map());
    logsByHabit.get(id).set(log.date, log);
    if (!firstDate || log.date < firstDate) firstDate = log.date;
  }

  const goalsByDate = new Map(); // date -> { total, done }
  for (const g of goals) {
    const entry = goalsByDate.get(g.date) || { total: 0, done: 0 };
    entry.total += 1;
    if (g.done) entry.done += 1;
    goalsByDate.set(g.date, entry);
  }

  return {
    habits,
    logsByHabit,
    leadsByDate: countBy(leads, (l) => l.createdAt),
    callsByDate: countBy(calls, (l) => l.coldCalledAt || l.updatedAt || l.createdAt),
    goalsByDate,
    firstDate
  };
}

/**
 * The marks for one day after auto-filling.
 * @returns {Map<string, {level: number, ratio?: number, value?: number}>} habitId -> mark
 */
export function marksForDay(ctx, dateStr) {
  const marks = new Map();
  if (isBreakDay(dateStr)) return marks;

  const leadsCount = ctx.leadsByDate.get(dateStr) || 0;
  const callsCount = ctx.callsByDate.get(dateStr) || 0;
  const goals = ctx.goalsByDate.get(dateStr) || { total: 0, done: 0 };
  const callsLevel = levelFromCount(callsCount, 'calls', dateStr);

  for (const habit of ctx.habits) {
    if (!habitAppliesOn(habit, dateStr)) continue;
    const id = habit._id.toString();

    if (isAutoHabit(habit.name, dateStr)) {
      const kind = autoKindFor(habit.name);
      let mark = null;
      if (kind === 'calls') {
        if (callsLevel) mark = { level: callsLevel };
      } else if (kind === 'leads') {
        const own = levelFromCount(leadsCount, 'leads', dateStr);
        // From v4, calls tick leads too (at the calls' level).
        const level = isV4Date(dateStr) ? Math.max(own, callsLevel) : own;
        if (level) mark = { level };
      } else if (kind === 'goals_written') {
        if (goals.total > 0) mark = { level: LEVEL.DARK };
      } else if (kind === 'goals_met') {
        if (goals.total > 0 && goals.done > 0) {
          const ratio = goals.done / goals.total;
          mark = { level: ratio >= 1 ? LEVEL.DARK : LEVEL.MEDIUM, ratio };
        }
      }
      if (mark) marks.set(id, mark);
      continue;
    }

    const log = ctx.logsByHabit.get(id)?.get(dateStr);
    if (log) marks.set(id, { level: log.level || LEVEL.DARK, value: log.value });
  }
  return marks;
}

/** Score and counts for one day. */
export function scoreDay(ctx, dateStr) {
  const isBreak = isBreakDay(dateStr);
  const marks = marksForDay(ctx, dateStr);
  const checked = [];
  for (const habit of ctx.habits) {
    const mark = marks.get(habit._id.toString());
    if (mark) checked.push({ name: habit.name, level: mark.level, ratio: mark.ratio });
  }
  const possible = ctx.habits.filter((h) => habitCountsTowardPossible(h, dateStr)).length;
  return {
    date: dateStr,
    isBreak,
    marks,
    completedCount: checked.length,
    possible,
    score: isBreak ? 0 : calculateDailyHabitScore(checked, dateStr)
  };
}

/** The all-time streak (not reset by months), from the first tracked day to today. */
export function streakFromHistory(ctx, todayStr) {
  if (!ctx.firstDate) return { streak: 0, throughYesterday: 0, exemptDates: new Set() };
  const days = [];
  for (let d = ctx.firstDate; d <= todayStr; d = nextDate(d)) {
    const { score, isBreak } = scoreDay(ctx, d);
    days.push({ date: d, score, isBreak });
  }
  return computeContinuousStreak(days, todayStr);
}
