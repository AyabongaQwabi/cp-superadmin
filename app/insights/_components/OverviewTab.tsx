import {
  cachedClinicSummary,
  cachedMonthlySummary,
  cachedOverviewTotals,
  cachedYearlySummary,
} from "@/lib/cached";
import { StatTile } from "@/components/StatTile";
import { YearlyTrendChart } from "@/components/charts/YearlyTrendChart";
import { RevenueTrendChart } from "@/components/charts/RevenueTrendChart";
import { MonthlyVolumeChart } from "@/components/charts/MonthlyVolumeChart";
import { SegmentTable, type SegmentRow } from "@/components/SegmentTable";
import { MethodologyNote } from "@/components/MethodologyNote";
import { SectionCard } from "@/components/superadmin/PageChrome";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export async function OverviewTab() {
  const currentYear = new Date().getFullYear();
  const monthlySinceYear = currentYear - 2;

  const [totals, yearly, monthly, clinics] = await Promise.all([
    cachedOverviewTotals(),
    cachedYearlySummary(),
    cachedMonthlySummary(monthlySinceYear),
    cachedClinicSummary(),
  ]);

  const latestFullYear = yearly.find((y) => y.year === currentYear) ?? yearly.at(-1);
  const priorYear = latestFullYear
    ? yearly.find((y) => y.year === latestFullYear.year - 1)
    : undefined;
  const collectedDelta =
    latestFullYear && priorYear && priorYear.collected > 0
      ? (latestFullYear.collected - priorYear.collected) / priorYear.collected
      : null;

  const clinicRows: SegmentRow[] = clinics.map((c) => ({
    key: c.clinic,
    name: c.clinic,
    totalAppointments: c.totalAppointments,
    approved: c.approved,
    declined: c.declined,
    pendingLive: c.pendingLive,
    collected: c.collected,
    outstanding: c.outstanding,
    lost: c.lost,
    completed: c.completed,
  }));
  const reconciledTotal = totals.approved + totals.declined + totals.pendingLive + totals.abandoned;

  return (
    <>
      <p className="text-xs max-w-4xl" style={{ color: "var(--text-secondary)" }}>
        {totals.earliestDate && totals.latestDate
          ? `Coverage: ${new Date(totals.earliestDate).toLocaleDateString("en-ZA", {
              year: "numeric",
              month: "short",
            })} – ${new Date(totals.latestDate).toLocaleDateString("en-ZA", {
              year: "numeric",
              month: "short",
            })}`
          : "Coverage: unknown"}
        {totals.duplicateIdCount > 0 && (
          <span style={{ color: "var(--status-warning)" }}>
            {" "}
            · {totals.duplicateIdCount} duplicate appointment id(s) detected
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Historical appointments" value={formatNumber(totals.totalAppointments)} />
        <StatTile
          label="Approved total"
          value={formatNumber(totals.approved)}
          sub={formatPercent(totals.totalAppointments ? totals.approved / totals.totalAppointments : 0)}
          tone="good"
        />
        <StatTile label="Pending (live)" value={formatNumber(totals.pendingLive)} tone="warning" />
        <StatTile
          label="Declined"
          value={formatNumber(totals.declined)}
          sub={formatPercent(totals.totalAppointments ? totals.declined / totals.totalAppointments : 0)}
          tone="critical"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Collected from completed" value={formatCurrency(totals.collected)} tone="good" />
        <StatTile label="Revenue lost" value={formatCurrency(totals.lost)} tone="critical" />
        <StatTile label="Reconciled total" value={formatNumber(reconciledTotal)} />
        <StatTile label="Completed paid" value={formatNumber(totals.completed)} tone="good" />
      </div>

      {latestFullYear && (
        <SectionCard
          title={`${latestFullYear.year} at a glance${priorYear ? ` (vs. ${priorYear.year})` : ""}`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Booked" value={formatNumber(latestFullYear.created)} />
            <StatTile label="Approved total" value={formatNumber(latestFullYear.approved)} tone="good" />
            <StatTile label="Collected from completed" value={formatCurrency(latestFullYear.collected)} tone="good" />
            <StatTile
              label="Collected vs. prior year"
              value={collectedDelta === null ? "—" : formatPercent(collectedDelta)}
              tone={collectedDelta === null ? undefined : collectedDelta >= 0 ? "good" : "critical"}
            />
          </div>
        </SectionCard>
      )}

      <SectionCard title="Appointment volume by year (created → outcome)">
        <YearlyTrendChart data={yearly} />
      </SectionCard>

      <SectionCard title="Revenue by year">
        <RevenueTrendChart data={yearly} />
      </SectionCard>

      <SectionCard title={`Monthly volume (${monthlySinceYear}–${currentYear})`}>
        <MonthlyVolumeChart data={monthly} />
      </SectionCard>

      <SectionCard title="By clinic">
        <SegmentTable rows={clinicRows} nameLabel="Clinic" emptyLabel="No clinic data found." />
      </SectionCard>

      <MethodologyNote />
    </>
  );
}
