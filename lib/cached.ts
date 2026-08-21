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
import { getLifecycleTimingDashboard, getRoleLoginTimingDashboard } from "./superadmin-read-model";
import {
  getAppointmentExceptions,
  getAppointmentExplorer,
  getAuditDashboard,
  getClinicCapacity,
  getCompanionAccessDashboard,
  getCompany360,
  getDataQualityDashboard,
  getInvoiceDashboard,
  getOperationsSummary,
  getPeopleDirectory,
  getServiceDashboard,
  getUsersDirectory,
} from "./superadmin-read-model";

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
const TIMING_REVALIDATE_SECONDS = 300;

export const cachedRoleLoginTiming = unstable_cache(
  getRoleLoginTimingDashboard,
  ["role-login-timing-v2"],
  { revalidate: TIMING_REVALIDATE_SECONDS },
);

export const cachedLifecycleTiming = unstable_cache(
  getLifecycleTimingDashboard,
  ["lifecycle-timing-v3"],
  { revalidate: TIMING_REVALIDATE_SECONDS },
);

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

// Admin Companion page-level read models. These are read-only dashboard
// projections, so short caches make navigation feel instant while still
// refreshing in the background during normal use.
const ADMIN_PAGE_REVALIDATE_SECONDS = 120;
const DIRECTORY_REVALIDATE_SECONDS = 60;

export const cachedOperationsSummary = unstable_cache(
  getOperationsSummary,
  ["admin-operations-summary"],
  { revalidate: ADMIN_PAGE_REVALIDATE_SECONDS },
);

export const cachedAppointmentExceptions = unstable_cache(
  getAppointmentExceptions,
  ["admin-appointment-exceptions"],
  { revalidate: ADMIN_PAGE_REVALIDATE_SECONDS },
);

export const cachedClinicCapacity = unstable_cache(
  getClinicCapacity,
  ["admin-clinic-capacity"],
  { revalidate: ADMIN_PAGE_REVALIDATE_SECONDS },
);

export const cachedInvoiceDashboard = unstable_cache(
  getInvoiceDashboard,
  ["admin-invoice-dashboard"],
  { revalidate: ADMIN_PAGE_REVALIDATE_SECONDS },
);

export const cachedServiceDashboard = unstable_cache(
  getServiceDashboard,
  ["admin-service-dashboard"],
  { revalidate: ADMIN_PAGE_REVALIDATE_SECONDS },
);

export const cachedCompanionAccessDashboard = unstable_cache(
  getCompanionAccessDashboard,
  ["admin-companion-access-dashboard"],
  { revalidate: ADMIN_PAGE_REVALIDATE_SECONDS },
);

export const cachedDataQualityDashboard = unstable_cache(
  getDataQualityDashboard,
  ["admin-data-quality-dashboard"],
  { revalidate: ADMIN_PAGE_REVALIDATE_SECONDS },
);

export const cachedAuditDashboard = unstable_cache(
  getAuditDashboard,
  ["admin-audit-dashboard"],
  { revalidate: DIRECTORY_REVALIDATE_SECONDS },
);

function searchKey(value?: string) {
  return String(value || "").trim().toLowerCase();
}

export async function cachedPeopleDirectory(search?: string) {
  const normalized = searchKey(search);
  return unstable_cache(
    () => getPeopleDirectory(search),
    ["admin-people-directory", normalized],
    { revalidate: DIRECTORY_REVALIDATE_SECONDS },
  )();
}

export async function cachedAppointmentExplorer(params: { search?: string; status?: string }) {
  const key = JSON.stringify({
    search: searchKey(params.search),
    status: searchKey(params.status),
  });
  return unstable_cache(
    () => getAppointmentExplorer(params),
    ["admin-appointment-explorer", key],
    { revalidate: DIRECTORY_REVALIDATE_SECONDS },
  )();
}

export async function cachedUsersDirectory(params: { search?: string; role?: string }) {
  const key = JSON.stringify({
    search: searchKey(params.search),
    role: searchKey(params.role),
  });
  return unstable_cache(
    () => getUsersDirectory(params),
    ["admin-users-directory", key],
    { revalidate: DIRECTORY_REVALIDATE_SECONDS },
  )();
}

export async function cachedCompany360(companyId: string) {
  return unstable_cache(
    () => getCompany360(companyId),
    ["admin-company-360", companyId],
    { revalidate: DIRECTORY_REVALIDATE_SECONDS },
  )();
}
