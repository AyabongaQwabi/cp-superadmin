import { getPeopleDirectory, displayDate } from "@/lib/superadmin-read-model";
import { formatCurrency, formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { EmptyState, PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const params = await searchParams;
  const search = params.search?.trim();
  const data = await getPeopleDirectory(search);
  const usingDirectory = data.source === "directory";
  const unverified = data.employees.filter((employee) => employee.matchConfidence !== "verified").length;
  const invalidIds = data.employees.filter((employee) => employee.idNumberValid === false).length;

  return (
    <PageChrome
      eyebrow="Identity"
      title="People & Identity Reconciliation"
      subtitle="Identity reconciliation view. When the Companion employee directory is empty, this page falls back to appointment managers from usersWhoCanManage on appointments; that is an activity count, not the production admin-account count."
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label={usingDirectory ? "Directory rows" : "Managers shown"} value={formatNumber(data.total)} />
        <StatTile label={usingDirectory ? "Shown unverified" : "Shown from appointments"} value={formatNumber(usingDirectory ? unverified : data.employees.length)} tone={usingDirectory && unverified ? "warning" : "good"} />
        <StatTile label={usingDirectory ? "Shown invalid IDs" : "Pending review"} value={formatNumber(usingDirectory ? invalidIds : 0)} tone={usingDirectory && invalidIds ? "critical" : "good"} />
        <StatTile label="Quality flags" value={formatNumber(data.flags.length)} tone={data.flags.length ? "warning" : "good"} />
      </div>

      <SectionCard title="Search">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs flex-1 min-w-60" style={{ color: "var(--text-muted)" }}>
            Name or ID number
            <input
              name="search"
              defaultValue={search ?? ""}
              className="rounded px-2 py-1.5 text-sm"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </label>
          <button type="submit" className="rounded px-3 py-1.5 text-sm font-medium" style={{ background: "var(--text-primary)", color: "var(--surface-1)" }}>
            Search
          </button>
        </form>
      </SectionCard>

      {!usingDirectory && (
        <SectionCard title="Identity directory not populated yet">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            The Companion identity backfill collections are empty in <code>cp_companion</code>, so this page is showing appointment managers from production appointment history instead.
          </p>
        </SectionCard>
      )}

      <SectionCard title={usingDirectory ? "Employee directory" : "Appointment managers"}>
        {data.employees.length === 0 ? (
          <EmptyState title={search ? "No people matched that search" : "No people found"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Employee</th>
                  <th className="text-left py-2 px-3">Identity</th>
                  <th className="text-left py-2 px-3">Seen</th>
                  <th className="text-right py-2 px-3">Appointments</th>
                  <th className="text-right py-2 pl-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((employee) => (
                  <tr key={employee._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                    <td className="py-2 pr-4">
                      <div className="font-medium">{employee.displayName}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{employee.occupations?.slice(0, 2).join(", ") || "-"}</div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={employee.matchConfidence === "verified" ? "good" : "warning"}>
                          {usingDirectory ? employee.matchConfidence : "activity"}
                        </StatusBadge>
                        {employee.idNumberValid === false && <StatusBadge tone="critical">invalid ID</StatusBadge>}
                      </div>
                      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{usingDirectory ? employee.idNumber ?? "No ID number" : `User id ${employee.idNumber ?? "-"}`}</div>
                    </td>
                    <td className="py-2 px-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {displayDate(employee.firstSeenAt)} to {displayDate(employee.lastSeenAt)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatNumber(employee.stats?.totalAppointments ?? 0)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{formatCurrency(employee.stats?.totalRevenue ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent data-quality flags">
        {data.flags.length === 0 ? (
          <EmptyState title="No data-quality flags found" />
        ) : (
          <div className="flex flex-col gap-3">
            {data.flags.map((flag) => (
              <div key={flag._id} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge tone="warning">{flag.flagType}</StatusBadge>
                  <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{displayDate(flag.lastSyncedAt)}</span>
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{flag.detail}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageChrome>
  );
}
