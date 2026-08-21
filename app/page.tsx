import { Suspense } from "react";
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
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-lg p-5"
      style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

async function Overview() {
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
    <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Business overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
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
        <p className="text-xs mt-2 max-w-4xl" style={{ color: "var(--text-secondary)" }}>
          Historical totals use live <code>appointments</code> plus <code>deleted_appointments</code>, deduped by appointment id. The status reconciliation is approved + declined + live pending + deleted pending = total.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Historical appointments" value={formatNumber(totals.totalAppointments)} />
        <StatTile
          label="Approved total"
          value={formatNumber(totals.approved)}
          sub={formatPercent(totals.totalAppointments ? totals.approved / totals.totalAppointments : 0)}
          tone="good"
        />
        <StatTile
          label="Pending (live)"
          value={formatNumber(totals.pendingLive)}
          tone="warning"
        />
        <StatTile
          label="Declined"
          value={formatNumber(totals.declined)}
          sub={formatPercent(totals.totalAppointments ? totals.declined / totals.totalAppointments : 0)}
          tone="critical"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Deleted pending"
          value={formatNumber(totals.abandoned)}
          sub="Pending when soft-deleted"
          tone="warning"
        />
        <StatTile label="Reconciled total" value={formatNumber(reconciledTotal)} sub="Approved + declined + live pending + deleted pending" />
        <StatTile label="Completed paid" value={formatNumber(totals.completed)} sub="Approved and service date passed" tone="good" />
        <StatTile label="Approved future" value={formatNumber(totals.approvedFuture)} sub="Paid, service date upcoming" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Collected from completed" value={formatCurrency(totals.collected)} sub="Approved and service date passed" tone="good" />
        <StatTile label="Revenue lost" value={formatCurrency(totals.lost)} sub="Declined appointments" tone="critical" />
        <StatTile
          label="Past-due pending"
          value={formatNumber(totals.expired)}
          sub="Live pending with past service date"
          tone="warning"
        />
        <StatTile label="Deleted approved" value={formatNumber(totals.deletedApproved)} sub="Approved before soft-delete" />
      </div>

      {latestFullYear && (
        <SectionCard title={`${latestFullYear.year} at a glance${priorYear ? ` (vs. ${priorYear.year})` : ""}`}>
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
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-6 py-16 text-center" style={{ color: "var(--text-muted)" }}>
          Loading analytics…
        </div>
      }
    >
      <Overview />
    </Suspense>
  );
}
