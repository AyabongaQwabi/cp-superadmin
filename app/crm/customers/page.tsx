import { companionApi } from "@/lib/companion-api";
import { formatNumber } from "@/lib/format";
import { PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";
import { StatTile } from "@/components/StatTile";

export const dynamic = "force-dynamic";

type Customer = {
  id: string;
  name: string;
  email: string;
  role: string;
  contactNumber?: string;
  companies?: { id: string; name: string }[];
};

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const data = await companionApi<{ total: number; users: Customer[] }>(
    `/api/admin/admin-companion/crm/audience?role=client&limit=100&q=${encodeURIComponent(q)}`,
  );

  return (
    <PageChrome eyebrow="CRM" title="Customers" subtitle="Search client users and the company accounts they are connected to.">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Matching customers" value={formatNumber(data.total)} tone="good" />
        <StatTile label="Displayed" value={formatNumber(data.users.length)} />
      </div>

      <SectionCard title="Search customers">
        <form method="get" className="crm-form-row">
          <input name="q" defaultValue={q} placeholder="Name, email, or id" />
          <button type="submit">Search</button>
        </form>
      </SectionCard>

      <SectionCard title="Customer list">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left py-2 pr-4">Customer</th>
                <th className="text-left py-2 px-3">Role</th>
                <th className="text-left py-2 px-3">Contact</th>
                <th className="text-left py-2 pl-3">Companies</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                  <td className="py-2 pr-4">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{user.email}</div>
                  </td>
                  <td className="py-2 px-3"><StatusBadge>{user.role}</StatusBadge></td>
                  <td className="py-2 px-3">{user.contactNumber || "-"}</td>
                  <td className="py-2 pl-3" style={{ color: "var(--text-secondary)" }}>
                    {(user.companies || []).slice(0, 3).map((company) => company.name).join(", ") || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageChrome>
  );
}
