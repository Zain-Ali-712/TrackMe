import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhoneOff, ThumbsDown, PhoneCall, Clock, CalendarCheck, CheckCircle,
  Users, AlertCircle, Ban, Globe, ArrowUpRight, RotateCw,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchNiches, fetchNicheStats } from '@/lib/api';
import { cn, getNicheIcon, STATUS_COLORS } from '@/lib/utils';
import { useChartTheme, SeriesTooltip, ChartLegend } from '@/lib/chartTheme';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

const STATUS_CONFIG = [
  { key: 'New Lead',       label: 'New leads',      icon: Users },
  { key: 'No Answer',      label: 'No answer',      icon: PhoneOff },
  { key: 'Not Interested', label: 'Not interested', icon: ThumbsDown },
  { key: 'Callback',       label: 'Callback',       icon: PhoneCall },
  { key: 'Follow Up',      label: 'Follow up',      icon: Clock },
  { key: 'Appointment',    label: 'Appointment',    icon: CalendarCheck },
  { key: 'Closed',         label: 'Closed',         icon: CheckCircle },
  { key: 'DNC',            label: 'DNC',            icon: Ban },
];

type SeriesKey = 'leads' | 'appointments' | 'closed';

const chipClass = (selected: boolean) =>
  cn(
    'h-8 px-3 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap',
    selected
      ? 'bg-clay-600 text-white border-clay-600 dark:bg-clay-500 dark:border-clay-500 dark:text-slate-950 shadow-[0_1px_2px_rgba(120,50,20,0.25)]'
      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:text-slate-900 dark:hover:border-slate-600 dark:hover:text-slate-50'
  );

export default function LeadStatsPage() {
  const navigate = useNavigate();
  const [niches, setNiches] = useState<any[]>([]);
  const [selectedNicheId, setSelectedNicheId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({ leads: true, appointments: true, closed: true });
  const theme = useChartTheme();

  const seriesColor: Record<SeriesKey, string> = {
    leads: theme.colors.clay,
    appointments: theme.colors.blue,
    closed: theme.colors.green,
  };

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

  const openPipeline = (status: string) => {
    navigate('/dashboard/leads', {
      state: { nicheId: selectedNicheId === 'all' ? null : selectedNicheId, status }
    });
  };

  const toggleSeries = (key: SeriesKey) =>
    setVisible((v) => {
      const next = { ...v, [key]: !v[key] };
      return Object.values(next).some(Boolean) ? next : v;
    });

  const selectedNiche = niches.find(n => n._id === selectedNicheId);
  const nicheLabel = selectedNicheId === 'all' ? 'All niches' : (selectedNiche ? selectedNiche.name : '');
  const monthsList = stats?.availableMonths?.length ? stats.availableMonths : [];
  const periodLabel = selectedMonth === 'all' ? 'all time' : (monthsList.find((m: any) => m.key === selectedMonth)?.label ?? selectedMonth);

  const counts = stats?.statusCounts ?? {};
  const total = stats?.total ?? 0;
  const contacted = total - (counts['New Lead'] || 0);
  const booked = (counts['Appointment'] || 0) + (counts['Closed'] || 0);
  const won = counts['Closed'] || 0;
  const funnel = [
    { label: 'Leads', value: total, hint: 'In this view' },
    { label: 'Contacted', value: contacted, hint: 'Moved past New lead' },
    { label: 'Booked', value: booked, hint: 'Appointment or closed' },
    { label: 'Won', value: won, hint: 'Closed deals' },
  ];
  const trendTotals = (stats?.trendData ?? []).reduce(
    (acc: Record<SeriesKey, number>, d: any) => ({
      leads: acc.leads + d.leads,
      appointments: acc.appointments + d.appointments,
      closed: acc.closed + d.closed,
    }),
    { leads: 0, appointments: 0, closed: 0 }
  );

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="surface p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mb-0.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-14 shrink-0">Niche</span>
          <button onClick={() => setSelectedNicheId('all')} className={chipClass(selectedNicheId === 'all')}>
            <Globe className="h-3.5 w-3.5" />
            All niches
          </button>
          {niches.map(n => {
            const IconComp = getNicheIcon(n.icon);
            return (
              <button key={n._id} onClick={() => setSelectedNicheId(n._id)} className={chipClass(selectedNicheId === n._id)}>
                <IconComp className="h-3.5 w-3.5 shrink-0" />
                {n.name}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-14 shrink-0">Period</span>
          <button onClick={() => setSelectedMonth('all')} className={chipClass(selectedMonth === 'all')}>All time</button>
          {monthsList.map((m: any) => (
            <button key={m.key} onClick={() => setSelectedMonth(m.key)} className={cn(chipClass(selectedMonth === m.key), 'tabular-nums')}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="surface flex flex-col items-center justify-center py-16 px-8 text-center">
          <span className="grid place-items-center h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mb-4">
            <AlertCircle className="h-5 w-5" />
          </span>
          <h3 className="font-display text-lg font-medium text-slate-900 dark:text-slate-50">Couldn't load analytics</h3>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-sm">
            The server didn't respond ({error}). Check that the backend is running, then retry.
          </p>
          <Button size="sm" onClick={loadStats}>
            <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      ) : isLoading || !stats ? (
        <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading analytics">
          <div className="h-28 bg-slate-200/50 dark:bg-slate-900 rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 bg-slate-200/50 dark:bg-slate-900 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
            <div className="lg:col-span-7 h-80 bg-slate-200/50 dark:bg-slate-900 rounded-2xl" />
            <div className="lg:col-span-3 h-80 bg-slate-200/50 dark:bg-slate-900 rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Headline numbers */}
          <section className="surface grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-200/70 dark:divide-slate-800 overflow-hidden">
            {[
              { label: 'Leads', value: total.toLocaleString(), note: `${nicheLabel}, ${periodLabel}` },
              { label: 'Active pipeline', value: (total - won - (counts['DNC'] || 0)).toLocaleString(), note: 'Not closed and not DNC' },
              { label: 'Booking rate', value: `${stats.appointmentRate}%`, note: `${counts['Appointment'] || 0} appointments set` },
              { label: 'Close rate', value: `${stats.conversionRate}%`, note: `${won} deals won`, accent: true },
            ].map((card) => (
              <div key={card.label} className="px-5 py-4 sm:px-6 sm:py-5">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className={cn(
                  'font-display text-[34px] leading-none mt-2 tabular-nums',
                  card.accent ? 'text-clay-700 dark:text-clay-300' : 'text-slate-900 dark:text-slate-50'
                )}>
                  {card.value}
                </p>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2 truncate">{card.note}</p>
              </div>
            ))}
          </section>

          {/* Status breakdown, each opens that tab in the pipeline */}
          <section aria-labelledby="status-breakdown">
            <div className="flex items-baseline justify-between px-1 mb-2.5">
              <h3 id="status-breakdown" className="font-display text-lg font-medium text-slate-900 dark:text-slate-50">By status</h3>
              <span className="text-[11.5px] text-slate-500 dark:text-slate-400">Select a status to open it in the pipeline</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {STATUS_CONFIG.map(s => {
                const count = counts[s.key] ?? 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const color = STATUS_COLORS[s.key];
                return (
                  <button
                    key={s.key}
                    onClick={() => openPipeline(s.key)}
                    className="group surface !rounded-xl text-left p-3 flex flex-col gap-2 transition-all hover:-translate-y-px hover:border-clay-300 dark:hover:border-clay-800 active:translate-y-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-600 dark:text-slate-300 truncate">
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', color.dot)} />
                        {s.label}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-clay-600 dark:group-hover:text-clay-400 transition-colors" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-2xl leading-none text-slate-900 dark:text-slate-50 tabular-nums">{count}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className={cn('h-full rounded-full', color.dot)} style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 items-stretch">
            {/* Daily trend */}
            <section className="lg:col-span-7 surface p-5 sm:p-6 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-display text-xl font-medium text-slate-900 dark:text-slate-50">Daily pipeline</h3>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {nicheLabel}, {selectedMonth === 'all' ? 'last 30 days' : periodLabel}, by the day each lead was added
                  </p>
                </div>
                <ChartLegend
                  items={[
                    { label: 'Leads', color: seriesColor.leads, value: trendTotals.leads, active: visible.leads, onToggle: () => toggleSeries('leads') },
                    { label: 'Appointments', color: seriesColor.appointments, value: trendTotals.appointments, active: visible.appointments, onToggle: () => toggleSeries('appointments') },
                    { label: 'Closed', color: seriesColor.closed, value: trendTotals.closed, active: visible.closed, onToggle: () => toggleSeries('closed') },
                  ]}
                />
              </div>

              <div className="h-[280px] w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.trendData || []} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
                    <defs>
                      {(Object.keys(seriesColor) as SeriesKey[]).map((key) => (
                        <linearGradient key={key} id={`velocity-${key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={seriesColor[key]} stopOpacity={key === 'leads' ? (theme.isDark ? 0.26 : 0.18) : 0.1} />
                          <stop offset="100%" stopColor={seriesColor[key]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid {...theme.grid} />
                    <XAxis dataKey="date" {...theme.axis} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis {...theme.axis} allowDecimals={false} width={48} />
                    <Tooltip content={<SeriesTooltip />} cursor={theme.cursor} />
                    {visible.leads && (
                      <Area type="monotone" dataKey="leads" name="Leads" stroke={seriesColor.leads} strokeWidth={2} fill="url(#velocity-leads)" activeDot={theme.activeDot(seriesColor.leads)} />
                    )}
                    {visible.appointments && (
                      <Area type="monotone" dataKey="appointments" name="Appointments" stroke={seriesColor.appointments} strokeWidth={2} fill="url(#velocity-appointments)" activeDot={theme.activeDot(seriesColor.appointments)} />
                    )}
                    {visible.closed && (
                      <Area type="monotone" dataKey="closed" name="Closed" stroke={seriesColor.closed} strokeWidth={2} fill="url(#velocity-closed)" activeDot={theme.activeDot(seriesColor.closed)} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Conversion funnel */}
            <section className="lg:col-span-3 surface p-5 sm:p-6 flex flex-col">
              <h3 className="font-display text-xl font-medium text-slate-900 dark:text-slate-50">Conversion</h3>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">How far leads in this view have moved</p>

              <ol className="mt-6 space-y-4 flex-1">
                {funnel.map((step, i) => {
                  const pct = total > 0 ? (step.value / total) * 100 : 0;
                  const prev = i > 0 ? funnel[i - 1].value : null;
                  const stepRate = prev ? Math.round((step.value / prev) * 100) : null;
                  return (
                    <li key={step.label}>
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{step.label}</span>
                        <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
                          {step.value}
                          {stepRate !== null && (
                            <span className="ml-1.5 text-[11px] font-normal text-slate-500 dark:text-slate-400">{stepRate}% of prev.</span>
                          )}
                        </span>
                      </div>
                      <div className="h-7 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden" title={step.hint}>
                        <div
                          className="h-full rounded-md transition-[width] duration-500 ease-out"
                          style={{
                            width: `${Math.max(pct, step.value > 0 ? 2 : 0)}%`,
                            backgroundColor: theme.colors.clay,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{step.hint}</p>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
