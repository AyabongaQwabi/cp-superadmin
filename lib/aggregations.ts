import { Document } from "mongodb";
import { getDb } from "./mongodb";
import type {
  ClinicSummary,
  CompanySummary,
  EmployeeSummary,
  MonthSummary,
  OverviewTotals,
  YearSummary,
} from "./types";

/**
 * Builds the unioned, deduped appointment source used by every aggregation:
 * live `appointments` + `deleted_appointments`, tagged with `_isDeleted`,
 * deduped by `id` (live wins if the same id somehow appears in both), and
 * with `_createdAt` / `_year` / `_month` derived from `tracking.0.date` —
 * the only reliable date field (see ANALYTICS_INVENTORY.md / PHASE_1B).
 * `archive` is intentionally excluded: its overlap with these two
 * collections is unresolved (PHASE_1B_REAL_DATA_VERIFICATION.md §6).
 */
const PROJECT_FIELDS = {
  id: 1,
  status: 1,
  lifecycleStatus: 1,
  "payment.amount": 1,
  "details.date": 1,
  "details.clinic": 1,
  "details.company.id": 1,
  "details.company.name": 1,
  "usersWhoCanManage.id": 1,
  "usersWhoCanManage.name": 1,
  _createdAt: {
    $convert: {
      input: { $arrayElemAt: ["$tracking.date", 0] },
      to: "date",
      onError: null,
      onNull: null,
    },
  },
};

/**
 * Dedupes the live+deleted union by id using $first-per-field accumulators
 * rather than a $sort + $top/$$ROOT approach. On this cluster, a $sort (or
 * a $group with $top/$bottom over $$ROOT) placed after $unionWith reliably
 * exceeds the 32MB in-memory limit and ignores allowDiskUse: true — a
 * server-side limitation of $unionWith combined with those accumulators,
 * confirmed by isolating each stage against the real data. $first works
 * because $unionWith preserves encounter order (live collection first, the
 * unioned collection's documents appended after) when no $sort intervenes,
 * so $first naturally prefers the live copy when an id exists in both.
 */
function unionedAppointmentsPipeline(): Document[] {
  return [
    { $addFields: { _isDeleted: false } },
    { $project: { ...PROJECT_FIELDS, _isDeleted: 1 } },
    {
      $unionWith: {
        coll: "deleted_appointments",
        pipeline: [
          { $addFields: { _isDeleted: true } },
          { $project: { ...PROJECT_FIELDS, _isDeleted: 1 } },
        ],
      },
    },
    { $match: { id: { $exists: true, $ne: null }, _createdAt: { $ne: null } } },
    {
      $group: {
        _id: "$id",
        status: { $first: "$status" },
        lifecycleStatus: { $first: "$lifecycleStatus" },
        amount: { $first: "$payment.amount" },
        serviceDate: { $first: "$details.date" },
        clinic: { $first: "$details.clinic" },
        companyId: { $first: "$details.company.id" },
        companyName: { $first: "$details.company.name" },
        usersWhoCanManage: { $first: "$usersWhoCanManage" },
        createdAt: { $first: "$_createdAt" },
        isDeleted: { $min: { $cond: ["$_isDeleted", 1, 0] } },
      },
    },
    {
      $addFields: {
        _year: { $year: "$createdAt" },
        _month: { $month: "$createdAt" },
        _amount: { $ifNull: ["$amount", 0] },
        _status: { $ifNull: ["$status", "unknown"] },
        _serviceDate: "$serviceDate",
        // Additive-only enrichment written by cp-companion's daily lifecycle-status job (see
        // PHASE_1C_PAYMENT_MODEL_RESOLVED.md / cp-companion/src/lib/sync/lifecycle-status.ts).
        // Never the basis for revenue math — status remains authoritative for that — this is
        // purely a richer breakdown of what "approved"/"pending" appointments have become.
        _lifecycleStatus: { $ifNull: ["$lifecycleStatus", null] },
        _isDeleted: { $eq: ["$isDeleted", 1] },
        "details.clinic": "$clinic",
        "details.company.id": "$companyId",
        "details.company.name": "$companyName",
      },
    },
  ];
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getOverviewTotals(): Promise<OverviewTotals> {
  const db = await getDb();
  const today = todayIsoDate();

  const [result] = await db
    .collection("appointments")
    .aggregate([
      ...unionedAppointmentsPipeline(),
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalAppointments: { $sum: 1 },
                approved: {
                  $sum: { $cond: [{ $eq: ["$_status", "approved"] }, 1, 0] },
                },
                declined: {
                  $sum: { $cond: [{ $eq: ["$_status", "declined"] }, 1, 0] },
                },
                pendingLive: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$_status", "pending"] },
                          { $eq: ["$_isDeleted", false] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                abandoned: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$_status", "pending"] },
                          { $eq: ["$_isDeleted", true] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                deletedApproved: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$_status", "approved"] },
                          { $eq: ["$_isDeleted", true] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                deletedDeclined: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$_status", "declined"] },
                          { $eq: ["$_isDeleted", true] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                collected: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$_status", "approved"] },
                          { $lte: ["$_serviceDate", today] },
                        ],
                      },
                      "$_amount",
                      0,
                    ],
                  },
                },
                approvedFuture: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$_status", "approved"] },
                          { $gt: ["$_serviceDate", today] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                outstanding: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$_status", "pending"] },
                          { $eq: ["$_isDeleted", false] },
                        ],
                      },
                      "$_amount",
                      0,
                    ],
                  },
                },
                lost: {
                  $sum: {
                    $cond: [{ $eq: ["$_status", "declined"] }, "$_amount", 0],
                  },
                },
                completed: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$_status", "approved"] },
                          { $lte: ["$_serviceDate", today] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                expired: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$_status", "pending"] },
                          { $eq: ["$_isDeleted", false] },
                          { $lte: ["$_serviceDate", today] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                sumAmount: { $sum: "$_amount" },
                earliestDate: { $min: "$createdAt" },
                latestDate: { $max: "$createdAt" },
              },
            },
          ],
          duplicates: [
            { $group: { _id: "$id", count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
            { $count: "n" },
          ],
        },
      },
    ], { allowDiskUse: true })
    .toArray();

  const t = result?.totals?.[0];
  const dupCount = result?.duplicates?.[0]?.n ?? 0;

  if (!t) {
    return {
      totalAppointments: 0,
      approved: 0,
      declined: 0,
      pendingLive: 0,
      abandoned: 0,
      deletedApproved: 0,
      deletedDeclined: 0,
      collected: 0,
      approvedFuture: 0,
      outstanding: 0,
      lost: 0,
      completed: 0,
      expired: 0,
      avgValue: 0,
      duplicateIdCount: dupCount,
      earliestDate: null,
      latestDate: null,
    };
  }

  return {
    totalAppointments: t.totalAppointments,
    approved: t.approved,
    declined: t.declined,
    pendingLive: t.pendingLive,
    abandoned: t.abandoned,
    deletedApproved: t.deletedApproved,
    deletedDeclined: t.deletedDeclined,
    collected: t.collected,
    approvedFuture: t.approvedFuture,
    outstanding: t.outstanding,
    lost: t.lost,
    completed: t.completed,
    expired: t.expired,
    avgValue: t.totalAppointments ? t.sumAmount / t.totalAppointments : 0,
    duplicateIdCount: dupCount,
    earliestDate: t.earliestDate ? new Date(t.earliestDate).toISOString() : null,
    latestDate: t.latestDate ? new Date(t.latestDate).toISOString() : null,
  };
}

export async function getYearlySummary(): Promise<YearSummary[]> {
  const db = await getDb();
  const today = todayIsoDate();

  const rows = await db
    .collection("appointments")
    .aggregate([
      ...unionedAppointmentsPipeline(),
      {
        $group: {
          _id: "$_year",
          created: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ["$_status", "approved"] }, 1, 0] },
          },
          declined: {
            $sum: { $cond: [{ $eq: ["$_status", "declined"] }, 1, 0] },
          },
          pendingLive: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          abandoned: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          deletedApproved: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          deletedDeclined: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "declined"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          collected: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                "$_amount",
                0,
              ],
            },
          },
          approvedFuture: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $gt: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          outstanding: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                  ],
                },
                "$_amount",
                0,
              ],
            },
          },
          lost: {
            $sum: { $cond: [{ $eq: ["$_status", "declined"] }, "$_amount", 0] },
          },
          completed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          expired: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          sumAmount: { $sum: "$_amount" },
        },
      },
      { $sort: { _id: 1 } },
    ], { allowDiskUse: true })
    .toArray();

  return rows.map((r) => ({
    year: r._id,
    created: r.created,
    approved: r.approved,
    declined: r.declined,
    pendingLive: r.pendingLive,
    abandoned: r.abandoned,
    deletedApproved: r.deletedApproved,
    deletedDeclined: r.deletedDeclined,
    collected: r.collected,
    approvedFuture: r.approvedFuture,
    outstanding: r.outstanding,
    lost: r.lost,
    completed: r.completed,
    expired: r.expired,
    avgValue: r.created ? r.sumAmount / r.created : 0,
  }));
}

export async function getMonthlySummary(sinceYear: number): Promise<MonthSummary[]> {
  const db = await getDb();
  const today = todayIsoDate();

  const rows = await db
    .collection("appointments")
    .aggregate([
      ...unionedAppointmentsPipeline(),
      { $match: { _year: { $gte: sinceYear } } },
      {
        $group: {
          _id: { year: "$_year", month: "$_month" },
          created: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ["$_status", "approved"] }, 1, 0] },
          },
          declined: {
            $sum: { $cond: [{ $eq: ["$_status", "declined"] }, 1, 0] },
          },
          pendingLive: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          abandoned: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          deletedApproved: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          deletedDeclined: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "declined"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          collected: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                "$_amount",
                0,
              ],
            },
          },
          approvedFuture: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $gt: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          outstanding: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                  ],
                },
                "$_amount",
                0,
              ],
            },
          },
          lost: {
            $sum: { $cond: [{ $eq: ["$_status", "declined"] }, "$_amount", 0] },
          },
          completed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          expired: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          sumAmount: { $sum: "$_amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ], { allowDiskUse: true })
    .toArray();

  return rows.map((r) => ({
    year: r._id.year,
    month: r._id.month,
    created: r.created,
    approved: r.approved,
    declined: r.declined,
    pendingLive: r.pendingLive,
    abandoned: r.abandoned,
    deletedApproved: r.deletedApproved,
    deletedDeclined: r.deletedDeclined,
    collected: r.collected,
    approvedFuture: r.approvedFuture,
    outstanding: r.outstanding,
    lost: r.lost,
    completed: r.completed,
    expired: r.expired,
    avgValue: r.created ? r.sumAmount / r.created : 0,
  }));
}

export interface SegmentFilters {
  year?: number;
  clinic?: string;
  companyId?: string;
  employeeId?: string;
}

function filterMatchStage(filters: SegmentFilters): Document {
  const match: Document = {};
  if (filters.year) match._year = filters.year;
  if (filters.clinic) match["details.clinic"] = filters.clinic;
  if (filters.companyId) match["details.company.id"] = filters.companyId;
  if (filters.employeeId) match["usersWhoCanManage.id"] = filters.employeeId;
  return match;
}

export async function getCompanySummary(
  filters: SegmentFilters = {}
): Promise<CompanySummary[]> {
  const db = await getDb();
  const match = filterMatchStage(filters);
  const today = todayIsoDate();

  const rows = await db
    .collection("appointments")
    .aggregate([
      ...unionedAppointmentsPipeline(),
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      {
        $group: {
          _id: {
            id: "$details.company.id",
            name: "$details.company.name",
          },
          totalAppointments: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ["$_status", "approved"] }, 1, 0] },
          },
          declined: {
            $sum: { $cond: [{ $eq: ["$_status", "declined"] }, 1, 0] },
          },
          pendingLive: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          abandoned: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          deletedApproved: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          deletedDeclined: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "declined"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          collected: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                "$_amount",
                0,
              ],
            },
          },
          approvedFuture: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $gt: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          outstanding: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                  ],
                },
                "$_amount",
                0,
              ],
            },
          },
          lost: {
            $sum: { $cond: [{ $eq: ["$_status", "declined"] }, "$_amount", 0] },
          },
          completed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          expired: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { collected: -1 } },
      { $limit: 500 },
    ], { allowDiskUse: true })
    .toArray();

  return rows
    .filter((r) => r._id.name)
    .map((r) => ({
      companyId: r._id.id ?? null,
      companyName: r._id.name ?? "Unknown company",
      totalAppointments: r.totalAppointments,
      approved: r.approved,
      declined: r.declined,
      pendingLive: r.pendingLive,
      abandoned: r.abandoned,
      deletedApproved: r.deletedApproved,
      deletedDeclined: r.deletedDeclined,
      collected: r.collected,
      approvedFuture: r.approvedFuture,
      outstanding: r.outstanding,
      lost: r.lost,
      completed: r.completed,
      expired: r.expired,
      declineRate: r.totalAppointments ? r.declined / r.totalAppointments : 0,
    }));
}

export async function getClinicSummary(
  filters: SegmentFilters = {}
): Promise<ClinicSummary[]> {
  const db = await getDb();
  const match = filterMatchStage(filters);
  const today = todayIsoDate();

  const rows = await db
    .collection("appointments")
    .aggregate([
      ...unionedAppointmentsPipeline(),
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      {
        $group: {
          _id: { $ifNull: ["$details.clinic", "Unspecified"] },
          totalAppointments: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ["$_status", "approved"] }, 1, 0] },
          },
          declined: {
            $sum: { $cond: [{ $eq: ["$_status", "declined"] }, 1, 0] },
          },
          pendingLive: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          abandoned: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          deletedApproved: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          deletedDeclined: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "declined"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          collected: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                "$_amount",
                0,
              ],
            },
          },
          approvedFuture: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $gt: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          outstanding: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                  ],
                },
                "$_amount",
                0,
              ],
            },
          },
          lost: {
            $sum: { $cond: [{ $eq: ["$_status", "declined"] }, "$_amount", 0] },
          },
          completed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          expired: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { collected: -1 } },
    ], { allowDiskUse: true })
    .toArray();

  return rows.map((r) => ({
    clinic: r._id,
    totalAppointments: r.totalAppointments,
    approved: r.approved,
    declined: r.declined,
    pendingLive: r.pendingLive,
    abandoned: r.abandoned,
    deletedApproved: r.deletedApproved,
    deletedDeclined: r.deletedDeclined,
    collected: r.collected,
    approvedFuture: r.approvedFuture,
    outstanding: r.outstanding,
    lost: r.lost,
    completed: r.completed,
    expired: r.expired,
  }));
}

export async function getEmployeeSummary(
  filters: SegmentFilters = {}
): Promise<EmployeeSummary[]> {
  const db = await getDb();
  const match = filterMatchStage(filters);
  const today = todayIsoDate();

  const rows = await db
    .collection("appointments")
    .aggregate([
      ...unionedAppointmentsPipeline(),
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      { $unwind: { path: "$usersWhoCanManage", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { id: "$usersWhoCanManage.id", name: "$usersWhoCanManage.name" },
          totalAppointments: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ["$_status", "approved"] }, 1, 0] },
          },
          declined: {
            $sum: { $cond: [{ $eq: ["$_status", "declined"] }, 1, 0] },
          },
          pendingLive: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          abandoned: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          deletedApproved: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          deletedDeclined: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "declined"] },
                    { $eq: ["$_isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          collected: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                "$_amount",
                0,
              ],
            },
          },
          approvedFuture: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $gt: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          completed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "approved"] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          expired: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_status", "pending"] },
                    { $eq: ["$_isDeleted", false] },
                    { $lte: ["$_serviceDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $match: { "_id.id": { $ne: null } } },
      { $sort: { collected: -1 } },
      { $limit: 500 },
    ], { allowDiskUse: true })
    .toArray();

  return rows.map((r) => ({
    userId: r._id.id,
    name: r._id.name ?? "Unknown",
    totalAppointments: r.totalAppointments,
    approved: r.approved,
    declined: r.declined,
    pendingLive: r.pendingLive,
    abandoned: r.abandoned,
    deletedApproved: r.deletedApproved,
    deletedDeclined: r.deletedDeclined,
    collected: r.collected,
    approvedFuture: r.approvedFuture,
    completed: r.completed,
    expired: r.expired,
  }));
}

export async function getDistinctClinics(): Promise<string[]> {
  const db = await getDb();
  const values = await db.collection("appointments").distinct("details.clinic");
  return values.filter((v): v is string => typeof v === "string" && v.length > 0).sort();
}
