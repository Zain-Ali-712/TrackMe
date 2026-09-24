import mongoose from 'mongoose';

const nicheSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: '📋' },
    color: { type: String, default: '#8b5cf6' },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const Niche = mongoose.model('Niche', nicheSchema);
export default Niche;
