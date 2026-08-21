import { displayDate } from "@/lib/superadmin-read-model";
import { cachedServiceDashboard } from "@/lib/cached";
import { formatCurrency, formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { EmptyState, PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await cachedServiceDashboard();
  const totalUses = data.services.reduce((sum, row) => sum + (row.uses ?? 0), 0);
  const bookedValue = data.services.reduce((sum, row) => sum + (row.bookedValue ?? 0), 0);
  const completedValue = data.services.reduce((sum, row) => sum + (row.completedValue ?? 0), 0);

  return (
    <PageChrome eyebrow="Services" title="Service Utilization" subtitle="Services are embedded on appointment employees. Booked service-line value is the sum of selected service prices across all appointment states; completed service-line value is only approved appointments whose service date has passed.">

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Service types" value={formatNumber(data.services.length)} />
        <StatTile label="Service uses" value={formatNumber(totalUses)} />
        <StatTile label="Booked service-line value" value={formatCurrency(bookedValue)} sub="All statuses, live + deleted" />
        <StatTile label="Completed service-line value" value={formatCurrency(completedValue)} sub="Approved and service date passed" tone="good" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Employees with services" value={formatNumber(data.employeesWithServices)} tone="good" />
        <StatTile label="Employees without services" value={formatNumber(data.employeesWithoutServices)} tone={data.employeesWithoutServices ? "warning" : "good"} />
      </div>

      <SectionCard title="Top services">
        {data.services.length === 0 ? (
          <EmptyState title="No services found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Service</th>
                  <th className="text-right py-2 px-3">Uses</th>
                  <th className="text-right py-2 px-3">Approved uses</th>
                  <th className="text-right py-2 px-3">Completed uses</th>
                  <th className="text-right py-2 px-3">Avg price</th>
                  <th className="text-right py-2 pl-3">Booked value</th>
                </tr>
              </thead>
              <tbody>
                {data.services.map((service) => (
                  <tr key={String(service._id ?? "unknown")} style={{ borderBottom: "1px solid var(--gridline)" }}>
                    <td className="py-2 pr-4 font-medium">{String(service._id ?? "Unknown")}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatNumber(service.uses ?? 0)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatNumber(service.approvedUses ?? 0)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatNumber(service.completedUses ?? 0)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(service.avgPrice ?? 0)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{formatCurrency(service.bookedValue ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent appointments with services">
        {data.recent.length === 0 ? (
          <EmptyState title="No recent service appointments found" />
        ) : (
          <div className="flex flex-col gap-3">
            {data.recent.map((appointment) => (
              <div key={appointment._id} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{appointment.id}</span>
                  <StatusBadge>{String(appointment.status ?? "unknown")}</StatusBadge>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{appointment.details?.company?.name ?? "-"} · {appointment.details?.clinic ?? "-"} · {displayDate(appointment.tracking?.[0]?.date)}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageChrome>
  );
}
