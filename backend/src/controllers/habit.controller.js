import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import DailyMetric from '../models/DailyMetric.js';

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

export function calculateDailyHabitScore(dayLogsByName) {
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

export const getHabits = async (req, res) => {
  try {
    let habits = await Habit.find({ archived: false }).sort({ order: 1, createdAt: 1 });
    
    // Seed default habits if empty
    if (habits.length === 0) {
      await Habit.insertMany(DEFAULT_HABITS);
      habits = await Habit.find({ archived: false }).sort({ order: 1, createdAt: 1 });
    }

    res.json(habits);
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

    // Calculate days in the given month
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    // Ensure habits exist
    let habits = await Habit.find({ archived: false }).sort({ order: 1, createdAt: 1 });
    if (habits.length === 0) {
      await Habit.insertMany(DEFAULT_HABITS);
      habits = await Habit.find({ archived: false }).sort({ order: 1, createdAt: 1 });
    }

    // Fetch all logs for this month
    const regex = new RegExp(`^${monthPrefix}`);
    const logs = await HabitLog.find({
      date: { $regex: regex },
      completed: true
    });

    // Fetch daily metrics (sleep hours) for this month
    const metrics = await DailyMetric.find({
      date: { $regex: regex }
    });

    // Map logs: { [habitId]: { [day]: true } }
    const logsMap = {};
    habits.forEach(h => { logsMap[h._id.toString()] = {}; });

    logs.forEach(log => {
      const hId = log.habit.toString();
      const dayNum = parseInt(log.date.split('-')[2], 10);
      if (logsMap[hId]) {
        logsMap[hId][dayNum] = true;
      }
    });

    // Map metrics: { [day]: { sleepHours, notes } }
    const metricsMap = {};
    metrics.forEach(m => {
      const dayNum = parseInt(m.date.split('-')[2], 10);
      metricsMap[dayNum] = {
        sleepHours: m.sleepHours || 0,
        notes: m.notes || ''
      };
    });

    // Calculate each habit's statistics
    const eachHabitStats = habits.map(h => {
      const hId = h._id.toString();
      const completedDays = logsMap[hId] ? Object.keys(logsMap[hId]).length : 0;
      const progressPercent = Math.round((completedDays / daysInMonth) * 100);
      return {
        habitId: hId,
        name: h.name,
        icon: h.icon,
        color: h.color,
        count: completedDays,
        totalDays: daysInMonth,
        progressPercent
      };
    });

    // Calculate daily statistics across all habits with habit score %
    const weekdaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const dailyStats = [];
    let totalCompletedMonth = 0;

    // Fast lookup habit by ID for normalized name
    const habitIdToNormalizedName = {};
    habits.forEach(h => {
      habitIdToNormalizedName[h._id.toString()] = h.name.toLowerCase().trim();
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
      const dayDate = new Date(year, month - 1, day);
      const weekday = weekdaysShort[dayDate.getDay()];
      const isSunday = dayDate.getDay() === 0;

      // Map of checked habits for this day: { [normalizedName]: true }
      const dayLogsByName = {};
      let dayCompletedCount = 0;

      habits.forEach(h => {
        const hId = h._id.toString();
        if (logsMap[hId] && logsMap[hId][day]) {
          dayCompletedCount++;
          dayLogsByName[habitIdToNormalizedName[hId]] = true;
        }
      });
      totalCompletedMonth += dayCompletedCount;

      const dayScore = calculateDailyHabitScore(dayLogsByName);
      const dayMetric = metricsMap[day] || { sleepHours: 0, notes: '' };

      dailyStats.push({
        day,
        date: dateStr,
        weekday,
        isSunday,
        completedCount: dayCompletedCount,
        totalHabits: habits.length,
        percent: habits.length > 0 ? Math.round((dayCompletedCount / habits.length) * 100) : 0,
        score: dayScore, // 0 - 100% based on weighted routine scoring
        sleepHours: dayMetric.sleepHours
      });
    }

    // Overall month statistics
    const totalPossible = habits.length * daysInMonth;
    const monthlyProgressPercent = totalPossible > 0 ? Number(((totalCompletedMonth / totalPossible) * 100).toFixed(1)) : 0;

    // Today's specific statistics
    const isCurrentMonth = (now.getFullYear() === year && (now.getMonth() + 1) === month);
    const todayDay = now.getDate();
    const todayStat = isCurrentMonth ? (dailyStats.find(d => d.day === todayDay) || null) : null;
    const todayScore = todayStat ? todayStat.score : 0;
    const todayCompletedCount = todayStat ? todayStat.completedCount : 0;

    // Calculate Streak:
    // (continues if daily habits score is >= 80%, breaks if any day gets below 80% 'except SUNDAY' which starts from 0 again)
    let streakCount = 0;
    const endDayForStreak = isCurrentMonth ? todayDay : daysInMonth;

    for (let d = 1; d <= endDayForStreak; d++) {
      const dStat = dailyStats[d - 1];
      if (!dStat) continue;

      if (d === endDayForStreak && isCurrentMonth) {
        // Today: if >= 80%, increment. If not yet 80%, keep previous streak count
        if (dStat.score >= 80) {
          streakCount++;
        }
      } else {
        if (dStat.score >= 80) {
          streakCount++;
        } else if (dStat.isSunday) {
          // Sunday is exempt! Does not break streak
        } else {
          // Non-Sunday with score < 80% breaks streak
          streakCount = 0;
        }
      }
    }

    // Major habits definitions & monthly completion
    const elapsedDays = isCurrentMonth ? Math.max(1, todayDay) : daysInMonth;
    const majorConfigs = [
      { key: 'book_reading', title: 'Book Reading', habits: ['book reading'], subtitle: 'Daily Reading' },
      { key: 'journaling', title: 'Journaling', habits: ['journaling', 'writing dreams'], subtitle: 'Journaling & Dreams' },
      { key: 'development', title: 'Development', habits: ['fyp development', 'project dev'], subtitle: 'FYP & Project Dev' },
      { key: 'leads_calls', title: 'Leads & Calls', habits: ['coldcall / practice', 'lead generation'], subtitle: 'Cold Call & Leads' },
      { key: 'workout', title: 'Workout', habits: ['workout / rest'], subtitle: 'Training & Rest' },
      { key: 'diet', title: 'Diet & Nutrition', habits: ['calories surplus', 'protein amount'], subtitle: 'Calories & Protein' },
      { key: 'personal_growth', title: 'Personal Growth', habits: ['learning videos', 'book reading', 'no movie / show', 'no disrespecting', 'no doom scroll', 'sleep on time', '5 prayers', 'namaz / dua'], subtitle: 'Mindset & Discipline' },
      { key: 'professional_growth', title: 'Professional Growth', habits: ['scholarships', 'job search', 'linkedin hunt'], subtitle: 'Careers & Network' }
    ];

    const majorHabitsStats = majorConfigs.map(cfg => {
      let completedChecks = 0;
      const matchedHabitIds = habits
        .filter(h => cfg.habits.includes(h.name.toLowerCase().trim()))
        .map(h => h._id.toString());

      matchedHabitIds.forEach(hId => {
        if (logsMap[hId]) {
          completedChecks += Object.keys(logsMap[hId]).length;
        }
      });

      const totalTarget = matchedHabitIds.length * elapsedDays;
      const percent = totalTarget > 0 ? Math.min(100, Math.round((completedChecks / totalTarget) * 100)) : 0;

      return {
        key: cfg.key,
        title: cfg.title,
        subtitle: cfg.subtitle,
        completedChecks,
        totalTarget,
        percent
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
      todayScore,
      overallStats: {
        totalPossible,
        totalCompleted: totalCompletedMonth,
        monthlyProgressPercent,
        todayCompletedCount,
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
