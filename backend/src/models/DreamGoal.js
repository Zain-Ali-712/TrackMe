import mongoose from 'mongoose';

/** A 5-year goal: photo, title, formatted text (light Markdown) and dated notes. */
const dreamGoalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    image: { type: String, default: '' }, // compressed data URL, resized in the browser
    content: { type: String, default: '' }, // **bold**, *italic*, "- " bullets, "- [ ] " / "- [x] " checklist
    achievedAt: { type: Date },
    notes: { type: String, default: '' }, // serialized dated notes, same format as lead notes
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model('DreamGoal', dreamGoalSchema);
