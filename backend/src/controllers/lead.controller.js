import Lead from '../models/Lead.js';
import Appointment from '../models/Appointment.js';
import Niche from '../models/Niche.js';

/**
 * Stamp the dates that mark a status change onto an update body.
 * appointmentAt is kept once set (the call was booked even if the lead later
 * closes); closedAt is cleared if the lead leaves Closed.
 */
function applyStatusDates(body, currentLead, nextStatus) {
  const now = new Date();
  body.statusChangedAt = now;
  if (nextStatus === 'Appointment' && !currentLead?.appointmentAt) body.appointmentAt = now;
  if (nextStatus === 'Closed') body.closedAt = now;
  else if (currentLead?.closedAt) body.closedAt = null;
}

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

    if (req.body.status) applyStatusDates(req.body, null, req.body.status);

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

    if (req.body.status && req.body.status !== currentLead.status) {
      applyStatusDates(req.body, currentLead, req.body.status);
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

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay(), diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startOf7DaysAgo = new Date(now);
    startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);
    startOf7DaysAgo.setHours(0, 0, 0, 0);

    // A call counts on the day it was made. Older leads may lack coldCalledAt,
    // so fall back to the last update and then creation, the same rule the
    // habits page uses, so both screens always report the same numbers.
    const callDate = { $ifNull: ['$coldCalledAt', { $ifNull: ['$updatedAt', '$createdAt'] }] };
    // Bucket days in the server's own timezone (Mongo defaults to UTC), so the
    // keys line up with the local dates built below.
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const dayKey = (date) => ({ $dateToString: { format: '%Y-%m-%d', date, timezone } });

    const [
      totalLeads,
      leadsThisWeek,
      leadsThisMonth,
      totalCalls,
      callRows,
      upcomingAppointmentsList,
      leadTrendRows
    ] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Lead.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Lead.countDocuments({ coldCalled: true }),
      // Week, month and 7-day counts of calls, all by the date of the call.
      Lead.aggregate([
        { $match: { coldCalled: true } },
        { $project: { callAt: callDate } },
        {
          $facet: {
            week: [{ $match: { callAt: { $gte: startOfWeek } } }, { $count: 'n' }],
            month: [{ $match: { callAt: { $gte: startOfMonth } } }, { $count: 'n' }],
            byDay: [
              { $match: { callAt: { $gte: startOf7DaysAgo } } },
              { $group: { _id: dayKey('$callAt'), calls: { $sum: 1 } } }
            ]
          }
        }
      ]),
      Appointment.find({ dateTime: { $gte: now }, status: 'Scheduled' })
        .populate('lead', 'businessName personName')
        .sort({ dateTime: 1 })
        .limit(5),
      Lead.aggregate([
        { $match: { createdAt: { $gte: startOf7DaysAgo } } },
        { $group: { _id: dayKey('$createdAt'), leads: { $sum: 1 } } }
      ])
    ]);

    const calls = callRows[0] || { week: [], month: [], byDay: [] };
    const callsThisWeek = calls.week[0]?.n || 0;
    const callsThisMonth = calls.month[0]?.n || 0;
    const leadsByDate = new Map(leadTrendRows.map((row) => [row._id, row.leads]));
    const callsByDate = new Map(calls.byDay.map((row) => [row._id, row.calls]));

    const chartData = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(startOf7DaysAgo);
      dayStart.setDate(dayStart.getDate() + i);
      const key = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`;

      chartData.push({
        date: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        leads: leadsByDate.get(key) || 0,
        calls: callsByDate.get(key) || 0
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

    // Leads count on the day they were added; appointments and wins count on
    // the day they happened. Leads from before those dates were recorded fall
    // back to their last update, the closest record of when the status moved.
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const dayKey = (date) => ({ $dateToString: { format: '%Y-%m-%d', date, timezone } });
    const inRange = { $gte: trendStart, $lt: trendEnd };

    const countByDay = (match, dateExpr) => Lead.aggregate([
      { $match: { ...nicheFilter, ...match } },
      { $project: { at: dateExpr } },
      { $match: { at: inRange } },
      { $group: { _id: dayKey('$at'), count: { $sum: 1 } } }
    ]);

    const [leadTrend, appointmentTrend, closedTrend] = await Promise.all([
      countByDay({}, '$createdAt'),
      countByDay(
        { $or: [{ appointmentAt: { $ne: null } }, { status: 'Appointment' }] },
        { $ifNull: ['$appointmentAt', '$updatedAt'] }
      ),
      countByDay({ status: 'Closed' }, { $ifNull: ['$closedAt', '$updatedAt'] })
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

export const batchDeleteLeads = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No lead IDs provided' });
    }
    const result = await Lead.deleteMany({ _id: { $in: ids } });
    res.json({ message: `Successfully deleted ${result.deletedCount} leads`, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
