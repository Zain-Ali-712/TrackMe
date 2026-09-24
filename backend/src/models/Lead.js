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
    coldCalledAt: { type: Date }
  },
  { timestamps: true }
);

leadSchema.index({ niche: 1, createdAt: -1 });

const Lead = mongoose.model('Lead', leadSchema);
export default Lead;
