import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * One chart system for every graph in the app.
 *
 * Categorical slots are assigned in this fixed order and never cycled.
 * Both modes were checked with the dataviz palette validator (lightness band,
 * chroma floor, CVD separation, contrast vs. the card surface).
 */
const PALETTE = {
  light: { clay: '#C15F3C', blue: '#3B66B8', green: '#1E8A6E', gold: '#B0841A' },
  dark: { clay: '#D6724F', blue: '#6E91D8', green: '#38A585', gold: '#AE8A28' },
} as const;

export type SeriesColor = keyof typeof PALETTE.light;

const INK = {
  light: { grid: '#ECE7DC', axis: '#8C867A', track: '#EFEBE2', surface: '#FFFDF9', muted: '#D9D3C6' },
  dark: { grid: '#33312D', axis: '#8F897E', track: '#302E2A', surface: '#21201D', muted: '#46433D' },
} as const;

/** Re-renders when the `dark` class on <html> flips. */
export function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

export function useChartTheme() {
  const isDark = useIsDark();
  const mode = isDark ? 'dark' : 'light';
  const ink = INK[mode];
  return {
    isDark,
    colors: PALETTE[mode],
    ink,
    grid: { stroke: ink.grid, strokeDasharray: '0', vertical: false } as const,
    axis: {
      axisLine: false,
      tickLine: false,
      tick: { fontSize: 11, fill: ink.axis, fontFamily: 'Geist, system-ui, sans-serif' },
      tickMargin: 10,
    } as const,
    cursor: { stroke: ink.muted, strokeWidth: 1 },
    barCursor: { fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,45,30,0.05)' },
    /** Ring around hovered points so they separate from the line under them. */
    activeDot: (color: string) => ({ r: 4.5, fill: color, stroke: ink.surface, strokeWidth: 2 }),
  };
}

interface TooltipRow {
  label: string;
  value: React.ReactNode;
  color?: string;
}

/** Shared tooltip body; values stay in ink, the swatch carries identity. */
export function ChartTooltipCard({ title, rows, footer }: { title: React.ReactNode; rows: TooltipRow[]; footer?: React.ReactNode }) {
  return (
    <div className="min-w-[160px] rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3 py-2.5 shadow-raised">
      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">{title}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              {row.color && <span className="h-2 w-2 rounded-[3px]" style={{ backgroundColor: row.color }} />}
              {row.label}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-50 tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">{footer}</div>}
    </div>
  );
}

/** Recharts `content` adapter for the common case: one row per payload entry. */
export function SeriesTooltip({ active, payload, label, format }: any) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltipCard
      title={label}
      rows={payload.map((entry: any) => ({
        label: entry.name,
        value: format ? format(entry.value, entry) : entry.value,
        color: entry.stroke && entry.stroke !== 'none' && !String(entry.stroke).startsWith('url') ? entry.stroke : entry.color,
      }))}
    />
  );
}

/** Legend row; series can double as toggles when `onToggle` is given. */
export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string; value?: React.ReactNode; active?: boolean; onToggle?: () => void }[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2 text-xs', className)}>
      {items.map((item) => {
        const content = (
          <>
            <span className="h-2.5 w-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: item.color, opacity: item.active === false ? 0.3 : 1 }} />
            <span className={cn('text-slate-600 dark:text-slate-300', item.active === false && 'text-slate-400 dark:text-slate-500 line-through decoration-slate-300')}>
              {item.label}
            </span>
            {item.value !== undefined && <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{item.value}</span>}
          </>
        );
        return item.onToggle ? (
          <button
            key={item.label}
            type="button"
            onClick={item.onToggle}
            aria-pressed={item.active !== false}
            className="flex items-center gap-2 rounded-md -mx-1 px-1 py-0.5 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05] transition-colors"
          >
            {content}
          </button>
        ) : (
          <span key={item.label} className="flex items-center gap-2">{content}</span>
        );
      })}
    </div>
  );
}
