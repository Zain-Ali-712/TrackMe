import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartTheme, SeriesTooltip, ChartLegend } from '@/lib/chartTheme';

interface LeadsTrendChartProps {
  data: Array<{ date: string; leads: number; calls: number }>;
}

export default function LeadsTrendChart({ data }: LeadsTrendChartProps) {
  const [visible, setVisible] = useState({ leads: true, calls: true });
  const theme = useChartTheme();
  const leadColor = theme.colors.clay;
  const callColor = theme.colors.blue;

  const totals = (data || []).reduce(
    (acc, d) => ({ leads: acc.leads + d.leads, calls: acc.calls + d.calls }),
    { leads: 0, calls: 0 }
  );

  // Never let both series be hidden at once.
  const toggle = (key: 'leads' | 'calls') =>
    setVisible((v) => {
      const next = { ...v, [key]: !v[key] };
      return next.leads || next.calls ? next : v;
    });

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h3 className="font-display text-xl font-medium text-slate-900 dark:text-slate-50">Outreach this week</h3>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Leads added and cold calls made, last 7 days</p>
        </div>
        <ChartLegend
          items={[
            { label: 'Leads added', color: leadColor, value: totals.leads, active: visible.leads, onToggle: () => toggle('leads') },
            { label: 'Cold calls', color: callColor, value: totals.calls, active: visible.calls, onToggle: () => toggle('calls') },
          ]}
        />
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data || []} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
            <defs>
              <linearGradient id="trendLeadsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={leadColor} stopOpacity={theme.isDark ? 0.28 : 0.2} />
                <stop offset="100%" stopColor={leadColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="trendCallsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={callColor} stopOpacity={theme.isDark ? 0.22 : 0.14} />
                <stop offset="100%" stopColor={callColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...theme.grid} />
            <XAxis dataKey="date" {...theme.axis} />
            <YAxis {...theme.axis} allowDecimals={false} width={48} />
            <Tooltip content={<SeriesTooltip />} cursor={theme.cursor} />
            {visible.leads && (
              <Area
                type="monotone"
                dataKey="leads"
                name="Leads added"
                stroke={leadColor}
                strokeWidth={2}
                fill="url(#trendLeadsFill)"
                activeDot={theme.activeDot(leadColor)}
              />
            )}
            {visible.calls && (
              <Area
                type="monotone"
                dataKey="calls"
                name="Cold calls"
                stroke={callColor}
                strokeWidth={2}
                fill="url(#trendCallsFill)"
                activeDot={theme.activeDot(callColor)}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
