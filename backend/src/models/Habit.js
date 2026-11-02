import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: '⚡' },
    color: { type: String, default: '#10b981' },
    targetDaysPerWeek: { type: Number, default: 7 },
    order: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
    // Last used the day before this date ("YYYY-MM-DD"). Kept, not deleted, so
    // its marks still count on the days it was part of the routine.
    retiredFrom: { type: String }
  },
  { timestamps: true }
);

const Habit = mongoose.model('Habit', habitSchema);
export default Habit;
