import Link from "next/link";
import { getAppointmentExceptions, displayDate } from "@/lib/superadmin-read-model";
import { formatCurrency, formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { EmptyState, InlineLink, PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getAppointmentExceptions();

  return (
    <PageChrome
      eyebrow="Exceptions"
      title="Appointment Exception Workbench"
      subtitle="Exception queues for duplicate ids, stale pending bookings, approved deleted appointments, and derived pricing-anomaly flags. This dashboard reads generated signals and does not recompute them."
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Pricing anomalies" value={formatNumber(data.anomalies.length)} tone={data.anomalies.length ? "critical" : "good"} />
        <StatTile label="Duplicate ids" value={formatNumber(data.duplicateIds.length)} tone={data.duplicateIds.length ? "warning" : "good"} />
        <StatTile label="Stale pending" value={formatNumber(data.stalePending.length)} tone={data.stalePending.length ? "warning" : "good"} />
        <StatTile label="Deleted approved" value={formatNumber(data.deletedApproved.length)} tone={data.deletedApproved.length ? "warning" : "good"} />
      </div>

      <SectionCard title="Pricing mismatches" description="Derived signal source: anomaly flags. Treat this as a sync-pipeline output; stale flags must be regenerated before they are trusted.">
        {data.anomalies.length === 0 ? (
          <EmptyState title="No pricing mismatches found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Appointment</th>
                  <th className="text-left py-2 px-3">Company</th>
                  <th className="text-right py-2 px-3">Stored</th>
                  <th className="text-right py-2 px-3">Recomputed</th>
                  <th className="text-right py-2 pl-3">Difference</th>
                </tr>
              </thead>
              <tbody>
                {data.anomalies.map((flag) => (
                  <tr key={flag._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                    <td className="py-2 pr-4">
                      <InlineLink href={`/audit-events/appointment/${encodeURIComponent(flag.appointmentId ?? "")}`}>
                        {flag.appointmentId}
                      </InlineLink>
                    </td>
                    <td className="py-2 px-3">{flag.companyId ?? "-"}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(flag.storedAmount ?? 0)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(flag.recomputedAmount ?? 0)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums" style={{ color: "var(--status-critical)" }}>
                      {formatCurrency(flag.difference ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Duplicate appointment ids">
          {data.duplicateIds.length === 0 ? (
            <EmptyState title="No duplicate ids detected" />
          ) : (
            <div className="flex flex-col gap-3">
              {data.duplicateIds.map((row) => (
                <div key={row._id} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/audit-events/appointment/${encodeURIComponent(row._id)}`} className="font-medium hover:underline">
                      {row._id}
                    </Link>
                    <StatusBadge tone="warning">{row.count} records</StatusBadge>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {(row.companyNames ?? []).filter(Boolean).join(", ") || "Unknown company"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Stale pending appointments">
          {data.stalePending.length === 0 ? (
            <EmptyState title="No stale pending appointments found" />
          ) : (
            <div className="flex flex-col gap-3">
              {data.stalePending.map((appointment) => (
                <div key={appointment._id} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <InlineLink href={`/audit-events/appointment/${encodeURIComponent(appointment.id ?? "")}`}>{appointment.id}</InlineLink>
                    <StatusBadge tone="warning">pending</StatusBadge>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {appointment.details?.company?.name ?? "-"} - {displayDate(appointment.tracking?.[0]?.date)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Approved but deleted">
          {data.deletedApproved.length === 0 ? (
            <EmptyState title="No approved deleted appointments found" />
          ) : (
            <div className="flex flex-col gap-3">
              {data.deletedApproved.map((appointment) => (
                <div key={appointment._id} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <InlineLink href={`/audit-events/appointment/${encodeURIComponent(appointment.id ?? "")}`}>{appointment.id}</InlineLink>
                    <StatusBadge tone="good">approved</StatusBadge>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {appointment.details?.company?.name ?? "-"} - {formatCurrency(appointment.payment?.amount ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageChrome>
  );
}
