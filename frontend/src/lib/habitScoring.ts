/**
 * Client-side mirror of `backend/src/lib/habitScoring.js`.
 *
 * Used ONLY to repaint the score immediately after a cell is clicked, without
 * a round trip. The backend response remains the source of truth, so keep this
 * file in step with the backend rules.
 *
 * Scoring is versioned by date: days before SCORING_V2_FROM keep the original
 * binary rules (so past scores and streaks never change); from that date some
 * habits record a light / medium / dark level and earn part of their weight.
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

/** First day scored with the level-based rules. */
export const SCORING_V2_FROM = '2026-10-24';
export const isV2Date = (dateStr?: string) => !dateStr || dateStr >= SCORING_V2_FROM;

/** First day of the 2026-10-29 revision (new weights, simpler leads/calls and dev levels). */
export const SCORING_V3_FROM = '2026-10-29';
export const isV3Date = (dateStr?: string) => !dateStr || dateStr >= SCORING_V3_FROM;

export const LEVEL = { LIGHT: 1, MEDIUM: 2, DARK: 3 } as const;
export type Level = 1 | 2 | 3;
/** logsMap values: the level of that day's mark (truthy when marked). */
export type LogsMap = Record<string, Record<number, number | boolean>>;

export const LEVEL_LABELS: Record<number, string> = { 1: 'Light', 2: 'Medium', 3: 'Dark' };

export const calorieTargetFor = (dateStr?: string) => (isV2Date(dateStr) ? 2550 : 2400);

/**
 * Counts needed per level for the auto-filled habits. 'medium' is omitted from
 * 2026-10-29: leads and calls are then just light (50%) or dark (100%).
 */
export const AUTO_LEVEL_THRESHOLDS_V2 = {
  leads: { medium: 6, dark: 12 },
  calls: { medium: 4, dark: 9 },
} as const;
export const AUTO_LEVEL_THRESHOLDS_V3 = {
  leads: { dark: 5 }, // 1-4 light, 5+ dark
  calls: { dark: 4 }, // 1-3 light, 4+ dark
} as const;
/** Current thresholds. */
export const AUTO_LEVEL_THRESHOLDS = AUTO_LEVEL_THRESHOLDS_V3;

export const autoThresholdsFor = (kind: 'leads' | 'calls', dateStr?: string): { medium?: number; dark: number } =>
  (isV3Date(dateStr) ? AUTO_LEVEL_THRESHOLDS_V3 : AUTO_LEVEL_THRESHOLDS_V2)[kind];

export function levelFromCount(count: number, kind: 'leads' | 'calls', dateStr?: string): number {
  const t = autoThresholdsFor(kind, dateStr);
  if (!count || count <= 0) return 0;
  if (count >= t.dark) return LEVEL.DARK;
  if (t.medium !== undefined && count >= t.medium) return LEVEL.MEDIUM;
  return LEVEL.LIGHT;
}

type Credit = Partial<Record<number, number>>;
const LIGHT_DARK: Credit = { 1: 0.5, 3: 1 };
const MEDIUM_DARK: Credit = { 2: 0.8, 3: 1 };
const LEADS_CALLS: Credit = { 1: 0.5, 2: 1, 3: 1 };
const DEV_WORK: Credit = { 1: 0.4, 2: 0.8, 3: 1 };
const LEADS_CALLS_V3: Credit = { 1: 0.5, 3: 1 };
const DEV_WORK_V3: Credit = { 2: 0.5, 3: 1 };

export interface ScoringRule {
  id: string;
  weight: number;
  partial?: number;
  single?: number;
  keywords?: string[];
  allKeywords?: string[];
  slots?: string[][];
  credit?: Credit;
  auto?: boolean;
  /** Points when both slots are done, keyed 'lowerLevel-higherLevel'. */
  bothPoints?: Record<string, number>;
}

export const LEGACY_RULES: ScoringRule[] = [
  { id: 'read_before_sleep', weight: 0, allKeywords: ['read', 'sleep'] },
  { id: 'five_prayers', weight: 5, keywords: ['prayer'] },
  { id: 'namaz_dua', weight: 3, keywords: ['namaz', 'dua', 'salah', 'pray'] },
  { id: 'no_doom_scroll', weight: 2, keywords: ['doom', 'scroll'] },
  { id: 'no_disrespecting', weight: 3, keywords: ['disrespect'] },
  { id: 'no_movie_show', weight: 2, keywords: ['movie', 'show', 'series', 'netflix'] },
  { id: 'sleep_on_time', weight: 3, keywords: ['sleep', 'bedtime'] },
  { id: 'wake_up', weight: 3, keywords: ['wake'] },
  { id: 'workout', weight: 10, keywords: ['workout', 'gym', 'training', 'exercise'] },
  { id: 'morning_shower', weight: 2, keywords: ['shower'] },
  { id: 'brush_teeth', weight: 2, keywords: ['brush', 'teeth', 'tooth'] },
  { id: 'book_reading', weight: 5, keywords: ['book', 'read'] },
  { id: 'learning_videos', weight: 3, keywords: ['learning', 'video', 'course', 'tutorial'] },
  { id: 'journaling', weight: 3, keywords: ['journal'] },
  { id: 'writing_goals', weight: 3, keywords: ['dream', 'goal'] },
  { id: 'calories_surplus', weight: 5, keywords: ['calorie'] },
  { id: 'protein_amount', weight: 3, keywords: ['protein'] },
  { id: 'leads_calls', weight: 15, keywords: ['coldcall', 'coldcalling', 'call', 'lead'] },
  { id: 'professional_growth', weight: 8, keywords: ['job', 'linkedin', 'scholarship'] },
  { id: 'development', weight: 20, partial: 15, slots: [['fyp'], ['project']] },
];

export const V2_RULES: ScoringRule[] = [
  { id: 'read_before_sleep', weight: 2, allKeywords: ['read', 'sleep'] },
  { id: 'five_prayers', weight: 5, keywords: ['prayer'] },
  { id: 'namaz_dua', weight: 3, keywords: ['namaz', 'dua', 'salah', 'pray'], credit: LIGHT_DARK },
  { id: 'no_doom_scroll', weight: 2, keywords: ['doom', 'scroll'] },
  { id: 'no_disrespecting', weight: 3, keywords: ['disrespect'] },
  { id: 'no_movie_show', weight: 2, keywords: ['movie', 'show', 'series', 'netflix'] },
  { id: 'sleep_on_time', weight: 3, keywords: ['sleep', 'bedtime'] },
  { id: 'wake_up', weight: 3, keywords: ['wake'] },
  { id: 'workout', weight: 10, keywords: ['workout', 'gym', 'training', 'exercise'] },
  { id: 'morning_shower', weight: 2, keywords: ['shower'], credit: LIGHT_DARK },
  { id: 'brush_teeth', weight: 2, keywords: ['brush', 'teeth', 'tooth'] },
  { id: 'book_reading', weight: 5, keywords: ['book', 'read'] },
  { id: 'learning_videos', weight: 3, keywords: ['learning', 'video', 'course', 'tutorial'] },
  { id: 'journaling', weight: 3, keywords: ['journal'] },
  { id: 'writing_goals', weight: 3, keywords: ['dream', 'goal'] },
  { id: 'calories_surplus', weight: 5, keywords: ['calorie'] },
  { id: 'protein_amount', weight: 3, keywords: ['protein'] },
  { id: 'leads_calls', weight: 15, single: 10, slots: [['coldcall', 'coldcalling', 'call'], ['lead']], credit: LEADS_CALLS, auto: true },
  { id: 'linkedin', weight: 7, keywords: ['linkedin'], credit: LIGHT_DARK },
  { id: 'job_scholarship', weight: 3, keywords: ['job', 'scholarship'], credit: MEDIUM_DARK },
  { id: 'development', weight: 16, single: 12, slots: [['fyp'], ['project']], credit: DEV_WORK },
];

/** Rules from SCORING_V3_FROM (2026-10-29) onward. */
export const V3_RULES: ScoringRule[] = [
  { id: 'read_before_sleep', weight: 3, allKeywords: ['read', 'sleep'] },
  { id: 'five_prayers', weight: 5, keywords: ['prayer'] },
  { id: 'namaz_dua', weight: 3, keywords: ['namaz', 'dua', 'salah', 'pray'], credit: LIGHT_DARK },
  { id: 'no_doom_scroll', weight: 2, keywords: ['doom', 'scroll'] },
  { id: 'no_disrespecting', weight: 3, keywords: ['disrespect'] },
  { id: 'no_movie_show', weight: 2, keywords: ['movie', 'show', 'series', 'netflix'] },
  { id: 'sleep_on_time', weight: 3, keywords: ['sleep', 'bedtime'] },
  { id: 'wake_up', weight: 2, keywords: ['wake'] },
  { id: 'workout', weight: 10, keywords: ['workout', 'gym', 'training', 'exercise'] },
  { id: 'morning_shower', weight: 2, keywords: ['shower'], credit: LIGHT_DARK },
  { id: 'brush_teeth', weight: 2, keywords: ['brush', 'teeth', 'tooth'] },
  { id: 'book_reading', weight: 5, keywords: ['book', 'read'] },
  { id: 'learning_videos', weight: 3, keywords: ['learning', 'video', 'course', 'tutorial'] },
  { id: 'journaling', weight: 3, keywords: ['journal'] },
  { id: 'writing_goals', weight: 3, keywords: ['dream', 'goal'] },
  { id: 'calories_surplus', weight: 5, keywords: ['calorie'] },
  { id: 'protein_amount', weight: 3, keywords: ['protein'] },
  { id: 'leads_calls', weight: 15, single: 10, slots: [['coldcall', 'coldcalling', 'call'], ['lead']], credit: LEADS_CALLS_V3, auto: true, bothPoints: { '1-1': 7, '1-3': 12, '3-3': 15 } },
  { id: 'linkedin', weight: 7, keywords: ['linkedin'], credit: LIGHT_DARK },
  { id: 'job_scholarship', weight: 3, keywords: ['job', 'scholarship'], credit: MEDIUM_DARK },
  { id: 'development', weight: 16, single: 12, slots: [['fyp'], ['project']], credit: DEV_WORK_V3, bothPoints: { '2-2': 8, '2-3': 12, '3-3': 16 } },
];

/** Current rules. */
export const SCORING_RULES = V3_RULES;
export const rulesFor = (dateStr?: string) =>
  isV3Date(dateStr) ? V3_RULES : isV2Date(dateStr) ? V2_RULES : LEGACY_RULES;

export const MAX_DAILY_SCORE = V3_RULES.reduce((total, rule) => total + rule.weight, 0);

const SUFFIXES = ['s', 'es', 'ing', 'ed'];

/** Split a habit name into comparable lowercase word tokens. */
export const tokenizeHabitName = (name: string): string[] =>
  String(name || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const tokenMatchesKeyword = (token: string, keyword: string): boolean =>
  token === keyword || SUFFIXES.some((suffix) => token === `${keyword}${suffix}`);

const matchesKeywords = (tokens: string[], keywords: string[]): boolean =>
  tokens.some((token) => keywords.some((keyword) => tokenMatchesKeyword(token, keyword)));

const ruleMatches = (tokens: string[], rule: ScoringRule) =>
  rule.allKeywords
    ? rule.allKeywords.every((k) => matchesKeywords(tokens, [k]))
    : matchesKeywords(tokens, rule.keywords || (rule.slots || []).flat());

export function ruleForHabit(name: string, dateStr?: string): ScoringRule | undefined {
  const tokens = tokenizeHabitName(name);
  if (tokens.length === 0) return undefined;
  return rulesFor(dateStr).find((rule) => ruleMatches(tokens, rule));
}

/** Levels a habit can be marked with on a day; [3] means a plain tick. */
export function levelOptionsFor(name: string, dateStr?: string): number[] {
  const rule = ruleForHabit(name, dateStr);
  if (!rule || !isV2Date(dateStr) || !rule.credit) return [LEVEL.DARK];
  return Object.keys(rule.credit).map(Number).sort();
}

export const isAutoHabit = (name: string, dateStr?: string) => Boolean(isV2Date(dateStr) && ruleForHabit(name, dateStr)?.auto);

export function autoKindFor(name: string): 'leads' | 'calls' | null {
  const tokens = tokenizeHabitName(name);
  if (matchesKeywords(tokens, ['lead'])) return 'leads';
  if (matchesKeywords(tokens, ['coldcall', 'coldcalling', 'call'])) return 'calls';
  return null;
}

/** Map ruleId -> names of the habits feeding that rule. */
export function assignHabitsToRules(habitNames: string[], dateStr?: string) {
  const assignments = new Map<string, string[]>();
  const unmatched: string[] = [];
  for (const name of habitNames) {
    const rule = ruleForHabit(name, dateStr);
    if (!rule) {
      if (tokenizeHabitName(name).length) unmatched.push(name);
      continue;
    }
    if (!assignments.has(rule.id)) assignments.set(rule.id, []);
    assignments.get(rule.id)!.push(name);
  }
  return { assignments, unmatched };
}

const roundPoints = (value: number) => Math.round(value + 1e-9);

/** Score one day. A plain name (or a mark without a level) counts as dark. */
export function calculateDailyHabitScore(
  checked: Array<string | { name: string; level?: number }>,
  dateStr?: string
): number {
  const v2 = isV2Date(dateStr);
  const rules = rulesFor(dateStr);
  const entries = (checked || []).map((item) =>
    typeof item === 'string' ? { name: item, level: LEVEL.DARK as number } : { name: item.name, level: item.level || LEVEL.DARK }
  );
  const creditOf = (rule: ScoringRule, level: number) => (v2 && rule.credit ? rule.credit[level] ?? 0 : 1);

  const byRule = new Map<string, typeof entries>();
  for (const entry of entries) {
    const rule = ruleForHabit(entry.name, dateStr);
    if (!rule) continue;
    if (!byRule.has(rule.id)) byRule.set(rule.id, []);
    byRule.get(rule.id)!.push(entry);
  }

  let score = 0;
  for (const rule of rules) {
    const assigned = byRule.get(rule.id);
    if (!assigned || assigned.length === 0 || rule.weight === 0) continue;

    if (rule.slots) {
      // Best mark per slot (highest credit), keeping its level for bothPoints.
      const slotBest = rule.slots.map((keywords) =>
        assigned
          .filter((e) => matchesKeywords(tokenizeHabitName(e.name), keywords))
          .reduce((best, e) => {
            const credit = creditOf(rule, e.level);
            return credit > best.credit ? { credit, level: e.level } : best;
          }, { credit: 0, level: 0 })
      );
      const coveredSlots = slotBest.filter((b) => b.credit > 0);
      const covered = coveredSlots.map((b) => b.credit);
      const bothKey = coveredSlots.map((b) => b.level).sort((x, y) => x - y).join('-');
      if (!v2) {
        if (covered.length === rule.slots.length) score += rule.weight;
        else if (rule.partial !== undefined && covered.length >= 1) score += rule.partial;
      } else if (covered.length === rule.slots.length) {
        score += rule.bothPoints?.[bothKey] ?? roundPoints(rule.weight * (covered.reduce((a, b) => a + b, 0) / covered.length));
      } else if (covered.length === 1) {
        score += roundPoints((rule.single ?? rule.weight) * covered[0]);
      }
    } else {
      const best = assigned.reduce((b, e) => Math.max(b, creditOf(rule, e.level)), 0);
      score += v2 ? roundPoints(rule.weight * best) : rule.weight;
    }
  }

  return Math.min(MAX_DAILY_SCORE, score);
}

/** Points a habit is worth on its own on a day (shared rules show the one-habit value). */
export function getHabitWeight(habitName: string, dateStr?: string): number {
  const rule = ruleForHabit(habitName, dateStr);
  if (!rule) return 0;
  if (isV2Date(dateStr) && rule.slots && rule.single !== undefined) return rule.single;
  return rule.weight;
}

/** Points a single habit earns at a level, rounded like the daily score. */
export function pointsForLevel(habitName: string, level: number, dateStr?: string): number {
  const rule = ruleForHabit(habitName, dateStr);
  if (!rule) return 0;
  const base = getHabitWeight(habitName, dateStr);
  const credit = isV2Date(dateStr) && rule.credit ? rule.credit[level] ?? 0 : 1;
  return roundPoints(base * credit);
}

/**
 * Before the v2 date, Coldcall & Leads (and LinkedIn & Job/Scholarships) shared
 * one any-one rule: when habit A is unchecked but its partner B is checked,
 * A is shown greyed with a subtle check. From v2 they score separately.
 */
export function isPartnerFulfilledHabit(
  habitName: string,
  day: number,
  logsMap: LogsMap,
  habits: any[],
  dateStr?: string
): boolean {
  if (isV2Date(dateStr)) return false;
  const tokens = tokenizeHabitName(habitName);
  const groups = [['coldcall', 'call', 'lead'], ['job', 'linkedin', 'scholarship']];
  for (const group of groups) {
    if (!matchesKeywords(tokens, group)) continue;
    const partners = habits.filter((h) => h.name !== habitName && matchesKeywords(tokenizeHabitName(h.name), group));
    return partners.some((p) => Boolean(logsMap[p._id.toString()]?.[day]));
  }
  return false;
}

/**
 * Dynamic weekly worst-day exemption:
 * Weeks start on Monday and end on Sunday.
 * In each week, the single weakest day (< 80%) is exempt so the streak does NOT break.
 * If 2 or more days in the same week are < 80%, only the single worst one is exempt,
 * and subsequent failing days break the streak.
 */
export function computeWeeklyWorstDayExemptions(
  dailyStats: Array<{ day: number; score: number }>,
  year: number,
  month: number,
  endDay: number
): Set<number> {
  const exemptDays = new Set<number>();
  const weeks: number[][] = [];
  let currentWeek: number[] = [];

  for (let day = 1; day <= dailyStats.length; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  for (const weekDays of weeks) {
    const evaluatedDays = weekDays.filter((d) => d <= endDay);
    if (evaluatedDays.length === 0) continue;

    const belowGoalDays = evaluatedDays
      .map((d) => dailyStats[d - 1])
      .filter((stat) => stat && stat.score < STREAK_THRESHOLD);

    if (belowGoalDays.length > 0) {
      let minDay = belowGoalDays[0];
      for (const stat of belowGoalDays) {
        if (stat.score < minDay.score) {
          minDay = stat;
        }
      }
      exemptDays.add(minDay.day);
    }
  }

  return exemptDays;
}

/** Score every day of a month from the logs map returned by the API. */
export function computeAllDailyScores(
  habits: any[],
  logsMap: LogsMap,
  daysInMonth: number,
  year: number,
  month: number
): Array<{ day: number; date: string; weekday: string; isSunday: boolean; score: number; completedCount: number; isBelowGoal: boolean; isExempt: boolean }> {
  const weekdaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const draftResults = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month - 1, day);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const checked: Array<{ name: string; level: number }> = [];
    habits.forEach((habit) => {
      const value = logsMap[habit._id.toString()]?.[day];
      if (value) checked.push({ name: habit.name, level: typeof value === 'number' ? value : LEVEL.DARK });
    });

    const score = calculateDailyHabitScore(checked, dateStr);
    draftResults.push({
      day,
      date: dateStr,
      weekday: weekdaysShort[dayDate.getDay()],
      isSunday: dayDate.getDay() === 0,
      score,
      completedCount: checked.length,
      isBelowGoal: score < STREAK_THRESHOLD
    });
  }

  const now = new Date();
  const isCurrentMonthNow = now.getFullYear() === year && (now.getMonth() + 1) === month;
  const endDayForExemptions = isCurrentMonthNow ? Math.max(0, now.getDate() - 1) : daysInMonth;
  const exemptDays = computeWeeklyWorstDayExemptions(draftResults, year, month, endDayForExemptions);

  return draftResults.map((item) => ({
    ...item,
    isExempt: exemptDays.has(item.day)
  }));
}

export function computeStreakCount(
  dailyStats: Array<{ day: number; isSunday: boolean; score: number }>,
  isCurrentMonth: boolean,
  todayDay: number,
  year?: number,
  month?: number
): number {
  const curYear = year || new Date().getFullYear();
  const curMonth = month || new Date().getMonth() + 1;

  if (isCurrentMonth) {
    // Only completed past days (1 to todayDay - 1) determine the guaranteed streak.
    // The current day has not ended yet (midnight has not arrived),
    // so an incomplete today must NEVER reset or break the streak to 0.
    const pastEndDay = Math.max(0, todayDay - 1);
    const exemptDays = computeWeeklyWorstDayExemptions(dailyStats, curYear, curMonth, pastEndDay);

    let streak = 0;
    for (let day = 1; day <= pastEndDay; day++) {
      const stat = dailyStats[day - 1];
      if (!stat) continue;

      if (stat.score >= STREAK_THRESHOLD) {
        streak++;
      } else if (exemptDays.has(day)) {
        // Exempt: Lowest day of week below 80% does not break streak!
      } else {
        streak = 0;
      }
    }

    // Today is in progress (updates officially after 12:00 midnight).
    // If today's habits are already marked >= 80%, immediately award +1 credit!
    const todayStat = dailyStats[todayDay - 1];
    if (todayStat && todayStat.score >= STREAK_THRESHOLD) {
      streak++;
    }

    return streak;
  } else {
    // Past month: all days have concluded past midnight.
    const endDay = dailyStats.length;
    const exemptDays = computeWeeklyWorstDayExemptions(dailyStats, curYear, curMonth, endDay);

    let streak = 0;
    for (let day = 1; day <= endDay; day++) {
      const stat = dailyStats[day - 1];
      if (!stat) continue;

      if (stat.score >= STREAK_THRESHOLD) {
        streak++;
      } else if (exemptDays.has(day)) {
        // Exempt
      } else {
        streak = 0;
      }
    }

    return streak;
  }
}

export const MAJOR_HABIT_CONFIGS = [
  { key: 'book_reading', title: 'Book Reading', habits: ['book'], subtitle: 'Daily Reading' },
  { key: 'journaling', title: 'Journaling', habits: ['journal', 'dream', 'goal'], subtitle: 'Journaling & Goals' },
  { key: 'development', title: 'Development', habits: ['fyp', 'project'], subtitle: 'FYP & Project Dev' },
  { key: 'leads_calls', title: 'Leads / Calls', habits: ['coldcall', 'lead'], subtitle: 'Cold Call & Leads' },
  { key: 'workout', title: 'Workout', habits: ['workout'], subtitle: 'Training & Rest' },
  { key: 'diet', title: 'Diet', habits: ['calorie', 'protein'], subtitle: 'Calories & Protein' },
  { key: 'personal_growth', title: 'Personal Growth', habits: ['learning', 'video', 'book', 'movie', 'show', 'disrespect', 'doom', 'scroll', 'sleep', 'prayer', 'namaz', 'dua'], subtitle: 'Mindset & Discipline' },
  { key: 'professional_growth', title: 'Professional Growth', habits: ['job', 'linkedin', 'scholarship'], subtitle: 'Careers & Network' }
];

export function computeMajorHabitsStats(
  habits: any[],
  logsMap: LogsMap,
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