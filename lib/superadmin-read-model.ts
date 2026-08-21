import { type Document } from "mongodb";
import { getCompanionDb, getDb } from "./mongodb";

const READ_LIMIT = 25;

type Serialized<T extends { _id?: unknown }> = Omit<T, "_id"> & { _id: string };

interface EmployeeDirectoryDoc {
  _id?: unknown;
  idNumber?: string | null;
  displayName?: string;
  matchConfidence?: "verified" | "unverified";
  idNumberValid?: boolean | null;
  occupations?: string[];
  firstSeenAt?: Date | string;
  lastSeenAt?: Date | string;
}

interface AppointmentManagerDoc {
  _id: {
    id?: string | null;
    name?: string | null;
  };
  totalAppointments: number;
  approved: number;
  declined: number;
  pendingLive: number;
  totalRevenue: number;
  firstSeenAt?: Date | string;
  lastSeenAt?: Date | string;
}

interface EmployeeStatsDoc {
  _id?: unknown;
  employeeDirectoryId: string;
  totalAppointments?: number;
  totalRevenue?: number;
}

interface CompanionUserDoc {
  _id?: unknown;
  productionUserId?: string;
  role?: string;
  firstLoginAt?: Date | string;
  signupBonusGrantedAt?: Date | string;
}

type CompanionAccessRow = Serialized<CompanionUserDoc> & {
  productionUser: Serialized<Document> | null;
};

type PeopleDirectoryEmployee = Serialized<EmployeeDirectoryDoc> & {
  stats: Serialized<EmployeeStatsDoc> | null;
};

export interface TimingSlot {
  key: string;
  label: string;
  count: number;
}

export interface DayHourSlot {
  dayOfWeek: number;
  dayLabel: string;
  hour: number;
  count: number;
}

export interface RoleTimingSummary {
  role: "admin" | "client";
  total: number;
  peakDay: string;
  peakHour: string;
}

export interface LifecycleTimingSummary {
  eventType: "signups" | "appointments" | "companies";
  label: string;
  total: number;
  peakDay: string;
  peakHour: string;
}

interface RawTimingEvent {
  role?: unknown;
  eventType?: unknown;
  createdAt?: unknown;
  source?: string;
}

const TIMING_TIMEZONE = "Africa/Johannesburg";
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TRACKING_LOGIN_PATTERN = "(login|logged|sign.?in|auth)";
const EVENT_READ_LIMIT = 25000;

function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function serializeId<T extends { _id?: unknown }>(doc: T): Serialized<T> {
  return { ...doc, _id: String(doc._id ?? "") };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getOperationsSummary() {
  const [prodDb, companionDb] = await Promise.all([getDb(), getCompanionDb()]);

  const [
    liveAppointments,
    deletedAppointments,
    companyCount,
    userCount,
    companionUserCount,
    statusCounts,
    recentProductionAppointments,
    latestSyncRuns,
    latestAdoptionMetric,
    anomalyCount,
    dataQualityCount,
    dormancyCount,
    newLeadCount,
    recentAnomalies,
    recentDataQuality,
  ] = await Promise.all([
    prodDb.collection("appointments").countDocuments(),
    prodDb.collection("deleted_appointments").countDocuments(),
    prodDb.collection("companies").countDocuments(),
    prodDb.collection("users").countDocuments(),
    companionDb.collection("companionUsers").countDocuments(),
    prodDb
      .collection("appointments")
      .aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    prodDb
      .collection("appointments")
      .find()
      .project({ id: 1, status: 1, payment: 1, details: 1, tracking: 1, usersWhoCanManage: 1 })
      .sort({ "tracking.0.date": -1, _id: -1 })
      .limit(READ_LIMIT)
      .toArray(),
    companionDb.collection("syncLog").find().sort({ startedAt: -1 }).limit(8).toArray(),
    companionDb.collection("adoptionMetrics").find().sort({ computedAt: -1 }).limit(1).toArray(),
    companionDb.collection("anomalyFlags").countDocuments(),
    companionDb.collection("dataQualitySweep").countDocuments(),
    companionDb.collection("dormancyFlags").countDocuments(),
    companionDb.collection("newCompanyLeads").countDocuments({ isOnCompanion: false }),
    companionDb.collection("anomalyFlags").find().sort({ flaggedAt: -1 }).limit(READ_LIMIT).toArray(),
    companionDb.collection("dataQualitySweep").find().sort({ lastSyncedAt: -1 }).limit(READ_LIMIT).toArray(),
  ]);

  return {
    latestSyncRuns: latestSyncRuns.map(serializeId),
    latestAdoptionMetric: latestAdoptionMetric[0] ? serializeId(latestAdoptionMetric[0]) : null,
    counts: {
      anomalyCount,
      dataQualityCount,
      dormancyCount,
      newLeadCount,
      liveAppointments,
      deletedAppointments,
      companyCount,
      userCount,
      companionUserCount,
    },
    statusCounts,
    recentProductionAppointments: recentProductionAppointments.map(serializeId),
    recentAnomalies: recentAnomalies.map(serializeId),
    recentDataQuality: recentDataQuality.map(serializeId),
    hasCompanionDerivedData:
      latestSyncRuns.length > 0 ||
      anomalyCount > 0 ||
      dataQualityCount > 0 ||
      dormancyCount > 0 ||
      newLeadCount > 0,
  };
}

export async function getAppointmentExceptions() {
  const [prodDb, companionDb] = await Promise.all([getDb(), getCompanionDb()]);
  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - 30);

  const [anomalies, duplicateIds, stalePending, deletedApproved] = await Promise.all([
    companionDb.collection("anomalyFlags").find().sort({ flaggedAt: -1 }).limit(READ_LIMIT).toArray(),
    prodDb
      .collection("appointments")
      .aggregate([
        { $project: { id: 1, status: 1, "details.company.name": 1, "details.date": 1 } },
        {
          $unionWith: {
            coll: "deleted_appointments",
            pipeline: [{ $project: { id: 1, status: 1, "details.company.name": 1, "details.date": 1 } }],
          },
        },
        { $match: { id: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: "$id",
            count: { $sum: 1 },
            statuses: { $addToSet: "$status" },
            companyNames: { $addToSet: "$details.company.name" },
            dates: { $addToSet: "$details.date" },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
        { $limit: READ_LIMIT },
      ], { allowDiskUse: true })
      .toArray(),
    prodDb
      .collection("appointments")
      .find({ status: "pending", "tracking.date": { $lte: staleCutoff } })
      .project({ id: 1, status: 1, payment: 1, details: 1, tracking: 1, usersWhoCanManage: 1 })
      .sort({ "tracking.0.date": 1 })
      .limit(READ_LIMIT)
      .toArray(),
    prodDb
      .collection("deleted_appointments")
      .find({ status: "approved" })
      .project({ id: 1, status: 1, payment: 1, details: 1, tracking: 1 })
      .sort({ "tracking.0.date": -1 })
      .limit(READ_LIMIT)
      .toArray(),
  ]);

  return {
    anomalies: anomalies.map(serializeId),
    duplicateIds,
    stalePending: stalePending.map(serializeId),
    deletedApproved: deletedApproved.map(serializeId),
  };
}

export async function getCompany360(companyId: string) {
  const [prodDb, companionDb] = await Promise.all([getDb(), getCompanionDb()]);

  const [company, profile, pattern, recentAppointments, invoices, auditEvents, flags] = await Promise.all([
    prodDb.collection("companies").findOne({ id: companyId }),
    companionDb.collection("companyProfiles").findOne({ companyId }),
    companionDb.collection("bookingPatterns").findOne({ companyId }),
    prodDb
      .collection("appointments")
      .find({ "details.company.id": companyId })
      .project({ id: 1, status: 1, payment: 1, details: 1, usersWhoCanManage: 1, tracking: 1 })
      .sort({ "tracking.0.date": -1 })
      .limit(READ_LIMIT)
      .toArray(),
    companionDb.collection("invoices").find({ companyId }).sort({ sentAt: -1 }).limit(READ_LIMIT).toArray(),
    companionDb
      .collection("audit_events")
      .find({
        $or: [
          { entityType: "company", entityId: companyId },
          { "metadata.companyId": companyId },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(READ_LIMIT)
      .toArray(),
    Promise.all([
      companionDb.collection("dormancyFlags").find({ companyId }).toArray(),
      companionDb.collection("dataQualitySweep").find({ companyId }).toArray(),
      companionDb.collection("anomalyFlags").find({ companyId }).toArray(),
      companionDb.collection("newCompanyLeads").find({ companyId }).toArray(),
    ]).then((groups) => groups.flat()),
  ]);

  return {
    company: company ? serializeId(company) : null,
    profile: profile ? serializeId(profile) : null,
    pattern: pattern ? serializeId(pattern) : null,
    recentAppointments: recentAppointments.map(serializeId),
    invoices: invoices.map(serializeId),
    auditEvents: auditEvents.map(serializeId),
    flags: flags.map(serializeId),
  };
}

export async function getClinicCapacity() {
  const prodDb = await getDb();
  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  const toDate = new Date(now);
  toDate.setDate(toDate.getDate() + 45);
  const to = toDate.toISOString().slice(0, 10);

  const [settings, clinics, upcoming] = await Promise.all([
    prodDb.collection("systemSettings").findOne({}),
    prodDb.collection("appointments").distinct("details.clinic"),
    prodDb
      .collection("appointments")
      .aggregate([
        { $match: { "details.date": { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { clinic: "$details.clinic", date: "$details.date" },
            appointments: { $sum: 1 },
            employees: { $sum: { $size: { $ifNull: ["$details.employees", []] } } },
          },
        },
        { $sort: { "_id.date": 1, "_id.clinic": 1 } },
      ])
      .toArray(),
  ]);

  const limits = (settings?.limits ?? {}) as Record<string, number>;
  return {
    limits,
    clinics: clinics.filter((clinic): clinic is string => typeof clinic === "string" && clinic.length > 0).sort(),
    upcoming,
    window: { from, to },
  };
}

export async function getPeopleDirectory(search?: string) {
  const [prodDb, companionDb] = await Promise.all([getDb(), getCompanionDb()]);
  const query: Document = {};
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { displayName: { $regex: escaped, $options: "i" } },
      { idNumber: { $regex: escaped, $options: "i" } },
    ];
  }

  const [total, entries, flags, appointmentManagers] = await Promise.all([
    companionDb.collection("employeeDirectory").countDocuments(query),
    companionDb
      .collection<EmployeeDirectoryDoc>("employeeDirectory")
      .find(query)
      .sort({ lastSeenAt: -1 })
      .limit(50)
      .toArray(),
    companionDb.collection("dataQualitySweep").find().sort({ lastSyncedAt: -1 }).limit(READ_LIMIT).toArray(),
    prodDb
      .collection("appointments")
      .aggregate<AppointmentManagerDoc>([
        {
          $project: {
            status: 1,
            payment: 1,
            usersWhoCanManage: 1,
            tracking: 1,
            _isDeleted: { $literal: false },
          },
        },
        {
          $unionWith: {
            coll: "deleted_appointments",
            pipeline: [
              {
                $project: {
                  status: 1,
                  payment: 1,
                  usersWhoCanManage: 1,
                  tracking: 1,
                  _isDeleted: { $literal: true },
                },
              },
            ],
          },
        },
        { $unwind: { path: "$usersWhoCanManage", preserveNullAndEmptyArrays: false } },
        {
          $match: search
            ? {
                $or: [
                  { "usersWhoCanManage.name": { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
                  { "usersWhoCanManage.id": { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
                ],
              }
            : {},
        },
        {
          $group: {
            _id: { id: "$usersWhoCanManage.id", name: "$usersWhoCanManage.name" },
            totalAppointments: { $sum: 1 },
            approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
            declined: { $sum: { $cond: [{ $eq: ["$status", "declined"] }, 1, 0] } },
            pendingLive: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$status", "pending"] }, { $eq: ["$_isDeleted", false] }] },
                  1,
                  0,
                ],
              },
            },
            totalRevenue: {
              $sum: { $cond: [{ $eq: ["$status", "approved"] }, { $ifNull: ["$payment.amount", 0] }, 0] },
            },
            firstSeenAt: { $min: { $first: "$tracking.date" } },
            lastSeenAt: { $max: { $first: "$tracking.date" } },
          },
        },
        { $match: { "_id.id": { $ne: null } } },
        { $sort: { totalRevenue: -1, totalAppointments: -1 } },
        { $limit: 50 },
      ], { allowDiskUse: true })
      .toArray(),
  ]);

  const ids = entries.map((entry) => String(entry._id));
  const stats = ids.length
    ? await companionDb.collection<EmployeeStatsDoc>("employeeStats").find({ employeeDirectoryId: { $in: ids } }).toArray()
    : [];
  const statsById = new Map(stats.map((row) => [row.employeeDirectoryId, serializeId(row)]));

  const directoryEmployees = entries.map((entry): PeopleDirectoryEmployee => ({
      ...serializeId(entry),
      stats: statsById.get(String(entry._id)) ?? null,
    }));

  const productionEmployees: PeopleDirectoryEmployee[] = appointmentManagers.map((manager) => ({
    _id: String(manager._id.id ?? manager._id.name ?? ""),
    idNumber: manager._id.id ?? null,
    displayName: manager._id.name ?? "Unknown admin user",
    matchConfidence: "verified",
    idNumberValid: null,
    occupations: ["Appointment manager"],
    firstSeenAt: manager.firstSeenAt,
    lastSeenAt: manager.lastSeenAt,
    stats: {
      _id: String(manager._id.id ?? manager._id.name ?? ""),
      employeeDirectoryId: String(manager._id.id ?? ""),
      totalAppointments: manager.totalAppointments,
      totalRevenue: manager.totalRevenue,
    },
  }));

  return {
    total: total || productionEmployees.length,
    employees: directoryEmployees.length ? directoryEmployees : productionEmployees,
    flags: flags.map(serializeId),
    source: directoryEmployees.length ? "directory" : "appointmentManagers",
  };
}

export async function getAppointmentExplorer({
  search,
  status,
}: {
  search?: string;
  status?: string;
}) {
  const prodDb = await getDb();
  const query: Document = {};

  if (status && status !== "all") query.status = status;
  if (search) {
    const escaped = escapeRegex(search);
    query.$or = [
      { id: { $regex: escaped, $options: "i" } },
      { "details.company.name": { $regex: escaped, $options: "i" } },
      { "details.company.id": { $regex: escaped, $options: "i" } },
      { "details.clinic": { $regex: escaped, $options: "i" } },
    ];
  }

  const [total, rows, statusCounts] = await Promise.all([
    prodDb.collection("appointments").countDocuments(query),
    prodDb
      .collection("appointments")
      .find(query)
      .project({ id: 1, status: 1, payment: 1, details: 1, tracking: 1, usersWhoCanManage: 1 })
      .sort({ "tracking.0.date": -1, _id: -1 })
      .limit(100)
      .toArray(),
    prodDb
      .collection("appointments")
      .aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
  ]);

  return { total, rows: rows.map(serializeId), statusCounts };
}

export async function getUsersDirectory({
  search,
  role,
}: {
  search?: string;
  role?: string;
}) {
  const prodDb = await getDb();
  const query: Document = {};

  if (role && role !== "all") query.role = role;
  if (search) {
    const escaped = escapeRegex(search);
    query.$or = [
      { id: { $regex: escaped, $options: "i" } },
      { "details.name": { $regex: escaped, $options: "i" } },
      { "details.surname": { $regex: escaped, $options: "i" } },
      { "details.email": { $regex: escaped, $options: "i" } },
      { "details.cell": { $regex: escaped, $options: "i" } },
    ];
  }

  const [total, suspended, rows, roleCounts] = await Promise.all([
    prodDb.collection("users").countDocuments(query),
    prodDb.collection("users").countDocuments({ isSuspended: true }),
    prodDb
      .collection("users")
      .find(query)
      .project({ hash: 0, password: 0, token: 0 })
      .sort({ "tracking.0.date": -1, _id: -1 })
      .limit(100)
      .toArray(),
    prodDb
      .collection("users")
      .aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
  ]);

  return { total, suspended, rows: rows.map(serializeId), roleCounts };
}

export async function getInvoiceDashboard() {
  const prodDb = await getDb();

  const [total, recent, totals, byClinic, byCompany] = await Promise.all([
    prodDb.collection("invoices").countDocuments(),
    prodDb
      .collection("invoices")
      .find()
      .project({ id: 1, client: 1, company: 1, appointment: 1, payment: 1, clinic: 1, date: 1, url: 1 })
      .sort({ date: -1, _id: -1 })
      .limit(50)
      .toArray(),
    prodDb
      .collection("invoices")
      .aggregate([
        {
          $group: {
            _id: null,
            amount: { $sum: { $ifNull: ["$payment.amount", 0] } },
            withUrl: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$url", ""] } }, 0] }, 1, 0] } },
          },
        },
      ])
      .toArray(),
    prodDb
      .collection("invoices")
      .aggregate([
        { $group: { _id: { $ifNull: ["$clinic", "Unspecified"] }, count: { $sum: 1 }, amount: { $sum: { $ifNull: ["$payment.amount", 0] } } } },
        { $sort: { amount: -1 } },
        { $limit: 20 },
      ])
      .toArray(),
    prodDb
      .collection("invoices")
      .aggregate([
        { $group: { _id: { id: "$company.id", name: "$company.name" }, count: { $sum: 1 }, amount: { $sum: { $ifNull: ["$payment.amount", 0] } } } },
        { $sort: { amount: -1 } },
        { $limit: 20 },
      ])
      .toArray(),
  ]);

  return {
    total,
    amount: totals[0]?.amount ?? 0,
    withUrl: totals[0]?.withUrl ?? 0,
    recent: recent.map(serializeId),
    byClinic,
    byCompany,
  };
}

export async function getServiceDashboard() {
  const prodDb = await getDb();
  const today = new Date().toISOString().slice(0, 10);

  const servicePipeline: Document[] = [
    { $project: { status: 1, payment: 1, details: 1, _isDeleted: { $literal: false } } },
    {
      $unionWith: {
        coll: "deleted_appointments",
        pipeline: [{ $project: { status: 1, payment: 1, details: 1, _isDeleted: { $literal: true } } }],
      },
    },
    { $unwind: { path: "$details.employees", preserveNullAndEmptyArrays: false } },
    { $unwind: { path: "$details.employees.services", preserveNullAndEmptyArrays: false } },
  ];

  const [services, employeeServiceCounts, recent] = await Promise.all([
    prodDb
      .collection("appointments")
      .aggregate([
        ...servicePipeline,
        {
          $group: {
            _id: "$details.employees.services.id",
            uses: { $sum: 1 },
            bookedValue: { $sum: { $ifNull: ["$details.employees.services.price", 0] } },
            approvedValue: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "approved"] },
                  { $ifNull: ["$details.employees.services.price", 0] },
                  0,
                ],
              },
            },
            completedValue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "approved"] },
                      { $lte: ["$details.date", today] },
                    ],
                  },
                  { $ifNull: ["$details.employees.services.price", 0] },
                  0,
                ],
              },
            },
            avgPrice: { $avg: { $ifNull: ["$details.employees.services.price", 0] } },
            approvedUses: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
            completedUses: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "approved"] },
                      { $lte: ["$details.date", today] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { bookedValue: -1, uses: -1 } },
        { $limit: 100 },
      ], { allowDiskUse: true })
      .toArray(),
    prodDb
      .collection("appointments")
      .aggregate([
        { $project: { details: 1 } },
        {
          $unionWith: {
            coll: "deleted_appointments",
            pipeline: [{ $project: { details: 1 } }],
          },
        },
        { $unwind: { path: "$details.employees", preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: null,
            withServices: {
              $sum: {
                $cond: [{ $gt: [{ $size: { $ifNull: ["$details.employees.services", []] } }, 0] }, 1, 0],
              },
            },
            withoutServices: {
              $sum: {
                $cond: [{ $eq: [{ $size: { $ifNull: ["$details.employees.services", []] } }, 0] }, 1, 0],
              },
            },
          },
        },
      ], { allowDiskUse: true })
      .toArray(),
    prodDb
      .collection("appointments")
      .find({ "details.employees.services.0": { $exists: true } })
      .project({ id: 1, status: 1, details: 1, payment: 1, tracking: 1 })
      .sort({ "tracking.0.date": -1, _id: -1 })
      .limit(25)
      .toArray(),
  ]);

  return {
    services,
    employeesWithServices: employeeServiceCounts[0]?.withServices ?? 0,
    employeesWithoutServices: employeeServiceCounts[0]?.withoutServices ?? 0,
    recent: recent.map(serializeId),
  };
}

export async function getCompanionAccessDashboard() {
  const [prodDb, companionDb] = await Promise.all([getDb(), getCompanionDb()]);

  const [total, rows, roleCounts] = await Promise.all([
    companionDb.collection("companionUsers").countDocuments(),
    companionDb
      .collection<CompanionUserDoc>("companionUsers")
      .find()
      .project({ hash: 0, password: 0, token: 0 })
      .sort({ firstLoginAt: -1, _id: -1 })
      .limit(100)
      .toArray(),
    companionDb
      .collection("companionUsers")
      .aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
  ]);

  const productionIds = rows
    .map((row) => row.productionUserId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const productionUsers = productionIds.length
    ? await prodDb
        .collection("users")
        .find({ id: { $in: productionIds } })
        .project({ id: 1, details: 1, role: 1, isSuspended: 1 })
        .toArray()
    : [];
  const usersById = new Map(productionUsers.map((user) => [user.id, serializeId(user)]));
  const rowsWithUsers: CompanionAccessRow[] = rows.map((row) => ({
    ...serializeId(row),
    productionUser: typeof row.productionUserId === "string" ? usersById.get(row.productionUserId) ?? null : null,
  }));

  return {
    total,
    rows: rowsWithUsers,
    roleCounts,
  };
}

export async function getDataQualityDashboard() {
  const prodDb = await getDb();

  const [
    missingStatus,
    missingCompanyId,
    missingManagers,
    zeroAmountApproved,
    appointmentWithoutEmployees,
    usersMissingEmail,
    suspendedUsers,
    decommissionedCompanies,
    approvedDeleted,
    samples,
  ] = await Promise.all([
    prodDb.collection("appointments").countDocuments({ $or: [{ status: { $exists: false } }, { status: null }] }),
    prodDb.collection("appointments").countDocuments({ $or: [{ "details.company.id": { $exists: false } }, { "details.company.id": null }, { "details.company.id": "" }] }),
    prodDb.collection("appointments").countDocuments({ $or: [{ usersWhoCanManage: { $exists: false } }, { usersWhoCanManage: { $size: 0 } }] }),
    prodDb.collection("appointments").countDocuments({ status: "approved", $or: [{ "payment.amount": { $lte: 0 } }, { "payment.amount": { $exists: false } }] }),
    prodDb.collection("appointments").countDocuments({ $or: [{ "details.employees": { $exists: false } }, { "details.employees": { $size: 0 } }] }),
    prodDb.collection("users").countDocuments({ $or: [{ "details.email": { $exists: false } }, { "details.email": "" }, { "details.email": null }] }),
    prodDb.collection("users").countDocuments({ isSuspended: true }),
    prodDb.collection("companies").countDocuments({ isDecomissioned: true }),
    prodDb.collection("deleted_appointments").countDocuments({ status: "approved" }),
    prodDb
      .collection("appointments")
      .find({
        $or: [
          { status: { $exists: false } },
          { status: null },
          { "details.company.id": { $exists: false } },
          { usersWhoCanManage: { $exists: false } },
          { usersWhoCanManage: { $size: 0 } },
          { status: "approved", "payment.amount": { $lte: 0 } },
        ],
      })
      .project({ id: 1, status: 1, payment: 1, details: 1, usersWhoCanManage: 1, tracking: 1 })
      .sort({ "tracking.0.date": -1, _id: -1 })
      .limit(50)
      .toArray(),
  ]);

  return {
    counts: {
      missingStatus,
      missingCompanyId,
      missingManagers,
      zeroAmountApproved,
      appointmentWithoutEmployees,
      usersMissingEmail,
      suspendedUsers,
      decommissionedCompanies,
      approvedDeleted,
    },
    samples: samples.map(serializeId),
  };
}

export async function getAuditDashboard() {
  const companionDb = await getCompanionDb();
  const prodDb = await getDb();
  const legacyPipeline = (entityType: "appointment" | "company" | "user") => [
    { $match: { "tracking.0": { $exists: true } } },
    { $project: { id: 1, tracking: 1 } },
    { $unwind: "$tracking" },
    {
      $project: {
        _id: {
          $concat: [
            "tracking:",
            entityType,
            ":",
            { $ifNull: ["$id", { $toString: "$_id" }] },
            ":",
            { $ifNull: ["$tracking.type", "unknown"] },
            ":",
            { $toString: "$tracking.date" },
          ],
        },
        entityType,
        entityId: { $ifNull: ["$id", { $toString: "$_id" }] },
        action: { $ifNull: ["$tracking.type", "UNKNOWN"] },
        actorId: { $ifNull: ["$tracking.doer", null] },
        actorName: null,
        source: "live-tracking",
        createdAt: "$tracking.date",
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: 100 },
  ];

  const [events, legacyAppointmentEvents, legacyCompanyEvents, legacyUserEvents] = await Promise.all([
    companionDb.collection("audit_events").find().sort({ createdAt: -1 }).limit(100).toArray(),
    prodDb.collection("appointments").aggregate(legacyPipeline("appointment")).toArray(),
    prodDb.collection("companies").aggregate(legacyPipeline("company")).toArray(),
    prodDb.collection("users").aggregate(legacyPipeline("user")).toArray(),
  ]);

  const combinedEvents = [...events, ...legacyAppointmentEvents, ...legacyCompanyEvents, ...legacyUserEvents]
    .map(serializeId)
    .sort((a, b) => {
      const aTime = iso(a.createdAt) || "";
      const bTime = iso(b.createdAt) || "";
      return bTime.localeCompare(aTime);
    })
    .slice(0, 100);

  const countBy = (field: "action" | "source", limit?: number) => {
    const counts = new Map<string, number>();
    for (const event of combinedEvents) {
      const key = String(event[field] || "unknown");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const rows = Array.from(counts.entries())
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => b.count - a.count);
    return typeof limit === "number" ? rows.slice(0, limit) : rows;
  };

  return {
    events: combinedEvents,
    actionCounts: countBy("action", 12),
    sourceCounts: countBy("source"),
  };
}

function dayLabel(dayOfWeek: number): string {
  return DAY_LABELS[(dayOfWeek - 1 + 7) % 7] ?? String(dayOfWeek);
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getLocalParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: TIMING_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const dayIndex = DAY_LABELS.findIndex((label) => label.toLowerCase() === weekday.toLowerCase());
  return {
    dayOfWeek: dayIndex >= 0 ? dayIndex + 1 : date.getDay() + 1,
    hour,
  };
}

function summarizeTimedEvents<T extends string>(
  events: Array<{ group: T; createdAt: unknown }>,
  labels: Record<T, string>,
) {
  const totals = new Map<T, number>();
  const dayCounts = new Map<string, number>();
  const hourCounts = new Map<string, number>();
  const dayHourCounts = new Map<string, number>();

  for (const event of events) {
    const createdAt = toDate(event.createdAt);
    if (!createdAt) continue;

    const { dayOfWeek, hour } = getLocalParts(createdAt);
    totals.set(event.group, (totals.get(event.group) ?? 0) + 1);
    dayCounts.set(`${event.group}:${dayOfWeek}`, (dayCounts.get(`${event.group}:${dayOfWeek}`) ?? 0) + 1);
    hourCounts.set(`${event.group}:${hour}`, (hourCounts.get(`${event.group}:${hour}`) ?? 0) + 1);
    dayHourCounts.set(
      `${event.group}:${dayOfWeek}:${hour}`,
      (dayHourCounts.get(`${event.group}:${dayOfWeek}:${hour}`) ?? 0) + 1,
    );
  }

  const groups = Object.keys(labels) as T[];
  const byDay = groups.map((group) => ({
    group,
    label: labels[group],
    slots: Array.from({ length: 7 }, (_, index) => {
      const dayOfWeek = index + 1;
      return {
        key: String(dayOfWeek),
        label: dayLabel(dayOfWeek),
        count: dayCounts.get(`${group}:${dayOfWeek}`) ?? 0,
      };
    }),
  }));
  const byHour = groups.map((group) => ({
    group,
    label: labels[group],
    slots: Array.from({ length: 24 }, (_, hour) => ({
      key: String(hour),
      label: hourLabel(hour),
      count: hourCounts.get(`${group}:${hour}`) ?? 0,
    })),
  }));
  const dayHour = groups.map((group) => ({
    group,
    label: labels[group],
    slots: Array.from({ length: 7 * 24 }, (_, index): DayHourSlot => {
      const dayOfWeek = Math.floor(index / 24) + 1;
      const hour = index % 24;
      return {
        dayOfWeek,
        dayLabel: dayLabel(dayOfWeek),
        hour,
        count: dayHourCounts.get(`${group}:${dayOfWeek}:${hour}`) ?? 0,
      };
    }),
  }));
  const topSlots = groups.map((group) => ({
    group,
    label: labels[group],
    slots: dayHour
      .find((row) => row.group === group)!
      .slots.filter((slot) => slot.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  }));

  return {
    byDay,
    byHour,
    dayHour,
    topSlots,
    totals,
  };
}

function dateFromTrackingExpression() {
  return {
    $convert: {
      input: { $arrayElemAt: ["$tracking.date", 0] },
      to: "date",
      onError: null,
      onNull: null,
    },
  };
}

export async function getRoleLoginTimingDashboard() {
  const [prodDb, companionDb] = await Promise.all([getDb(), getCompanionDb()]);

  const [productionTrackingEvents, companionFirstLogins, auditLoginEvents] = await Promise.all([
    prodDb
      .collection("users")
      .aggregate<RawTimingEvent>([
        { $match: { role: { $in: ["admin", "client"] }, "tracking.0": { $exists: true } } },
        { $project: { role: 1, tracking: 1 } },
        { $unwind: "$tracking" },
        {
          $match: {
            "tracking.date": { $exists: true, $ne: null },
            "tracking.type": { $regex: TRACKING_LOGIN_PATTERN, $options: "i" },
          },
        },
        { $project: { role: 1, createdAt: "$tracking.date", source: { $literal: "production-user-tracking" } } },
        { $sort: { createdAt: -1 } },
        { $limit: EVENT_READ_LIMIT },
      ], { allowDiskUse: true })
      .toArray(),
    companionDb
      .collection<CompanionUserDoc>("companionUsers")
      .find({ firstLoginAt: { $exists: true } })
      .project({ productionUserId: 1, firstLoginAt: 1 })
      .sort({ firstLoginAt: -1, _id: -1 })
      .limit(EVENT_READ_LIMIT)
      .toArray(),
    companionDb
      .collection("audit_events")
      .find({
        createdAt: { $exists: true, $ne: null },
        action: { $regex: TRACKING_LOGIN_PATTERN, $options: "i" },
      })
      .project({ actorId: 1, createdAt: 1, source: 1 })
      .sort({ createdAt: -1, _id: -1 })
      .limit(EVENT_READ_LIMIT)
      .toArray(),
  ]);

  const productionIds = Array.from(
    new Set(
      [
        ...companionFirstLogins.map((row) => row.productionUserId),
        ...auditLoginEvents.map((row) => row.actorId),
      ].filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  const productionUsers = productionIds.length
    ? await prodDb.collection("users").find({ id: { $in: productionIds } }).project({ id: 1, role: 1 }).toArray()
    : [];
  const roleByProductionId = new Map(productionUsers.map((user) => [user.id, user.role]));

  const companionEvents = companionFirstLogins
    .map((row) => ({
      group: roleByProductionId.get(row.productionUserId ?? "") as "admin" | "client" | undefined,
      createdAt: row.firstLoginAt,
      source: "companion-first-login",
    }))
    .filter((row): row is { group: "admin" | "client"; createdAt: unknown; source: string } =>
      row.group === "admin" || row.group === "client",
    );
  const auditEvents = auditLoginEvents
    .map((row) => ({
      group: roleByProductionId.get(row.actorId ?? "") as "admin" | "client" | undefined,
      createdAt: row.createdAt,
      source: "companion-audit-login",
    }))
    .filter((row): row is { group: "admin" | "client"; createdAt: unknown; source: string } =>
      row.group === "admin" || row.group === "client",
    );
  const productionEvents = productionTrackingEvents
    .map((row) => ({
      group: row.role as "admin" | "client",
      createdAt: row.createdAt,
      source: row.source ?? "production-user-tracking",
    }))
    .filter((row) => row.group === "admin" || row.group === "client");
  const events = [...productionEvents, ...auditEvents, ...companionEvents];
  const timing = summarizeTimedEvents(events, { admin: "Admins", client: "Clients" });

  const summaries: RoleTimingSummary[] = (["admin", "client"] as const).map((role) => {
    const peakDay = timing.byDay
      .find((row) => row.group === role)!
      .slots.reduce((best, slot) => (slot.count > best.count ? slot : best));
    const peakHour = timing.byHour
      .find((row) => row.group === role)!
      .slots.reduce((best, slot) => (slot.count > best.count ? slot : best));
    return {
      role,
      total: timing.totals.get(role) ?? 0,
      peakDay: peakDay.count ? peakDay.label : "-",
      peakHour: peakHour.count ? peakHour.label : "-",
    };
  });

  const sourceCounts = events.reduce<Record<string, number>>((counts, event) => {
    counts[event.source] = (counts[event.source] ?? 0) + 1;
    return counts;
  }, {});

  return {
    summaries,
    byDay: timing.byDay,
    byHour: timing.byHour,
    dayHour: timing.dayHour,
    topSlots: timing.topSlots,
    sourceCounts,
    timezone: TIMING_TIMEZONE,
  };
}

export async function getLifecycleTimingDashboard() {
  const prodDb = await getDb();

  const [events] = await Promise.all([
    prodDb
      .collection("users")
      .aggregate<RawTimingEvent>([
        { $project: { eventType: { $literal: "signups" }, createdAt: dateFromTrackingExpression() } },
        { $match: { createdAt: { $ne: null } } },
        {
          $unionWith: {
            coll: "appointments",
            pipeline: [
              { $project: { eventType: { $literal: "appointments" }, createdAt: dateFromTrackingExpression() } },
              { $match: { createdAt: { $ne: null } } },
            ],
          },
        },
        {
          $unionWith: {
            coll: "deleted_appointments",
            pipeline: [
              { $project: { eventType: { $literal: "appointments" }, createdAt: dateFromTrackingExpression() } },
              { $match: { createdAt: { $ne: null } } },
            ],
          },
        },
        {
          $unionWith: {
            coll: "companies",
            pipeline: [
              { $project: { eventType: { $literal: "companies" }, createdAt: dateFromTrackingExpression() } },
              { $match: { createdAt: { $ne: null } } },
            ],
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: EVENT_READ_LIMIT * 2 },
      ], { allowDiskUse: true })
      .toArray(),
  ]);

  const labels = {
    signups: "User signups",
    appointments: "Appointments created",
    companies: "Companies created",
  };
  const timing = summarizeTimedEvents(
    events
      .map((event) => ({
        group: event.eventType as keyof typeof labels,
        createdAt: event.createdAt,
      }))
      .filter((event) => event.group in labels),
    labels,
  );

  const summaries: LifecycleTimingSummary[] = (Object.keys(labels) as Array<keyof typeof labels>).map((eventType) => {
    const peakDay = timing.byDay
      .find((row) => row.group === eventType)!
      .slots.reduce((best, slot) => (slot.count > best.count ? slot : best));
    const peakHour = timing.byHour
      .find((row) => row.group === eventType)!
      .slots.reduce((best, slot) => (slot.count > best.count ? slot : best));
    return {
      eventType,
      label: labels[eventType],
      total: timing.totals.get(eventType) ?? 0,
      peakDay: peakDay.count ? peakDay.label : "-",
      peakHour: peakHour.count ? peakHour.label : "-",
    };
  });

  return {
    summaries,
    byDay: timing.byDay,
    byHour: timing.byHour,
    dayHour: timing.dayHour,
    topSlots: timing.topSlots,
    timezone: TIMING_TIMEZONE,
  };
}

export function displayDate(value: unknown): string {
  const date = iso(value);
  return date ? new Date(date).toLocaleDateString("en-ZA") : "-";
}
