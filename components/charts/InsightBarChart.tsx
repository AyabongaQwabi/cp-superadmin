"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/format";

export function InsightBarChart({
  data,
  labelKey,
  valueKey,
  valueFormat = "number",
  layout = "vertical",
}: {
  data: Record<string, string | number>[];
  labelKey: string;
  valueKey: string;
  valueFormat?: "number" | "currency";
  layout?: "vertical" | "horizontal";
}) {
  if (!data.length) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
        No chart data available.
      </p>
    );
  }

  const formatValue = (value: number) =>
    valueFormat === "currency" ? formatCurrency(value) : formatNumber(value);

  const tickFormatter = (value: number) =>
    valueFormat === "currency" ? formatCompactCurrency(value) : formatNumber(value);

  if (layout === "horizontal") {
    return (
      <ResponsiveContainer width="100%" height={Math.max(240, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--gridline)" horizontal={false} />
          <XAxis
            type="number"
            stroke="var(--baseline)"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            tickFormatter={tickFormatter}
          />
          <YAxis
            type="category"
            dataKey={labelKey}
            stroke="var(--baseline)"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
            }}
            formatter={(value) => formatValue(Number(value))}
          />
          <Bar dataKey={valueKey} fill="var(--series-1)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gridline)" vertical={false} />
        <XAxis
          dataKey={labelKey}
          stroke="var(--baseline)"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          stroke="var(--baseline)"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          tickLine={false}
          tickFormatter={tickFormatter}
          width={56}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 13,
          }}
          formatter={(value) => formatValue(Number(value))}
        />
        <Bar dataKey={valueKey} fill="var(--series-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
