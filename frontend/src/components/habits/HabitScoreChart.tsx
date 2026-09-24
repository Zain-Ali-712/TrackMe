import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Flame, Target } from 'lucide-react';

interface HabitScoreChartProps {
  data: Array<{
    day: number;
    date: string;
    weekday: string;
    isSunday?: boolean;
    score: number;
  }>;
}

export default function HabitScoreChart({ data }: HabitScoreChartProps) {
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

  // Theme colors consistent with dashboard graphs:
  // Dark mode: White / Light Grey line with emerald accents
  // Light mode: Dark Slate line with emerald accents
  const strokeColor = isDark ? '#f1f5f9' : '#1e293b';

  // Calculate average score for the days with logs or up to current day
  const validDays = data.filter(d => d.score > 0);
  const avgScore = validDays.length > 0 
    ? Math.round(validDays.reduce((acc, curr) => acc + curr.score, 0) / validDays.length)
    : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const score = item.score || 0;
      const isSunday = item.isSunday;

      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 text-white p-3 rounded-xl shadow-xl min-w-[150px]">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Day {item.day} ({item.weekday})
          </p>
          <div className="flex items-baseline justify-between gap-3 text-xs mb-1">
            <span className="text-slate-300 font-medium">Daily Score:</span>
            <span className="font-extrabold text-emerald-400 text-sm tabular-nums">
              {score}%
            </span>
          </div>
          <div className="pt-1.5 border-t border-slate-800 text-[10px] font-semibold">
            {score >= 80 ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Flame className="h-3 w-3" /> Streak Target Met (≥80%)
              </span>
            ) : isSunday ? (
              <span className="text-amber-400">
                Sunday Exempt (Streak Safe)
              </span>
            ) : (
              <span className="text-slate-400">
                Below 80% Streak Goal
              </span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Flame className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Daily Habits Score Rhythm
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Weighted performance score with 80% streak benchmark
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold tabular-nums">
            <Target className="h-3 w-3" />
            Avg: {avgScore}%
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
            Streak Goal: 80%
          </span>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="habitScoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={isDark ? 0.35 : 0.25} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200/80 dark:text-slate-800/80" />
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-400 dark:text-slate-500 font-medium"
              dy={5}
            />
            <YAxis 
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-400 dark:text-slate-500 font-medium"
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* 80% Benchmark Reference Line */}
            <ReferenceLine 
              y={80} 
              stroke="#10b981" 
              strokeDasharray="4 4" 
              strokeWidth={1.5}
            />

            <Area 
              type="monotone" 
              dataKey="score" 
              name="Habit Score"
              stroke={strokeColor} 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill="url(#habitScoreGrad)" 
              dot={{ r: 2.5, fill: strokeColor, strokeWidth: 1.5, stroke: isDark ? '#0f172a' : '#ffffff' }}
              activeDot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: strokeColor }} />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Daily Habit Score</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-emerald-500" />
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">80% Streak Benchmark</span>
        </div>
      </div>
    </div>
  );
}
