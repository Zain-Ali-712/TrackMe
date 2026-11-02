import DailyGoal, { GOAL_LOCATIONS } from '../models/DailyGoal.js';
import MonthlyGoal from '../models/MonthlyGoal.js';
import DreamGoal from '../models/DreamGoal.js';
import DailyMetric from '../models/DailyMetric.js';
import Habit from '../models/Habit.js';
import { isDateEditable, toDateString } from '../lib/dateRules.js';
import { isBreakDay, STREAK_THRESHOLD } from '../lib/habitScoring.js';
import { loadScoringContext, scoreDay, nextDate } from '../lib/habitDays.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Monthly targets shown on the dashboard, reused as automatic monthly goals.
const MONTHLY_TARGETS = { calls: 200, leads: 250, habitScore: STREAK_THRESHOLD, workouts: 20, dailyGoals: 80 };

const currentMonth = () => toDateString(new Date()).slice(0, 7);

/** Only today and yesterday can change, and never a break Sunday. */
function checkDailyEditable(date, res) {
  if (!DATE_RE.test(String(date || '')) || !isDateEditable(date)) {
    res.status(400).json({ message: 'Daily goals can only be changed for today and yesterday.' });
    return false;
  }
  if (isBreakDay(date)) {
    res.status(400).json({ message: 'This is a break Sunday. Nothing is tracked today.' });
    return false;
  }
  return true;
}

function cleanDailyFields(body) {
  const fields = {};
  if (body.text !== undefined) fields.text = String(body.text).trim().slice(0, 500);
  if (body.time !== undefined) fields.time = TIME_RE.test(body.time) ? body.time : '';
  if (body.location !== undefined) fields.location = GOAL_LOCATIONS.includes(body.location) ? body.location : '';
  if (body.done !== undefined) {
    fields.done = Boolean(body.done);
    fields.doneAt = fields.done ? new Date() : null;
  }
  return fields;
}

/* ------------------------------ Daily goals ------------------------------ */

export const listDailyGoals = async (req, res) => {
  try {
    const to = DATE_RE.test(req.query.to || '') ? req.query.to : toDateString(new Date());
    const fromDefault = new Date();
    fromDefault.setDate(fromDefault.getDate() - 90);
    const from = DATE_RE.test(req.query.from || '') ? req.query.from : toDateString(fromDefault);
    const goals = await DailyGoal.find({ date: { $gte: from, $lte: to } }).sort({ date: -1, time: 1, createdAt: 1 });
    res.json({ goals, locations: GOAL_LOCATIONS });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDailyGoal = async (req, res) => {
  try {
    const date = req.body.date || toDateString(new Date());
    if (!checkDailyEditable(date, res)) return;
    const fields = cleanDailyFields(req.body);
    if (!fields.text) return res.status(400).json({ message: 'Write the goal first.' });
    const goal = await DailyGoal.create({ ...fields, date, done: false });
    res.status(201).json(goal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateDailyGoal = async (req, res) => {
  try {
    const goal = await DailyGoal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (!checkDailyEditable(goal.date, res)) return;
    Object.assign(goal, cleanDailyFields(req.body));
    if (!goal.text) return res.status(400).json({ message: 'A goal needs some text.' });
    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteDailyGoal = async (req, res) => {
  try {
    const goal = await DailyGoal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (!checkDailyEditable(goal.date, res)) return;
    await goal.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ----------------------------- Monthly goals ----------------------------- */

/** Automatic goals for a month, measured from your real activity. */
async function autoGoalsFor(month, ctx) {
  const [y, m] = month.split('-').map(Number);
  const today = toDateString(new Date());
  const first = `${month}-01`;
  const last = toDateString(new Date(y, m, 0));
  const end = last < today ? last : today;

  let calls = 0;
  let leads = 0;
  let scoreSum = 0;
  let scoredDays = 0;
  let goalDays = 0;
  let goalDaysMet = 0;
  for (let d = first; d <= end; d = nextDate(d)) {
    calls += ctx.callsByDate.get(d) || 0;
    leads += ctx.leadsByDate.get(d) || 0;
    if (!isBreakDay(d)) {
      scoreSum += scoreDay(ctx, d).score;
      scoredDays += 1;
    }
    const g = ctx.goalsByDate.get(d);
    if (g && g.total > 0) {
      goalDays += 1;
      if (g.done === g.total) goalDaysMet += 1;
    }
  }
  const workouts = await DailyMetric.countDocuments({ date: { $regex: `^${month}` }, workoutStatus: 'workout' });
  const avgScore = scoredDays ? Math.round(scoreSum / scoredDays) : 0;
  const goalRate = goalDays ? Math.round((goalDaysMet / goalDays) * 100) : 0;

  return [
    { key: 'calls', label: `Make ${MONTHLY_TARGETS.calls} cold calls`, current: calls, target: MONTHLY_TARGETS.calls, unit: 'calls' },
    { key: 'leads', label: `Add ${MONTHLY_TARGETS.leads} leads`, current: leads, target: MONTHLY_TARGETS.leads, unit: 'leads' },
    { key: 'habitScore', label: `Average habit score ${MONTHLY_TARGETS.habitScore}%+`, current: avgScore, target: MONTHLY_TARGETS.habitScore, unit: '%' },
    { key: 'workouts', label: `Work out ${MONTHLY_TARGETS.workouts} days`, current: workouts, target: MONTHLY_TARGETS.workouts, unit: 'days' },
    { key: 'dailyGoals', label: `Meet every daily goal on ${MONTHLY_TARGETS.dailyGoals}% of days`, current: goalRate, target: MONTHLY_TARGETS.dailyGoals, unit: '%' }
  ].map((g) => ({ ...g, done: g.current >= g.target }));
}

export const listMonthlyGoals = async (req, res) => {
  try {
    const count = Math.min(24, Math.max(1, parseInt(req.query.count, 10) || 6));
    const now = new Date();
    const months = Array.from({ length: count }, (_, i) =>
      toDateString(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7)
    );
    const [goals, habits] = await Promise.all([
      MonthlyGoal.find({ month: { $in: months } }).sort({ createdAt: 1 }),
      Habit.find({ archived: false })
    ]);
    const ctx = await loadScoringContext(habits);
    const result = [];
    for (const month of months) {
      result.push({
        month,
        goals: goals.filter((g) => g.month === month),
        auto: await autoGoalsFor(month, ctx)
      });
    }
    res.json({ months: result, currentMonth: currentMonth() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Monthly goals can be changed during their own month only. */
function checkMonthEditable(month, res) {
  if (!MONTH_RE.test(String(month || '')) || month !== currentMonth()) {
    res.status(400).json({ message: 'Only this month\'s goals can be changed.' });
    return false;
  }
  return true;
}

export const createMonthlyGoal = async (req, res) => {
  try {
    const month = req.body.month || currentMonth();
    if (!checkMonthEditable(month, res)) return;
    const text = String(req.body.text || '').trim().slice(0, 500);
    if (!text) return res.status(400).json({ message: 'Write the goal first.' });
    res.status(201).json(await MonthlyGoal.create({ month, text }));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMonthlyGoal = async (req, res) => {
  try {
    const goal = await MonthlyGoal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (!checkMonthEditable(goal.month, res)) return;
    if (req.body.text !== undefined) goal.text = String(req.body.text).trim().slice(0, 500) || goal.text;
    if (req.body.done !== undefined) {
      goal.done = Boolean(req.body.done);
      goal.doneAt = goal.done ? new Date() : null;
    }
    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteMonthlyGoal = async (req, res) => {
  try {
    const goal = await MonthlyGoal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (!checkMonthEditable(goal.month, res)) return;
    await goal.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ------------------------------ 5-year goals ----------------------------- */

const IMAGE_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_CHARS = 3_000_000; // ~2.2 MB once decoded; the browser sends ~200-400 KB

function cleanDreamFields(body) {
  const fields = {};
  if (body.title !== undefined) fields.title = String(body.title).trim().slice(0, 200);
  if (body.content !== undefined) fields.content = String(body.content).slice(0, 20000);
  if (body.notes !== undefined) fields.notes = String(body.notes).slice(0, 100000);
  if (body.image !== undefined) {
    const image = String(body.image || '');
    if (image && (!IMAGE_RE.test(image) || image.length > MAX_IMAGE_CHARS)) {
      throw new Error('The photo must be a JPEG, PNG or WebP under 2 MB.');
    }
    fields.image = image;
  }
  if (body.achieved !== undefined) fields.achievedAt = body.achieved ? new Date() : null;
  return fields;
}

export const listDreams = async (req, res) => {
  try {
    res.json(await DreamGoal.find().sort({ order: 1, createdAt: 1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDream = async (req, res) => {
  try {
    const fields = cleanDreamFields(req.body);
    if (!fields.title) return res.status(400).json({ message: 'Give the goal a title.' });
    const count = await DreamGoal.countDocuments();
    res.status(201).json(await DreamGoal.create({ ...fields, order: count }));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateDream = async (req, res) => {
  try {
    const fields = cleanDreamFields(req.body);
    if (fields.title === '') delete fields.title;
    const dream = await DreamGoal.findByIdAndUpdate(req.params.id, fields, { new: true });
    if (!dream) return res.status(404).json({ message: 'Goal not found' });
    res.json(dream);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteDream = async (req, res) => {
  try {
    await DreamGoal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
