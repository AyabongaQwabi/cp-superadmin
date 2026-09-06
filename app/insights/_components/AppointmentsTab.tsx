import Link from "next/link";
import { cachedDashboardStats } from "@/lib/cached";
import { StatTile } from "@/components/StatTile";
import { DailyRevenueChart } from "@/components/charts/DailyRevenueChart";
import { InsightBarChart } from "@/components/charts/InsightBarChart";
import { StatusBreakdownChart } from "@/components/charts/StatusBreakdownChart";
import { EmptyState, InlineLink, SectionCard } from "@/components/superadmin/PageChrome";
import { formatCurrency, formatNumber } from "@/lib/format";

type PeriodCount = { count: number; countDiferennce: number };

type DashboardStatItem = {
  title: string;
  count: PeriodCount | { count: { id: string; count: number; title: string }[]; countDiferennce: number };
};

type DashboardStatsPayload = {
  stats: {
    today: DashboardStatItem[];
    yesterday: DashboardStatItem[];
    thisMonth: DashboardStatItem[];
    lastMonth: DashboardStatItem[];
  };
  insights: {
    revenueTrend: { date: string; amount: number; appointments: number }[];
    quoteBacklog: { "0-3d": number; "4-7d": number; "8d+": number };
    clinicComparison: { clinic: string; appointments: number; amount: number; employeesCateredTo: number }[];
    topCompanies: { name: string; appointments: number; amount: number }[];
    statusBreakdown: { pending: number; approved: number; declined: number };
  };
};

function metric(items: DashboardStatItem[], title: string): PeriodCount | null {
  const item = items.find((row) => row.title.toLowerCase() === title.toLowerCase());
  if (!item || !item.count || typeof item.count !== "object" || !("count" in item.count)) return null;
  if (Array.isArray((item.count as { count: unknown }).count)) return null;
  return item.count as PeriodCount;
}

function PeriodCards({ label, items }: { label: string; items: DashboardStatItem[] }) {
  const employees = metric(items, "Employees");
  const pending = metric(items, "Pending");
  const upcoming = metric(items, "Upcoming");
  const quotesPending = metric(items, "Quotes Pending");

  return (
    <SectionCard title={label} description="Live production appointments matched by service date.">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Employee slots"
          value={formatNumber(employees?.count ?? 0)}
          sub={
            employees?.countDiferennce
              ? `${employees.countDiferennce >= 0 ? "+" : ""}${formatNumber(employees.countDiferennce)} vs prior`
              : undefined
          }
        />
        <StatTile label="Pending" value={formatNumber(pending?.count ?? 0)} tone="warning" />
        <StatTile label="Upcoming approved" value={formatNumber(upcoming?.count ?? 0)} tone="good" />
        <StatTile label="Quotes pending" value={formatNumber(quotesPending?.count ?? 0)} tone="warning" />
      </div>
    </SectionCard>
  );
}

export async function AppointmentsTab() {
  const data = (await cachedDashboardStats()) as DashboardStatsPayload;
  const { insights } = data;

  const statusData = [
    { name: "Approved", value: insights.statusBreakdown.approved },
    { name: "Pending", value: insights.statusBreakdown.pending },
    { name: "Declined", value: insights.statusBreakdown.declined },
  ];

  const quoteBacklogData = Object.entries(insights.quoteBacklog).map(([name, value]) => ({
    name,
    value,
  }));

  const clinicChartData = insights.clinicComparison.map((row) => ({
    clinic: row.clinic,
    appointments: row.appointments,
  }));

  return (
    <>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Live operational stats from cp-companion dashboard-stats API. Refreshes every ~90 seconds.{" "}
        <InlineLink href="/appointments">Open appointment explorer →</InlineLink>
      </p>

      <PeriodCards label="Today" items={data.stats.today} />
      <PeriodCards label="Yesterday" items={data.stats.yesterday} />
      <PeriodCards label="This month" items={data.stats.thisMonth} />
      <PeriodCards label="Last month" items={data.stats.lastMonth} />

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="30-day revenue trend">
          <DailyRevenueChart data={insights.revenueTrend} />
        </SectionCard>
        <SectionCard title="This month status breakdown">
          <StatusBreakdownChart data={statusData} />
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Clinic comparison (this month)">
          <InsightBarChart
            data={clinicChartData}
            labelKey="clinic"
            valueKey="appointments"
            layout="horizontal"
          />
        </SectionCard>
        <SectionCard title="Quote backlog aging">
          <StatusBreakdownChart data={quoteBacklogData} />
        </SectionCard>
      </div>

      <SectionCard title="Top companies this month">
        {insights.topCompanies.length === 0 ? (
          <EmptyState title="No company activity this month" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Company</th>
                  <th className="text-right py-2 px-3">Appointments</th>
                  <th className="text-right py-2 pl-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {insights.topCompanies.map((row) => (
                  <tr key={row.name} style={{ borderBottom: "1px solid var(--gridline)" }}>
                    <td className="py-2 pr-4 font-medium">{row.name}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatNumber(row.appointments)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        <Link href="/appointments" className="underline">
          View all appointments
        </Link>
      </p>
    </>
  );
}
