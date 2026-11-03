import { useEffect, useState } from 'react';
import { CalendarDays, CalendarRange, Mountain, AlarmClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import DailyGoals from '@/components/goals/DailyGoals';
import MonthlyGoals from '@/components/goals/MonthlyGoals';
import DreamGoals from '@/components/goals/DreamGoals';
import UpcomingPlans from '@/components/goals/UpcomingPlans';

type Tab = 'plans' | 'daily' | 'monthly' | 'dreams';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'plans', label: 'Upcoming Plans', icon: AlarmClock },
  { id: 'daily', label: 'Daily', icon: CalendarDays },
  { id: 'monthly', label: 'Monthly', icon: CalendarRange },
  { id: 'dreams', label: '5 Years', icon: Mountain },
];

const STORAGE_KEY = 'trackme_goals_tab';

export default function GoalsPage() {
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Tab | null;
      return saved && TABS.some((t) => t.id === saved) ? saved : 'daily';
    } catch {
      return 'daily';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, tab);
    } catch {
      /* remembering the tab is optional */
    }
  }, [tab]);

  return (
    <div className="space-y-5 pb-12">
      <div role="tablist" aria-label="Goal views" className="inline-flex max-w-full overflow-x-auto rounded-xl bg-slate-200/50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 px-3 sm:px-4 h-9 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all',
              tab === t.id
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-card'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            )}
          >
            <t.icon className={cn('h-4 w-4', tab === t.id && 'text-clay-600 dark:text-clay-400')} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plans' && <UpcomingPlans />}
      {tab === 'daily' && <DailyGoals />}
      {tab === 'monthly' && <MonthlyGoals />}
      {tab === 'dreams' && <DreamGoals />}
    </div>
  );
}
