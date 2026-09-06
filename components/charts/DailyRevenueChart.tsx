"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/format";

export function DailyRevenueChart({
  data,
}: {
  data: { date: string; amount: number; appointments?: number }[];
}) {
  if (!data.length) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
        No revenue trend data available.
      </p>
    );
  }

  const chartData = data.map((row) => ({
    ...row,
    label: row.date.slice(5),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gridline)" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="var(--baseline)"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="var(--baseline)"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          tickLine={false}
          tickFormatter={(v) => formatCompactCurrency(v)}
          width={64}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 13,
          }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
          formatter={(value, name) =>
            name === "amount" ? formatCurrency(Number(value)) : formatNumber(Number(value))
          }
        />
        <Line
          type="monotone"
          dataKey="amount"
          name="amount"
          stroke="var(--status-good)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
