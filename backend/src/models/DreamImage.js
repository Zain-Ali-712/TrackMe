import mongoose from 'mongoose';

/** One photo of a 5-year goal, kept apart so goal lists stay small and photos load on their own. */
const dreamImageSchema = new mongoose.Schema(
  {
    dream: { type: mongoose.Schema.Types.ObjectId, ref: 'DreamGoal', required: true, index: true },
    data: { type: String, required: true } // compressed data URL, resized in the browser
  },
  { timestamps: true }
);

export default mongoose.model('DreamImage', dreamImageSchema);
