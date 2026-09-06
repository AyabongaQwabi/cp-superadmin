import Link from "next/link";
import { cachedOperationsSummary, cachedPlatformSignals } from "@/lib/cached";
import { displayDate } from "@/lib/superadmin-read-model";
import { StatTile } from "@/components/StatTile";
import { EmptyState, InlineLink, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";
import { formatNumber, formatPercent } from "@/lib/format";

type PlatformSignalsPayload = {
  adoptionMetric: { adoptionRate?: number; computedAt?: string } | null;
  anomalies: { _id: string; appointmentId: string; difference?: number; companyId?: string }[];
  dataQuality: { _id: string; companyId: string; flagType: string; detail?: string }[];
  recentSyncRuns: {
    _id: string;
    startedAt: string;
    status: string;
    jobs?: { name: string; errors?: number }[];
  }[];
};

function syncTone(status: string): "good" | "warning" | "critical" {
  if (status === "success") return "good";
  if (status === "partial") return "warning";
  return "critical";
}

export async function OperationsTab() {
  const [data, signals] = await Promise.all([
    cachedOperationsSummary(),
    cachedPlatformSignals() as Promise<PlatformSignalsPayload>,
  ]);

  const adoptionRate =
    typeof signals.adoptionMetric?.adoptionRate === "number"
      ? formatPercent(signals.adoptionMetric.adoptionRate, 1)
      : typeof data.latestAdoptionMetric?.adoptionRate === "number"
        ? formatPercent(data.latestAdoptionMetric.adoptionRate, 1)
        : "-";

  const syncRuns = signals.recentSyncRuns.length ? signals.recentSyncRuns : data.latestSyncRuns;

  return (
    <>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Sync health, adoption, and exception queues.{" "}
        <InlineLink href="/operations">Open operations command center →</InlineLink> ·{" "}
        <InlineLink href="/audit">Audit trail →</InlineLink>
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Live appointments" value={formatNumber(data.counts.liveAppointments)} />
        <StatTile label="Companies" value={formatNumber(data.counts.companyCount)} />
        <StatTile label="Workspace adoption" value={adoptionRate} tone="good" />
        <StatTile
          label="Pricing anomalies"
          value={formatNumber(data.counts.anomalyCount)}
          tone={data.counts.anomalyCount ? "critical" : "good"}
        />
      </div>

      <SectionCard title="Production appointment status">
        {data.statusCounts.length === 0 ? (
          <EmptyState title="No appointment statuses found" />
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            {data.statusCounts.map((row) => (
              <div key={String(row._id ?? "unknown")} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                <div className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>
                  {String(row._id ?? "unknown")}
                </div>
                <div className="text-xl font-semibold tabular-nums mt-1">{formatNumber(row.count ?? 0)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent sync runs">
        {syncRuns.length === 0 ? (
          <EmptyState title="No sync runs found yet" />
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
                {syncRuns.slice(0, 10).map((run) => {
                  const errors = (run.jobs ?? []).reduce(
                    (sum: number, job: { errors?: number }) => sum + (job.errors ?? 0),
                    0,
                  );
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

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Recent pricing anomalies">
          {data.recentAnomalies.length === 0 ? (
            <EmptyState title="No pricing anomalies flagged" />
          ) : (
            <div className="flex flex-col gap-3">
              {data.recentAnomalies.slice(0, 8).map((flag) => (
                <div key={flag._id} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{flag.appointmentId}</span>
                    <StatusBadge tone="critical">{formatNumber(Math.abs(flag.difference ?? 0))} ZAR diff</StatusBadge>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Company {flag.companyId ?? "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent data-quality flags">
          {data.recentDataQuality.length === 0 ? (
            <EmptyState title="No data-quality flags visible" />
          ) : (
            <div className="flex flex-col gap-3">
              {data.recentDataQuality.slice(0, 8).map((flag) => (
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

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        <Link href="/data-quality" className="underline">
          Full data-quality dashboard
        </Link>
      </p>
    </>
  );
}
