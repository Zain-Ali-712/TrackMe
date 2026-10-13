import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Flame } from 'lucide-react';
import { STREAK_THRESHOLD } from '@/lib/habitScoring';
import { useChartTheme, ChartTooltipCard, ChartLegend } from '@/lib/chartTheme';

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
  const theme = useChartTheme();
  const color = theme.colors.green;

  const validDays = data.filter(d => d.score > 0);
  const avgScore = validDays.length > 0
    ? Math.round(validDays.reduce((acc, curr) => acc + curr.score, 0) / validDays.length)
    : 0;

  const ScoreTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const score = item.score || 0;
    return (
      <ChartTooltipCard
        title={`${item.weekday}, day ${item.day}`}
        rows={[{ label: 'Score', value: `${score}%`, color }]}
        footer={
          score >= STREAK_THRESHOLD ? (
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
              <Flame className="h-3 w-3" /> Streak target met
            </span>
          ) : item.isSunday ? 'Sunday, streak is safe' : `Below the ${STREAK_THRESHOLD}% target`
        }
      />
    );
  };

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h3 className="font-display text-xl font-medium text-slate-900 dark:text-slate-50">Daily score</h3>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Weighted habit score per day this month</p>
        </div>
        <div className="flex items-center gap-5">
          <ChartLegend items={[{ label: 'Score', color }]} />
          <span className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="w-4 border-t-[1.5px] border-dashed border-slate-400 dark:border-slate-500" />
            {STREAK_THRESHOLD}% target
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Avg <span className="font-semibold text-slate-900 dark:text-slate-50 tabular-nums">{avgScore}%</span>
          </span>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data || []} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
            <defs>
              <linearGradient id="habitScoreFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={theme.isDark ? 0.26 : 0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...theme.grid} />
            <XAxis dataKey="day" {...theme.axis} interval="preserveStartEnd" minTickGap={12} />
            <YAxis {...theme.axis} domain={[0, 100]} allowDecimals={false} unit="%" width={52} />
            <Tooltip content={<ScoreTooltip />} cursor={theme.cursor} />
            <ReferenceLine y={STREAK_THRESHOLD} stroke={theme.ink.axis} strokeDasharray="4 4" strokeWidth={1.25} />
            <Area
              type="monotone"
              dataKey="score"
              name="Score"
              stroke={color}
              strokeWidth={2}
              fill="url(#habitScoreFill)"
              dot={false}
              activeDot={theme.activeDot(color)}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
