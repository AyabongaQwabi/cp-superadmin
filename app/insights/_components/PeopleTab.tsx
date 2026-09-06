import { cachedEmployeeSummary, cachedPeopleDirectory } from "@/lib/cached";
import { StatTile } from "@/components/StatTile";
import { EmptyState, InlineLink, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";
import { formatCurrency, formatNumber } from "@/lib/format";

export async function PeopleTab() {
  const [directory, employeeSummary] = await Promise.all([
    cachedPeopleDirectory(),
    cachedEmployeeSummary(),
  ]);

  const usingDirectory = directory.source === "directory";
  const unverified = directory.employees.filter((row) => row.matchConfidence !== "verified").length;
  const topEmployees = [...directory.employees]
    .sort((a, b) => (b.stats?.totalAppointments ?? 0) - (a.stats?.totalAppointments ?? 0))
    .slice(0, 15);

  const occupationCounts = new Map<string, number>();
  for (const employee of directory.employees) {
    for (const occupation of employee.occupations ?? []) {
      const key = occupation.trim();
      if (!key) continue;
      occupationCounts.set(key, (occupationCounts.get(key) ?? 0) + 1);
    }
  }
  const topOccupations = [...occupationCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const totalRevenue = directory.employees.reduce(
    (sum, row) => sum + (row.stats?.totalRevenue ?? 0),
    0,
  );
  const totalAppointments = directory.employees.reduce(
    (sum, row) => sum + (row.stats?.totalAppointments ?? 0),
    0,
  );

  return (
    <>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Employee directory stats and appointment-derived identity reconciliation.{" "}
        <InlineLink href="/people">Open people directory →</InlineLink>
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label={usingDirectory ? "Directory rows" : "Managers shown"}
          value={formatNumber(directory.total)}
        />
        <StatTile
          label={usingDirectory ? "Unverified matches" : "From appointments"}
          value={formatNumber(usingDirectory ? unverified : directory.employees.length)}
          tone={usingDirectory && unverified ? "warning" : "good"}
        />
        <StatTile label="Total appointments" value={formatNumber(totalAppointments)} />
        <StatTile label="Total revenue" value={formatCurrency(totalRevenue)} tone="good" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Employee segments" value={formatNumber(employeeSummary.length)} />
        <StatTile label="Quality flags" value={formatNumber(directory.flags.length)} tone={directory.flags.length ? "warning" : "good"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Top employees by appointments">
          {topEmployees.length === 0 ? (
            <EmptyState title="No employee data found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="text-left py-2 pr-4">Employee</th>
                    <th className="text-left py-2 px-3">Match</th>
                    <th className="text-right py-2 px-3">Appointments</th>
                    <th className="text-right py-2 pl-3">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topEmployees.map((employee) => (
                    <tr key={employee._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                      <td className="py-2 pr-4">
                        <div className="font-medium">{employee.displayName}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {employee.occupations?.slice(0, 2).join(", ") || "—"}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <StatusBadge tone={employee.matchConfidence === "verified" ? "good" : "warning"}>
                          {usingDirectory ? employee.matchConfidence : "activity"}
                        </StatusBadge>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {formatNumber(employee.stats?.totalAppointments ?? 0)}
                      </td>
                      <td className="py-2 pl-3 text-right tabular-nums">
                        {formatCurrency(employee.stats?.totalRevenue ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Top occupations in directory sample">
          {topOccupations.length === 0 ? (
            <EmptyState title="No occupations recorded" />
          ) : (
            <div className="flex flex-col gap-2">
              {topOccupations.map(([occupation, count]) => (
                <div key={occupation} className="flex justify-between text-sm py-1">
                  <span>{occupation}</span>
                  <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
