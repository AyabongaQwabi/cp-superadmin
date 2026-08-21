import { Suspense } from "react";
import Link from "next/link";
import { cachedAuditEvents } from "@/lib/cached";
import { AuditEventTable } from "@/components/AuditEventTable";
import { StatTile } from "@/components/StatTile";
import { formatNumber } from "@/lib/format";
import type { AuditEntityType, AuditSource } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ENTITY_TYPES: AuditEntityType[] = ["appointment", "user", "company"];
const SOURCES: AuditSource[] = ["cp-redesign", "cp-redesign-admin", "legacy-import", "system"];

interface AuditEventsSearchParams {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}

function buildQueryString(params: AuditEventsSearchParams, overrides: Record<string, string | undefined>) {
  const merged: Record<string, string | undefined> = { ...params, ...overrides };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function AuditEventsList({ searchParams }: { searchParams: AuditEventsSearchParams }) {
  const entityType = ENTITY_TYPES.includes(searchParams.entityType as AuditEntityType)
    ? (searchParams.entityType as AuditEntityType)
    : undefined;
  const source = SOURCES.includes(searchParams.source as AuditSource)
    ? (searchParams.source as AuditSource)
    : undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const filters = {
    entityType,
    entityId: searchParams.entityId || undefined,
    actorId: searchParams.actorId || undefined,
    action: searchParams.action || undefined,
    source,
    dateFrom: searchParams.dateFrom || undefined,
    dateTo: searchParams.dateTo || undefined,
    page,
  };

  const { events, total, pageSize } = await cachedAuditEvents(filters);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Audit Events
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Activity log from the admin analytics read model. Cached for up
          to 60 seconds.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Matching events" value={formatNumber(total)} />
        <StatTile label="Page" value={`${page} of ${totalPages}`} />
      </div>

      <section
        className="rounded-lg p-5"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Filters
        </h2>
        <form method="get" className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Entity type
            <select
              name="entityType"
              defaultValue={entityType ?? ""}
              className="rounded px-2 py-1.5 text-sm"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <option value="">All</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Entity ID
            <input
              type="text"
              name="entityId"
              defaultValue={searchParams.entityId ?? ""}
              placeholder="Exact ID"
              className="rounded px-2 py-1.5 text-sm"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Actor ID
            <input
              type="text"
              name="actorId"
              defaultValue={searchParams.actorId ?? ""}
              placeholder="Exact ID"
              className="rounded px-2 py-1.5 text-sm"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Action
            <input
              type="text"
              name="action"
              defaultValue={searchParams.action ?? ""}
              placeholder="e.g. status_changed"
              className="rounded px-2 py-1.5 text-sm"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Source
            <select
              name="source"
              defaultValue={source ?? ""}
              className="rounded px-2 py-1.5 text-sm"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <option value="">All</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Date from
            <input
              type="date"
              name="dateFrom"
              defaultValue={searchParams.dateFrom ?? ""}
              className="rounded px-2 py-1.5 text-sm"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Date to
            <input
              type="date"
              name="dateTo"
              defaultValue={searchParams.dateTo ?? ""}
              className="rounded px-2 py-1.5 text-sm"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded px-3 py-1.5 text-sm font-medium"
              style={{ background: "var(--text-primary)", color: "var(--surface-1)" }}
            >
              Apply
            </button>
            <Link
              href="/audit-events"
              className="rounded px-3 py-1.5 text-sm font-medium hover:underline"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section
        className="rounded-lg p-5"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Events, most recent first
        </h2>
        <AuditEventTable events={events} />

        <div className="flex items-center justify-between mt-4 text-sm">
          <div style={{ color: "var(--text-muted)" }}>
            Page {page} of {totalPages} · {formatNumber(total)} total
          </div>
          <div className="flex gap-3">
            {page > 1 ? (
              <a
                href={`/audit-events${buildQueryString(searchParams, { page: String(page - 1) })}`}
                className="hover:underline"
                style={{ color: "var(--text-secondary)" }}
              >
                ← Previous
              </a>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>← Previous</span>
            )}
            {page < totalPages ? (
              <a
                href={`/audit-events${buildQueryString(searchParams, { page: String(page + 1) })}`}
                className="hover:underline"
                style={{ color: "var(--text-secondary)" }}
              >
                Next →
              </a>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>Next →</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<AuditEventsSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-6 py-16 text-center" style={{ color: "var(--text-muted)" }}>
          Loading audit events…
        </div>
      }
    >
      <AuditEventsList searchParams={resolvedSearchParams} />
    </Suspense>
  );
}
