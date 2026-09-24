import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    niche: { type: mongoose.Schema.Types.ObjectId, ref: 'Niche', required: true },
    dateTime: { type: Date, required: true },
    duration: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'No Show', 'Cancelled', 'Rescheduled'],
      default: 'Scheduled'
    },
    notes: { type: String }
  },
  { timestamps: true }
);

appointmentSchema.index({ lead: 1 });
appointmentSchema.index({ dateTime: -1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
