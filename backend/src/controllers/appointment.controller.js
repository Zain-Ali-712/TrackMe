import Appointment from '../models/Appointment.js';
import Lead from '../models/Lead.js';

export const getAppointments = async (req, res) => {
  try {
    const { niche, status } = req.query;
    let query = {};
    
    if (niche) query.niche = niche;
    if (status) query.status = status;
    
    const appointments = await Appointment.find(query)
      .populate('lead', 'businessName personName contact email location website createdAt status')
      .populate('niche', 'name icon color')
      .sort({ dateTime: -1 });
      
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAppointment = async (req, res) => {
  try {
    if (req.body.leadId && !req.body.lead) req.body.lead = req.body.leadId;
    if (req.body.nicheId && !req.body.niche) req.body.niche = req.body.nicheId;

    if (!req.body.niche && req.body.lead) {
      const lead = await Lead.findById(req.body.lead);
      if (lead) req.body.niche = lead.niche;
    }

    const newAppointment = new Appointment(req.body);
    let savedAppointment = await newAppointment.save();
    
    await Lead.findByIdAndUpdate(req.body.lead, { status: 'Appointment' });
    
    savedAppointment = await savedAppointment.populate([
      { path: 'lead', select: 'businessName personName contact' },
      { path: 'niche', select: 'name icon color' }
    ]);
    
    res.status(201).json(savedAppointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'lead', select: 'businessName personName contact' },
      { path: 'niche', select: 'name icon color' }
    ]);
    
    if (!updatedAppointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json(updatedAppointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteAppointment = async (req, res) => {
  try {
    const deletedAppointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!deletedAppointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
