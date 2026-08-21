import { Suspense } from "react";
import { cachedCompanySummary } from "@/lib/cached";
import { SegmentTable, type SegmentRow } from "@/components/SegmentTable";
import { StatTile } from "@/components/StatTile";
import { formatCurrency, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

async function CompaniesList() {
  const companies = await cachedCompanySummary();

  const rows: SegmentRow[] = companies.map((c) => ({
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

  const totalCollected = companies.reduce((a, c) => a + c.collected, 0);
  const totalAppointments = companies.reduce((a, c) => a + c.totalAppointments, 0);
  const totalAbandoned = companies.reduce((a, c) => a + c.abandoned, 0);
  const totalCompleted = companies.reduce((a, c) => a + c.completed, 0);
  const mostReliable = [...companies]
    .filter((c) => c.totalAppointments >= 5)
    .sort((a, b) => a.declineRate - b.declineRate)[0];
  const highestCancellation = [...companies]
    .filter((c) => c.totalAppointments >= 5)
    .sort((a, b) => b.declineRate - a.declineRate)[0];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Companies
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {formatNumber(companies.length)} companies with deduped historical appointment activity and a company name.
        </p>
        <p className="text-xs mt-2 max-w-4xl" style={{ color: "var(--text-secondary)" }}>
          This is not the master company registry count. It only includes companies that appear on live or deleted appointments after deduping by appointment id. Collected means approved appointments whose service date has passed.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Companies with bookings" value={formatNumber(companies.length)} />
        <StatTile label="Attributed appointments" value={formatNumber(totalAppointments)} sub="Only rows with company name" />
        <StatTile label="Completed paid" value={formatNumber(totalCompleted)} sub="Approved and service date passed" tone="good" />
        <StatTile label="Deleted pending" value={formatNumber(totalAbandoned)} sub="Pending when soft-deleted" tone="warning" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Collected from completed" value={formatCurrency(totalCollected)} tone="good" />
        <StatTile
          label="Most reliable payer"
          value={mostReliable?.companyName ?? "—"}
          sub={mostReliable ? `${formatNumber(mostReliable.declined)} declined of ${formatNumber(mostReliable.totalAppointments)}` : undefined}
        />
      </div>

      {highestCancellation && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Highest decline rate (min. 5 appointments): <strong>{highestCancellation.companyName}</strong> at{" "}
          {(highestCancellation.declineRate * 100).toFixed(0)}%
        </p>
      )}

      <section
        className="rounded-lg p-5"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          All companies, ranked by revenue collected
        </h2>
        <SegmentTable rows={rows} nameLabel="Company" emptyLabel="No company data found." />
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-6 py-16 text-center" style={{ color: "var(--text-muted)" }}>
          Loading companies…
        </div>
      }
    >
      <CompaniesList />
    </Suspense>
  );
}
