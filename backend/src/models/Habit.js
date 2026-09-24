import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: '⚡' },
    color: { type: String, default: '#10b981' },
    targetDaysPerWeek: { type: Number, default: 7 },
    order: { type: Number, default: 0 },
    archived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Habit = mongoose.model('Habit', habitSchema);
export default Habit;
