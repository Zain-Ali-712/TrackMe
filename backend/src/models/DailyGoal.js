import mongoose from 'mongoose';

export const GOAL_LOCATIONS = ['Lib', 'Fyp1', 'Fyp2', 'C block', 'Lec time', 'Sofa', 'Room'];

const dailyGoalSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // "YYYY-MM-DD"
    text: { type: String, required: true, trim: true, maxlength: 500 },
    time: { type: String, default: '' }, // "HH:MM"
    location: { type: String, default: '' },
    done: { type: Boolean, default: false },
    doneAt: { type: Date }
  },
  { timestamps: true }
);

dailyGoalSchema.index({ date: 1, time: 1 });

export default mongoose.model('DailyGoal', dailyGoalSchema);
