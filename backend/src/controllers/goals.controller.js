import DailyGoal, { GOAL_LOCATIONS } from '../models/DailyGoal.js';
import MonthlyGoal from '../models/MonthlyGoal.js';
import DreamGoal from '../models/DreamGoal.js';
import DreamImage from '../models/DreamImage.js';
import Achievement from '../models/Achievement.js';
import MonthlyJournal from '../models/MonthlyJournal.js';
import Plan from '../models/Plan.js';
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
    const [goals, habits, achievements, journals] = await Promise.all([
      MonthlyGoal.find({ month: { $in: months } }).sort({ createdAt: 1 }),
      Habit.find({ archived: false }),
      Achievement.find({ month: { $in: months } }).sort({ date: -1, createdAt: -1 }),
      MonthlyJournal.find({ month: { $in: months } })
    ]);
    const ctx = await loadScoringContext(habits);
    const result = [];
    for (const month of months) {
      result.push({
        month,
        goals: goals.filter((g) => g.month === month),
        achievements: achievements.filter((a) => a.month === month),
        journal: journals.find((j) => j.month === month) || null,
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
  if (body.achieved !== undefined) fields.achievedAt = body.achieved ? new Date() : null;
  return fields;
}

const MAX_DREAM_IMAGES = 12;

const checkImage = (value) => {
  const image = String(value || '');
  if (!IMAGE_RE.test(image) || image.length > MAX_IMAGE_CHARS) {
    throw new Error('The photo must be a JPEG, PNG or WebP under 2 MB.');
  }
  return image;
};

/** Goals used to hold one inline photo; move any left over into their own documents, once per instance. */
let dreamImagesMigrated = false;
async function migrateDreamImages() {
  if (dreamImagesMigrated) return;
  const legacy = await DreamGoal.find({ image: { $nin: ['', null] } }).select('image images');
  for (const dream of legacy) {
    const img = await DreamImage.create({ dream: dream._id, data: dream.image });
    dream.images = [img._id, ...(dream.images || [])];
    dream.image = '';
    await dream.save();
  }
  dreamImagesMigrated = true;
}

export const listDreams = async (req, res) => {
  try {
    await migrateDreamImages();
    // Photos are fetched one by one by id, so this list stays small however many there are.
    res.json(await DreamGoal.find().select('-image').sort({ order: 1, createdAt: 1 }).lean());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDreamImage = async (req, res) => {
  try {
    const img = await DreamImage.findById(req.params.imageId).select('data').lean();
    if (!img) return res.status(404).json({ message: 'Photo not found' });
    // A photo never changes once saved (edits add a new one), so the browser can keep it.
    res.set('Cache-Control', 'private, max-age=31536000, immutable');
    res.json({ _id: img._id, data: img.data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addDreamImage = async (req, res) => {
  try {
    const dream = await DreamGoal.findById(req.params.id).select('images');
    if (!dream) return res.status(404).json({ message: 'Goal not found' });
    if ((dream.images || []).length >= MAX_DREAM_IMAGES) {
      return res.status(400).json({ message: `A goal can have up to ${MAX_DREAM_IMAGES} photos.` });
    }
    const img = await DreamImage.create({ dream: dream._id, data: checkImage(req.body.image) });
    dream.images.push(img._id);
    await dream.save();
    res.status(201).json({ _id: img._id, images: dream.images });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteDreamImage = async (req, res) => {
  try {
    const dream = await DreamGoal.findById(req.params.id).select('images');
    if (!dream) return res.status(404).json({ message: 'Goal not found' });
    dream.images = dream.images.filter((id) => id.toString() !== req.params.imageId);
    await Promise.all([dream.save(), DreamImage.deleteOne({ _id: req.params.imageId, dream: dream._id })]);
    res.json({ images: dream.images });
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
    if (Array.isArray(req.body.images)) {
      // Reorder only (the first photo is the cover); adding and removing have their own routes.
      const current = await DreamGoal.findById(req.params.id).select('images').lean();
      if (!current) return res.status(404).json({ message: 'Goal not found' });
      const have = new Set((current.images || []).map(String));
      const next = req.body.images.map(String);
      if (next.length !== have.size || !next.every((id) => have.has(id))) {
        return res.status(400).json({ message: 'Photos changed in the meantime. Reload and try again.' });
      }
      fields.images = next;
    }
    const dream = await DreamGoal.findByIdAndUpdate(req.params.id, fields, { new: true }).select('-image').lean();
    if (!dream) return res.status(404).json({ message: 'Goal not found' });
    res.json(dream);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteDream = async (req, res) => {
  try {
    await Promise.all([DreamGoal.findByIdAndDelete(req.params.id), DreamImage.deleteMany({ dream: req.params.id })]);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ----------------------- Achievements & monthly journal ----------------------- */

export const createAchievement = async (req, res) => {
  try {
    const title = String(req.body.title || '').trim().slice(0, 300);
    if (!title) return res.status(400).json({ message: 'Write the achievement first.' });
    // The browser's day, as long as it is today or yesterday on the server's clock.
    const date = isDateEditable(req.body.date) ? req.body.date : toDateString(new Date());
    const details = String(req.body.details || '').slice(0, 20000);
    const achievement = await Achievement.create({
      month: date.slice(0, 7),
      date,
      title,
      details,
      detailsUpdatedAt: details ? new Date() : undefined
    });
    res.status(201).json(achievement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) return res.status(404).json({ message: 'Achievement not found' });
    if (req.body.title !== undefined) achievement.title = String(req.body.title).trim().slice(0, 300) || achievement.title;
    if (req.body.details !== undefined) {
      achievement.details = String(req.body.details).slice(0, 20000);
      achievement.detailsUpdatedAt = new Date();
    }
    await achievement.save();
    res.json(achievement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteAchievement = async (req, res) => {
  try {
    await Achievement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Save a month's journal; any past or current month, never a future one. */
export const saveMonthlyJournal = async (req, res) => {
  try {
    const { month } = req.params;
    // One day of slack so a timezone ahead of the server can start its new month.
    const latest = toDateString(new Date(Date.now() + 86400000)).slice(0, 7);
    if (!MONTH_RE.test(month) || month > latest) {
      return res.status(400).json({ message: 'You can only write journals for this month or earlier.' });
    }
    const content = String(req.body.content ?? '').slice(0, 50000);
    const journal = await MonthlyJournal.findOneAndUpdate({ month }, { content }, { upsert: true, new: true });
    res.json(journal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/* ---------------------------------- Plans ---------------------------------- */

const PLAN_HISTORY_DAYS = 60;

/**
 * Why a plan holds the app hostage right now, or null:
 *  - 'overdue'      its end time passed and it isn't done
 *  - 'not_started'  its start time passed and it was never marked started
 */
export function planLockReason(plan, now = Date.now()) {
  if (plan.done) return null;
  if (plan.deadline && new Date(plan.deadline).getTime() <= now) return 'overdue';
  if (!plan.startedAt && plan.startAt && new Date(plan.startAt).getTime() <= now) return 'not_started';
  return null;
}

/**
 * Plans used to have a single deadline. That date becomes the start time; open
 * plans get an empty end time to fill in once, finished ones keep it as their end.
 */
let plansMigrated = false;
async function migratePlans() {
  if (plansMigrated) return;
  await Plan.updateMany({ startAt: { $exists: false }, done: true }, [
    { $set: { startAt: '$deadline', startedAt: { $ifNull: ['$startedAt', { $ifNull: ['$doneAt', '$deadline'] }] } } }
  ]);
  await Plan.updateMany({ startAt: { $exists: false }, done: { $ne: true } }, [{ $set: { startAt: '$deadline', deadline: null } }]);
  plansMigrated = true;
}

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const listPlans = async (req, res) => {
  try {
    await migratePlans();
    const since = new Date(Date.now() - PLAN_HISTORY_DAYS * 86400000);
    const plans = await Plan.find({ $or: [{ done: false }, { doneAt: { $gte: since } }] }).sort({ startAt: 1 }).lean();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createPlan = async (req, res) => {
  try {
    await migratePlans();
    const title = String(req.body.title || '').trim().slice(0, 200);
    if (!title) return res.status(400).json({ message: 'Give the plan a heading.' });
    const now = new Date();
    const startNow = Boolean(req.body.startNow);
    const startAt = startNow ? now : parseDate(req.body.startAt);
    const deadline = parseDate(req.body.deadline);
    if (!startAt) return res.status(400).json({ message: 'Pick when you will start.' });
    if (!deadline) return res.status(400).json({ message: 'Pick when it should be finished.' });
    if (!startNow && startAt.getTime() <= now.getTime()) {
      return res.status(400).json({ message: 'The start time has to be in the future, or choose "Starting now".' });
    }
    if (deadline.getTime() <= startAt.getTime() || deadline.getTime() <= now.getTime()) {
      return res.status(400).json({ message: 'The end time has to be after the start time.' });
    }
    const plan = await Plan.create({
      title,
      content: String(req.body.content || '').slice(0, 20000),
      startAt,
      startedAt: startNow ? now : undefined,
      deadline
    });
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updatePlan = async (req, res) => {
  try {
    await migratePlans();
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    const now = new Date();

    if (req.body.startAt !== undefined && parseDate(req.body.startAt)?.getTime() !== plan.startAt?.getTime()) {
      return res.status(400).json({ message: "A plan's start time can't be changed." });
    }
    if (req.body.deadline !== undefined) {
      const deadline = parseDate(req.body.deadline);
      if (plan.deadline) {
        if (deadline?.getTime() !== plan.deadline.getTime()) {
          return res.status(400).json({ message: "A plan's end time can't be changed." });
        }
      } else {
        // Plans from before start/end times get their end time set once, here.
        if (!deadline || deadline.getTime() <= now.getTime() || (plan.startAt && deadline.getTime() <= plan.startAt.getTime())) {
          return res.status(400).json({ message: 'The end time has to be in the future and after the start.' });
        }
        plan.deadline = deadline;
      }
    }
    if (req.body.title !== undefined) plan.title = String(req.body.title).trim().slice(0, 200) || plan.title;
    if (req.body.content !== undefined) plan.content = String(req.body.content).slice(0, 20000);
    if (req.body.started !== undefined && !plan.done) {
      plan.startedAt = req.body.started ? plan.startedAt || now : undefined;
    }
    if (req.body.done !== undefined) {
      plan.done = Boolean(req.body.done);
      plan.doneAt = plan.done ? now : undefined;
      if (plan.done && !plan.startedAt) plan.startedAt = now;
    }
    await plan.save();
    res.json(plan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/** A plan that is locking the app can't be deleted; start it or finish it instead. */
export const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.json({ message: 'Deleted' });
    const reason = planLockReason(plan);
    if (reason) {
      return res.status(400).json({
        message: reason === 'overdue' ? 'This plan is overdue. Mark it done instead.' : 'This plan should have started. Mark it started instead.'
      });
    }
    await plan.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
