import { displayDate } from "@/lib/superadmin-read-model";
import { cachedCompanionAccessDashboard } from "@/lib/cached";
import { formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { EmptyState, PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await cachedCompanionAccessDashboard();

  return (
    <PageChrome eyebrow="Access" title="Admin Access" subtitle="Read-only view of admin workspace users linked back to production user records where possible.">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Workspace users" value={formatNumber(data.total)} />
        {data.roleCounts.slice(0, 3).map((row) => (
          <StatTile key={String(row._id ?? "unknown")} label={String(row._id ?? "unknown")} value={formatNumber(row.count ?? 0)} />
        ))}
      </div>

      <SectionCard title="Linked users">
        {data.rows.length === 0 ? (
          <EmptyState title="No workspace users found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Production user</th>
                  <th className="text-left py-2 px-3">Workspace role</th>
                  <th className="text-left py-2 px-3">Production state</th>
                  <th className="text-right py-2 pl-3">First login</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                    <td className="py-2 pr-4">
                      <div className="font-medium">{row.productionUser ? [row.productionUser.details?.name, row.productionUser.details?.surname].filter(Boolean).join(" ") : row.productionUserId}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{row.productionUserId ?? "-"}</div>
                    </td>
                    <td className="py-2 px-3"><StatusBadge tone={row.role === "superadmin" ? "good" : "neutral"}>{String(row.role ?? "unknown")}</StatusBadge></td>
                    <td className="py-2 px-3">
                      {row.productionUser ? (
                        <div className="flex gap-2">
                          <StatusBadge>{String(row.productionUser.role ?? "unknown")}</StatusBadge>
                          {row.productionUser.isSuspended && <StatusBadge tone="warning">suspended</StatusBadge>}
                        </div>
                      ) : (
                        <StatusBadge tone="warning">not linked</StatusBadge>
                      )}
                    </td>
                    <td className="py-2 pl-3 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>{displayDate(row.firstLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </PageChrome>
  );
}
