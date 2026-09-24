import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhoneOff, ThumbsDown, PhoneCall, Clock, CalendarCheck, CheckCircle,
  TrendingUp, Users, AlertCircle, Ban, Calendar,
  Globe, CheckCircle2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';
import { fetchNiches, fetchNicheStats } from '@/lib/api';
import { cn, getNicheIcon } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_CONFIG = [
  { key: 'New Lead',       label: 'New Leads',      icon: Users,         color: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500',   bg: 'bg-slate-50 dark:bg-slate-800/40',   border: 'border-slate-200 dark:border-slate-700',   chartColor: '#64748b', nav: 'New Lead' },
  { key: 'No Answer',      label: 'No Answer',      icon: PhoneOff,      color: 'text-slate-500',                     dot: 'bg-slate-400',   bg: 'bg-slate-50 dark:bg-slate-800/40',   border: 'border-slate-200 dark:border-slate-700',   chartColor: '#94a3b8', nav: 'No Answer' },
  { key: 'Not Interested', label: 'Not Interested', icon: ThumbsDown,    color: 'text-rose-600',                      dot: 'bg-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/30',     border: 'border-rose-200 dark:border-rose-900/40',  chartColor: '#f43f5e', nav: 'Not Interested' },
  { key: 'Callback',       label: 'Callback',       icon: PhoneCall,     color: 'text-amber-600',                     dot: 'bg-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-amber-200 dark:border-amber-900/40', chartColor: '#f59e0b', nav: 'Callback' },
  { key: 'Follow Up',      label: 'Follow Up',      icon: Clock,         color: 'text-sky-600',                       dot: 'bg-sky-500',     bg: 'bg-sky-50 dark:bg-sky-950/30',       border: 'border-sky-200 dark:border-sky-900/40',    chartColor: '#0284c7', nav: 'Follow Up' },
  { key: 'Appointment',    label: 'Appointment',    icon: CalendarCheck, color: 'text-blue-700 dark:text-blue-400',  dot: 'bg-blue-600',    bg: 'bg-blue-50 dark:bg-blue-950/30',     border: 'border-blue-200 dark:border-blue-900/40',  chartColor: '#2563eb', nav: 'Appointment' },
  { key: 'Closed',         label: 'Closed',         icon: CheckCircle,   color: 'text-emerald-600',                   dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900/40', chartColor: '#10b981', nav: 'Closed' },
  { key: 'DNC',            label: 'DNC',            icon: Ban,           color: 'text-red-600',                       dot: 'bg-red-500',     bg: 'bg-red-50 dark:bg-red-950/30',       border: 'border-red-200 dark:border-red-900/40',    chartColor: '#ef4444', nav: 'DNC' },
];

export default function LeadStatsPage() {
  const navigate = useNavigate();
  const [niches, setNiches] = useState<any[]>([]);
  const [selectedNicheId, setSelectedNicheId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active metric toggle for the full-width performance velocity chart (All / Leads / Appointments / Closed)
  const [activeVelocityMetric, setActiveVelocityMetric] = useState<'all' | 'leads' | 'appointments' | 'closed'>('all');
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const leadColor = isDark ? '#f1f5f9' : '#1e293b';
  const closedColor = isDark ? '#34d399' : '#10b981';
  const apptColor = isDark ? '#38bdf8' : '#0284c7';

  useEffect(() => {
    fetchNiches()
      .then(setNiches)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadStats();
  }, [selectedNicheId, selectedMonth]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchNicheStats(
        selectedNicheId === 'all' ? undefined : selectedNicheId,
        selectedMonth === 'all' ? undefined : selectedMonth
      );
      setStats(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to backend');
      toast.error('Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusCardClick = (navStatus: string) => {
    navigate('/dashboard/leads', {
      state: { nicheId: selectedNicheId === 'all' ? null : selectedNicheId, status: navStatus }
    });
  };

  const selectedNiche = niches.find(n => n._id === selectedNicheId);
  const nicheLabel = selectedNicheId === 'all' ? 'All Niches' : (selectedNiche ? selectedNiche.name : '');

  // Prepare Pie / Donut Chart Data
  const pieData = STATUS_CONFIG.map(s => ({
    name: s.label,
    value: stats?.statusCounts?.[s.key] ?? 0,
    color: s.chartColor
  })).filter(d => d.value > 0);

  // Dynamic available months list across the entire database
  const monthsList = stats?.availableMonths && stats.availableMonths.length > 0
    ? stats.availableMonths
    : [
        { key: '2026-09', label: 'Sep 2026' },
        { key: '2026-08', label: 'Aug 2026' },
        { key: '2026-07', label: 'Jul 2026' },
        { key: '2026-06', label: 'Jun 2026' },
      ];

  const VelocityTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 text-white p-3 rounded-xl shadow-xl min-w-[150px]">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry: any) => (
              <div key={entry.name} className="flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.stroke }} />
                  <span className="text-slate-300 font-medium">{entry.name}:</span>
                </div>
                <span className="font-bold text-white tabular-nums">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Filter Section: Niche Selector & Date Range Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">
        {/* Row 1: Niche Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
            <Globe className="h-3 w-3" /> Niche:
          </span>
          <button
            onClick={() => setSelectedNicheId('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5',
              selectedNicheId === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>All Niches</span>
          </button>
          {niches.map(n => {
            const IconComp = getNicheIcon(n.icon);
            const isSelected = selectedNicheId === n._id;
            return (
              <button
                key={n._id}
                onClick={() => setSelectedNicheId(n._id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5',
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                )}
              >
                <IconComp className="h-3.5 w-3.5 shrink-0" />
                <span>{n.name}</span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Date Selector (All Time + All months listed by month name) */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Period:
          </span>
          <button
            onClick={() => setSelectedMonth('all')}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-semibold border transition-all',
              selectedMonth === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            )}
          >
            All Time
          </button>

          {/* All previous & current months listed by month name */}
          {monthsList.map((m: any) => (
            <button
              key={m.key}
              onClick={() => setSelectedMonth(m.key)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold border transition-all tabular-nums',
                selectedMonth === m.key
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-3">
            <AlertCircle className="h-7 w-7 text-rose-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Backend Connection Required</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
            Could not fetch lead stats. Please start your backend server on port 5000.
          </p>
          <button
            onClick={loadStats}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:opacity-90"
          >
            Retry Connection
          </button>
        </div>
      ) : isLoading || !stats ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-72 bg-muted rounded-2xl" />
            <div className="h-72 bg-muted rounded-2xl" />
          </div>
          <div className="h-80 bg-muted rounded-2xl" />
        </div>
      ) : (
        <>
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Volume', value: stats.total, icon: Users, accent: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-50 dark:bg-blue-950/40', note: `${nicheLabel || 'All'} in period` },
              { label: 'Active Pipeline', value: (stats.total - (stats.statusCounts?.['Closed'] || 0) - (stats.statusCounts?.['DNC'] || 0)), icon: TrendingUp, accent: 'text-sky-600 dark:text-sky-400', iconBg: 'bg-sky-50 dark:bg-sky-950/40', note: 'Engaged & in progress' },
              { label: 'Booked Calls', value: `${stats.appointmentRate}%`, icon: CalendarCheck, accent: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-50 dark:bg-purple-950/40', note: `${stats.statusCounts?.['Appointment'] || 0} scheduled demos` },
              { label: 'Closed Rate', value: `${stats.conversionRate}%`, icon: CheckCircle2, accent: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', note: `${stats.statusCounts?.['Closed'] || 0} deals won` },
            ].map(card => (
              <div key={card.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{card.label}</span>
                  <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', card.iconBg)}>
                    <card.icon className={cn('h-3.5 w-3.5', card.accent)} strokeWidth={1.75} />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{card.value}</div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{card.note}</p>
              </div>
            ))}
          </div>

          {/* Status Breakdown Cards (8 Clickable Cards - Opens Exact Tab in Pipeline) */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Disposition Breakdown
              </h4>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Click card to jump to pipeline tab</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {STATUS_CONFIG.map(s => {
                const count = stats.statusCounts?.[s.key] ?? 0;
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <button
                    key={s.key}
                    onClick={() => handleStatusCardClick(s.nav)}
                    className={cn(
                      'text-left rounded-xl border p-3 flex flex-col gap-1.5 transition-all hover:scale-[1.02] hover:shadow-sm active:scale-[0.98] cursor-pointer',
                      s.bg, s.border
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-6 w-6 rounded-md flex items-center justify-center bg-white/70 dark:bg-slate-900/60 shadow-xs">
                        <s.icon className={cn('h-3 w-3', s.color)} strokeWidth={1.75} />
                      </div>
                      <span className={cn('text-[9px] font-bold px-1 rounded-full bg-white/80 dark:bg-slate-900/80', s.color)}>{pct}%</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">{s.label}</p>
                      <p className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{count}</p>
                    </div>
                    <div className="h-1 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                      <div className={cn('h-full rounded-full', s.dot)} style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Combined Charts Row: 70% Performance Velocity & 30% Pipeline Share Donut (Vertical) */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 items-stretch">
            {/* Left 70%: Performance Velocity & Pipeline Conversion */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.08)] flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Performance Velocity &amp; Pipeline Conversion</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {nicheLabel} — daily comparison of leads captured, calls booked, and deals closed
                  </p>
                </div>

                {/* Metric Filter Tabs */}
                <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200/70 dark:border-slate-700/60 self-start sm:self-auto">
                  <button
                    onClick={() => setActiveVelocityMetric('all')}
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded-md transition-all",
                      activeVelocityMetric === 'all'
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveVelocityMetric('leads')}
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded-md transition-all",
                      activeVelocityMetric === 'leads'
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    Leads
                  </button>
                  <button
                    onClick={() => setActiveVelocityMetric('appointments')}
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded-md transition-all",
                      activeVelocityMetric === 'appointments'
                        ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm font-bold"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    Appointments
                  </button>
                  <button
                    onClick={() => setActiveVelocityMetric('closed')}
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded-md transition-all",
                      activeVelocityMetric === 'closed'
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    Closed
                  </button>
                </div>
              </div>

              {/* Chart Container */}
              <div className="h-[270px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.trendData || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      {/* Theme-Adaptive Leads Gradient */}
                      <linearGradient id="velocityDynamicLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={leadColor} stopOpacity={isDark ? 0.35 : 0.25} />
                        <stop offset="95%" stopColor={leadColor} stopOpacity={0.01} />
                      </linearGradient>
                      {/* Electric Blue/Sky Gradient for Appointments */}
                      <linearGradient id="velocityDynamicApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={apptColor} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={apptColor} stopOpacity={0.02} />
                      </linearGradient>
                      {/* Emerald Gradient for Closed */}
                      <linearGradient id="velocityDynamicClosed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={closedColor} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={closedColor} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200/80 dark:text-slate-800/80" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'currentColor' }}
                      className="text-slate-400 dark:text-slate-500 font-medium"
                      dy={10}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: 'currentColor' }}
                      className="text-slate-400 dark:text-slate-500 font-medium"
                    />
                    <Tooltip content={<VelocityTooltip />} />

                    {(activeVelocityMetric === 'all' || activeVelocityMetric === 'leads') && (
                      <Area 
                        type="monotone" 
                        dataKey="leads" 
                        name="Leads"
                        stroke={leadColor} 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#velocityDynamicLeads)" 
                      />
                    )}

                    {(activeVelocityMetric === 'all' || activeVelocityMetric === 'appointments') && (
                      <Area 
                        type="monotone" 
                        dataKey="appointments" 
                        name="Appointments"
                        stroke={apptColor} 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#velocityDynamicApps)" 
                      />
                    )}

                    {(activeVelocityMetric === 'all' || activeVelocityMetric === 'closed') && (
                      <Area 
                        type="monotone" 
                        dataKey="closed" 
                        name="Closed Won"
                        stroke={closedColor} 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#velocityDynamicClosed)" 
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: leadColor }} />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Leads Recorded</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: apptColor }} />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Appointments Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: closedColor }} />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Deals Closed</span>
                </div>
              </div>
            </div>

            {/* Right 30%: Vertical Pipeline Share Donut Chart */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.06)] flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Pipeline Share by Status</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Distribution of leads in {nicheLabel}
                </p>
              </div>

              {/* Centered Donut & Vertical List */}
              <div className="flex flex-col items-center gap-3 my-auto py-2">
                <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Central Ring Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[11px] text-slate-400 font-medium">Total</span>
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{stats.total}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">{stats.conversionRate}% won</span>
                  </div>
                </div>

                {/* Circular Legend Grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 w-full text-xs">
                  {STATUS_CONFIG.map(s => {
                    const count = stats.statusCounts?.[s.key] ?? 0;
                    return (
                      <div key={s.key} className="flex items-center justify-between py-0.5 border-b border-slate-50 dark:border-slate-800/60">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={cn('h-2 w-2 rounded-full shrink-0', s.dot)} />
                          <span className="text-slate-600 dark:text-slate-400 truncate text-[11px]">{s.label}</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums ml-1.5">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
