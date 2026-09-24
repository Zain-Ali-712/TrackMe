import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Habit from '../models/Habit.js';

export const USER_HABITS = [
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

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trackme';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Remove existing habits
    await Habit.deleteMany({});
    console.log('Cleared old habits');

    // Insert 22 user habits
    const created = await Habit.insertMany(USER_HABITS);
    console.log(`Successfully seeded ${created.length} user habits!`);

    process.exit(0);
  } catch (err) {
    console.error('Failed to seed user habits:', err);
    process.exit(1);
  }
}

run();
