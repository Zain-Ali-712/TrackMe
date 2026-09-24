import React from 'react';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  accentColor?: string;
  trendLabel?: string;
}

export default function StatsCard({ title, value, icon: Icon, accentColor = 'slate', trendLabel }: StatsCardProps) {
  const getIconContainerStyle = (color: string) => {
    switch (color) {
      case 'accent':
      case 'blue':
        return 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60';
      case 'amber':
        return 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60';
      case 'slate':
      default:
        return 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border border-slate-800 dark:border-slate-200';
    }
  };

  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)] hover:shadow-[0_6px_18px_rgba(15,23,42,0.1)] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 overflow-hidden">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {value.toLocaleString()}
            </h3>
          </div>
        </div>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 duration-200", getIconContainerStyle(accentColor))}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          {trendLabel || "Live tracker"}
        </span>
        <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
          Active <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
