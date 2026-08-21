import { unstable_cache } from "next/cache";
import {
  getClinicSummary,
  getCompanySummary,
  getDistinctClinics,
  getEmployeeSummary,
  getMonthlySummary,
  getOverviewTotals,
  getYearlySummary,
  type SegmentFilters,
} from "./aggregations";
import {
  getEntityTimeline,
  queryAuditEvents,
  type AuditEntityType,
  type AuditEventFilters,
} from "./audit";

// Historical data changes slowly (payment status is updated by admins, but
// not second-to-second) — cache aggregate results for an hour rather than
// recomputing six years of history on every page load.
const REVALIDATE_SECONDS = 3600;

export const cachedOverviewTotals = unstable_cache(
  getOverviewTotals,
  ["overview-totals"],
  { revalidate: REVALIDATE_SECONDS }
);

export const cachedYearlySummary = unstable_cache(
  getYearlySummary,
  ["yearly-summary"],
  { revalidate: REVALIDATE_SECONDS }
);

export const cachedMonthlySummary = unstable_cache(
  getMonthlySummary,
  ["monthly-summary"],
  { revalidate: REVALIDATE_SECONDS }
);

export const cachedDistinctClinics = unstable_cache(
  getDistinctClinics,
  ["distinct-clinics"],
  { revalidate: REVALIDATE_SECONDS }
);

function filterKey(filters: SegmentFilters): string {
  return JSON.stringify(filters ?? {});
}

export async function cachedCompanySummary(filters: SegmentFilters = {}) {
  return unstable_cache(
    () => getCompanySummary(filters),
    ["company-summary", filterKey(filters)],
    { revalidate: REVALIDATE_SECONDS }
  )();
}

export async function cachedClinicSummary(filters: SegmentFilters = {}) {
  return unstable_cache(
    () => getClinicSummary(filters),
    ["clinic-summary", filterKey(filters)],
    { revalidate: REVALIDATE_SECONDS }
  )();
}

export async function cachedEmployeeSummary(filters: SegmentFilters = {}) {
  return unstable_cache(
    () => getEmployeeSummary(filters),
    ["employee-summary", filterKey(filters)],
    { revalidate: REVALIDATE_SECONDS }
  )();
}

// Audit events are operational/security-relevant records (who did what,
// when) rather than slow-changing historical aggregates — superadmins
// expect near-real-time visibility into recent actions (e.g. "did that
// decline just go through?"), so these use a much shorter revalidate
// window than the 1-hour convention above rather than the same cadence
// as the revenue/appointment aggregates.
const AUDIT_REVALIDATE_SECONDS = 60;

function auditFilterKey(filters: AuditEventFilters): string {
  return JSON.stringify(filters ?? {});
}

export async function cachedAuditEvents(filters: AuditEventFilters = {}) {
  return unstable_cache(
    () => queryAuditEvents(filters),
    ["audit-events", auditFilterKey(filters)],
    { revalidate: AUDIT_REVALIDATE_SECONDS }
  )();
}

export async function cachedEntityTimeline(
  entityType: AuditEntityType,
  entityId: string
) {
  return unstable_cache(
    () => getEntityTimeline(entityType, entityId),
    ["audit-entity-timeline", entityType, entityId],
    { revalidate: AUDIT_REVALIDATE_SECONDS }
  )();
}
