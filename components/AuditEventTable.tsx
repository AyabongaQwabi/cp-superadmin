import type { AuditEvent } from "@/lib/audit";

function formatTimestamp(value: Date | string): string {
  const d = new Date(value);
  return d.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function SourceBadge({ source }: { source: string }) {
  const isLegacy = source === "legacy-import";
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-medium"
      style={{
        background: isLegacy ? "var(--gridline)" : "var(--status-good-text)",
        color: isLegacy ? "var(--text-muted)" : "var(--surface-1)",
        opacity: isLegacy ? 1 : 0.85,
      }}
    >
      {source}
    </span>
  );
}

export function AuditEventTable({
  events,
  emptyLabel = "No audit events found.",
}: {
  events: AuditEvent[];
  emptyLabel?: string;
}) {
  if (events.length === 0) {
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
              Timestamp
            </th>
            <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-muted)" }}>
              Entity
            </th>
            <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-muted)" }}>
              Action
            </th>
            <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-muted)" }}>
              Actor
            </th>
            <th className="text-left py-2 pl-3 font-medium" style={{ color: "var(--text-muted)" }}>
              Source
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} style={{ borderBottom: "1px solid var(--gridline)" }}>
              <td className="py-2 pr-4 whitespace-nowrap tabular-nums" style={{ color: "var(--text-secondary)" }}>
                {formatTimestamp(event.createdAt)}
              </td>
              <td className="py-2 px-3" style={{ color: "var(--text-primary)" }}>
                <a
                  href={`/audit-events/${event.entityType}/${encodeURIComponent(event.entityId)}`}
                  className="hover:underline"
                >
                  {event.entityType}:{event.entityId}
                </a>
              </td>
              <td className="py-2 px-3" style={{ color: "var(--text-primary)" }}>
                {event.action}
              </td>
              <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>
                {event.actorName ?? event.actorId ?? "—"}
                {event.actorType && (
                  <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    ({event.actorType})
                  </span>
                )}
              </td>
              <td className="py-2 pl-3">
                <SourceBadge source={event.source} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
