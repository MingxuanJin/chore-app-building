"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type Series = { id: string; name: string; color: string };
type Row = Record<string, string | number>;

const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" };
const TOOLTIP_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "var(--font-sans)",
  color: "var(--foreground)",
};

/** One column group per x value, one bar per person. */
export function GroupedBars({
  data,
  xKey,
  series,
  format,
  allowDecimals = false,
}: {
  data: Row[];
  xKey: string;
  series: Series[];
  format: (v: number) => string;
  allowDecimals?: boolean;
}) {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={AXIS_TICK} interval="preserveStartEnd" />
          <YAxis allowDecimals={allowDecimals} tickLine={false} axisLine={false} tick={AXIS_TICK} />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, key) => [format(Number(value)), series.find((s) => s.id === key)?.name ?? ""]}
          />
          {series.map((s) => (
            <Bar key={s.id} dataKey={s.id} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={18} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** One line per person over time, with a crosshair tooltip. */
export function TrendLines({
  data,
  xKey,
  series,
  format,
}: {
  data: Row[];
  xKey: string;
  series: Series[];
  format: (v: number) => string;
}) {
  const showDots = data.length <= 31;
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={AXIS_TICK} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, key) => [format(Number(value)), series.find((s) => s.id === key)?.name ?? ""]}
          />
          {series.map((s) => (
            <Line
              key={s.id}
              type="linear"
              dataKey={s.id}
              stroke={s.color}
              strokeWidth={2}
              dot={showDots ? { r: 3, fill: s.color, stroke: "var(--card)", strokeWidth: 2 } : false}
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A single ratio against 100%. */
export function Meter({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="font-serif text-[40px] font-medium leading-[46px] lining-nums tabular-nums">{value === null ? "—" : `${value}%`}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-blush"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? 0}
      >
        <div className="h-full rounded-full bg-series-me" style={{ width: `${value ?? 0}%` }} />
      </div>
    </div>
  );
}
