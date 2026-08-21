import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export interface SegmentRow {
  key: string;
  name: string;
  href?: string;
  totalAppointments: number;
  approved: number;
  declined: number;
  pendingLive: number;
  collected: number;
  outstanding?: number;
  lost?: number;
  completed?: number;
}

export function SegmentTable({
  rows,
  nameLabel,
  emptyLabel,
}: {
  rows: SegmentRow[];
  nameLabel: string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th className="text-left py-2 pr-4 font-medium" style={{ color: "var(--text-muted)" }}>
              {nameLabel}
            </th>
            <th className="text-right py-2 px-3 font-medium tabular-nums" style={{ color: "var(--text-muted)" }}>
              Total
            </th>
            <th className="text-right py-2 px-3 font-medium tabular-nums" style={{ color: "var(--text-muted)" }}>
              Approved
            </th>
            <th className="text-right py-2 px-3 font-medium tabular-nums" style={{ color: "var(--text-muted)" }}>
              Declined
            </th>
            <th className="text-right py-2 px-3 font-medium tabular-nums" style={{ color: "var(--text-muted)" }}>
              Decline rate
            </th>
            <th className="text-right py-2 px-3 font-medium tabular-nums" style={{ color: "var(--text-muted)" }}>
              Collected
            </th>
            <th className="text-right py-2 px-3 font-medium tabular-nums" style={{ color: "var(--text-muted)" }}>
              Outstanding
            </th>
            <th className="text-right py-2 pl-3 font-medium tabular-nums" style={{ color: "var(--text-muted)" }}>
              Completed
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const declineRate = row.totalAppointments ? row.declined / row.totalAppointments : 0;
            return (
              <tr
                key={row.key}
                style={{ borderBottom: "1px solid var(--gridline)" }}
                className={row.href ? "hover:bg-[var(--gridline)]/30" : undefined}
              >
                <td className="py-2 pr-4" style={{ color: "var(--text-primary)" }}>
                  {row.href ? (
                    <a href={row.href} className="hover:underline">
                      {row.name}
                    </a>
                  ) : (
                    row.name
                  )}
                </td>
                <td className="text-right py-2 px-3 tabular-nums" style={{ color: "var(--text-secondary)" }}>
                  {formatNumber(row.totalAppointments)}
                </td>
                <td className="text-right py-2 px-3 tabular-nums" style={{ color: "var(--status-good-text)" }}>
                  {formatNumber(row.approved)}
                </td>
                <td className="text-right py-2 px-3 tabular-nums" style={{ color: "var(--status-critical)" }}>
                  {formatNumber(row.declined)}
                </td>
                <td
                  className="text-right py-2 px-3 tabular-nums"
                  style={{ color: declineRate > 0.15 ? "var(--status-critical)" : "var(--text-secondary)" }}
                >
                  {formatPercent(declineRate)}
                </td>
                <td className="text-right py-2 px-3 tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {formatCurrency(row.collected)}
                </td>
                <td className="text-right py-2 px-3 tabular-nums" style={{ color: "var(--text-secondary)" }}>
                  {formatCurrency(row.outstanding ?? 0)}
                </td>
                <td className="text-right py-2 pl-3 tabular-nums" style={{ color: "var(--status-good-text)" }}>
                  {formatNumber(row.completed ?? 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
