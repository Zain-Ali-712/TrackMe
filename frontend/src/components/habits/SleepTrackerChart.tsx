import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Moon } from 'lucide-react';

interface SleepTrackerChartProps {
  data: Array<{
    day: number;
    date: string;
    weekday: string;
    sleepHours: number;
  }>;
}

export default function SleepTrackerChart({ data }: SleepTrackerChartProps) {
  // Calculate average sleep of logged days
  const loggedDays = data.filter(d => (d.sleepHours || 0) > 0);
  const avgSleep = loggedDays.length > 0
    ? (loggedDays.reduce((acc, curr) => acc + (curr.sleepHours || 0), 0) / loggedDays.length).toFixed(1)
    : '0';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 text-white p-3 rounded-xl shadow-xl min-w-[130px]">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Day {item.day} ({item.weekday})
          </p>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-slate-300 font-medium">Sleep Duration:</span>
            <span className="font-bold text-cyan-400 tabular-nums">
              {item.sleepHours ? `${item.sleepHours} hrs` : 'Not logged'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/60 dark:border-cyan-800/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Moon className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Sleep & Recovery Rhythm
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Daily recorded sleep duration (editable in the bottom grid row)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Month Avg:</span>
          <span className="px-2 py-0.5 rounded-full font-bold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/60 tabular-nums">
            {avgSleep} hrs
          </span>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
            <XAxis 
              dataKey="day" 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
              className="text-slate-400 dark:text-slate-500"
            />
            <YAxis 
              domain={[0, 12]}
              allowDecimals={false}
              tickLine={false} 
              axisLine={false}
              tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 500 }}
              className="text-slate-400 dark:text-slate-500"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="sleepHours" 
              stroke="#06b6d4" 
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#06b6d4', strokeWidth: 1.5, stroke: '#fff' }}
              activeDot={{ r: 5, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
