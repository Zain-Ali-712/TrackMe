/**
 * READ-ONLY diagnostic. Reports habits that match no scoring rule (which would
 * silently cost points) and the score a fully-completed day actually reaches.
 *
 * Run: node src/scripts/inspectHabitScoring.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import {
  assignHabitsToRules,
  calculateDailyHabitScore,
  MAX_DAILY_SCORE,
  SCORING_RULES
} from '../lib/habitScoring.js';

dotenv.config();

async function run() {
  const habits = await Habit.find({ archived: false }).sort({ order: 1 });
  const names = habits.map((habit) => habit.name);

  const { assignments, unmatched } = assignHabitsToRules(names);
  const allCheckedScore = calculateDailyHabitScore(names);

  console.log('=== Scoring rules ===');
  for (const rule of SCORING_RULES) {
    const assigned = assignments.get(rule.id) || [];
    const flag = assigned.length ? 'OK  ' : 'GAP ';
    const label = rule.slots ? `${rule.partial}/${rule.weight}` : String(rule.weight);
    console.log(`  ${flag}${rule.id.padEnd(20)} ${label.padStart(7)}%  <- ${assigned.join(', ') || 'NO HABIT MATCHES'}`);
  }

  console.log('\n=== Result ===');
  console.log(`  Habits in database:      ${habits.length}`);
  console.log(`  Rules with no habit:     ${SCORING_RULES.filter((r) => !assignments.get(r.id)).length}`);
  console.log(`  Unmatched habits:        ${unmatched.length ? unmatched.join(', ') : '(none)'}`);
  console.log(`  Rules sum to:            ${MAX_DAILY_SCORE}%`);
  console.log(`  Score if ALL checked:    ${allCheckedScore}%`);
  console.log(allCheckedScore === 100 ? '  RESULT: PASS' : '  RESULT: FAIL - not every habit scores');

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayLogs = await HabitLog.find({ date: todayStr, completed: true });
  const checkedIds = new Set(todayLogs.map((log) => String(log.habit)));
  const checkedNames = habits.filter((habit) => checkedIds.has(String(habit._id))).map((habit) => habit.name);

  console.log(`\n=== Today (${todayStr}) ===`);
  console.log(`  Checked: ${checkedIds.size}/${habits.length}  Score: ${calculateDailyHabitScore(checkedNames)}%`);

  process.exit(0);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(run)
  .catch((err) => {
    console.error('Failed:', err.message);
    process.exit(1);
  });