import { displayDate } from "@/lib/superadmin-read-model";
import { cachedAppointmentExplorer } from "@/lib/cached";
import { formatCurrency, formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { EmptyState, PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

function tone(status: string): "good" | "warning" | "critical" | "neutral" {
  if (status === "approved") return "good";
  if (status === "pending") return "warning";
  if (status === "declined") return "critical";
  return "neutral";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params.search?.trim();
  const status = params.status?.trim() || "all";
  const data = await cachedAppointmentExplorer({ search, status });

  return (
    <PageChrome
      eyebrow="Bookings"
      title="Appointment Explorer"
      subtitle="Lookup for live production appointments only. Deleted appointments are intentionally excluded here; use Business overview for historical live+deleted totals."
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Matched appointments" value={formatNumber(data.total)} />
        {data.statusCounts.slice(0, 4).map((row) => (
          <StatTile key={String(row._id ?? "unknown")} label={String(row._id ?? "unknown")} value={formatNumber(row.count ?? 0)} />
        ))}
      </div>

      <SectionCard title="Filters">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs flex-1 min-w-60" style={{ color: "var(--text-muted)" }}>
            Appointment, company, or clinic
            <input name="search" defaultValue={search ?? ""} className="rounded px-2 py-1.5 text-sm" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Status
            <select name="status" defaultValue={status} className="rounded px-2 py-1.5 text-sm" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="declined">Declined</option>
            </select>
          </label>
          <button type="submit" className="rounded px-3 py-1.5 text-sm font-medium" style={{ background: "var(--text-primary)", color: "var(--surface-1)" }}>Apply</button>
        </form>
      </SectionCard>

      <SectionCard title="Appointments">
        {data.rows.length === 0 ? (
          <EmptyState title="No appointments matched" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Appointment</th>
                  <th className="text-left py-2 px-3">Company</th>
                  <th className="text-left py-2 px-3">Clinic</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Amount</th>
                  <th className="text-right py-2 pl-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((appointment) => (
                  <tr key={appointment._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                    <td className="py-2 pr-4 font-medium">{appointment.id ?? appointment._id}</td>
                    <td className="py-2 px-3">{appointment.details?.company?.name ?? "-"}</td>
                    <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{appointment.details?.clinic ?? "-"}</td>
                    <td className="py-2 px-3"><StatusBadge tone={tone(String(appointment.status))}>{String(appointment.status ?? "unknown")}</StatusBadge></td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(appointment.payment?.amount ?? 0)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>{displayDate(appointment.tracking?.[0]?.date)}</td>
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
