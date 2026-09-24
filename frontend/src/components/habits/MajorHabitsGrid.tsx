import React from 'react';
import { 
  BookOpen, 
  PenTool, 
  Code2, 
  PhoneCall, 
  Dumbbell, 
  UtensilsCrossed, 
  TrendingUp, 
  Briefcase,
  type LucideIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MajorHabitSummary } from '@/lib/habitScoring';

interface MajorHabitsGridProps {
  stats: MajorHabitSummary[];
}

const MAJOR_ICONS: Record<string, LucideIcon> = {
  book_reading: BookOpen,
  journaling: PenTool,
  development: Code2,
  leads_calls: PhoneCall,
  workout: Dumbbell,
  diet: UtensilsCrossed,
  personal_growth: TrendingUp,
  professional_growth: Briefcase,
};

export default function MajorHabitsGrid({ stats }: MajorHabitsGridProps) {
  const TOTAL_SEGMENTS = 6;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 h-full content-between">
      {stats.map((item) => {
        const IconComponent = MAJOR_ICONS[item.key] || TrendingUp;
        const percent = Math.min(100, Math.max(0, item.percent || 0));
        const filledSegments = Math.round((percent / 100) * TOTAL_SEGMENTS);

        return (
          <div
            key={item.key}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            {/* Top row: Icon + Title & Subtitle */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 truncate">
                <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-300">
                  <IconComponent className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate leading-none mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom row: Dashed / Segmented Cells + Percentage (Matching Image 1 sketch) */}
            <div className="flex items-center justify-between gap-2 pt-1 mt-auto">
              <div className="flex items-center gap-1 flex-1">
                {Array.from({ length: TOTAL_SEGMENTS }).map((_, idx) => {
                  const isFilled = idx < filledSegments;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'h-2.5 flex-1 rounded-sm transition-all duration-300 border',
                        isFilled
                          ? 'bg-emerald-500 border-emerald-600 dark:bg-emerald-400 dark:border-emerald-500 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80'
                      )}
                    />
                  );
                })}
              </div>

              {/* Bold percentage text */}
              <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums shrink-0 ml-1">
                {percent}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
