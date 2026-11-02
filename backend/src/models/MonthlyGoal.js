import mongoose from 'mongoose';

const monthlyGoalSchema = new mongoose.Schema(
  {
    month: { type: String, required: true }, // "YYYY-MM"
    text: { type: String, required: true, trim: true, maxlength: 500 },
    done: { type: Boolean, default: false },
    doneAt: { type: Date }
  },
  { timestamps: true }
);

monthlyGoalSchema.index({ month: 1, createdAt: 1 });

export default mongoose.model('MonthlyGoal', monthlyGoalSchema);
