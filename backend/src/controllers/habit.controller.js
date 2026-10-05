import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import DailyMetric from '../models/DailyMetric.js';
import Lead from '../models/Lead.js';
import {
  calculateDailyHabitScore,
  assignHabitsToRules,
  STREAK_THRESHOLD,
  MAX_DAILY_SCORE,
  computeWeeklyWorstDayExemptions,
  computeStreakCount
} from '../lib/habitScoring.js';
import { isDateEditable, getLatestEditableDate, toDateString } from '../lib/dateRules.js';

// Default 22 starter habits based on user schedule
export const DEFAULT_HABITS = [
  { name: 'Wake up 4Am', icon: 'Clock', color: '#f59e0b', order: 1 },
  { name: 'Workout / Rest', icon: 'Dumbbell', color: '#10b981', order: 2 },
  { name: 'Morning shower', icon: 'Droplets', color: '#06b6d4', order: 3 },
  { name: 'Brush Teeth', icon: 'Sparkles', color: '#0ea5e9', order: 4 },
  { name: 'Namaz / dua', icon: 'HeartHandshake', color: '#8b5cf6', order: 5 },
  { name: 'Coldcall / Practice', icon: 'PhoneCall', color: '#10b981', order: 6 },
  { name: 'Lead generation', icon: 'Users', color: '#3b82f6', order: 7 },
  { name: 'LinkedIn Setup', icon: 'Share2', color: '#0284c7', order: 8 },
  { name: 'Job / Scholarships', icon: 'Briefcase', color: '#6366f1', order: 9 },
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
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const [logs, metrics, leadsInMonth, coldCallsInMonth] = await Promise.all([
      HabitLog.find({ date: { $regex: monthRegex }, completed: true }).select('habit date value'),
      DailyMetric.find({ date: { $regex: monthRegex } }).select('date sleepHours notes calories protein workoutStatus'),
      Lead.find({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } }).select('createdAt'),
      Lead.find({
        coldCalled: true,
        $or: [
          { coldCalledAt: { $gte: startOfMonth, $lte: endOfMonth } },
          { coldCalledAt: null, updatedAt: { $gte: startOfMonth, $lte: endOfMonth } },
          { coldCalledAt: null, createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
        ]
      }).select('coldCalledAt updatedAt createdAt')
    ]);

    // Daily lead creation & cold call activity
    const leadsByDay = {};
    const callsByDay = {};
    leadsInMonth.forEach((l) => {
      const dStr = toDateString(new Date(l.createdAt));
      const [y, m, d] = dStr.split('-').map(Number);
      if (y === year && m === month) {
        leadsByDay[d] = (leadsByDay[d] || 0) + 1;
      }
    });
    coldCallsInMonth.forEach((l) => {
      const callDate = l.coldCalledAt || l.updatedAt || l.createdAt;
      const dStr = toDateString(new Date(callDate));
      const [y, m, d] = dStr.split('-').map(Number);
      if (y === year && m === month) {
        callsByDay[d] = (callsByDay[d] || 0) + 1;
      }
    });

    // Recent 7 days nutrition & workout history (spans across month boundary seamlessly)
    const sevenDates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      sevenDates.push(toDateString(d));
    }
    const recentMetrics = await DailyMetric.find({ date: { $in: sevenDates } });
    const recentMetricsMap = {};
    recentMetrics.forEach(m => {
      recentMetricsMap[m.date] = m;
    });

    const last7DaysNutrition = sevenDates.map(dateStr => {
      const d = new Date(dateStr + 'T00:00:00');
      const m = recentMetricsMap[dateStr] || {};
      const cal = m.calories || 0;
      const prot = m.protein || 0;
      const ws = m.workoutStatus || '';
      return {
        date: dateStr,
        day: d.getDate(),
        weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
        calories: cal,
        protein: prot,
        workoutStatus: ws,
        isMetCalories: cal > 2400,
        isMetProtein: prot >= 80
      };
    });

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

    // { [dayOfMonth]: { sleepHours, notes, calories, protein, workoutStatus } }
    const metricsMap = {};
    metrics.forEach((metric) => {
      const dayNum = parseInt(metric.date.split('-')[2], 10);
      if (!Number.isNaN(dayNum)) {
        metricsMap[dayNum] = {
          sleepHours: metric.sleepHours || 0,
          notes: metric.notes || '',
          calories: metric.calories || 0,
          protein: metric.protein || 0,
          workoutStatus: metric.workoutStatus || ''
        };
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
    const dailyStatsDraft = [];
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
      const score = calculateDailyHabitScore(checkedNames);

      dailyStatsDraft.push({
        day,
        date: dateStr,
        weekday: weekdaysShort[dayDate.getDay()],
        isSunday: dayDate.getDay() === 0,
        completedCount: checkedNames.length,
        totalHabits: habits.length,
        percent: habits.length > 0 ? Math.round((checkedNames.length / habits.length) * 100) : 0,
        score,
        isBelowGoal: score < STREAK_THRESHOLD,
        sleepHours: (metricsMap[day] || {}).sleepHours || 0
      });
    }

    const todayDay = now.getDate();
    const endDayForExemptions = isCurrentMonth ? Math.max(0, todayDay - 1) : daysInMonth;
    const exemptDays = computeWeeklyWorstDayExemptions(dailyStatsDraft, year, month, endDayForExemptions);

    // Final dailyStats with isExempt flag
    const dailyStats = dailyStatsDraft.map((ds) => ({
      ...ds,
      isExempt: exemptDays.has(ds.day)
    }));

    const totalPossible = habits.length * daysInMonth;
    const monthlyProgressPercent = totalPossible > 0
      ? Number(((totalCompletedMonth / totalPossible) * 100).toFixed(1))
      : 0;

    const todayStat = isCurrentMonth ? dailyStats[todayDay - 1] || null : null;

    // Dynamic weekly worst-day streak calculation
    const streakCount = computeStreakCount(dailyStats, isCurrentMonth, todayDay, year, month);

    // Monthly nutrition & workout data (for the entire selected month)
    const monthNutritionData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
      const d = new Date(year, month - 1, day);
      const m = metricsMap[day] || {};
      const cal = m.calories || 0;
      const prot = m.protein || 0;
      const ws = m.workoutStatus || '';
      monthNutritionData.push({
        date: dateStr,
        day,
        weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
        calories: cal,
        protein: prot,
        workoutStatus: ws,
        isMetCalories: cal > 2400,
        isMetProtein: prot >= 80
      });
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
      dailyLeadActivity: {
        leadsByDay,
        callsByDay
      },
      last7DaysNutrition,
      monthNutritionData,
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
      // Enforce lead generation & cold calls validation
      const habit = await Habit.findById(habitId);
      if (habit) {
        const hName = (habit.name || '').toLowerCase();
        if (hName.includes('lead')) {
          const allLeads = await Lead.find().select('createdAt');
          const hasLead = allLeads.some(l => toDateString(new Date(l.createdAt)) === date);
          if (!hasLead) {
            return res.status(400).json({
              message: 'Cannot mark Lead Generation: You have not added any leads for this date yet. Add at least 1 lead in the Leads section first.'
            });
          }
        } else if (hName.includes('coldcall') || hName.includes('cold call')) {
          const allCalls = await Lead.find({ coldCalled: true }).select('coldCalledAt updatedAt createdAt');
          const hasCall = allCalls.some(l => toDateString(new Date(l.coldCalledAt || l.updatedAt || l.createdAt)) === date);
          if (!hasCall) {
            return res.status(400).json({
              message: 'Cannot mark Coldcall / Practice: You have not made any cold calls for this date yet. Log at least 1 call in the Leads section first.'
            });
          }
        }
      }

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
    const { date, sleepHours, notes, calories, protein, workoutStatus } = req.body;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    // Same date rule as habit logs, so the rule holds if this input is ever built.
    if (!isDateEditable(date)) {
      return res.status(400).json({
        message: 'This day can no longer be edited. Daily metrics can only be changed for today and yesterday.'
      });
    }

    const updateFields = {};
    if (sleepHours !== undefined) updateFields.sleepHours = parseFloat(sleepHours) || 0;
    if (notes !== undefined) updateFields.notes = notes;
    if (calories !== undefined) updateFields.calories = parseFloat(calories) || 0;
    if (protein !== undefined) updateFields.protein = parseFloat(protein) || 0;
    if (workoutStatus !== undefined) updateFields.workoutStatus = workoutStatus;

    const metric = await DailyMetric.findOneAndUpdate(
      { date },
      updateFields,
      { upsert: true, new: true }
    );

    // Auto-sync HabitLog for Calories Surplus (> 2400)
    if (calories !== undefined) {
      const calHabit = await Habit.findOne({ name: { $regex: /calorie/i }, archived: false });
      if (calHabit) {
        if (parseFloat(calories) > 2400) {
          await HabitLog.findOneAndUpdate(
            { habit: calHabit._id, date },
            { completed: true, value: parseFloat(calories) },
            { upsert: true, new: true }
          );
        } else {
          await HabitLog.findOneAndDelete({ habit: calHabit._id, date });
        }
      }
    }

    // Auto-sync HabitLog for Protein Amount (>= 80g)
    if (protein !== undefined) {
      const proteinHabit = await Habit.findOne({ name: { $regex: /protein/i }, archived: false });
      if (proteinHabit) {
        if (parseFloat(protein) >= 80) {
          await HabitLog.findOneAndUpdate(
            { habit: proteinHabit._id, date },
            { completed: true, value: parseFloat(protein) },
            { upsert: true, new: true }
          );
        } else {
          await HabitLog.findOneAndDelete({ habit: proteinHabit._id, date });
        }
      }
    }

    // Auto-sync HabitLog for Workout / Rest (workout or rest counts as task done!)
    if (workoutStatus !== undefined) {
      const workoutHabit = await Habit.findOne({ name: { $regex: /workout/i }, archived: false });
      if (workoutHabit) {
        if (workoutStatus === 'workout' || workoutStatus === 'rest') {
          await HabitLog.findOneAndUpdate(
            { habit: workoutHabit._id, date },
            { completed: true },
            { upsert: true, new: true }
          );
        } else {
          await HabitLog.findOneAndDelete({ habit: workoutHabit._id, date });
        }
      }
    }

    res.json(metric);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update daily metric', error: error.message });
  }
};