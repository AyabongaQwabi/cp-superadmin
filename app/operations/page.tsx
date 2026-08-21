import { displayDate } from "@/lib/superadmin-read-model";
import { cachedOperationsSummary } from "@/lib/cached";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { EmptyState, PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

function syncTone(status: string): "good" | "warning" | "critical" {
  if (status === "success") return "good";
  if (status === "partial") return "warning";
  return "critical";
}

function appointmentTone(status: string): "good" | "warning" | "critical" {
  if (status === "approved") return "good";
  if (status === "pending") return "warning";
  return "critical";
}

export default async function Page() {
  const data = await cachedOperationsSummary();
  const adoptionRate =
    typeof data.latestAdoptionMetric?.adoptionRate === "number"
      ? formatPercent(data.latestAdoptionMetric.adoptionRate, 1)
      : "-";

  return (
    <PageChrome
      eyebrow="Operations"
      title="Operations Command Center"
      subtitle="Sync health, adoption, exception queues, and recent data-quality signals across the ClinicPlus ecosystem."
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Live appointments" value={formatNumber(data.counts.liveAppointments)} />
        <StatTile label="Deleted appointments" value={formatNumber(data.counts.deletedAppointments)} tone="warning" />
        <StatTile label="Companies" value={formatNumber(data.counts.companyCount)} />
        <StatTile label="Users" value={formatNumber(data.counts.userCount)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Admin workspace users" value={formatNumber(data.counts.companionUserCount)} tone="good" />
        <StatTile label="Workspace adoption" value={adoptionRate} tone={data.latestAdoptionMetric ? "good" : undefined} />
        <StatTile label="Pricing anomalies" value={formatNumber(data.counts.anomalyCount)} tone={data.counts.anomalyCount ? "critical" : "good"} />
        <StatTile label="Data-quality flags" value={formatNumber(data.counts.dataQualityCount)} tone={data.counts.dataQualityCount ? "warning" : "good"} />
      </div>

      <SectionCard title="Production appointment status" description="Live production appointments, grouped by current status.">
        {data.statusCounts.length === 0 ? (
          <EmptyState title="No appointment statuses found" />
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            {data.statusCounts.map((row) => (
              <div key={String(row._id ?? "unknown")} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                <div className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>{String(row._id ?? "unknown")}</div>
                <div className="text-xl font-semibold tabular-nums mt-1" style={{ color: "var(--text-primary)" }}>{formatNumber(row.count ?? 0)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent sync runs" description="Latest derived-data refreshes for admin analytics and operational read models.">
        {data.latestSyncRuns.length === 0 ? (
          <EmptyState title="No sync runs found yet" detail="Showing production operational reads below until derived analytics collections are available." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Started</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Jobs</th>
                  <th className="text-right py-2 pl-3">Errors</th>
                </tr>
              </thead>
              <tbody>
                {data.latestSyncRuns.map((run) => {
                  const errors = (run.jobs ?? []).reduce((sum: number, job: { errors?: number }) => sum + (job.errors ?? 0), 0);
                  return (
                    <tr key={run._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                      <td className="py-2 pr-4 tabular-nums">{displayDate(run.startedAt)}</td>
                      <td className="py-2 px-3">
                        <StatusBadge tone={syncTone(String(run.status))}>{String(run.status)}</StatusBadge>
                      </td>
                      <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>
                        {(run.jobs ?? []).map((job: { name: string }) => job.name).join(", ") || "-"}
                      </td>
                      <td className="py-2 pl-3 text-right tabular-nums">{formatNumber(errors)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent production appointments" description="Read-only sample from production.appointments so the command center is populated even before derived sync logs exist.">
        {data.recentProductionAppointments.length === 0 ? (
          <EmptyState title="No recent production appointments found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Appointment</th>
                  <th className="text-left py-2 px-3">Company</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Amount</th>
                  <th className="text-right py-2 pl-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.recentProductionAppointments.map((appointment) => (
                  <tr key={appointment._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                    <td className="py-2 pr-4 font-medium">{appointment.id ?? appointment._id}</td>
                    <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{appointment.details?.company?.name ?? "-"}</td>
                    <td className="py-2 px-3">
                      <StatusBadge tone={appointmentTone(String(appointment.status))}>{String(appointment.status ?? "unknown")}</StatusBadge>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(appointment.payment?.amount ?? 0)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>{displayDate(appointment.tracking?.[0]?.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Recent pricing anomalies">
          {data.recentAnomalies.length === 0 ? (
            <EmptyState title="No pricing anomalies currently flagged" />
          ) : (
            <div className="flex flex-col gap-3">
              {data.recentAnomalies.map((flag) => (
                <div key={flag._id} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{flag.appointmentId}</span>
                    <StatusBadge tone="critical">{formatNumber(Math.abs(flag.difference ?? 0))} ZAR diff</StatusBadge>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Stored {flag.storedAmount ?? "-"} vs recomputed {flag.recomputedAmount ?? "-"} - company {flag.companyId ?? "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent data-quality flags">
          {data.recentDataQuality.length === 0 ? (
            <EmptyState title="No data-quality flags currently visible" />
          ) : (
            <div className="flex flex-col gap-3">
              {data.recentDataQuality.map((flag) => (
                <div key={flag._id} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{flag.companyId}</span>
                    <StatusBadge tone="warning">{flag.flagType}</StatusBadge>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {flag.detail}
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
