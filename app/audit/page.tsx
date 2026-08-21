import { getAuditDashboard, displayDate } from "@/lib/superadmin-read-model";
import { formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { EmptyState, InlineLink, PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getAuditDashboard();

  return (
    <PageChrome
      eyebrow="Audit"
      title="Audit & Change Explorer"
      subtitle="Recent centralized audit events plus live legacy tracking entries from production appointments, companies, and users."
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatTile label="Recent events shown" value={formatNumber(data.events.length)} />
        <StatTile label="Action types" value={formatNumber(data.actionCounts.length)} />
        <StatTile label="Sources" value={formatNumber(data.sourceCounts.length)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Top actions">
          {data.actionCounts.length === 0 ? (
            <EmptyState title="No audit actions found" />
          ) : (
            <div className="flex flex-col gap-2">
              {data.actionCounts.map((row) => (
                <div key={row._id ?? "unknown"} className="flex items-center justify-between gap-3 text-sm">
                  <span>{row._id ?? "unknown"}</span>
                  <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>{formatNumber(row.count)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Source coverage">
          {data.sourceCounts.length === 0 ? (
            <EmptyState title="No audit sources found" />
          ) : (
            <div className="flex flex-col gap-2">
              {data.sourceCounts.map((row) => (
                <div key={row._id ?? "unknown"} className="flex items-center justify-between gap-3 text-sm">
                  <StatusBadge>{row._id ?? "unknown"}</StatusBadge>
                  <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>{formatNumber(row.count)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent events" description="Includes live tracking fallback when centralized audit events have not been backfilled yet.">
        {data.events.length === 0 ? (
          <EmptyState title="No audit events found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Time</th>
                  <th className="text-left py-2 px-3">Entity</th>
                  <th className="text-left py-2 px-3">Action</th>
                  <th className="text-left py-2 px-3">Actor</th>
                  <th className="text-left py-2 pl-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((event) => (
                  <tr key={event._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                    <td className="py-2 pr-4 tabular-nums">{displayDate(event.createdAt)}</td>
                    <td className="py-2 px-3">
                      <InlineLink href={`/audit-events/${event.entityType}/${encodeURIComponent(event.entityId)}`}>
                        {event.entityType}:{event.entityId}
                      </InlineLink>
                    </td>
                    <td className="py-2 px-3">{event.action}</td>
                    <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{event.actorName ?? event.actorId ?? "-"}</td>
                    <td className="py-2 pl-3"><StatusBadge>{event.source}</StatusBadge></td>
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
