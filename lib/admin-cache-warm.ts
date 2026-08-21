import {
  cachedAppointmentExceptions,
  cachedAppointmentExplorer,
  cachedAuditDashboard,
  cachedClinicCapacity,
  cachedClinicSummary,
  cachedCompanionAccessDashboard,
  cachedDataQualityDashboard,
  cachedEmployeeSummary,
  cachedInvoiceDashboard,
  cachedLifecycleTiming,
  cachedMonthlySummary,
  cachedOperationsSummary,
  cachedOverviewTotals,
  cachedPeopleDirectory,
  cachedRoleLoginTiming,
  cachedServiceDashboard,
  cachedUsersDirectory,
  cachedYearlySummary,
} from "@/lib/cached";
import { cachedCompanionApi } from "@/lib/companion-api";

async function settleBatch<T>(jobs: (() => Promise<T>)[], batchSize = 4) {
  const results: PromiseSettledResult<T>[] = [];
  for (let index = 0; index < jobs.length; index += batchSize) {
    results.push(...(await Promise.allSettled(jobs.slice(index, index + batchSize).map((job) => job()))));
  }
  return results;
}

export async function warmAdminCompanionCache(adminUserId?: string) {
  const currentYear = new Date().getFullYear();
  const monthlySinceYear = currentYear - 2;
  const jobs: (() => Promise<unknown>)[] = [
    () => cachedOverviewTotals(),
    () => cachedYearlySummary(),
    () => cachedMonthlySummary(monthlySinceYear),
    () => cachedClinicSummary(),
    () => cachedOperationsSummary(),
    () => cachedRoleLoginTiming(),
    () => cachedLifecycleTiming(),
    () => cachedDataQualityDashboard(),
    () => cachedAuditDashboard(),
    () => cachedAppointmentExplorer({ status: "all" }),
    () => cachedAppointmentExceptions(),
    () => cachedUsersDirectory({ role: "all" }),
    () => cachedPeopleDirectory(),
    () => cachedEmployeeSummary(),
    () => cachedServiceDashboard(),
    () => cachedInvoiceDashboard(),
    () => cachedClinicCapacity(),
    () => cachedCompanionAccessDashboard(),
    () => cachedCompanionApi("/api/admin/admin-companion/crm/audience?role=client&limit=100&q="),
    () => cachedCompanionApi("/api/admin/admin-companion/crm/user-intelligence?days=30"),
    () => cachedCompanionApi("/api/admin/support-tickets", 30),
    () => cachedCompanionApi("/api/admin/platform-controls", 30),
  ];

  if (adminUserId) {
    jobs.push(() =>
      cachedCompanionApi(
        `/api/admin/admin-companion/billing/subscription?adminUserId=${encodeURIComponent(adminUserId)}`,
        30,
      ),
    );
  }

  const startedAt = Date.now();
  const results = await settleBatch(jobs);
  return {
    warmed: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
    durationMs: Date.now() - startedAt,
  };
}
