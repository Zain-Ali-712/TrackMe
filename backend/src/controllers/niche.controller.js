import Niche from '../models/Niche.js';
import Lead from '../models/Lead.js';
import Appointment from '../models/Appointment.js';

export const getAllNiches = async (req, res) => {
  try {
    const niches = await Niche.find().sort({ order: 1 });
    res.json(niches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createNiche = async (req, res) => {
  try {
    const maxOrderNiche = await Niche.findOne().sort({ order: -1 });
    const order = maxOrderNiche ? maxOrderNiche.order + 1 : 0;
    
    const newNiche = new Niche({
      ...req.body,
      order
    });
    
    const savedNiche = await newNiche.save();
    res.status(201).json(savedNiche);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateNiche = async (req, res) => {
  try {
    const updatedNiche = await Niche.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedNiche) return res.status(404).json({ message: 'Niche not found' });
    res.json(updatedNiche);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteNiche = async (req, res) => {
  try {
    const nicheId = req.params.id;
    const deletedNiche = await Niche.findByIdAndDelete(nicheId);
    if (!deletedNiche) return res.status(404).json({ message: 'Niche not found' });
    
    await Lead.deleteMany({ niche: nicheId });
    await Appointment.deleteMany({ niche: nicheId });
    
    res.json({ message: 'Niche and all related leads and appointments deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reorderNiches = async (req, res) => {
  try {
    const { updates } = req.body; // Expecting [{ id: '...', order: 1 }, ...]
    
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update.id },
        update: { order: update.order }
      }
    }));
    
    if(updates && updates.length > 0) {
      await Niche.bulkWrite(bulkOps);
    }
    res.json({ message: 'Niches reordered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
