import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusMetricProps {
  label: string;
  value: number;
  dotColor?: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export default function StatusMetric({ label, value, dotColor = 'bg-slate-400', icon: Icon, onClick }: StatusMetricProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-[0_1px_3px_0_rgba(15,23,42,0.06)] hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 cursor-pointer overflow-hidden",
        onClick && "hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate tracking-tight">
            {label}
          </span>
        </div>
        <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors" strokeWidth={1.75} />
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
          {value.toLocaleString()}
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">leads</span>
      </div>
    </div>
  );
}
