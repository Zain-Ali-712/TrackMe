import mongoose from 'mongoose';

/** Something worth remembering, dated the day it was added, with its own short journal. */
const achievementSchema = new mongoose.Schema(
  {
    month: { type: String, required: true }, // "YYYY-MM"
    date: { type: String, required: true }, // "YYYY-MM-DD", the day it was added
    title: { type: String, required: true, trim: true, maxlength: 300 },
    details: { type: String, default: '', maxlength: 20000 },
    detailsUpdatedAt: { type: Date }
  },
  { timestamps: true }
);

achievementSchema.index({ month: 1, date: -1 });

export default mongoose.model('Achievement', achievementSchema);
