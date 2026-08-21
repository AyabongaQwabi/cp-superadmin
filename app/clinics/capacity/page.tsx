import { getClinicCapacity } from "@/lib/superadmin-read-model";
import { formatNumber, formatPercent } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { EmptyState, PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getClinicCapacity();

  return (
    <PageChrome
      eyebrow="Clinic Operations"
      title="Clinic Capacity & Availability"
      subtitle={`Current production systemSettings limits and booked employee counts from ${data.window.from} to ${data.window.to}.`}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.clinics.slice(0, 4).map((clinic) => (
          <StatTile key={clinic} label={`${clinic} limit`} value={formatNumber(data.limits[clinic] ?? 100)} />
        ))}
      </div>

      <SectionCard title="Upcoming capacity pressure">
        {data.upcoming.length === 0 ? (
          <EmptyState title="No upcoming bookings in this window" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-left py-2 px-3">Clinic</th>
                  <th className="text-right py-2 px-3">Appointments</th>
                  <th className="text-right py-2 px-3">Employees</th>
                  <th className="text-right py-2 pl-3">Load</th>
                </tr>
              </thead>
              <tbody>
                {data.upcoming.map((row) => {
                  const clinic = row._id?.clinic ?? "Unspecified";
                  const limit = data.limits[clinic] ?? 100;
                  const load = limit ? row.employees / limit : 0;
                  return (
                    <tr key={`${row._id?.clinic}:${row._id?.date}`} style={{ borderBottom: "1px solid var(--gridline)" }}>
                      <td className="py-2 pr-4 tabular-nums">{row._id?.date ?? "-"}</td>
                      <td className="py-2 px-3">{clinic}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatNumber(row.appointments ?? 0)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatNumber(row.employees ?? 0)}</td>
                      <td className="py-2 pl-3 text-right">
                        <StatusBadge tone={load >= 1 ? "critical" : load >= 0.8 ? "warning" : "good"}>
                          {formatPercent(load, 0)}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Write path not enabled" description="Capacity edits should be implemented later through a guarded superadmin API, with typed confirmation, idempotency, and immutable audit logging.">
        <button
          type="button"
          disabled
          className="rounded px-3 py-1.5 text-sm font-medium"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          Capacity edits disabled in this read-only build
        </button>
      </SectionCard>
    </PageChrome>
  );
}
