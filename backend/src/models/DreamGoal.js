import mongoose from 'mongoose';

/** A 5-year goal: photo, title, formatted text (light Markdown) and dated notes. */
const dreamGoalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    image: { type: String, default: '' }, // legacy single photo; moved into DreamImage on first load
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DreamImage' }], // first one is the cover
    content: { type: String, default: '' }, // **bold**, *italic*, "- " bullets, "- [ ] " / "- [x] " checklist
    achievedAt: { type: Date },
    notes: { type: String, default: '' }, // serialized dated notes, same format as lead notes
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model('DreamGoal', dreamGoalSchema);
