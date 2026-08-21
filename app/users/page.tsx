import { getUsersDirectory, displayDate } from "@/lib/superadmin-read-model";
import { formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { EmptyState, PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string }>;
}) {
  const params = await searchParams;
  const search = params.search?.trim();
  const role = params.role?.trim() || "all";
  const data = await getUsersDirectory({ search, role });

  return (
    <PageChrome eyebrow="Access" title="Production Users" subtitle="Directory from the production users collection. Role counts are account roles, not appointment activity counts.">

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Matched users" value={formatNumber(data.total)} />
        <StatTile label="Suspended users" value={formatNumber(data.suspended)} tone={data.suspended ? "warning" : "good"} />
        {data.roleCounts.slice(0, 2).map((row) => (
          <StatTile key={String(row._id ?? "unknown")} label={String(row._id ?? "unknown")} value={formatNumber(row.count ?? 0)} />
        ))}
      </div>

      <SectionCard title="Filters">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs flex-1 min-w-60" style={{ color: "var(--text-muted)" }}>
            Name, email, phone, or user id
            <input name="search" defaultValue={search ?? ""} className="rounded px-2 py-1.5 text-sm" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Role
            <select name="role" defaultValue={role} className="rounded px-2 py-1.5 text-sm" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              <option value="all">All</option>
              <option value="admin">Admin</option>
              <option value="client">Client</option>
            </select>
          </label>
          <button type="submit" className="rounded px-3 py-1.5 text-sm font-medium" style={{ background: "var(--text-primary)", color: "var(--surface-1)" }}>Apply</button>
        </form>
      </SectionCard>

      <SectionCard title="Users">
        {data.rows.length === 0 ? (
          <EmptyState title="No users matched" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">User</th>
                  <th className="text-left py-2 px-3">Role</th>
                  <th className="text-left py-2 px-3">Contact</th>
                  <th className="text-right py-2 px-3">Companies</th>
                  <th className="text-right py-2 px-3">Appointments</th>
                  <th className="text-right py-2 pl-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((user) => (
                  <tr key={user._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                    <td className="py-2 pr-4">
                      <div className="font-medium">{[user.details?.name, user.details?.surname].filter(Boolean).join(" ") || user.id}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{user.id}</div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-2">
                        <StatusBadge>{String(user.role ?? "unknown")}</StatusBadge>
                        {user.isSuspended && <StatusBadge tone="warning">suspended</StatusBadge>}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-xs" style={{ color: "var(--text-secondary)" }}>{user.details?.email ?? "-"}<br />{user.details?.cell ?? "-"}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatNumber(user.companiesManaging?.length ?? 0)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatNumber(user.appointmentsManaging?.length ?? 0)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>{displayDate(user.tracking?.[0]?.date)}</td>
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
