/**
 * Canonical daily habit scoring.
 *
 * The frontend mirrors this file in `frontend/src/lib/habitScoring.ts` purely
 * for optimistic updates — the backend is the source of truth.
 *
 * Habits are matched to rules by KEYWORD, never by exact name, so renaming a
 * habit can never silently drop its points. Matching is per WORD: a token
 * matches a keyword when it is the keyword itself or the keyword plus a common
 * suffix (s / es / ing / ed), so "5 Prayers" matches "prayer" while "shower"
 * does not match "show".
 *
 * Scoring is VERSIONED BY DATE. Days before SCORING_V2_FROM keep the original
 * rules exactly, so past scores and streaks never change. From that date on:
 *   - Some habits record an intensity level (light / medium / dark) instead of
 *     a plain tick, and the level decides how much of the weight they earn.
 *   - Lead generation and Cold calls are filled in automatically from the day's
 *     real counts.
 *   - Every rule's points are rounded to a whole number (x.5 rounds up).
 *
 * Rule shapes:
 *   keywords     - any matching habit feeds the rule.
 *   allKeywords  - a habit feeds the rule only if it contains ALL the words
 *                  ("Read before Sleep" must not count as book reading or sleep).
 *   slots        - two related habits share one rule. One covered slot earns
 *                  `single` (v2) / `partial` (legacy); both earn `weight`.
 *
 * A habit is assigned to exactly ONE rule (the first it matches), so nothing is
 * double counted. Each version's weights sum to exactly 100.
 */

export const STREAK_THRESHOLD = 80;

/** First day scored with the level-based rules ("YYYY-MM-DD"). */
export const SCORING_V2_FROM = '2026-10-24';

export const isV2Date = (dateStr) => !dateStr || String(dateStr) >= SCORING_V2_FROM;

/** First day of the 2026-10-29 revision (new weights, simpler leads/calls and dev levels). */
export const SCORING_V3_FROM = '2026-10-29';
export const isV3Date = (dateStr) => !dateStr || String(dateStr) >= SCORING_V3_FROM;

/** Intensity levels stored on a habit log. A log without a level counts as DARK (full). */
export const LEVEL = { LIGHT: 1, MEDIUM: 2, DARK: 3 };

/** Calorie surplus target for a day. */
export const calorieTargetFor = (dateStr) => (isV2Date(dateStr) ? 2550 : 2400);

/**
 * Counts needed per level for the auto-filled habits. 'medium' is omitted from
 * 2026-10-29: leads and calls are then just light (50%) or dark (100%).
 */
export const AUTO_LEVEL_THRESHOLDS_V2 = {
  leads: { medium: 6, dark: 12 }, // 1-5 light, 6-11 medium, 12+ dark
  calls: { medium: 4, dark: 9 }   // 1-3 light, 4-8 medium, 9+ dark
};
export const AUTO_LEVEL_THRESHOLDS_V3 = {
  leads: { dark: 5 }, // 1-4 light, 5+ dark
  calls: { dark: 4 }  // 1-3 light, 4+ dark
};
export const AUTO_LEVEL_THRESHOLDS = AUTO_LEVEL_THRESHOLDS_V3;

export const autoThresholdsFor = (kind, dateStr) =>
  (isV3Date(dateStr) ? AUTO_LEVEL_THRESHOLDS_V3 : AUTO_LEVEL_THRESHOLDS_V2)[kind];

export function levelFromCount(count, kind, dateStr) {
  const t = autoThresholdsFor(kind, dateStr);
  if (!t || !count || count <= 0) return 0;
  if (count >= t.dark) return LEVEL.DARK;
  if (t.medium !== undefined && count >= t.medium) return LEVEL.MEDIUM;
  return LEVEL.LIGHT;
}

// Credit tables: share of the weight each level earns.
const FULL_ONLY = { [LEVEL.DARK]: 1 };
const LIGHT_DARK = { [LEVEL.LIGHT]: 0.5, [LEVEL.DARK]: 1 };
const MEDIUM_DARK = { [LEVEL.MEDIUM]: 0.8, [LEVEL.DARK]: 1 };
const LEADS_CALLS = { [LEVEL.LIGHT]: 0.5, [LEVEL.MEDIUM]: 1, [LEVEL.DARK]: 1 };
const DEV_WORK = { [LEVEL.LIGHT]: 0.4, [LEVEL.MEDIUM]: 0.8, [LEVEL.DARK]: 1 };
const LEADS_CALLS_V3 = { [LEVEL.LIGHT]: 0.5, [LEVEL.DARK]: 1 };
const DEV_WORK_V3 = { [LEVEL.MEDIUM]: 0.5, [LEVEL.DARK]: 1 };

/** Original rules, used for every day before SCORING_V2_FROM. Binary ticks only. */
export const LEGACY_RULES = [
  // Did not exist before v2; listed first (weight 0) so it never borrows another rule's points.
  { id: 'read_before_sleep',   weight: 0,  allKeywords: ['read', 'sleep'] },
  { id: 'five_prayers',        weight: 5,  keywords: ['prayer'] },
  { id: 'namaz_dua',           weight: 3,  keywords: ['namaz', 'dua', 'salah', 'pray'] },
  { id: 'no_doom_scroll',      weight: 2,  keywords: ['doom', 'scroll'] },
  { id: 'no_disrespecting',    weight: 3,  keywords: ['disrespect'] },
  { id: 'no_movie_show',       weight: 2,  keywords: ['movie', 'show', 'series', 'netflix'] },
  { id: 'sleep_on_time',       weight: 3,  keywords: ['sleep', 'bedtime'] },
  { id: 'wake_up',             weight: 3,  keywords: ['wake'] },
  { id: 'workout',             weight: 10, keywords: ['workout', 'gym', 'training', 'exercise'] },
  { id: 'morning_shower',      weight: 2,  keywords: ['shower'] },
  { id: 'brush_teeth',         weight: 2,  keywords: ['brush', 'teeth', 'tooth'] },
  { id: 'book_reading',        weight: 5,  keywords: ['book', 'read'] },
  { id: 'learning_videos',     weight: 3,  keywords: ['learning', 'video', 'course', 'tutorial'] },
  { id: 'journaling',          weight: 3,  keywords: ['journal'] },
  { id: 'writing_goals',       weight: 3,  keywords: ['dream', 'goal'] },
  { id: 'calories_surplus',    weight: 5,  keywords: ['calorie'] },
  { id: 'protein_amount',      weight: 3,  keywords: ['protein'] },
  { id: 'leads_calls',         weight: 15, keywords: ['coldcall', 'coldcalling', 'call', 'lead'] },
  { id: 'professional_growth', weight: 8,  keywords: ['job', 'linkedin', 'scholarship'] },
  { id: 'development',         weight: 20, partial: 15, slots: [['fyp'], ['project']] }
];

/** Level-based rules, used from SCORING_V2_FROM onward. */
export const V2_RULES = [
  { id: 'read_before_sleep',   weight: 2,  allKeywords: ['read', 'sleep'] },
  { id: 'five_prayers',        weight: 5,  keywords: ['prayer'] },
  { id: 'namaz_dua',           weight: 3,  keywords: ['namaz', 'dua', 'salah', 'pray'], credit: LIGHT_DARK },
  { id: 'no_doom_scroll',      weight: 2,  keywords: ['doom', 'scroll'] },
  { id: 'no_disrespecting',    weight: 3,  keywords: ['disrespect'] },
  { id: 'no_movie_show',       weight: 2,  keywords: ['movie', 'show', 'series', 'netflix'] },
  { id: 'sleep_on_time',       weight: 3,  keywords: ['sleep', 'bedtime'] },
  { id: 'wake_up',             weight: 3,  keywords: ['wake'] },
  { id: 'workout',             weight: 10, keywords: ['workout', 'gym', 'training', 'exercise'] },
  { id: 'morning_shower',      weight: 2,  keywords: ['shower'], credit: LIGHT_DARK },
  { id: 'brush_teeth',         weight: 2,  keywords: ['brush', 'teeth', 'tooth'] },
  { id: 'book_reading',        weight: 5,  keywords: ['book', 'read'] },
  { id: 'learning_videos',     weight: 3,  keywords: ['learning', 'video', 'course', 'tutorial'] },
  { id: 'journaling',          weight: 3,  keywords: ['journal'] },
  { id: 'writing_goals',       weight: 3,  keywords: ['dream', 'goal'] },
  { id: 'calories_surplus',    weight: 5,  keywords: ['calorie'] },
  { id: 'protein_amount',      weight: 3,  keywords: ['protein'] },
  // One of the two = 10, both = 15; filled in automatically from the day's counts.
  { id: 'leads_calls',         weight: 15, single: 10, slots: [['coldcall', 'coldcalling', 'call'], ['lead']], credit: LEADS_CALLS, auto: true },
  { id: 'linkedin',            weight: 7,  keywords: ['linkedin'], credit: LIGHT_DARK },
  { id: 'job_scholarship',     weight: 3,  keywords: ['job', 'scholarship'], credit: MEDIUM_DARK },
  // One of the two = 12, both = 16.
  { id: 'development',         weight: 16, single: 12, slots: [['fyp'], ['project']], credit: DEV_WORK }
];

/** Rules from SCORING_V3_FROM (2026-10-29) onward. */
export const V3_RULES = [
  { id: 'read_before_sleep',   weight: 3,  allKeywords: ['read', 'sleep'] },
  { id: 'five_prayers',        weight: 5,  keywords: ['prayer'] },
  { id: 'namaz_dua',           weight: 3,  keywords: ['namaz', 'dua', 'salah', 'pray'], credit: LIGHT_DARK },
  { id: 'no_doom_scroll',      weight: 2,  keywords: ['doom', 'scroll'] },
  { id: 'no_disrespecting',    weight: 3,  keywords: ['disrespect'] },
  { id: 'no_movie_show',       weight: 2,  keywords: ['movie', 'show', 'series', 'netflix'] },
  { id: 'sleep_on_time',       weight: 3,  keywords: ['sleep', 'bedtime'] },
  { id: 'wake_up',             weight: 2,  keywords: ['wake'] },
  { id: 'workout',             weight: 10, keywords: ['workout', 'gym', 'training', 'exercise'] },
  { id: 'morning_shower',      weight: 2,  keywords: ['shower'], credit: LIGHT_DARK },
  { id: 'brush_teeth',         weight: 2,  keywords: ['brush', 'teeth', 'tooth'] },
  { id: 'book_reading',        weight: 5,  keywords: ['book', 'read'] },
  { id: 'learning_videos',     weight: 3,  keywords: ['learning', 'video', 'course', 'tutorial'] },
  { id: 'journaling',          weight: 3,  keywords: ['journal'] },
  { id: 'writing_goals',       weight: 3,  keywords: ['dream', 'goal'] },
  { id: 'calories_surplus',    weight: 5,  keywords: ['calorie'] },
  { id: 'protein_amount',      weight: 3,  keywords: ['protein'] },
  // Filled in from the day's counts. One: light 5, dark 10. Both: light+light 7, light+dark 12, dark+dark 15.
  { id: 'leads_calls',         weight: 15, single: 10, slots: [['coldcall', 'coldcalling', 'call'], ['lead']], credit: LEADS_CALLS_V3, auto: true, bothPoints: { '1-1': 7, '1-3': 12, '3-3': 15 } },
  { id: 'linkedin',            weight: 7,  keywords: ['linkedin'], credit: LIGHT_DARK },
  { id: 'job_scholarship',     weight: 3,  keywords: ['job', 'scholarship'], credit: MEDIUM_DARK },
  // Medium or dark only. One: medium 6, dark 12. Both: 8 / 12 / 16.
  { id: 'development',         weight: 16, single: 12, slots: [['fyp'], ['project']], credit: DEV_WORK_V3, bothPoints: { '2-2': 8, '2-3': 12, '3-3': 16 } }
];

/** Current rules, for scripts and tooling. */
export const SCORING_RULES = V3_RULES;

export const rulesFor = (dateStr) =>
  isV3Date(dateStr) ? V3_RULES : isV2Date(dateStr) ? V2_RULES : LEGACY_RULES;

/** Max possible score (100) — guards against the rules and the goal drifting apart. */
export const MAX_DAILY_SCORE = V3_RULES.reduce((total, rule) => total + rule.weight, 0);

/** Split a habit name into comparable lowercase word tokens. */
export const tokenizeHabitName = (name) =>
  String(name || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const SUFFIXES = ['s', 'es', 'ing', 'ed'];

const tokenMatchesKeyword = (token, keyword) =>
  token === keyword || SUFFIXES.some((suffix) => token === keyword + suffix);

const matchesKeywords = (tokens, keywords) =>
  tokens.some((token) => keywords.some((keyword) => tokenMatchesKeyword(token, keyword)));

const ruleMatches = (tokens, rule) => {
  if (rule.allKeywords) return rule.allKeywords.every((k) => matchesKeywords(tokens, [k]));
  return matchesKeywords(tokens, rule.keywords || rule.slots.flat());
};

/** The rule a habit feeds on a given day (or undefined). */
export function ruleForHabit(name, dateStr) {
  const tokens = tokenizeHabitName(name);
  if (tokens.length === 0) return undefined;
  return rulesFor(dateStr).find((rule) => ruleMatches(tokens, rule));
}

/** Levels a habit can be marked with on a given day; [DARK] means a plain tick. */
export function levelOptionsFor(name, dateStr) {
  const rule = ruleForHabit(name, dateStr);
  if (!rule || !isV2Date(dateStr) || !rule.credit) return [LEVEL.DARK];
  return Object.keys(rule.credit).map(Number).sort();
}

/** True for habits the app fills in by itself on a given day (leads, cold calls). */
export const isAutoHabit = (name, dateStr) => Boolean(isV2Date(dateStr) && ruleForHabit(name, dateStr)?.auto);

/** Which auto counter feeds a habit: 'leads', 'calls' or null. */
export function autoKindFor(name) {
  const tokens = tokenizeHabitName(name);
  if (matchesKeywords(tokens, ['lead'])) return 'leads';
  if (matchesKeywords(tokens, ['coldcall', 'coldcalling', 'call'])) return 'calls';
  return null;
}

/**
 * Assign each habit name to the first rule it matches.
 * @returns {{ assignments: Map<string, string[]>, unmatched: string[] }}
 */
export function assignHabitsToRules(habitNames, dateStr) {
  const assignments = new Map();
  const unmatched = [];
  for (const name of habitNames) {
    const rule = ruleForHabit(name, dateStr);
    if (!rule) {
      if (tokenizeHabitName(name).length) unmatched.push(name);
      continue;
    }
    if (!assignments.has(rule.id)) assignments.set(rule.id, []);
    assignments.get(rule.id).push(name);
  }
  return { assignments, unmatched };
}

/** Round to a whole percent, x.5 up (guarding float noise like 2.4999999). */
const roundPoints = (value) => Math.round(value + 1e-9);

/**
 * Score one day.
 *
 * @param {Array<string|{name: string, level?: number}>} checked habits checked that day
 *   (a plain name, or a log without a level, counts as DARK)
 * @param {string} [dateStr] "YYYY-MM-DD"; picks legacy vs level-based rules
 * @returns {number} 0-100
 */
export function calculateDailyHabitScore(checked, dateStr) {
  const v2 = isV2Date(dateStr);
  const rules = rulesFor(dateStr);
  const entries = (checked || []).map((item) =>
    typeof item === 'string' ? { name: item, level: LEVEL.DARK } : { name: item.name, level: item.level || LEVEL.DARK }
  );

  // Strongest credit per rule (and per slot), from the habits checked today.
  const creditOf = (rule, level) => (v2 && rule.credit ? rule.credit[level] ?? 0 : 1);
  const byRule = new Map();
  for (const entry of entries) {
    const rule = ruleForHabit(entry.name, dateStr);
    if (!rule) continue;
    if (!byRule.has(rule.id)) byRule.set(rule.id, []);
    byRule.get(rule.id).push(entry);
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
        const average = covered.reduce((a, b) => a + b, 0) / covered.length;
        score += rule.bothPoints?.[bothKey] ?? roundPoints(rule.weight * average);
      } else if (covered.length === 1) {
        score += roundPoints(rule.single * covered[0]);
      }
    } else {
      const best = assigned.reduce((b, e) => Math.max(b, creditOf(rule, e.level)), 0);
      score += v2 ? roundPoints(rule.weight * best) : rule.weight;
    }
  }

  return Math.min(MAX_DAILY_SCORE, score);
}

/**
 * Dynamic weekly worst-day exemption:
 * Weeks run Monday through Sunday.
 * In each week, the single weakest day (< 80%) is exempt so the streak does NOT break.
 * If 2 or more days in the same week are < 80%, only the single worst one is exempt,
 * and subsequent failing days break the streak.
 */
export function computeWeeklyWorstDayExemptions(dailyStats, year, month, endDay) {
  const exemptDays = new Set();
  const weeks = [];
  let currentWeek = [];

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
    const evaluatedDays = weekDays.filter(d => d <= endDay);
    if (evaluatedDays.length === 0) continue;

    const belowGoalDays = evaluatedDays
      .map(d => dailyStats[d - 1])
      .filter(stat => stat && stat.score < STREAK_THRESHOLD);

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

export function computeStreakCount(dailyStats, isCurrentMonth, todayDay, year, month) {
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
