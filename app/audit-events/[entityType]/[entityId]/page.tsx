import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cachedEntityTimeline } from "@/lib/cached";
import { formatNumber } from "@/lib/format";
import type { AuditEntityType } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ENTITY_TYPES: AuditEntityType[] = ["appointment", "user", "company"];

function isValidEntityType(value: string): value is AuditEntityType {
  return (ENTITY_TYPES as string[]).includes(value);
}

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

async function EntityTimeline({
  entityType,
  entityId,
}: {
  entityType: AuditEntityType;
  entityId: string;
}) {
  const events = await cachedEntityTimeline(entityType, entityId);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div>
        <Link
          href="/audit-events"
          className="text-xs hover:underline"
          style={{ color: "var(--text-secondary)" }}
        >
          ← Back to Audit Events
        </Link>
        <h1 className="text-2xl font-semibold mt-2" style={{ color: "var(--text-primary)" }}>
          {entityType}: {entityId}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {formatNumber(events.length)} event{events.length === 1 ? "" : "s"}, most recent first
        </p>
      </div>

      <section
        className="rounded-lg p-5 flex flex-col gap-4"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
      >
        {events.length === 0 && (
          <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
            No audit events found for this entity.
          </p>
        )}

        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-md p-4"
            style={{ border: "1px solid var(--gridline)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {event.action}
                </span>
                <span
                  className="inline-block rounded px-2 py-0.5 text-xs font-medium"
                  style={{
                    background: event.source === "legacy-import" ? "var(--gridline)" : "var(--status-good-text)",
                    color: event.source === "legacy-import" ? "var(--text-muted)" : "var(--surface-1)",
                    opacity: event.source === "legacy-import" ? 1 : 0.85,
                  }}
                >
                  {event.source}
                </span>
              </div>
              <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                {formatTimestamp(event.createdAt)}
              </span>
            </div>

            <div className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              Actor: {event.actorName ?? event.actorId ?? "—"}
              {event.actorType && <span className="ml-1">({event.actorType})</span>}
            </div>

            {event.changes && event.changes.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                  Changes
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {event.changes.map((change, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--gridline)" }}>
                        <td className="py-1 pr-3 font-mono" style={{ color: "var(--text-primary)" }}>
                          {change.field}
                        </td>
                        <td className="py-1 pr-3" style={{ color: "var(--status-critical)" }}>
                          {JSON.stringify(change.before)}
                        </td>
                        <td className="py-1" style={{ color: "var(--status-good-text)" }}>
                          {JSON.stringify(change.after)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <details className="mt-3">
                <summary
                  className="text-xs font-medium cursor-pointer"
                  style={{ color: "var(--text-muted)" }}
                >
                  Metadata
                </summary>
                <pre
                  className="mt-2 text-xs overflow-x-auto rounded p-3"
                  style={{ background: "var(--background)", color: "var(--text-secondary)" }}
                >
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ entityType: string; entityId: string }>;
}) {
  const { entityType, entityId } = await params;

  if (!isValidEntityType(entityType) || !entityId) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-6 py-16 text-center" style={{ color: "var(--text-muted)" }}>
          Loading timeline…
        </div>
      }
    >
      <EntityTimeline entityType={entityType} entityId={decodeURIComponent(entityId)} />
    </Suspense>
  );
}
