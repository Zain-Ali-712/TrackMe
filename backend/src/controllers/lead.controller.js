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

    const startOf7DaysAgo = new Date(now);
    startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);
    startOf7DaysAgo.setHours(0, 0, 0, 0);

    const [
      totalLeads,
      leadsToday,
      leadsThisWeek,
      leadsThisMonth,
      totalCalls,
      callsThisWeek,
      callsThisMonth,
      upcomingAppointmentsList,
      // One aggregation replaces the 14 countDocuments calls the 7-day trend
      // used to make.
      trendRows
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
        .limit(5),
      Lead.aggregate([
        { $match: { createdAt: { $gte: startOf7DaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            leads: { $sum: 1 },
            calls: {
              $sum: { $cond: [{ $eq: ['$coldCalled', true] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const trendByDate = new Map(trendRows.map((row) => [row._id, row]));

    const chartData = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(startOf7DaysAgo);
      dayStart.setDate(dayStart.getDate() + i);
      const key = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`;
      const row = trendByDate.get(key);

      chartData.push({
        date: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        leads: row?.leads || 0,
        calls: row?.calls || 0
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
    //    Built with a single grouped aggregation per series. This previously ran
    //    3 countDocuments x 30/31 days (about 93 sequential round trips).
    let trendStart;
    let trendEnd;
    let dayCount;
    let labelFormat;

    if (isMonthFilter && monthStart && monthEnd) {
      trendStart = new Date(monthStart);
      trendEnd = new Date(monthEnd);
      dayCount = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
      labelFormat = 'monthDay';
    } else {
      trendStart = new Date(now);
      trendStart.setDate(trendStart.getDate() - 29);
      trendStart.setHours(0, 0, 0, 0);
      trendEnd = new Date(now);
      trendEnd.setDate(trendEnd.getDate() + 1);
      trendEnd.setHours(0, 0, 0, 0);
      dayCount = 30;
      labelFormat = 'shortDate';
    }

    const [leadTrend, appointmentTrend, closedTrend] = await Promise.all([
      Lead.aggregate([
        { $match: { ...nicheFilter, createdAt: { $gte: trendStart, $lt: trendEnd } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        {
          $match: {
            ...nicheFilter,
            status: 'Appointment',
            createdAt: { $gte: trendStart, $lt: trendEnd }
          }
        },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        {
          $match: {
            ...nicheFilter,
            status: 'Closed',
            createdAt: { $gte: trendStart, $lt: trendEnd }
          }
        },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
      ])
    ]);

    const toCountMap = (rows) => new Map(rows.map((row) => [row._id, row.count]));
    const leadByDate = toCountMap(leadTrend);
    const appointmentByDate = toCountMap(appointmentTrend);
    const closedByDate = toCountMap(closedTrend);

    const trendData = [];
    for (let i = 0; i < dayCount; i++) {
      const dayStart = new Date(trendStart);
      dayStart.setDate(dayStart.getDate() + i);

      const key = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`;

      trendData.push({
        date: labelFormat === 'monthDay'
          ? `${dayStart.toLocaleDateString('en-US', { month: 'short' })} ${dayStart.getDate()}`
          : dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        leads: leadByDate.get(key) || 0,
        appointments: appointmentByDate.get(key) || 0,
        closed: closedByDate.get(key) || 0
      });
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
