import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartTheme, ChartTooltipCard } from '@/lib/chartTheme';

interface SleepTrackerChartProps {
  data: Array<{
    day: number;
    date: string;
    weekday: string;
    sleepHours: number;
  }>;
}

export default function SleepTrackerChart({ data }: SleepTrackerChartProps) {
  const theme = useChartTheme();
  const color = theme.colors.blue;

  const loggedDays = data.filter(d => (d.sleepHours || 0) > 0);
  const avgSleep = loggedDays.length > 0
    ? (loggedDays.reduce((acc, curr) => acc + (curr.sleepHours || 0), 0) / loggedDays.length).toFixed(1)
    : '0';

  const SleepTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <ChartTooltipCard
        title={`${item.weekday}, day ${item.day}`}
        rows={[{ label: 'Sleep', value: item.sleepHours ? `${item.sleepHours} h` : 'Not logged', color }]}
      />
    );
  };

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
        <div>
          <h3 className="font-display text-xl font-medium text-slate-900 dark:text-slate-50">Sleep</h3>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Hours per night, edited in the grid's sleep row</p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Month avg <span className="font-display text-xl text-slate-900 dark:text-slate-50 tabular-nums ml-1">{avgSleep}</span> h
        </span>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
            <CartesianGrid {...theme.grid} />
            <XAxis dataKey="day" {...theme.axis} interval="preserveStartEnd" minTickGap={12} />
            <YAxis {...theme.axis} domain={[0, 12]} allowDecimals={false} width={48} />
            <Tooltip content={<SleepTooltip />} cursor={theme.cursor} />
            <Line
              type="monotone"
              dataKey="sleepHours"
              name="Sleep"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 2.5, fill: color, strokeWidth: 1.5, stroke: theme.ink.surface }}
              activeDot={theme.activeDot(color)}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
