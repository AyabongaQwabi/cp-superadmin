import { getCompanionDb, getDb } from "../mongodb";
import { getCompany360 } from "../superadmin-read-model";
import { dedupeEntities, entityRef } from "../entity-routes";

type Serialized<T extends { _id?: unknown }> = Omit<T, "_id"> & { _id: string };

function serializeId<T extends { _id?: unknown }>(doc: T): Serialized<T> {
  return { ...doc, _id: String(doc._id ?? "") };
}

export async function findCompany(companyId: string) {
  const db = await getDb();
  const company = await db.collection("companies").findOne({ id: companyId });
  const name = company?.details?.name;
  return {
    available: true,
    found: !!company,
    company: company ? serializeId(company) : null,
    entities: dedupeEntities([entityRef("company", companyId, name ?? companyId)]),
  };
}

export async function findCompanyManager(companyId: string) {
  const db = await getDb();
  const rows = await db
    .collection("appointments")
    .aggregate([
      { $match: { "details.company.id": companyId } },
      { $unwind: { path: "$usersWhoCanManage", preserveNullAndEmptyArrays: false } },
      { $group: { _id: { id: "$usersWhoCanManage.id", name: "$usersWhoCanManage.name" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ])
    .toArray();
  const managers = rows.map((r) => ({ id: r._id.id ?? null, name: r._id.name ?? null, appointmentCount: r.count }));
  return {
    available: true,
    managers,
    entities: dedupeEntities(managers.map((m) => entityRef("user", m.id, m.name))),
  };
}

export async function findCompanyEmployees(companyId: string, limit = 50) {
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
  return {
    available: true,
    count: rows.length,
    employees: rows,
    entities: dedupeEntities(rows.map((r) => entityRef("employee", r._id, r.name))),
  };
}

export async function findCompanySites(companyId: string, limit = 50) {
  const companionDb = await getCompanionDb();
  const rows = await companionDb
    .collection("siteDirectory")
    .find({ companyIds: companyId })
    .sort({ lastUsedAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const sites = rows.map(serializeId);
  const entities = dedupeEntities(
    sites.map((s) => {
      const id = s._id;
      const name = typeof s.name === "string" ? s.name : undefined;
      return entityRef("site", id, name ?? `Site ${id}`);
    }),
  );
  return { available: true, count: rows.length, sites, entities };
}

export async function findCompanyAppointments(companyId: string, limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("appointments")
    .find({ "details.company.id": companyId })
    .project({ id: 1, status: 1, payment: 1, details: 1, tracking: 1, usersWhoCanManage: 1 })
    .sort({ "tracking.0.date": -1, _id: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const appointments = rows.map(serializeId);
  const entities = dedupeEntities(
    appointments.map((a) => {
      const id = typeof a.id === "string" ? a.id : undefined;
      return entityRef("appointment", id, id);
    }),
  );
  return { available: true, count: rows.length, appointments, entities };
}

export async function findCompanyInvoices(companyId: string, limit = 50) {
  const companionDb = await getCompanionDb();
  const rows = await companionDb
    .collection("invoices")
    .find({ companyId })
    .sort({ sentAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const invoices = rows.map(serializeId);
  const entities = dedupeEntities(
    invoices.map((inv) => {
      const id = typeof inv.id === "string" ? inv.id : undefined;
      return entityRef("invoice", id, id);
    }),
  );
  return { available: true, count: rows.length, invoices, entities };
}

export async function findCompanyBookingPattern(companyId: string) {
  const companionDb = await getCompanionDb();
  const pattern = await companionDb.collection("bookingPatterns").findOne({ companyId });
  return {
    available: true,
    found: !!pattern,
    pattern: pattern ? serializeId(pattern) : null,
    entities: dedupeEntities([entityRef("company", companyId, companyId)]),
  };
}

export async function findCompanyComplianceStatus(_companyId: string) {
  return {
    available: false,
    reason:
      "No compliance-status concept exists on the company schema or in cp_companion -- companies has details/registration/vat fields and companyProfiles/bookingPatterns/dormancyFlags exist, but nothing tracks a compliance state. Would need schema clarification before building this.",
  };
}

export async function findCompanyDormancyStatus(companyId: string) {
  const companionDb = await getCompanionDb();
  const flags = await companionDb.collection("dormancyFlags").find({ companyId }).toArray();
  return {
    available: true,
    isDormant: flags.length > 0,
    flags: flags.map(serializeId),
    entities: dedupeEntities([entityRef("company", companyId, companyId)]),
  };
}

export async function findCompanyAuditHistory(companyId: string) {
  const companionDb = await getCompanionDb();
  const events = await companionDb
    .collection("audit_events")
    .find({ $or: [{ entityType: "company", entityId: companyId }, { "metadata.companyId": companyId }] })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return {
    available: true,
    count: events.length,
    auditEvents: events.map(serializeId),
    entities: dedupeEntities([entityRef("company", companyId, companyId)]),
  };
}

export async function findCompany360(companyId: string) {
  const data = await getCompany360(companyId);
  const companyName = data.company?.details?.name;
  const appointmentEntities = (data.recentAppointments ?? []).map((a) => {
    const id = typeof a.id === "string" ? a.id : undefined;
    return entityRef("appointment", id, id);
  });
  return {
    available: true,
    ...data,
    entities: dedupeEntities([entityRef("company", companyId, companyName ?? companyId), ...appointmentEntities]),
  };
}

export async function findCompanySupportTickets(companyId: string, limit = 50) {
  const companionDb = await getCompanionDb();
  const db = await getDb();
  const employeeIds = await db
    .collection("appointments")
    .aggregate([
      { $match: { "details.company.id": companyId } },
      { $unwind: { path: "$usersWhoCanManage", preserveNullAndEmptyArrays: false } },
      { $group: { _id: "$usersWhoCanManage.id" } },
    ])
    .toArray();
  const userIds = employeeIds.map((r) => r._id).filter((id): id is string => typeof id === "string" && id.length > 0);
  const rows = await companionDb
    .collection("supportTickets")
    .find({ submittedByUserId: { $in: userIds } })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  return {
    available: true,
    count: rows.length,
    tickets: rows.map(serializeId),
    entities: dedupeEntities([entityRef("company", companyId, companyId)]),
  };
}

export async function findCompaniesWithAnomalies(limit = 50) {
  const companionDb = await getCompanionDb();
  const rows = await companionDb
    .collection("anomalyFlags")
    .find({ companyId: { $exists: true, $ne: null } })
    .sort({ flaggedAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const anomalies = rows.map(serializeId);
  const entities = dedupeEntities(
    anomalies.map((a) => {
      const companyId = typeof a.companyId === "string" ? a.companyId : undefined;
      return entityRef("company", companyId, companyId);
    }),
  );
  return { available: true, count: rows.length, anomalies, entities };
}

export async function findDormantCompanies(limit = 50) {
  const companionDb = await getCompanionDb();
  const rows = await companionDb
    .collection("dormancyFlags")
    .find({})
    .sort({ flaggedAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const companies = rows.map(serializeId);
  const entities = dedupeEntities(
    companies.map((c) => {
      const companyId = typeof c.companyId === "string" ? c.companyId : undefined;
      return entityRef("company", companyId, companyId);
    }),
  );
  return { available: true, count: rows.length, companies, entities };
}

export async function findNewLeadCompanies(limit = 50) {
  const companionDb = await getCompanionDb();
  const rows = await companionDb
    .collection("newCompanyLeads")
    .find({ isOnCompanion: false })
    .sort({ _id: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  return { available: true, count: rows.length, leads: rows.map(serializeId) };
}

export async function findDeletedCompanies(_limit = 50) {
  return {
    available: false,
    reason:
      "No 'deleted_companies' collection exists in the production database (unlike appointments, which has a deleted_appointments collection). Companies appear to use an isDecomissioned flag on the live companies collection instead of a separate deleted collection. Would need schema clarification before building this.",
  };
}
