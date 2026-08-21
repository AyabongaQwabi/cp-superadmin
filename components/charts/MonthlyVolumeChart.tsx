"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthSummary } from "@/lib/types";
import { MONTH_NAMES, formatNumber } from "@/lib/format";

export function MonthlyVolumeChart({ data }: { data: MonthSummary[] }) {
  const chartData = data.map((d) => ({
    label: `${MONTH_NAMES[d.month - 1]} ${String(d.year).slice(2)}`,
    Approved: d.approved,
    Pending: d.pendingLive,
    Declined: d.declined,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          tickLine={false}
          tickFormatter={(v) => formatNumber(v)}
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 13,
          }}
          labelStyle={{ color: "var(--text-primary)" }}
          formatter={(value) => formatNumber(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }} />
        <Bar dataKey="Approved" stackId="s" fill="var(--status-good)" />
        <Bar dataKey="Pending" stackId="s" fill="var(--status-warning)" />
        <Bar dataKey="Declined" stackId="s" fill="var(--status-critical)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
