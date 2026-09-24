import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface LeadsTrendChartProps {
  data: Array<{ date: string; leads: number; calls: number }>;
}

export default function LeadsTrendChart({ data }: LeadsTrendChartProps) {
  const [activeMetric, setActiveMetric] = useState<'all' | 'leads' | 'calls'>('all');
  const [isDark, setIsDark] = useState(() => 
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Theme colors:
  // Dark mode: Leads = White/Light Grey (#f1f5f9), Calls = Vibrant Green (#10b981)
  // Light mode: Leads = Darker Blue/Grey (#1e293b), Calls = Green (#10b981)
  const leadColor = isDark ? '#f1f5f9' : '#1e293b';
  const callColor = isDark ? '#34d399' : '#10b981';

  const CustomTooltip = ({ active, payload, label }: any) => {
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Daily Outreach &amp; Lead Intake</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Daily leads recorded vs cold calls executed over the last 7 days</p>
        </div>

        {/* Metric Filter Tabs */}
        <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200/70 dark:border-slate-700/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveMetric('all')}
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-md transition-all",
              activeMetric === 'all'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            All
          </button>
          <button
            onClick={() => setActiveMetric('leads')}
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-md transition-all",
              activeMetric === 'leads'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Leads
          </button>
          <button
            onClick={() => setActiveMetric('calls')}
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-md transition-all",
              activeMetric === 'calls'
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Cold Calls
          </button>
        </div>
      </div>
      
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              {/* Dynamic Gradient for Leads (White/grey in dark mode, darker blue/grey in light mode) */}
              <linearGradient id="colorDynamicLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={leadColor} stopOpacity={isDark ? 0.35 : 0.25} />
                <stop offset="95%" stopColor={leadColor} stopOpacity={0.01} />
              </linearGradient>
              {/* Vibrant Green Gradient for Cold Calls */}
              <linearGradient id="colorDynamicCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={callColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={callColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200/80 dark:text-slate-800/80" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-400 dark:text-slate-500 font-medium"
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-400 dark:text-slate-500 font-medium"
            />
            <Tooltip content={<CustomTooltip />} />
            
            {(activeMetric === 'all' || activeMetric === 'leads') && (
              <Area 
                type="monotone" 
                dataKey="leads" 
                name="Leads Recorded"
                stroke={leadColor} 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorDynamicLeads)" 
              />
            )}

            {(activeMetric === 'all' || activeMetric === 'calls') && (
              <Area 
                type="monotone" 
                dataKey="calls" 
                name="Cold Calls Made"
                stroke={callColor} 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorDynamicCalls)" 
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: leadColor }} />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Leads Recorded</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: callColor }} />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Cold Calls Made</span>
        </div>
      </div>
    </div>
  );
}
