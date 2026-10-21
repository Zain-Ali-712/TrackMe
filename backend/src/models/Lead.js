import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    niche: { type: mongoose.Schema.Types.ObjectId, ref: 'Niche', required: true },
    businessName: { type: String, required: true, trim: true },
    personName: { type: String, trim: true },
    contact: { type: String, trim: true },
    email: { type: String, trim: true },
    website: { type: String, trim: true },
    location: { type: String, trim: true },
    status: {
      type: String,
      enum: ['New Lead', 'No Answer', 'Not Interested', 'Callback', 'Follow Up', 'Appointment', 'Closed', 'DNC'],
      default: 'New Lead'
    },
    notes: { type: String },
    followUpDate: { type: Date },
    followUpNotes: { type: String },
    coldCalled: { type: Boolean, default: false },
    coldCalledAt: { type: Date },
    // When the status last changed, and when the lead first reached the
    // Appointment / Closed stages. Charts use these so a booking or a win
    // shows on the day it happened, not the day the lead was added.
    statusChangedAt: { type: Date },
    appointmentAt: { type: Date },
    closedAt: { type: Date },
    // Call-prep fields. Kept separate from `notes`: they describe how to pitch
    // the lead, not the history of what happened with it.
    bestCallTime: { type: String, trim: true, default: '' },
    problem: { type: String, default: '' },
    solution: { type: String, default: '' },
    coldCallQuestions: { type: String, default: '' },
    // Nearby businesses to cite on the call as relatable proof
    nearbyExamples: { type: String, default: '' }
  },
  { timestamps: true }
);

leadSchema.index({ niche: 1, createdAt: -1 });

const Lead = mongoose.model('Lead', leadSchema);
export default Lead;
