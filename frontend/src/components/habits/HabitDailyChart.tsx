import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useChartTheme, ChartTooltipCard, ChartLegend } from '@/lib/chartTheme';

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
  const theme = useChartTheme();
  const color = theme.colors.green;
  const target = Math.round(totalHabits * 0.8);
  const totalChecksMonth = data.reduce((acc, curr) => acc + curr.completedCount, 0);

  const CountTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <ChartTooltipCard
        title={`${item.weekday}, day ${item.day}`}
        rows={[
          { label: 'Completed', value: `${item.completedCount} / ${item.totalHabits}`, color },
          { label: 'Ratio', value: `${item.percent}%` },
        ]}
      />
    );
  };

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h3 className="font-display text-xl font-medium text-slate-900 dark:text-slate-50">Habits completed</h3>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Checks per day, {totalChecksMonth} this month
          </p>
        </div>
        <ChartLegend
          items={[
            { label: `${target}+ done`, color },
            { label: 'Fewer', color: theme.isDark ? 'rgba(56,165,133,0.45)' : 'rgba(30,138,110,0.4)' },
          ]}
        />
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid {...theme.grid} />
            <XAxis dataKey="day" {...theme.axis} interval="preserveStartEnd" minTickGap={12} />
            <YAxis {...theme.axis} domain={[0, Math.max(totalHabits, 5)]} allowDecimals={false} width={48} />
            <Tooltip content={<CountTooltip />} cursor={theme.barCursor} />
            <Bar dataKey="completedCount" name="Completed" radius={[4, 4, 0, 0]} maxBarSize={18}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={color}
                  fillOpacity={entry.completedCount >= target ? 1 : 0.42}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
