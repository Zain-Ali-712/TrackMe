import mongoose from 'mongoose';

const habitLogSchema = new mongoose.Schema(
  {
    habit: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true },
    date: { type: String, required: true }, // Format "YYYY-MM-DD" e.g. "2026-09-01"
    completed: { type: Boolean, default: true },
    value: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// Compound index to ensure 1 entry per habit per day
habitLogSchema.index({ habit: 1, date: 1 }, { unique: true });

const HabitLog = mongoose.model('HabitLog', habitLogSchema);
export default HabitLog;
