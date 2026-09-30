/**
 * Client-side mirror of `backend/src/lib/habitScoring.js`.
 *
 * Used ONLY to repaint the score immediately after a checkbox is clicked,
 * without a round trip. The backend response remains the source of truth, so
 * keep this file in step with the backend rules.
 *
 * Habits match by KEYWORD rather than exact name, so renaming a habit can
 * never silently drop its points (which is what capped a perfect day at 95%).
 */

export interface MajorHabitSummary {
  key: string;
  title: string;
  subtitle: string;
  habits: string[];
  percent: number;
  completedChecks: number;
  totalTarget: number;
}

export const STREAK_THRESHOLD = 80;

/** A day at or above this score extends the streak. */
export const STREAK_GOAL = STREAK_THRESHOLD;

export interface ScoringRule {
  id: string;
  weight: number;
  partial?: number;
  keywords?: string[];
  slots?: string[][];
}

export const SCORING_RULES: ScoringRule[] = [
  { id: 'five_prayers', weight: 5, keywords: ['prayer'] },
  { id: 'namaz_dua', weight: 5, keywords: ['namaz', 'dua', 'salah', 'pray'] },
  { id: 'no_doom_scroll', weight: 2, keywords: ['doom', 'scroll'] },
  { id: 'no_disrespecting', weight: 1, keywords: ['disrespect'] },
  { id: 'no_movie_show', weight: 2, keywords: ['movie', 'show', 'series', 'netflix'] },
  { id: 'sleep_on_time', weight: 3, keywords: ['sleep', 'bedtime'] },
  { id: 'wake_up', weight: 5, keywords: ['wake'] },
  { id: 'workout', weight: 10, keywords: ['workout', 'gym', 'training', 'exercise'] },
  { id: 'morning_shower', weight: 2, keywords: ['shower'] },
  { id: 'book_reading', weight: 5, keywords: ['book', 'read'] },
  { id: 'learning_videos', weight: 3, keywords: ['learning', 'video', 'course', 'tutorial'] },
  { id: 'journaling', weight: 2, keywords: ['journal'] },
  { id: 'writing_dreams', weight: 2, keywords: ['dream'] },
  { id: 'calories_surplus', weight: 5, keywords: ['calorie'] },
  { id: 'protein_amount', weight: 3, keywords: ['protein'] },
  { id: 'leads_calls', weight: 15, keywords: ['coldcall', 'coldcalling', 'call', 'lead'] },
  { id: 'professional_growth', weight: 10, keywords: ['job', 'linkedin', 'scholarship'] },
  { id: 'development', weight: 20, partial: 15, slots: [['fyp'], ['project']] }
];

export const MAX_DAILY_SCORE = SCORING_RULES.reduce((total, rule) => total + rule.weight, 0);

const SUFFIXES = ['s', 'es', 'ing', 'ed'];

/** Split a habit name into comparable lowercase word tokens. */
export const tokenizeHabitName = (name: string): string[] =>
  String(name || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** A word matches a keyword when it is the keyword, or the keyword plus a common suffix. */
const tokenMatchesKeyword = (token: string, keyword: string): boolean =>
  token === keyword || SUFFIXES.some((suffix) => token === `${keyword}${suffix}`);

const matchesKeywords = (tokens: string[], keywords: string[]): boolean =>
  tokens.some((token) => keywords.some((keyword) => tokenMatchesKeyword(token, keyword)));

const keywordsFor = (rule: ScoringRule): string[] => rule.keywords || (rule.slots || []).flat();

/** Map ruleId -> names of the habits feeding that rule. */
export function assignHabitsToRules(habitNames: string[]) {
  const assignments = new Map<string, string[]>();
  const unmatched: string[] = [];

  for (const name of habitNames) {
    const tokens = tokenizeHabitName(name);
    if (tokens.length === 0) continue;

    const rule = SCORING_RULES.find((candidate) =>
      matchesKeywords(tokens, keywordsFor(candidate))
    );

    if (!rule) {
      unmatched.push(name);
      continue;
    }

    if (!assignments.has(rule.id)) assignments.set(rule.id, []);
    assignments.get(rule.id)!.push(name);
  }

  return { assignments, unmatched };
}

/** Score one day from the names of the habits checked that day. */
export function calculateDailyHabitScore(checkedHabitNames: string[]): number {
  const { assignments } = assignHabitsToRules(checkedHabitNames || []);

  let score = 0;

  for (const rule of SCORING_RULES) {
    const assigned = assignments.get(rule.id);
    if (!assigned || assigned.length === 0) continue;

    if (rule.slots) {
      const coveredSlots = rule.slots.filter((keywords) =>
        assigned.some((name) => matchesKeywords(tokenizeHabitName(name), keywords))
      ).length;

      if (coveredSlots === rule.slots.length) {
        score += rule.weight;
      } else if (rule.partial !== undefined && coveredSlots >= 1) {
        score += rule.partial;
      }
    } else {
      score += rule.weight;
    }
  }

  return Math.min(MAX_DAILY_SCORE, score);
}

/** Score every day of a month from the logs map returned by the API. */
export function computeAllDailyScores(
  habits: any[],
  logsMap: Record<string, Record<number, boolean>>,
  daysInMonth: number,
  year: number,
  month: number
): Array<{ day: number; date: string; weekday: string; isSunday: boolean; score: number; completedCount: number }> {
  const weekdaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const results = [];

  const nameByHabitId: Record<string, string> = {};
  habits.forEach((habit) => {
    nameByHabitId[habit._id.toString()] = habit.name;
  });

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month - 1, day);

    const checkedNames: string[] = [];
    habits.forEach((habit) => {
      const habitId = habit._id.toString();
      if (logsMap[habitId] && logsMap[habitId][day]) {
        checkedNames.push(nameByHabitId[habitId]);
      }
    });

    results.push({
      day,
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      weekday: weekdaysShort[dayDate.getDay()],
      isSunday: dayDate.getDay() === 0,
      score: calculateDailyHabitScore(checkedNames),
      completedCount: checkedNames.length
    });
  }

  return results;
}

export function computeStreakCount(
  dailyStats: Array<{ day: number; isSunday: boolean; score: number }>,
  isCurrentMonth: boolean,
  todayDay: number
): number {
  let streak = 0;
  const endDay = isCurrentMonth ? todayDay : dailyStats.length;

  for (let day = 1; day <= endDay; day++) {
    const stat = dailyStats[day - 1];
    if (!stat) continue;

    if (stat.score >= STREAK_THRESHOLD) {
      streak++;
    } else if (stat.isSunday) {
      // Sunday is exempt: below-goal days do not break the streak.
    } else if (day !== endDay || !isCurrentMonth) {
      streak = 0;
    }
  }

  return streak;
}

export const MAJOR_HABIT_CONFIGS = [
  { key: 'book_reading', title: 'Book Reading', habits: ['book'], subtitle: 'Daily Reading' },
  { key: 'journaling', title: 'Journaling', habits: ['journal', 'dream'], subtitle: 'Journaling & Dreams' },
  { key: 'development', title: 'Development', habits: ['fyp', 'project'], subtitle: 'FYP & Project Dev' },
  { key: 'leads_calls', title: 'Leads / Calls', habits: ['coldcall', 'lead'], subtitle: 'Cold Call & Leads' },
  { key: 'workout', title: 'Workout', habits: ['workout'], subtitle: 'Training & Rest' },
  { key: 'diet', title: 'Diet', habits: ['calorie', 'protein'], subtitle: 'Calories & Protein' },
  { key: 'personal_growth', title: 'Personal Growth', habits: ['learning', 'video', 'book', 'movie', 'show', 'disrespect', 'doom', 'scroll', 'sleep', 'prayer', 'namaz', 'dua'], subtitle: 'Mindset & Discipline' },
  { key: 'professional_growth', title: 'Professional Growth', habits: ['job', 'linkedin', 'scholarship'], subtitle: 'Careers & Network' }
];

export function computeMajorHabitsStats(
  habits: any[],
  logsMap: Record<string, Record<number, boolean>>,
  elapsedDays: number
): MajorHabitSummary[] {
  return MAJOR_HABIT_CONFIGS.map((config) => {
    const matchedHabitIds = habits
      .filter((habit) => {
        const tokens = tokenizeHabitName(habit.name);
        return tokens.some((token) =>
          config.habits.some(
            (keyword) =>
              token === keyword ||
              token === `${keyword}s` ||
              token === `${keyword}ing` ||
              token === `${keyword}ed`
          )
        );
      })
      .map((habit) => habit._id.toString());

    const completedChecks = matchedHabitIds.reduce(
      (sum, habitId) => sum + Object.keys(logsMap[habitId] || {}).length,
      0
    );

    const totalTarget = matchedHabitIds.length * Math.max(1, elapsedDays);

    return {
      key: config.key,
      title: config.title,
      subtitle: config.subtitle,
      habits: config.habits,
      completedChecks,
      totalTarget,
      percent: totalTarget > 0 ? Math.min(100, Math.round((completedChecks / totalTarget) * 100)) : 0
    };
  });
}