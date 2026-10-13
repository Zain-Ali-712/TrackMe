import React from 'react';

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
    <div className="surface p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div>
            <h4 className="font-display text-lg font-medium text-slate-900 dark:text-slate-50 leading-tight">
              This month
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All habit checks so far</p>
          </div>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Target 80%+
        </span>
      </div>

      <div className="flex items-center justify-center py-3 relative my-auto">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 130 130">
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1E8A6E" />
              <stop offset="100%" stopColor="#2E9E80" />
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            strokeWidth="9"
            className="stroke-slate-100 dark:stroke-slate-800"
            fill="transparent"
          />
          {/* Animated Progress circle */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            strokeWidth="9"
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
          <span className="font-display text-[30px] text-slate-900 dark:text-slate-50 tabular-nums leading-none">
            {percent}%
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Completed
          </span>
        </div>
      </div>

      {/* Bottom stats row */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-850 text-center">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Checks done</span>
          <span className="font-semibold text-slate-900 dark:text-slate-50 tabular-nums text-[13px]">
            {completedCount} <span className="text-[9px] text-slate-400 font-medium">({percent}%)</span>
          </span>
        </div>
        <div className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-850 text-center">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Remaining</span>
          <span className="font-semibold text-slate-900 dark:text-slate-50 tabular-nums text-[13px]">
            {Math.max(0, totalPossible - completedCount)} <span className="text-[9px] text-slate-400 font-medium">({remainingPercent}%)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
