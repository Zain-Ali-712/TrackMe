import mongoose from 'mongoose';

/**
 * A plan with a hard deadline. The deadline is fixed once the plan is made;
 * while an unfinished plan is past it, the app locks to the plans page.
 */
const planSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: '', maxlength: 20000 },
    deadline: { type: Date, required: true },
    done: { type: Boolean, default: false },
    doneAt: { type: Date }
  },
  { timestamps: true }
);

planSchema.index({ done: 1, deadline: 1 });

export default mongoose.model('Plan', planSchema);
