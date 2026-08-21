import { getDataQualityDashboard, displayDate } from "@/lib/superadmin-read-model";
import { formatCurrency, formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { EmptyState, PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

interface AppointmentIssueInput {
  [key: string]: unknown;
  status?: string | null;
  payment?: { amount?: number | null };
  details?: { company?: { id?: string | null }; employees?: unknown[] };
  usersWhoCanManage?: unknown[];
}

function issueLabels(appointment: AppointmentIssueInput) {
  const issues: string[] = [];
  if (!appointment.status) issues.push("missing status");
  if (!appointment.details?.company?.id) issues.push("missing company id");
  if (!appointment.usersWhoCanManage?.length) issues.push("missing manager");
  if (appointment.status === "approved" && (appointment.payment?.amount ?? 0) <= 0) issues.push("approved with zero amount");
  if (!appointment.details?.employees?.length) issues.push("no employees");
  return issues;
}

export default async function Page() {
  const data = await getDataQualityDashboard();
  const issueRows = [
    ["Missing appointment status", data.counts.missingStatus, "critical"],
    ["Missing company id", data.counts.missingCompanyId, "critical"],
    ["Missing managers", data.counts.missingManagers, "warning"],
    ["Approved with zero amount", data.counts.zeroAmountApproved, "critical"],
    ["Appointments without employees", data.counts.appointmentWithoutEmployees, "warning"],
    ["Users missing email", data.counts.usersMissingEmail, "warning"],
    ["Suspended users", data.counts.suspendedUsers, "warning"],
    ["Decommissioned companies", data.counts.decommissionedCompanies, undefined],
    ["Approved deleted appointments", data.counts.approvedDeleted, "warning"],
  ] satisfies Array<readonly [string, number, "good" | "warning" | "critical" | undefined]>;

  return (
    <PageChrome eyebrow="Integrity" title="Data Quality Workbench" subtitle="Production checks for missing identifiers, ambiguous ownership, zero-value approved bookings, and unusual lifecycle states. Sample rows include the exact issue that made the appointment appear here.">

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {issueRows.slice(0, 5).map(([label, value, tone]) => (
          <StatTile key={label} label={label} value={formatNumber(value)} tone={value ? tone : "good"} />
        ))}
      </div>

      <SectionCard title="Issue counts">
        <div className="grid sm:grid-cols-2 gap-3">
          {issueRows.map(([label, value, tone]) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
              <span className="text-sm">{label}</span>
              <StatusBadge tone={value ? tone : "good"}>{formatNumber(value)}</StatusBadge>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Sample appointment issues">
        {data.samples.length === 0 ? (
          <EmptyState title="No sampled appointment issues found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Appointment</th>
                  <th className="text-left py-2 px-3">Issue</th>
                  <th className="text-left py-2 px-3">Company</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Amount</th>
                  <th className="text-right py-2 pl-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.samples.map((appointment) => (
                  <tr key={appointment._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                    <td className="py-2 pr-4 font-medium">{appointment.id ?? appointment._id}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {issueLabels(appointment).map((issue) => (
                          <StatusBadge key={issue} tone={issue.includes("zero") || issue.includes("missing status") ? "critical" : "warning"}>{issue}</StatusBadge>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-3">{appointment.details?.company?.name ?? "-"}</td>
                    <td className="py-2 px-3"><StatusBadge tone={appointment.status ? "neutral" : "critical"}>{String(appointment.status ?? "missing")}</StatusBadge></td>
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
