import React from 'react';
import { Target, TrendingUp } from 'lucide-react';

interface HabitProgressGaugeProps {
  completedPercent: number;
  completedCount: number;
  totalPossible: number;
}

export default function HabitProgressGauge({
  completedPercent = 0,
  completedCount = 0,
  totalPossible = 0
}: HabitProgressGaugeProps) {
  const percent = Math.min(100, Math.max(0, completedPercent));
  const remainingPercent = Math.max(0, Number((100 - percent).toFixed(1)));
  
  // SVG circular progress calculation
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)] flex flex-col justify-between h-full hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Target className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-tight">
              Monthly Execution
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5">Total routines momentum</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
          80%+ Target
        </span>
      </div>

      <div className="flex items-center justify-center py-3 relative my-auto">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 130 130">
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            strokeWidth="11"
            className="stroke-slate-100 dark:stroke-slate-800"
            fill="transparent"
          />
          {/* Animated Progress circle */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            strokeWidth="11"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="url(#gaugeGrad)"
            className="transition-all duration-700 ease-out"
            fill="transparent"
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums leading-none">
            {percent}%
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
            Completed
          </span>
        </div>
      </div>

      {/* Bottom stats row */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        <div className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-center">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">Checks Done</span>
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums text-xs">
            {completedCount} <span className="text-[9px] text-slate-400 font-medium">({percent}%)</span>
          </span>
        </div>
        <div className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-center">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">Remaining</span>
          <span className="font-extrabold text-slate-700 dark:text-slate-300 tabular-nums text-xs">
            {Math.max(0, totalPossible - completedCount)} <span className="text-[9px] text-slate-400 font-medium">({remainingPercent}%)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
