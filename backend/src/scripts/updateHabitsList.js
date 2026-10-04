import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';

const NEW_HABITS = [
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

async function update() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI missing in .env');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // 1. Find Scholarships and Job Search
    const scholarships = await Habit.findOne({ name: { $regex: /scholarship/i } });
    let jobHabit = await Habit.findOne({ name: { $regex: /job/i } });

    if (jobHabit) {
      jobHabit.name = 'Job / Scholarships';
      await jobHabit.save();
      console.log('Renamed Job Search to Job / Scholarships');
    }

    if (scholarships && jobHabit) {
      // Migrate any logs from Scholarships to Job / Scholarships
      const sLogs = await HabitLog.find({ habit: scholarships._id });
      for (const log of sLogs) {
        const exists = await HabitLog.findOne({ habit: jobHabit._id, date: log.date });
        if (!exists) {
          log.habit = jobHabit._id;
          await log.save();
        } else {
          await HabitLog.findByIdAndDelete(log._id);
        }
      }
      await Habit.findByIdAndDelete(scholarships._id);
      console.log('Migrated Scholarships logs and removed old habit');
    }

    // 2. Ensure Brush Teeth exists
    let brushHabit = await Habit.findOne({ name: { $regex: /brush/i } });
    if (!brushHabit) {
      brushHabit = await Habit.create({
        name: 'Brush Teeth',
        icon: 'Sparkles',
        color: '#0ea5e9',
        targetDaysPerWeek: 7,
        order: 4
      });
      console.log('Created Brush Teeth habit');
    }

    // 3. Update order and properties for all habits
    for (const hConfig of NEW_HABITS) {
      const tokens = hConfig.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      // Find matching habit
      const habit = await Habit.findOne({
        name: { $regex: new RegExp(tokens[0], 'i') }
      });

      if (habit) {
        habit.name = hConfig.name;
        habit.order = hConfig.order;
        habit.color = hConfig.color;
        habit.icon = hConfig.icon;
        await habit.save();
      }
    }

    const all = await Habit.find().sort({ order: 1 });
    console.log(`Updated successfully. Total habits: ${all.length}`);
    all.forEach(h => console.log(`${h.order}: ${h.name}`));

    process.exit(0);
  } catch (err) {
    console.error('Error updating habits:', err);
    process.exit(1);
  }
}

update();
