import { getCompanionDb, getDb } from "../mongodb";
import { dedupeEntities, entityRef } from "../entity-routes";

type Serialized<T extends { _id?: unknown }> = Omit<T, "_id"> & { _id: string };

function serializeId<T extends { _id?: unknown }>(doc: T): Serialized<T> {
  return { ...doc, _id: String(doc._id ?? "") };
}

export async function findUser(userId: string) {
  const db = await getDb();
  const user = await db.collection("users").findOne({ id: userId }, { projection: { hash: 0, password: 0, token: 0 } });
  if (!user) return { available: true, found: false, user: null };
  const serialized = serializeId(user);
  const name = typeof serialized.details?.name === "string" ? serialized.details.name : undefined;
  return {
    available: true,
    found: true,
    user: serialized,
    entities: dedupeEntities([entityRef("user", userId, name ?? userId)]),
  };
}

export async function findUserRole(userId: string) {
  const db = await getDb();
  const user = await db.collection("users").findOne({ id: userId }, { projection: { id: 1, role: 1 } });
  if (!user) return { available: true, found: false };
  return {
    available: true,
    found: true,
    role: user.role ?? null,
    entities: dedupeEntities([entityRef("user", userId, userId)]),
  };
}

export async function findUserAppointments(userId: string, limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("appointments")
    .find({ $or: [{ "usersWhoCanManage.id": userId }, { "tracking.doer": userId }] })
    .project({ id: 1, status: 1, payment: 1, details: 1, tracking: 1, usersWhoCanManage: 1 })
    .sort({ "tracking.0.date": -1, _id: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const appointments = rows.map(serializeId);
  const entities = dedupeEntities([
    entityRef("user", userId, userId),
    ...appointments.map((a) => {
      const id = typeof a.id === "string" ? a.id : undefined;
      return entityRef("appointment", id, id);
    }),
  ]);
  return { available: true, count: rows.length, appointments, entities };
}

export async function findUserCompanies(userId: string, limit = 50) {
  const db = await getDb();
  const user = await db.collection("users").findOne({ id: userId }, { projection: { companiesCanEdit: 1, companiesManaging: 1 } });
  const companies = [...(user?.companiesCanEdit ?? []), ...(user?.companiesManaging ?? [])].slice(0, Math.min(limit, 200));
  const entities = dedupeEntities([
    entityRef("user", userId, userId),
    ...companies.map((c: Record<string, unknown>) => {
      const id = typeof c.id === "string" ? c.id : undefined;
      const name = typeof c.name === "string" ? c.name : undefined;
      return entityRef("company", id, name ?? id);
    }),
  ]);
  return { available: true, found: !!user, count: companies.length, companies, entities };
}

export async function findUserAuditHistory(userId: string) {
  const companionDb = await getCompanionDb();
  const events = await companionDb
    .collection("audit_events")
    .find({ $or: [{ entityType: "user", entityId: userId }, { actorId: userId }] })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return {
    available: true,
    count: events.length,
    auditEvents: events.map(serializeId),
    entities: dedupeEntities([entityRef("user", userId, userId)]),
  };
}

export async function findAdminActivity(userId: string, limit = 50) {
  const companionDb = await getCompanionDb();
  const events = await companionDb
    .collection("audit_events")
    .find({ actorId: userId, actorType: "admin" })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  return {
    available: true,
    count: events.length,
    activity: events.map(serializeId),
    entities: dedupeEntities([entityRef("user", userId, userId)]),
  };
}

export async function findDeletedUsers(_limit = 50) {
  return {
    available: false,
    reason:
      "No 'deleted_users' collection exists in the production database (unlike appointments, which has a deleted_appointments collection). Users appear to use an isSuspended flag on the live users collection instead of a separate deleted collection. Would need schema clarification before building this.",
  };
}

export async function findEmployee(employeeId: string) {
  const companionDb = await getCompanionDb();
  const employee = await companionDb.collection("employeeDirectory").findOne({ idNumber: employeeId });
  if (!employee) return { available: true, found: false };
  const serialized = serializeId(employee);
  const name = typeof serialized.displayName === "string" ? serialized.displayName : undefined;
  return {
    available: true,
    found: true,
    employee: serialized,
    entities: dedupeEntities([entityRef("employee", employeeId, name ?? employeeId)]),
  };
}

export async function findEmployeeJobSpec(_employeeId: string) {
  return {
    available: false,
    reason:
      "No 'job specification' concept exists on the employeeDirectory schema or elsewhere in cp_companion -- employeeDirectory only tracks idNumber, displayName, matchConfidence, and occupations[]. Would need schema clarification before building this.",
  };
}

export async function findEmployeeJobSpecs(_employeeId: string, _limit = 50) {
  return {
    available: false,
    reason:
      "No 'job specification' concept exists on the employeeDirectory schema or elsewhere in cp_companion -- employeeDirectory only tracks idNumber, displayName, matchConfidence, and occupations[]. Would need schema clarification before building this.",
  };
}

export async function findEmployeeAppointmentHistory(employeeId: string, limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("appointments")
    .find({ "details.employees.id": employeeId })
    .project({ id: 1, status: 1, payment: 1, details: 1, tracking: 1 })
    .sort({ "tracking.0.date": -1, _id: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const appointments = rows.map(serializeId);
  const entities = dedupeEntities([
    entityRef("employee", employeeId, employeeId),
    ...appointments.map((a) => {
      const id = typeof a.id === "string" ? a.id : undefined;
      return entityRef("appointment", id, id);
    }),
  ]);
  return { available: true, count: rows.length, appointments, entities };
}

export async function findEmployeeStats(employeeId: string) {
  const companionDb = await getCompanionDb();
  const stats = await companionDb.collection("employeeStats").findOne({ employeeDirectoryId: employeeId });
  return {
    available: true,
    found: !!stats,
    stats: stats ? serializeId(stats) : null,
    entities: dedupeEntities([entityRef("employee", employeeId, employeeId)]),
  };
}

export async function findEmployeeTopCompanies(employeeId: string, limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("appointments")
    .aggregate([
      { $match: { "details.employees.id": employeeId } },
      {
        $group: {
          _id: { id: "$details.company.id", name: "$details.company.name" },
          appointmentCount: { $sum: 1 },
        },
      },
      { $sort: { appointmentCount: -1 } },
      { $limit: Math.min(limit, 200) },
    ])
    .toArray();
  const companies = rows.map((r) => ({ companyId: r._id.id ?? null, companyName: r._id.name ?? null, appointmentCount: r.appointmentCount }));
  const entities = dedupeEntities([
    entityRef("employee", employeeId, employeeId),
    ...companies.map((c) => entityRef("company", c.companyId, c.companyName ?? c.companyId)),
  ]);
  return { available: true, count: rows.length, companies, entities };
}

export async function findEmployeePastSites(employeeId: string, limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("appointments")
    .aggregate([
      { $match: { "details.employees.id": employeeId } },
      { $unwind: { path: "$details.employees", preserveNullAndEmptyArrays: false } },
      { $match: { "details.employees.id": employeeId } },
      { $unwind: { path: "$details.employees.sites", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$details.employees.sites",
          lastSeen: { $max: { $first: "$tracking.date" } },
          appointmentCount: { $sum: 1 },
        },
      },
      { $sort: { lastSeen: -1 } },
      { $limit: Math.min(limit, 200) },
    ])
    .toArray();
  const entities = dedupeEntities([
    entityRef("employee", employeeId, employeeId),
    ...rows.map((r) => {
      const site = r._id as Record<string, unknown> | undefined;
      const id = typeof site?.id === "string" ? site.id : undefined;
      const name = typeof site?.name === "string" ? site.name : undefined;
      return entityRef("site", id, name ?? id);
    }),
  ]);
  return { available: true, count: rows.length, sites: rows, entities };
}

export async function findEmployeeLatestSite(employeeId: string) {
  const db = await getDb();
  const rows = await db
    .collection("appointments")
    .aggregate([
      { $match: { "details.employees.id": employeeId } },
      { $unwind: { path: "$details.employees", preserveNullAndEmptyArrays: false } },
      { $match: { "details.employees.id": employeeId } },
      { $unwind: { path: "$details.employees.sites", preserveNullAndEmptyArrays: false } },
      { $sort: { "tracking.0.date": -1 } },
      { $limit: 1 },
    ])
    .toArray();
  const row = rows[0];
  if (!row) return { available: true, found: false };
  const site = row.details?.employees?.sites ?? null;
  const siteId = typeof site?.id === "string" ? site.id : undefined;
  const siteName = typeof site?.name === "string" ? site.name : undefined;
  const appointmentId = typeof row.id === "string" ? row.id : undefined;
  const entities = dedupeEntities([
    entityRef("employee", employeeId, employeeId),
    entityRef("site", siteId, siteName ?? siteId),
    entityRef("appointment", appointmentId, appointmentId),
  ]);
  return { available: true, found: true, site, appointmentId: row.id, entities };
}

export async function findEmployeeDemographics(_employeeId: string) {
  return {
    available: false,
    reason:
      "No demographic fields (age, gender, etc.) exist on the employeeDirectory schema in cp_companion -- it only tracks idNumber, displayName, matchConfidence, idNumberValid, and occupations[]. Would need schema clarification before building this.",
  };
}

export async function findEmployeesByCompany(companyId: string, limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("appointments")
    .aggregate([
      { $match: { "details.company.id": companyId } },
      { $unwind: { path: "$details.employees", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$details.employees.id",
          name: { $first: "$details.employees.name" },
          appointmentCount: { $sum: 1 },
        },
      },
      { $sort: { appointmentCount: -1 } },
      { $limit: Math.min(limit, 200) },
    ])
    .toArray();
  const entities = dedupeEntities([
    entityRef("company", companyId, companyId),
    ...rows.map((r) => {
      const id = typeof r._id === "string" ? r._id : undefined;
      const name = typeof r.name === "string" ? r.name : undefined;
      return entityRef("employee", id, name ?? id);
    }),
  ]);
  return { available: true, count: rows.length, employees: rows, entities };
}
