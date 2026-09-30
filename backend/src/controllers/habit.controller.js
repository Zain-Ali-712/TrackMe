import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import DailyMetric from '../models/DailyMetric.js';
import {
  calculateDailyHabitScore,
  assignHabitsToRules,
  STREAK_THRESHOLD,
  MAX_DAILY_SCORE
} from '../lib/habitScoring.js';
import { isDateEditable, getLatestEditableDate } from '../lib/dateRules.js';

// Default 22 starter habits based on user schedule
export const DEFAULT_HABITS = [
  { name: 'Wake up early (4)', icon: 'Clock', color: '#f59e0b', order: 1 },
  { name: 'Workout / Rest', icon: 'Dumbbell', color: '#10b981', order: 2 },
  { name: 'Morning shower', icon: 'Droplets', color: '#06b6d4', order: 3 },
  { name: 'Namaz / dua', icon: 'HeartHandshake', color: '#8b5cf6', order: 4 },
  { name: 'Coldcall / Practice', icon: 'PhoneCall', color: '#10b981', order: 5 },
  { name: 'Lead generation', icon: 'Users', color: '#3b82f6', order: 6 },
  { name: 'Job Search', icon: 'Briefcase', color: '#6366f1', order: 7 },
  { name: 'Scholarships', icon: 'GraduationCap', color: '#a855f7', order: 8 },
  { name: 'LinkedIn hunt', icon: 'Share2', color: '#0284c7', order: 9 },
  { name: 'FYP Development', icon: 'Code2', color: '#ec4899', order: 10 },
  { name: 'Project Dev', icon: 'Laptop', color: '#3b82f6', order: 11 },
  { name: 'Book Reading', icon: 'BookOpen', color: '#f59e0b', order: 12 },
  { name: 'Learning Videos', icon: 'Video', color: '#ef4444', order: 13 },
  { name: 'Journaling', icon: 'PenTool', color: '#14b8a6', order: 14 },
  { name: 'Writing Dreams', icon: 'Sparkles', color: '#8b5cf6', order: 15 },
  { name: '5 Prayers', icon: 'Sun', color: '#10b981', order: 16 },
  { name: 'No Doom Scroll', icon: 'SmartphoneOff', color: '#f43f5e', order: 17 },
  { name: 'No Disrespecting', icon: 'Smile', color: '#10b981', order: 18 },
  { name: 'No Movie / show', icon: 'Tv2', color: '#64748b', order: 19 },
  { name: 'Sleep on time', icon: 'Moon', color: '#6366f1', order: 20 },
  { name: 'Calories Surplus', icon: 'UtensilsCrossed', color: '#f97316', order: 21 },
  { name: 'Protein Amount', icon: 'Activity', color: '#10b981', order: 22 }
];

/** Load the active habit list, seeding the defaults the first time. */
async function loadHabits() {
  let habits = await Habit.find({ archived: false }).sort({ order: 1, createdAt: 1 });

  if (habits.length === 0) {
    await Habit.insertMany(DEFAULT_HABITS);
    habits = await Habit.find({ archived: false }).sort({ order: 1, createdAt: 1 });
  }

  return habits;
}

export const getHabits = async (req, res) => {
  try {
    res.json(await loadHabits());
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch habits', error: error.message });
  }
};

export const createHabit = async (req, res) => {
  try {
    const { name, icon, color, targetDaysPerWeek } = req.body;
    const count = await Habit.countDocuments();
    const habit = new Habit({
      name,
      icon: icon || '⚡',
      color: color || '#10b981',
      targetDaysPerWeek: targetDaysPerWeek || 7,
      order: count + 1
    });
    await habit.save();
    res.status(201).json(habit);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create habit', error: error.message });
  }
};

export const updateHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const habit = await Habit.findByIdAndUpdate(id, req.body, { new: true });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    res.json(habit);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update habit', error: error.message });
  }
};

export const deleteHabit = async (req, res) => {
  try {
    const { id } = req.params;
    await Habit.findByIdAndDelete(id);
    await HabitLog.deleteMany({ habit: id });
    res.json({ message: 'Habit deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete habit', error: error.message });
  }
};

export const getMonthData = async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1); // 1-indexed

    const daysInMonth = new Date(year, month, 0).getDate();
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;

    const habits = await loadHabits();

    // A month holds at most 31 days x ~22 habits of log rows; fetch them in one
    // indexed round trip and derive every statistic below in memory.
    const monthRegex = new RegExp(`^${monthPrefix}`);
    const [logs, metrics] = await Promise.all([
      HabitLog.find({ date: { $regex: monthRegex }, completed: true }).select('habit date'),
      DailyMetric.find({ date: { $regex: monthRegex } }).select('date sleepHours notes')
    ]);

    // { [habitId]: { [dayOfMonth]: true } }
    const logsMap = {};
    const nameByHabitId = {};
    habits.forEach((habit) => {
      const habitId = habit._id.toString();
      logsMap[habitId] = {};
      nameByHabitId[habitId] = habit.name;
    });

    logs.forEach((log) => {
      const habitId = log.habit.toString();
      if (!logsMap[habitId]) return;
      const dayNum = parseInt(log.date.split('-')[2], 10);
      if (!Number.isNaN(dayNum)) logsMap[habitId][dayNum] = true;
    });

    // { [dayOfMonth]: { sleepHours, notes } }
    const metricsMap = {};
    metrics.forEach((metric) => {
      const dayNum = parseInt(metric.date.split('-')[2], 10);
      if (!Number.isNaN(dayNum)) {
        metricsMap[dayNum] = { sleepHours: metric.sleepHours || 0, notes: metric.notes || '' };
      }
    });

    // Which rule each habit feeds, resolved once per month rather than per day.
    const { assignments, unmatched } = assignHabitsToRules(habits.map((habit) => habit.name));

    const eachHabitStats = habits.map((habit) => {
      const habitId = habit._id.toString();
      const count = logsMap[habitId] ? Object.keys(logsMap[habitId]).length : 0;
      return {
        habitId,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        count,
        totalDays: daysInMonth,
        progressPercent: Math.round((count / daysInMonth) * 100)
      };
    });

    const weekdaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const dailyStats = [];
    let totalCompletedMonth = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
      const dayDate = new Date(year, month - 1, day);

      const checkedNames = [];
      habits.forEach((habit) => {
        const habitId = habit._id.toString();
        if (logsMap[habitId][day]) checkedNames.push(nameByHabitId[habitId]);
      });

      totalCompletedMonth += checkedNames.length;

      dailyStats.push({
        day,
        date: dateStr,
        weekday: weekdaysShort[dayDate.getDay()],
        isSunday: dayDate.getDay() === 0,
        completedCount: checkedNames.length,
        totalHabits: habits.length,
        percent: habits.length > 0 ? Math.round((checkedNames.length / habits.length) * 100) : 0,
        score: calculateDailyHabitScore(checkedNames),
        sleepHours: (metricsMap[day] || {}).sleepHours || 0
      });
    }

    const totalPossible = habits.length * daysInMonth;
    const monthlyProgressPercent = totalPossible > 0
      ? Number(((totalCompletedMonth / totalPossible) * 100).toFixed(1))
      : 0;

    const todayDay = now.getDate();
    const todayStat = isCurrentMonth ? dailyStats[todayDay - 1] || null : null;

    // Streak: a day >= threshold extends it, Sunday never breaks it, any other
    // day below the threshold resets it to zero. Today is not counted yet when
    // it hasn't reached the threshold, so an unfinished day never costs a streak.
    let streakCount = 0;
    const endDayForStreak = isCurrentMonth ? todayDay : daysInMonth;

    for (let day = 1; day <= endDayForStreak; day++) {
      const dayStat = dailyStats[day - 1];
      if (!dayStat) continue;

      if (dayStat.score >= STREAK_THRESHOLD) {
        streakCount++;
      } else if (dayStat.isSunday) {
        // Sunday is exempt: below-threshold days do not break the streak.
      } else if (day !== endDayForStreak || !isCurrentMonth) {
        streakCount = 0;
      }
    }

    const elapsedDays = isCurrentMonth ? Math.max(1, todayDay) : daysInMonth;

    // Major habits are groups of habits, so a day's score is the fraction of
    // that group's checks completed.
    const majorConfigs = [
      { key: 'book_reading', title: 'Book Reading', habits: ['book'], subtitle: 'Daily Reading' },
      { key: 'journaling', title: 'Journaling', habits: ['journal', 'dream'], subtitle: 'Journaling & Dreams' },
      { key: 'development', title: 'Development', habits: ['fyp', 'project'], subtitle: 'FYP & Project Dev' },
      { key: 'leads_calls', title: 'Leads & Calls', habits: ['coldcall', 'lead'], subtitle: 'Cold Call & Leads' },
      { key: 'workout', title: 'Workout', habits: ['workout'], subtitle: 'Training & Rest' },
      { key: 'diet', title: 'Diet & Nutrition', habits: ['calorie', 'protein'], subtitle: 'Calories & Protein' },
      { key: 'personal_growth', title: 'Personal Growth', habits: ['learning', 'video', 'book', 'movie', 'show', 'disrespect', 'doom', 'scroll', 'sleep', 'prayer', 'namaz', 'dua'], subtitle: 'Mindset & Discipline' },
      { key: 'professional_growth', title: 'Professional Growth', habits: ['job', 'linkedin', 'scholarship'], subtitle: 'Careers & Network' }
    ];

    const majorHabitsStats = majorConfigs.map((config) => {
      const matchedHabitIds = habits
        .filter((habit) => {
          const tokens = habit.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
          return tokens.some((token) => config.habits.some(
            (keyword) => token === keyword || token === `${keyword}s` || token === `${keyword}ing` || token === `${keyword}ed`
          ));
        })
        .map((habit) => habit._id.toString());

      const completedChecks = matchedHabitIds.reduce(
        (sum, habitId) => sum + Object.keys(logsMap[habitId] || {}).length,
        0
      );

      const totalTarget = matchedHabitIds.length * elapsedDays;

      return {
        key: config.key,
        title: config.title,
        subtitle: config.subtitle,
        completedChecks,
        totalTarget,
        percent: totalTarget > 0 ? Math.min(100, Math.round((completedChecks / totalTarget) * 100)) : 0
      };
    });

    res.json({
      year,
      month,
      daysInMonth,
      habits,
      logsMap,
      metricsMap,
      eachHabitStats,
      dailyStats,
      majorHabitsStats,
      streakCount,
      streakThreshold: STREAK_THRESHOLD,
      maxDailyScore: MAX_DAILY_SCORE,
      todayScore: todayStat ? todayStat.score : 0,
      // Habits may only be edited for today and the previous day.
      latestEditableDate: getLatestEditableDate(now),
      unmatchedHabitNames: unmatched,
      overallStats: {
        totalPossible,
        totalCompleted: totalCompletedMonth,
        monthlyProgressPercent,
        todayCompletedCount: todayStat ? todayStat.completedCount : 0,
        todayTotalHabits: habits.length,
        todayDay: isCurrentMonth ? todayDay : null,
        isCurrentMonth
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch month habit data', error: error.message });
  }
};

export const toggleHabit = async (req, res) => {
  try {
    const { habitId, date, completed } = req.body;
    if (!habitId || !date) {
      return res.status(400).json({ message: 'habitId and date are required' });
    }

    // Days older than yesterday are frozen — reject rather than trust the client.
    if (!isDateEditable(date)) {
      return res.status(400).json({
        message: 'This day can no longer be edited. Habits can only be changed for today and yesterday.'
      });
    }

    if (completed) {
      const log = await HabitLog.findOneAndUpdate(
        { habit: habitId, date },
        { completed: true },
        { upsert: true, new: true }
      );
      res.json({ success: true, log });
    } else {
      await HabitLog.findOneAndDelete({ habit: habitId, date });
      res.json({ success: true, message: 'Habit check removed' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle habit', error: error.message });
  }
};

export const updateDailyMetric = async (req, res) => {
  try {
    const { date, sleepHours, notes } = req.body;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    // Same date rule as habit logs, so the rule holds if this input is ever built.
    if (!isDateEditable(date)) {
      return res.status(400).json({
        message: 'This day can no longer be edited. Daily metrics can only be changed for today and yesterday.'
      });
    }

    const metric = await DailyMetric.findOneAndUpdate(
      { date },
      {
        ...(sleepHours !== undefined && { sleepHours: parseFloat(sleepHours) || 0 }),
        ...(notes !== undefined && { notes })
      },
      { upsert: true, new: true }
    );
    res.json(metric);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update daily metric', error: error.message });
  }
};