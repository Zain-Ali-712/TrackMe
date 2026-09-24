// Frontend Habit Scoring & Streak Logic

export interface MajorHabitSummary {
  key: string;
  title: string;
  subtitle: string;
  habits: string[];
  percent: number;
  completedChecks: number;
  totalTarget: number;
}

export function calculateDailyHabitScore(dayLogsByName: Record<string, boolean>): number {
  let score = 0;

  // 1. Wake Up early 4am - 5%
  if (dayLogsByName['wake up early (4)']) score += 5;

  // 2. Workout/rest - 10%
  if (dayLogsByName['workout / rest']) score += 10;

  // 3. Morning Shower - 2%
  if (dayLogsByName['morning shower']) score += 2;

  // 4. Prayer/Dua - 5%
  if (dayLogsByName['namaz / dua']) score += 5;

  // 5. ColdCalling & Lead generation (considered 1, max 15%)
  if (dayLogsByName['coldcall / practice'] || dayLogsByName['lead generation']) score += 15;

  // 6. Professional Growth (Job search, LinkedIn hunt, Scholarships - considered 1, max 10%)
  if (dayLogsByName['job search'] || dayLogsByName['linkedin hunt'] || dayLogsByName['scholarships']) score += 10;

  // 7. Development (FYP and Project Dev: 1 is 15%, both is 20%)
  const hasFYP = !!dayLogsByName['fyp development'];
  const hasProject = !!dayLogsByName['project dev'];
  if (hasFYP && hasProject) {
    score += 20;
  } else if (hasFYP || hasProject) {
    score += 15;
  }

  // 8. Book reading - 5%
  if (dayLogsByName['book reading']) score += 5;

  // 9. Learning videos - 3%
  if (dayLogsByName['learning videos']) score += 3;

  // 10. Journaling - 2%
  if (dayLogsByName['journaling']) score += 2;

  // 11. Writing Dreams - 2%
  if (dayLogsByName['writing dreams']) score += 2;

  // 12. 5 prayers - 5%
  if (dayLogsByName['5 prayers']) score += 5;

  // 13. Sleep on time - 3%
  if (dayLogsByName['sleep on time']) score += 3;

  // 14. Calories surplus - 5%
  if (dayLogsByName['calories surplus']) score += 5;

  // 15. Protein Amount - 3%
  if (dayLogsByName['protein amount']) score += 3;

  // 16. No Doom Scroll - 2%
  if (dayLogsByName['no doom scroll']) score += 2;

  // 17. No Disrespecting - 1%
  if (dayLogsByName['no disrespecting']) score += 1;

  // 18. No Movie/show - 2%
  if (dayLogsByName['no movie / show']) score += 2;

  return Math.min(100, score);
}

export function computeAllDailyScores(
  habits: any[],
  logsMap: Record<string, Record<number, boolean>>,
  daysInMonth: number,
  year: number,
  month: number
): Array<{ day: number; date: string; weekday: string; isSunday: boolean; score: number; completedCount: number }> {
  const weekdaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const results = [];

  const habitIdToNormalizedName: Record<string, string> = {};
  habits.forEach(h => {
    habitIdToNormalizedName[h._id.toString()] = h.name.toLowerCase().trim();
  });

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month - 1, day);
    const weekday = weekdaysShort[dayDate.getDay()];
    const isSunday = dayDate.getDay() === 0;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const dayLogsByName: Record<string, boolean> = {};
    let count = 0;

    habits.forEach(h => {
      const hId = h._id.toString();
      if (logsMap[hId] && logsMap[hId][day]) {
        count++;
        dayLogsByName[habitIdToNormalizedName[hId]] = true;
      }
    });

    const score = calculateDailyHabitScore(dayLogsByName);

    results.push({
      day,
      date: dateStr,
      weekday,
      isSunday,
      score,
      completedCount: count
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

  for (let d = 1; d <= endDay; d++) {
    const stat = dailyStats[d - 1];
    if (!stat) continue;

    if (d === endDay && isCurrentMonth) {
      if (stat.score >= 80) {
        streak++;
      }
    } else {
      if (stat.score >= 80) {
        streak++;
      } else if (stat.isSunday) {
        // Sunday is exempt! Does not break streak
      } else {
        // Non-Sunday with score < 80% breaks streak
        streak = 0;
      }
    }
  }

  return streak;
}

export const MAJOR_HABIT_CONFIGS = [
  { key: 'book_reading', title: 'Book Reading', habits: ['book reading'], subtitle: 'Daily Reading' },
  { key: 'journaling', title: 'Journaling', habits: ['journaling', 'writing dreams'], subtitle: 'Journaling & Dreams' },
  { key: 'development', title: 'Development', habits: ['fyp development', 'project dev'], subtitle: 'FYP & Project Dev' },
  { key: 'leads_calls', title: 'Leads / Calls', habits: ['coldcall / practice', 'lead generation'], subtitle: 'Cold Call & Leads' },
  { key: 'workout', title: 'Workout', habits: ['workout / rest'], subtitle: 'Training & Rest' },
  { key: 'diet', title: 'Diet', habits: ['calories surplus', 'protein amount'], subtitle: 'Calories & Protein' },
  { key: 'personal_growth', title: 'Personal Growth', habits: ['learning videos', 'book reading', 'no movie / show', 'no disrespecting', 'no doom scroll', 'sleep on time', '5 prayers', 'namaz / dua'], subtitle: 'Mindset & Discipline' },
  { key: 'professional_growth', title: 'Professional Growth', habits: ['scholarships', 'job search', 'linkedin hunt'], subtitle: 'Careers & Network' }
];

export function computeMajorHabitsStats(
  habits: any[],
  logsMap: Record<string, Record<number, boolean>>,
  elapsedDays: number
): MajorHabitSummary[] {
  return MAJOR_HABIT_CONFIGS.map(cfg => {
    let completedChecks = 0;
    const matchedHabitIds = habits
      .filter(h => cfg.habits.includes(h.name.toLowerCase().trim()))
      .map(h => h._id.toString());

    matchedHabitIds.forEach(hId => {
      if (logsMap[hId]) {
        completedChecks += Object.keys(logsMap[hId]).length;
      }
    });

    const totalTarget = matchedHabitIds.length * Math.max(1, elapsedDays);
    const percent = totalTarget > 0 ? Math.min(100, Math.round((completedChecks / totalTarget) * 100)) : 0;

    return {
      key: cfg.key,
      title: cfg.title,
      subtitle: cfg.subtitle,
      habits: cfg.habits,
      completedChecks,
      totalTarget,
      percent
    };
  });
}
