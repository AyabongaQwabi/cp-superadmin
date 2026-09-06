"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  approved: "var(--status-good)",
  pending: "var(--status-warning)",
  declined: "var(--status-critical)",
  active: "var(--status-good)",
  dormant: "var(--status-warning)",
  inactive: "var(--text-muted)",
};

const FALLBACK_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--status-warning)",
  "var(--status-critical)",
];

export function StatusBreakdownChart({
  data,
  nameKey = "name",
  valueKey = "value",
}: {
  data: { [key: string]: string | number }[];
  nameKey?: string;
  valueKey?: string;
}) {
  const chartData = data.filter((row) => Number(row[valueKey]) > 0);
  if (!chartData.length) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
        No breakdown data available.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey={valueKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={56}
          outerRadius={96}
          paddingAngle={2}
        >
          {chartData.map((entry, index) => {
            const label = String(entry[nameKey]).toLowerCase();
            const fill = STATUS_COLORS[label] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
            return <Cell key={`${entry[nameKey]}-${index}`} fill={fill} />;
          })}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 13,
          }}
          formatter={(value) => formatNumber(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
