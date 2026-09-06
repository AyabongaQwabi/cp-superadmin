import { cachedCompanySummary, cachedPlatformSignals } from "@/lib/cached";
import { displayDate } from "@/lib/superadmin-read-model";
import { StatTile } from "@/components/StatTile";
import { SegmentTable, type SegmentRow } from "@/components/SegmentTable";
import { EmptyState, InlineLink, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

type PlatformSignalsPayload = {
  dormancy: {
    _id: string;
    companyId: string;
    companyName?: string;
    daysSinceLastBooking: number;
    lastBookingAt?: string;
  }[];
  newLeads: {
    _id: string;
    companyName: string;
    firstSeenAt: string;
    appointmentCount?: number;
  }[];
};

export async function CompaniesTab() {
  const [companies, signals] = await Promise.all([
    cachedCompanySummary(),
    cachedPlatformSignals() as Promise<PlatformSignalsPayload>,
  ]);

  const rows: SegmentRow[] = companies.slice(0, 25).map((c) => ({
    key: c.companyId ?? c.companyName,
    name: c.companyName,
    href: c.companyId ? `/companies/${encodeURIComponent(c.companyId)}` : undefined,
    totalAppointments: c.totalAppointments,
    approved: c.approved,
    declined: c.declined,
    pendingLive: c.pendingLive,
    collected: c.collected,
    outstanding: c.outstanding,
    lost: c.lost,
    completed: c.completed,
  }));

  const totalCollected = companies.reduce((sum, row) => sum + row.collected, 0);
  const totalAppointments = companies.reduce((sum, row) => sum + row.totalAppointments, 0);

  return (
    <>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Historical company segments from Mongo plus live platform signals for dormancy and new leads.{" "}
        <InlineLink href="/companies">Open companies directory →</InlineLink>
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Companies with bookings" value={formatNumber(companies.length)} />
        <StatTile label="Attributed appointments" value={formatNumber(totalAppointments)} />
        <StatTile label="Collected from completed" value={formatCurrency(totalCollected)} tone="good" />
        <StatTile
          label="Dormant companies"
          value={formatNumber(signals.dormancy.length)}
          tone={signals.dormancy.length ? "warning" : "good"}
        />
      </div>

      <SectionCard title="Top companies by volume" description="Top 25 by historical appointment count.">
        <SegmentTable rows={rows} nameLabel="Company" emptyLabel="No company data found." />
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Dormant companies" description="No recent booking activity flagged by sync pipeline.">
          {signals.dormancy.length === 0 ? (
            <EmptyState title="No dormant companies flagged" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="text-left py-2 pr-4">Company</th>
                    <th className="text-right py-2 px-3">Days idle</th>
                    <th className="text-right py-2 pl-3">Last booking</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.dormancy.slice(0, 15).map((row) => (
                    <tr key={row._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                      <td className="py-2 pr-4">
                        {row.companyId ? (
                          <InlineLink href={`/companies/${encodeURIComponent(row.companyId)}`}>
                            {row.companyName ?? row.companyId}
                          </InlineLink>
                        ) : (
                          row.companyName ?? row.companyId
                        )}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        <StatusBadge tone="warning">{formatNumber(row.daysSinceLastBooking)}</StatusBadge>
                      </td>
                      <td className="py-2 pl-3 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>
                        {displayDate(row.lastBookingAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="New leads not on Companion" description="Companies seen in production but not yet on Companion.">
          {signals.newLeads.length === 0 ? (
            <EmptyState title="No new off-platform leads" />
          ) : (
            <div className="flex flex-col gap-2">
              {signals.newLeads.slice(0, 15).map((lead) => (
                <div
                  key={lead._id}
                  className="flex justify-between gap-3 text-sm py-2"
                  style={{ borderBottom: "1px solid var(--gridline)" }}
                >
                  <span className="font-medium">{lead.companyName}</span>
                  <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {formatNumber(lead.appointmentCount ?? 0)} appts · {displayDate(lead.firstSeenAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {companies.length > 0 && (
        <SectionCard title="Reliability snapshot">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[...companies]
              .filter((row) => row.totalAppointments >= 5)
              .sort((a, b) => a.declineRate - b.declineRate)
              .slice(0, 1)
              .map((row) => (
                <div key={`best-${row.companyId}`} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Lowest decline rate (5+ bookings)</p>
                  <p className="font-medium mt-1">{row.companyName}</p>
                  <p className="text-xs mt-1">{formatPercent(row.declineRate)} decline</p>
                </div>
              ))}
            {[...companies]
              .filter((row) => row.totalAppointments >= 5)
              .sort((a, b) => b.declineRate - a.declineRate)
              .slice(0, 1)
              .map((row) => (
                <div key={`worst-${row.companyId}`} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Highest decline rate (5+ bookings)</p>
                  <p className="font-medium mt-1">{row.companyName}</p>
                  <p className="text-xs mt-1">{formatPercent(row.declineRate)} decline</p>
                </div>
              ))}
          </div>
        </SectionCard>
      )}
    </>
  );
}
