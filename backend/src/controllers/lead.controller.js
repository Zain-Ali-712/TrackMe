import Lead from '../models/Lead.js';
import Appointment from '../models/Appointment.js';
import Niche from '../models/Niche.js';

export const getLeads = async (req, res) => {
  try {
    const { niche, status, search } = req.query;
    let query = {};
    
    if (niche && niche !== 'all') query.niche = niche;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { personName: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    const leads = await Lead.find(query)
      .populate('niche', 'name icon color')
      .sort({ createdAt: -1 });
      
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find()
      .populate('niche', 'name icon color')
      .sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createLead = async (req, res) => {
  try {
    if (req.body.nicheId && !req.body.niche) {
      req.body.niche = req.body.nicheId;
    }
    if (!req.body.niche) {
      const firstNiche = await Niche.findOne().sort({ order: 1 });
      if (firstNiche) {
        req.body.niche = firstNiche._id;
      } else {
        const defaultNiche = await Niche.create({
          name: 'General',
          icon: 'folder',
          color: '#64748b',
          order: 0
        });
        req.body.niche = defaultNiche._id;
      }
    }

    // Auto mark cold called if created directly with status != 'New Lead'
    if (req.body.status && req.body.status !== 'New Lead' && !req.body.coldCalled) {
      req.body.coldCalled = true;
      req.body.coldCalledAt = new Date();
    } else if (req.body.coldCalled && !req.body.coldCalledAt) {
      req.body.coldCalledAt = new Date();
    }

    const newLead = new Lead(req.body);
    let savedLead = await newLead.save();
    savedLead = await savedLead.populate('niche', 'name icon color');
    res.status(201).json(savedLead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateLead = async (req, res) => {
  try {
    if (req.body.nicheId && !req.body.niche) {
      req.body.niche = req.body.nicheId;
    }

    const currentLead = await Lead.findById(req.params.id);
    if (!currentLead) return res.status(404).json({ message: 'Lead not found' });

    // Handle cold call toggling & auto-tick rule
    if (req.body.coldCalled !== undefined) {
      if (req.body.coldCalled === true) {
        req.body.coldCalled = true;
        req.body.coldCalledAt = currentLead.coldCalledAt || new Date();
      } else {
        req.body.coldCalled = false;
        req.body.coldCalledAt = null;
      }
    } else if (req.body.status && req.body.status !== 'New Lead' && !currentLead.coldCalled) {
      // If user changed status without checking the box, auto check it!
      req.body.coldCalled = true;
      req.body.coldCalledAt = currentLead.coldCalledAt || new Date();
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('niche', 'name icon color');
    
    res.json(updatedLead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    const deletedLead = await Lead.findByIdAndDelete(leadId);
    if (!deletedLead) return res.status(404).json({ message: 'Lead not found' });
    
    await Appointment.deleteMany({ lead: leadId });
    
    res.json({ message: 'Lead and related appointments deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLeadStats = async (req, res) => {
  try {
    const now = new Date();
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay(), diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [
      totalLeads,
      leadsToday,
      leadsThisWeek,
      leadsThisMonth,
      totalCalls,
      callsThisWeek,
      callsThisMonth,
      upcomingAppointmentsList
    ] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ createdAt: { $gte: startOfToday } }),
      Lead.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Lead.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Lead.countDocuments({ coldCalled: true }),
      Lead.countDocuments({ coldCalled: true, coldCalledAt: { $gte: startOfWeek } }),
      Lead.countDocuments({ coldCalled: true, coldCalledAt: { $gte: startOfMonth } }),
      Appointment.find({ dateTime: { $gte: now }, status: 'Scheduled' })
        .populate('lead', 'businessName personName')
        .sort({ dateTime: 1 })
        .limit(5)
    ]);

    const startOf7DaysAgo = new Date(now);
    startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);
    startOf7DaysAgo.setHours(0,0,0,0);

    const chartData = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOf7DaysAgo);
      d.setDate(d.getDate() + i);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      
      const [leads, calls] = await Promise.all([
        Lead.countDocuments({ createdAt: { $gte: d, $lt: nextD } }),
        Lead.countDocuments({ coldCalled: true, coldCalledAt: { $gte: d, $lt: nextD } })
      ]);
      
      chartData.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        leads,
        calls
      });
    }

    res.json({
      leads: {
        total: totalLeads,
        thisWeek: leadsThisWeek,
        thisMonth: leadsThisMonth,
        weekGoal: 60,
        monthGoal: 250
      },
      calls: {
        total: totalCalls,
        thisWeek: callsThisWeek,
        thisMonth: callsThisMonth,
        weekGoal: 50,
        monthGoal: 200
      },
      trends: chartData,
      upcomingAppointments: upcomingAppointmentsList
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/leads/niche-stats?nicheId=xxx&month=YYYY-MM
 * Supports niche filtering and monthly date filtering (or 'all')
 */
export const getNicheStats = async (req, res) => {
  try {
    const now = new Date();
    const { nicheId, month } = req.query;

    const ALL_STATUSES = ['New Lead', 'No Answer', 'Not Interested', 'Callback', 'Follow Up', 'Appointment', 'Closed', 'DNC'];

    // 1. Build niche filter
    const nicheFilter = (nicheId && nicheId !== 'all') ? { niche: nicheId } : {};

    // 2. Build date filter
    let dateFilter = {};
    let isMonthFilter = false;
    let monthStart = null;
    let monthEnd = null;

    if (month && month !== 'all') {
      isMonthFilter = true;
      const parts = month.split('-');
      const targetYear = parseInt(parts[0], 10);
      const targetMonth = parseInt(parts[1], 10) - 1;

      monthStart = new Date(targetYear, targetMonth, 1, 0, 0, 0);
      monthEnd = new Date(targetYear, targetMonth + 1, 1, 0, 0, 0);
      dateFilter = { createdAt: { $gte: monthStart, $lt: monthEnd } };
    }

    const currentFilter = { ...nicheFilter, ...dateFilter };

    // 3. Status breakdown in this period
    const [total, statusBreakdown] = await Promise.all([
      Lead.countDocuments(currentFilter),
      Lead.aggregate([
        { $match: currentFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const statusCounts = {};
    ALL_STATUSES.forEach(s => { statusCounts[s] = 0; });
    statusBreakdown.forEach(s => {
      if (statusCounts[s._id] !== undefined) statusCounts[s._id] = s.count;
    });

    // 4. Trend Data Generation (includes leads, appointments, closed)
    const trendData = [];
    if (isMonthFilter && monthStart && monthEnd) {
      const daysInTargetMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= daysInTargetMonth; day++) {
        const dStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), day, 0, 0, 0);
        const dEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), day + 1, 0, 0, 0);
        
        const [leadCount, apptCount, closedCount] = await Promise.all([
          Lead.countDocuments({ ...nicheFilter, createdAt: { $gte: dStart, $lt: dEnd } }),
          Lead.countDocuments({ ...nicheFilter, status: 'Appointment', createdAt: { $gte: dStart, $lt: dEnd } }),
          Lead.countDocuments({ ...nicheFilter, status: 'Closed', createdAt: { $gte: dStart, $lt: dEnd } })
        ]);

        trendData.push({
          date: `${dStart.toLocaleDateString('en-US', { month: 'short' })} ${day}`,
          leads: leadCount,
          appointments: apptCount,
          closed: closedCount
        });
      }
    } else {
      // Last 30 days for All Time
      const startOf30DaysAgo = new Date(now);
      startOf30DaysAgo.setDate(startOf30DaysAgo.getDate() - 29);
      startOf30DaysAgo.setHours(0, 0, 0, 0);

      for (let i = 0; i < 30; i++) {
        const d = new Date(startOf30DaysAgo);
        d.setDate(d.getDate() + i);
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);

        const [leadCount, apptCount, closedCount] = await Promise.all([
          Lead.countDocuments({ ...nicheFilter, createdAt: { $gte: d, $lt: nextD } }),
          Lead.countDocuments({ ...nicheFilter, status: 'Appointment', createdAt: { $gte: d, $lt: nextD } }),
          Lead.countDocuments({ ...nicheFilter, status: 'Closed', createdAt: { $gte: d, $lt: nextD } })
        ]);

        trendData.push({
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          leads: leadCount,
          appointments: apptCount,
          closed: closedCount
        });
      }
    }

    // 5. Conversion stats
    const closedCount = statusCounts['Closed'] || 0;
    const appointmentCount = statusCounts['Appointment'] || 0;
    const conversionRate = total > 0 ? Number(((closedCount / total) * 100).toFixed(1)) : 0;
    const appointmentRate = total > 0 ? Number(((appointmentCount / total) * 100).toFixed(1)) : 0;

    // 6. Discover Available Months with lead data ACROSS ALL NICHES (always visible regardless of niche filter!)
    const monthAggregation = await Lead.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const availableMonths = monthAggregation.map(m => {
      const y = m._id.year;
      const mo = m._id.month;
      const key = `${y}-${String(mo).padStart(2, '0')}`;
      const label = `${monthNames[mo - 1]} ${y}`;
      return { key, label, count: m.count };
    });

    res.json({
      nicheId: nicheId || 'all',
      selectedMonth: month || 'all',
      total,
      statusCounts,
      conversionRate,
      appointmentRate,
      trendData,
      availableMonths
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
