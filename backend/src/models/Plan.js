import mongoose from 'mongoose';

/**
 * A plan with a fixed start and end time, both set when it is made.
 * The app locks while a plan's start has passed without it being marked
 * started, or its end has passed without it being done.
 */
const planSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: '', maxlength: 20000 },
    startAt: { type: Date },
    startedAt: { type: Date },
    // End time. Empty only for plans made before start/end times, until it is set once.
    deadline: { type: Date, default: null },
    done: { type: Boolean, default: false },
    doneAt: { type: Date }
  },
  { timestamps: true }
);

planSchema.index({ done: 1, startAt: 1 });

export default mongoose.model('Plan', planSchema);
