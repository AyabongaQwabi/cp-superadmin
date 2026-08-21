import { notFound } from "next/navigation";
import { getCompany360, displayDate } from "@/lib/superadmin-read-model";
import { formatCurrency, formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { EmptyState, InlineLink, PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCompany360(decodeURIComponent(id));

  if (!data.company && !data.profile) notFound();

  const name = data.company?.details?.name ?? data.profile?.companyName ?? id;

  return (
    <PageChrome
      eyebrow="Company 360"
      title={name}
      subtitle={`Company id ${id}. Production company data, derived profile, recent appointments, invoices, flags, and audit events.`}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Historical spend" value={formatCurrency(data.profile?.totalHistoricalSpend ?? 0)} tone="good" />
        <StatTile label="Current employees" value={formatNumber(data.profile?.currentEmployeeCount ?? 0)} />
        <StatTile label="Recent appointments" value={formatNumber(data.recentAppointments.length)} />
        <StatTile label="Open flags" value={formatNumber(data.flags.length)} tone={data.flags.length ? "warning" : "good"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Profile">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt style={{ color: "var(--text-muted)" }}>Registration</dt>
            <dd>{data.company?.details?.registrationName ?? "-"}</dd>
            <dt style={{ color: "var(--text-muted)" }}>VAT</dt>
            <dd>{data.company?.details?.vat ?? "-"}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Dominant clinic</dt>
            <dd>{data.profile?.dominantClinic ?? "-"}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Dominant service</dt>
            <dd>{data.profile?.dominantServiceType ?? "-"}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Avg booking interval</dt>
            <dd>{data.profile?.avgBookingIntervalDays ? `${data.profile.avgBookingIntervalDays} days` : "-"}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Last active</dt>
            <dd>{displayDate(data.profile?.lastActiveAt)}</dd>
          </dl>
        </SectionCard>

        <SectionCard title="Booking pattern">
          {data.pattern ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt style={{ color: "var(--text-muted)" }}>Avg employees per booking</dt>
              <dd>{data.pattern.avgEmployeesPerBooking ?? "-"}</dd>
              <dt style={{ color: "var(--text-muted)" }}>X-ray attach rate</dt>
              <dd>{typeof data.pattern.xrayAttachRate === "number" ? `${(data.pattern.xrayAttachRate * 100).toFixed(1)}%` : "-"}</dd>
              <dt style={{ color: "var(--text-muted)" }}>Last synced</dt>
              <dd>{displayDate(data.pattern.lastSyncedAt)}</dd>
            </dl>
          ) : (
            <EmptyState title="No booking pattern found" />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent appointments">
        {data.recentAppointments.length === 0 ? (
          <EmptyState title="No recent appointments found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Appointment</th>
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Clinic</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 pl-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentAppointments.map((appointment) => (
                  <tr key={appointment._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                    <td className="py-2 pr-4">
                      <InlineLink href={`/audit-events/appointment/${encodeURIComponent(appointment.id ?? "")}`}>{appointment.id}</InlineLink>
                    </td>
                    <td className="py-2 px-3">{appointment.details?.date ?? "-"}</td>
                    <td className="py-2 px-3">{appointment.details?.clinic ?? "-"}</td>
                    <td className="py-2 px-3"><StatusBadge>{appointment.status ?? "-"}</StatusBadge></td>
                    <td className="py-2 pl-3 text-right tabular-nums">{formatCurrency(appointment.payment?.amount ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Flags">
          {data.flags.length === 0 ? (
            <EmptyState title="No flags found for this company" />
          ) : (
            <div className="flex flex-col gap-3">
              {data.flags.map((flag) => (
                <div key={flag._id} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                  <StatusBadge tone="warning">{flag.flagType ?? flag.appointmentId ?? "flag"}</StatusBadge>
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                    {flag.detail ?? `Stored ${flag.storedAmount ?? "-"} / recomputed ${flag.recomputedAmount ?? "-"}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent audit events">
          {data.auditEvents.length === 0 ? (
            <EmptyState title="No audit events found" />
          ) : (
            <div className="flex flex-col gap-3">
              {data.auditEvents.map((event) => (
                <div key={event._id} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <InlineLink href={`/audit-events/${event.entityType}/${encodeURIComponent(event.entityId)}`}>{event.action}</InlineLink>
                    <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{displayDate(event.createdAt)}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Actor: {event.actorName ?? event.actorId ?? "-"}
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
