/**
 * Canonical daily habit scoring.
 *
 * The frontend mirrors this file in `frontend/src/lib/habitScoring.ts` purely
 * for optimistic updates — the backend is the source of truth.
 *
 * Habits are matched to rules by KEYWORD, never by exact name. An earlier
 * version compared lowercased strings, which meant renaming a habit (e.g.
 * "Wake up early (4)" -> "Wake up 4Am") silently dropped its points and a
 * fully-completed day could only ever score 95%. Keyword matching makes that
 * class of bug impossible.
 *
 * Matching is per WORD, never a raw substring: matching "show" as a substring
 * would swallow "Morning shower" and cost the shower habit its points. A token
 * matches a keyword when it is the keyword itself or the keyword plus a common
 * English suffix (s / es / ing / ed), so "5 Prayers" matches "prayer" and
 * "No Disrespecting" matches "disrespect", while "shower" does not match "show".
 *
 * Two rule shapes exist:
 *   `keywords`  - any ONE matching habit earns the full weight. This covers
 *                 leads/calls and professional growth, where Coldcall and Lead
 *                 generation each independently earn 15%.
 *   `slots`     - every slot must be covered to earn `weight`; covering one
 *                 earns `partial`. Used by Development (FYP alone = 15,
 *                 FYP + Project = 20).
 *
 * A habit is assigned to exactly ONE rule (the first whose keywords it
 * contains), so keywords stay non-overlapping and nothing is double counted.
 *
 * Weights sum to exactly 100, so checking every habit scores exactly 100%.
 */

export const STREAK_THRESHOLD = 80;

/** Split a habit name into comparable lowercase word tokens. */
export const tokenizeHabitName = (name) =>
  String(name || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export const SCORING_RULES = [
  { id: 'five_prayers',        weight: 5,  keywords: ['prayer'] },
  { id: 'namaz_dua',           weight: 5,  keywords: ['namaz', 'dua', 'salah', 'pray'] },
  { id: 'no_doom_scroll',      weight: 2,  keywords: ['doom', 'scroll'] },
  { id: 'no_disrespecting',    weight: 1,  keywords: ['disrespect'] },
  { id: 'no_movie_show',       weight: 2,  keywords: ['movie', 'show', 'series', 'netflix'] },
  { id: 'sleep_on_time',       weight: 3,  keywords: ['sleep', 'bedtime'] },
  { id: 'wake_up',             weight: 5,  keywords: ['wake'] },
  { id: 'workout',             weight: 10, keywords: ['workout', 'gym', 'training', 'exercise'] },
  { id: 'morning_shower',      weight: 2,  keywords: ['shower'] },
  { id: 'book_reading',        weight: 5,  keywords: ['book', 'read'] },
  { id: 'learning_videos',      weight: 3,  keywords: ['learning', 'video', 'course', 'tutorial'] },
  { id: 'journaling',          weight: 2,  keywords: ['journal'] },
  { id: 'writing_dreams',      weight: 2,  keywords: ['dream'] },
  { id: 'calories_surplus',    weight: 5,  keywords: ['calorie'] },
  { id: 'protein_amount',      weight: 3,  keywords: ['protein'] },
  { id: 'leads_calls',         weight: 15, keywords: ['coldcall', 'coldcalling', 'call', 'lead'] },
  { id: 'professional_growth', weight: 10, keywords: ['job', 'linkedin', 'scholarship'] },
  { id: 'development',         weight: 20, partial: 15, slots: [['fyp'], ['project']] }
];

/** Max possible score — guards against the rules and the 100% goal drifting apart. */
export const MAX_DAILY_SCORE = SCORING_RULES.reduce((total, rule) => total + rule.weight, 0);

const SUFFIXES = ['s', 'es', 'ing', 'ed'];

/** True when a name word is the keyword, or the keyword plus a plural/verb suffix. */
const tokenMatchesKeyword = (token, keyword) =>
  token === keyword || SUFFIXES.some((suffix) => token === keyword + suffix);

const matchesKeywords = (tokens, keywords) =>
  tokens.some((token) => keywords.some((keyword) => tokenMatchesKeyword(token, keyword)));

const keywordsFor = (rule) => rule.keywords || rule.slots.flat();

/**
 * Assign each habit name to the first rule it matches.
 * @param {string[]} habitNames raw habit names from the database
 * @returns {{ assignments: Map<string, string[]>, unmatched: string[] }}
 *   assignments maps ruleId -> names of the habits feeding that rule.
 */
export function assignHabitsToRules(habitNames) {
  const assignments = new Map();
  const unmatched = [];

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
    assignments.get(rule.id).push(name);
  }

  return { assignments, unmatched };
}

/**
 * Score one day.
 *
 * @param {string[]} checkedHabitNames names of the habits checked that day
 * @returns {number} 0-100
 */
export function calculateDailyHabitScore(checkedHabitNames) {
  const { assignments } = assignHabitsToRules(checkedHabitNames || []);

  let score = 0;

  for (const rule of SCORING_RULES) {
    const assigned = assignments.get(rule.id);
    if (!assigned || assigned.length === 0) continue;

    if (rule.slots) {
      // Slot rule: full weight only when every slot is covered.
      const coveredSlots = rule.slots.filter((keywords) =>
        assigned.some((name) => matchesKeywords(tokenizeHabitName(name), keywords))
      ).length;

      if (coveredSlots === rule.slots.length) {
        score += rule.weight;
      } else if (rule.partial !== undefined && coveredSlots >= 1) {
        score += rule.partial;
      }
    } else {
      // Any-one rule: a single matching habit earns the full weight.
      score += rule.weight;
    }
  }

  return Math.min(MAX_DAILY_SCORE, score);
}