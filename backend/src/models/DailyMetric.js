import mongoose from 'mongoose';

const dailyMetricSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // Format "YYYY-MM-DD"
    sleepHours: { type: Number, default: 0 },
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    workoutStatus: { type: String, enum: ['workout', 'rest', 'none', ''], default: '' },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

const DailyMetric = mongoose.model('DailyMetric', dailyMetricSchema);
export default DailyMetric;
