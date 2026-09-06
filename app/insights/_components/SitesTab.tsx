import { cachedSitesPlatformInsights } from "@/lib/cached";
import { displayDate } from "@/lib/superadmin-read-model";
import { StatTile } from "@/components/StatTile";
import { InsightBarChart } from "@/components/charts/InsightBarChart";
import { StatusBreakdownChart } from "@/components/charts/StatusBreakdownChart";
import { EmptyState, InlineLink, SectionCard } from "@/components/superadmin/PageChrome";
import { formatCurrency, formatNumber } from "@/lib/format";

type SitesInsightsPayload = {
  summary: {
    totalSites: number;
    activeSites: number;
    dormantSites: number;
    totalDirectoryAppointments: number;
    appointmentsWithSites: number;
    paidAppointments: number;
    unpaidAppointments: number;
    totalRevenue: number;
    uniqueEmployees: number;
    linkedCompanies: number;
  };
  directoryStatusBreakdown: { status: string; count: number }[];
  siteTypeBreakdown: { siteType: string; count: number }[];
  monthlyTrend: { month: string; appointments: number; revenue: number }[];
  appointmentStatusBreakdown: { status: string; count: number }[];
  topSites: {
    siteId: string;
    name: string;
    status: string;
    appointmentCount: number;
    companyCount: number;
    revenue: number;
    lastUsedAt: string | null;
  }[];
  topCompanies: { companyId: string; companyName: string; appointmentCount: number; revenue: number }[];
  topOccupations: { occupation: string; count: number }[];
  recentlyActiveSites: {
    siteId: string;
    name: string;
    status: string;
    appointmentCount: number;
    lastUsedAt: string | null;
  }[];
};

export async function SitesTab() {
  const data = (await cachedSitesPlatformInsights()) as SitesInsightsPayload;
  const { summary } = data;

  const statusData = data.directoryStatusBreakdown.map((row) => ({
    name: row.status,
    value: row.count,
  }));

  const monthlyChart = data.monthlyTrend.map((row) => ({
    month: row.month,
    appointments: row.appointments,
  }));

  const topSitesChart = data.topSites.slice(0, 10).map((row) => ({
    site: row.name.length > 24 ? `${row.name.slice(0, 24)}…` : row.name,
    appointments: row.appointmentCount,
  }));

  return (
    <>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Platform-wide client worksite analytics from cp-companion site directory and appointment cross-reference.
        Per-site drill-down remains in cp-redesign-admin.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total sites" value={formatNumber(summary.totalSites)} />
        <StatTile label="Active sites" value={formatNumber(summary.activeSites)} tone="good" />
        <StatTile label="Dormant sites" value={formatNumber(summary.dormantSites)} tone="warning" />
        <StatTile label="Site-linked appointments" value={formatNumber(summary.appointmentsWithSites)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Attributed revenue" value={formatCurrency(summary.totalRevenue)} tone="good" />
        <StatTile label="Linked companies" value={formatNumber(summary.linkedCompanies)} />
        <StatTile label="Unique employees" value={formatNumber(summary.uniqueEmployees)} />
        <StatTile label="Paid appointments" value={formatNumber(summary.paidAppointments)} tone="good" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Monthly site appointments">
          <InsightBarChart data={monthlyChart} labelKey="month" valueKey="appointments" />
        </SectionCard>
        <SectionCard title="Directory status">
          <StatusBreakdownChart data={statusData} />
        </SectionCard>
      </div>

      <SectionCard title="Top 10 sites by appointments">
        <InsightBarChart
          data={topSitesChart}
          labelKey="site"
          valueKey="appointments"
          layout="horizontal"
        />
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Top sites">
          {data.topSites.length === 0 ? (
            <EmptyState title="No site activity found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="text-left py-2 pr-4">Site</th>
                    <th className="text-right py-2 px-3">Appointments</th>
                    <th className="text-right py-2 px-3">Companies</th>
                    <th className="text-right py-2 pl-3">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSites.slice(0, 15).map((row) => (
                    <tr key={row.siteId} style={{ borderBottom: "1px solid var(--gridline)" }}>
                      <td className="py-2 pr-4">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {row.status} · last used {displayDate(row.lastUsedAt)}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatNumber(row.appointmentCount)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatNumber(row.companyCount)}</td>
                      <td className="py-2 pl-3 text-right tabular-nums">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Top companies by site bookings">
          {data.topCompanies.length === 0 ? (
            <EmptyState title="No company site bookings" />
          ) : (
            <div className="flex flex-col gap-2">
              {data.topCompanies.slice(0, 12).map((row) => (
                <div
                  key={row.companyId}
                  className="flex justify-between gap-3 text-sm py-2"
                  style={{ borderBottom: "1px solid var(--gridline)" }}
                >
                  {row.companyId ? (
                    <InlineLink href={`/companies/${encodeURIComponent(row.companyId)}`}>
                      {row.companyName}
                    </InlineLink>
                  ) : (
                    <span>{row.companyName}</span>
                  )}
                  <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {formatNumber(row.appointmentCount)} · {formatCurrency(row.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Top occupations at sites">
          {data.topOccupations.length === 0 ? (
            <EmptyState title="No occupation data" />
          ) : (
            <div className="flex flex-col gap-2">
              {data.topOccupations.slice(0, 12).map((row) => (
                <div key={row.occupation} className="flex justify-between text-sm py-1">
                  <span>{row.occupation}</span>
                  <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {formatNumber(row.count)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recently active sites">
          {data.recentlyActiveSites.length === 0 ? (
            <EmptyState title="No recently active sites" />
          ) : (
            <div className="flex flex-col gap-2">
              {data.recentlyActiveSites.slice(0, 12).map((row) => (
                <div key={row.siteId} className="flex justify-between text-sm py-1">
                  <span>{row.name}</span>
                  <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {formatNumber(row.appointmentCount)} · {displayDate(row.lastUsedAt)}
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
