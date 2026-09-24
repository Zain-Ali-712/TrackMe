import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle2 } from 'lucide-react';

interface HabitDailyChartProps {
  data: Array<{
    day: number;
    date: string;
    weekday: string;
    completedCount: number;
    totalHabits: number;
    percent: number;
  }>;
  totalHabits: number;
}

export default function HabitDailyChart({ data, totalHabits }: HabitDailyChartProps) {
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 text-white p-3 rounded-xl shadow-xl min-w-[140px]">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Day {item.day} ({item.weekday})
          </p>
          <div className="flex items-baseline justify-between gap-3 text-xs mb-1">
            <span className="text-slate-300 font-medium">Completed:</span>
            <span className="font-extrabold text-emerald-400 tabular-nums">
              {item.completedCount} / {item.totalHabits}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-xs pt-1 border-t border-slate-800">
            <span className="text-slate-400 font-medium">Ratio:</span>
            <span className="font-bold text-white tabular-nums">{item.percent}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const totalChecksMonth = data.reduce((acc, curr) => acc + curr.completedCount, 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Habits Completion Volume
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Daily completed check volume across routines
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold tabular-nums">
            Total Checks: {totalChecksMonth}
          </span>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200/80 dark:text-slate-800/80" />
            <XAxis 
              dataKey="day" 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 500 }}
              className="text-slate-400 dark:text-slate-500"
              dy={5}
            />
            <YAxis 
              domain={[0, Math.max(totalHabits, 5)]}
              allowDecimals={false}
              tickLine={false} 
              axisLine={false}
              tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 500 }}
              className="text-slate-400 dark:text-slate-500"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="completedCount" 
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            >
              {data.map((entry, index) => {
                const isHigh = entry.completedCount >= Math.round(totalHabits * 0.8);
                const hasAny = entry.completedCount > 0;
                
                let fillColor = isDark ? '#334155' : '#e2e8f0';
                if (isHigh) {
                  fillColor = isDark ? '#34d399' : '#10b981';
                } else if (hasAny) {
                  fillColor = isDark ? '#059669' : '#34d399';
                }

                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={fillColor}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Target Range (≥80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/70" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 dark:bg-slate-700" />
          <span className="font-semibold text-slate-500 dark:text-slate-400">Empty</span>
        </div>
      </div>
    </div>
  );
}
