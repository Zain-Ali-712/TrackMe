/**
 * Date rules for habit editing.
 *
 * Habits are filled in for today and, because the day often ends late and
 * bedtime habits get missed, for the previous day as well. Anything older is
 * frozen, and nothing can be logged for a future day.
 *
 * Both bounds are computed on the server so the rule cannot be bypassed by
 * changing the browser clock.
 */

/** Format a Date as the local "YYYY-MM-DD" used throughout the app. */
export function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The oldest date that may still be edited: today, plus one day back. */
export function getLatestEditableDate(now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return toDateString(yesterday);
}

/** The newest date that may be edited — days cannot be logged in advance. */
export function getToday(now = new Date()) {
  return toDateString(now);
}

/**
 * True when `date` is today or yesterday (i.e. still editable).
 *
 * "YYYY-MM-DD" sorts lexicographically, and older dates sort EARLIER, so the
 * lower bound is `>=` the latest editable date. The upper bound rejects days
 * that have not happened yet.
 */
export function isDateEditable(date, now = new Date()) {
  if (!DATE_PATTERN.test(String(date || ''))) return false;

  const value = String(date);
  return value >= getLatestEditableDate(now) && value <= getToday(now);
}