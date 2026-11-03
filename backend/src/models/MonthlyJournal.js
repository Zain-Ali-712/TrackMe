import mongoose from 'mongoose';

/** One journal entry per month, usually written at the end of it; editable any time. */
const monthlyJournalSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true }, // "YYYY-MM"
    content: { type: String, default: '', maxlength: 50000 }
  },
  { timestamps: true }
);

export default mongoose.model('MonthlyJournal', monthlyJournalSchema);
