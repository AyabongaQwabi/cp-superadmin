import { getCompanionDb, getDb } from "../mongodb";
import { getClinicCapacity, getDataQualityDashboard } from "../superadmin-read-model";
import { getCompanySummary, getOverviewTotals } from "../aggregations";
import { dedupeEntities, entityRef, type EntityType } from "../entity-routes";

const VALID_ENTITY_TYPES: EntityType[] = ["company", "appointment", "user", "employee", "site", "invoice"];

function isEntityType(value: unknown): value is EntityType {
  return typeof value === "string" && (VALID_ENTITY_TYPES as string[]).includes(value);
}

type Serialized<T extends { _id?: unknown }> = Omit<T, "_id"> & { _id: string };

function serializeId<T extends { _id?: unknown }>(doc: T): Serialized<T> {
  return { ...doc, _id: String(doc._id ?? "") };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function findClinicAvailability(clinic: string, from?: string, to?: string) {
  const db = await getDb();
  const match: Record<string, unknown> = { "details.clinic": clinic };
  if (from || to) {
    const dateMatch: Record<string, string> = {};
    if (from) dateMatch.$gte = from;
    if (to) dateMatch.$lte = to;
    match["details.date"] = dateMatch;
  }
  const rows = await db
    .collection("appointments")
    .aggregate([
      { $match: match },
      { $group: { _id: "$details.date", appointments: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 200 },
    ])
    .toArray();
  return { available: true, byDate: rows.map((r) => ({ date: r._id, appointments: r.appointments })) };
}

export async function findClinicCapacity(clinic: string) {
  const data = await getClinicCapacity();
  const limit = data.limits[clinic] ?? null;
  const upcoming = data.upcoming.filter((row) => row._id.clinic === clinic);
  return { available: true, clinic, limit, upcoming, window: data.window };
}

function ticketEntities(tickets: Array<Record<string, unknown>>): ReturnType<typeof dedupeEntities> {
  return dedupeEntities(
    tickets.map((t) => {
      const id = typeof t.submittedByUserId === "string" ? t.submittedByUserId : undefined;
      return entityRef("user", id, id);
    }),
  );
}

export async function findSupportTicket(ticketId: string) {
  const companionDb = await getCompanionDb();
  const ticket = await companionDb.collection("supportTickets").findOne({ id: ticketId });
  if (!ticket) return { available: true, found: false, ticket: null };
  const serialized = serializeId(ticket);
  return { available: true, found: true, ticket: serialized, entities: ticketEntities([serialized]) };
}

export async function findOpenSupportTickets(limit = 50) {
  const companionDb = await getCompanionDb();
  const rows = await companionDb
    .collection("supportTickets")
    .find({ status: "open" })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const tickets = rows.map(serializeId);
  return { available: true, count: rows.length, tickets, entities: ticketEntities(tickets) };
}

export async function findUserTickets(userId: string, limit = 50) {
  const companionDb = await getCompanionDb();
  const rows = await companionDb
    .collection("supportTickets")
    .find({ submittedByUserId: userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const tickets = rows.map(serializeId);
  return {
    available: true,
    count: rows.length,
    tickets,
    entities: dedupeEntities([entityRef("user", userId, userId)]),
  };
}

export async function findTicketsByCategory(category: string, limit = 50) {
  const companionDb = await getCompanionDb();
  const rows = await companionDb
    .collection("supportTickets")
    .find({ category })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const tickets = rows.map(serializeId);
  return { available: true, count: rows.length, tickets, entities: ticketEntities(tickets) };
}

export async function findPlatformControlState() {
  const db = await getDb();
  const settings = await db.collection("systemSettings").findOne({});
  if (!settings) return { available: true, found: false };
  return {
    available: true,
    found: true,
    client: settings.client ?? null,
    admin: settings.admin ?? null,
    limits: settings.limits ?? null,
  };
}

export async function findLockdownStatus(entityId?: string) {
  const db = await getDb();
  const settings = await db.collection("systemSettings").findOne({});
  const platformLockdown = {
    clientUnderMaintenance: settings?.client?.underMaintanance ?? false,
    adminUnderMaintenance: settings?.admin?.underMaintanance ?? false,
  };
  if (!entityId) {
    return { available: true, scope: "platform", ...platformLockdown };
  }
  return {
    available: false,
    reason:
      "No per-entity lockdown/suspension concept exists beyond systemSettings' platform-wide client/admin maintenance flags -- entity-level access is only reflected via users.isSuspended or companies.isDecomissioned, which are distinct concepts from a 'lockdown'. Would need schema clarification before building per-entity lockdown lookup.",
    scope: "platform",
    ...platformLockdown,
  };
}

export async function findUserAccessLevel(userId: string) {
  const db = await getDb();
  const user = await db.collection("users").findOne({ id: userId }, { projection: { id: 1, role: 1, isSuspended: 1 } });
  if (!user) return { available: true, found: false };
  return {
    available: true,
    found: true,
    role: user.role ?? null,
    isSuspended: user.isSuspended ?? false,
    entities: dedupeEntities([entityRef("user", userId, userId)]),
  };
}

export async function findAccessControlHistory(userId: string, limit = 50) {
  const companionDb = await getCompanionDb();
  const events = await companionDb
    .collection("audit_events")
    .find({
      $or: [
        { entityType: "user", entityId: userId, action: { $regex: "(suspend|role|access|permission)", $options: "i" } },
        { actorId: userId, action: { $regex: "(suspend|role|access|permission)", $options: "i" } },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  return {
    available: true,
    count: events.length,
    events: events.map(serializeId),
    entities: dedupeEntities([entityRef("user", userId, userId)]),
  };
}

export async function findDeletedEntity(entityType: string, entityId: string) {
  const db = await getDb();
  if (entityType === "appointment") {
    const deleted = await db.collection("deleted_appointments").findOne({ id: entityId });
    if (!deleted) return { available: true, found: false, entity: null };
    return {
      available: true,
      found: true,
      entity: serializeId(deleted),
      entities: dedupeEntities([entityRef("appointment", entityId, entityId)]),
    };
  }
  return {
    available: false,
    reason: `No deleted-entity collection exists for entityType '${entityType}' -- only appointments have a dedicated deleted_appointments collection. Companies and users mark deletion/deactivation via flags (companies.isDecomissioned, users.isSuspended) on the live collection instead. Would need schema clarification before building this for other entity types.`,
  };
}

export async function globalSearch(query: string, limit = 50) {
  const [db, companionDb] = await Promise.all([getDb(), getCompanionDb()]);
  const escaped = escapeRegex(query);
  const perTypeLimit = Math.min(limit, 200);

  const [companies, users, appointments, invoices] = await Promise.all([
    db
      .collection("companies")
      .find({ $or: [{ id: { $regex: escaped, $options: "i" } }, { "details.name": { $regex: escaped, $options: "i" } }] })
      .limit(perTypeLimit)
      .toArray(),
    db
      .collection("users")
      .find({
        $or: [
          { id: { $regex: escaped, $options: "i" } },
          { "details.name": { $regex: escaped, $options: "i" } },
          { "details.email": { $regex: escaped, $options: "i" } },
        ],
      })
      .project({ hash: 0, password: 0, token: 0 })
      .limit(perTypeLimit)
      .toArray(),
    db
      .collection("appointments")
      .find({ $or: [{ id: { $regex: escaped, $options: "i" } }, { "details.company.name": { $regex: escaped, $options: "i" } }] })
      .project({ id: 1, status: 1, details: 1 })
      .limit(perTypeLimit)
      .toArray(),
    db
      .collection("invoices")
      .find({ id: { $regex: escaped, $options: "i" } })
      .limit(perTypeLimit)
      .toArray(),
  ]);

  const ticketResults = await companionDb
    .collection("supportTickets")
    .find({ $or: [{ id: { $regex: escaped, $options: "i" } }, { message: { $regex: escaped, $options: "i" } }] })
    .limit(perTypeLimit)
    .toArray();

  const serializedCompanies = companies.map(serializeId);
  const serializedUsers = users.map(serializeId);
  const serializedAppointments = appointments.map(serializeId);
  const serializedInvoices = invoices.map(serializeId);

  const entities = dedupeEntities([
    ...serializedCompanies.map((c) => {
      const id = typeof c.id === "string" ? c.id : undefined;
      const name = typeof c.details?.name === "string" ? c.details.name : undefined;
      return entityRef("company", id, name ?? id);
    }),
    ...serializedUsers.map((u) => {
      const id = typeof u.id === "string" ? u.id : undefined;
      const name = typeof u.details?.name === "string" ? u.details.name : undefined;
      return entityRef("user", id, name ?? id);
    }),
    ...serializedAppointments.map((a) => {
      const id = typeof a.id === "string" ? a.id : undefined;
      return entityRef("appointment", id, id);
    }),
    ...serializedInvoices.map((inv) => {
      const id = typeof inv.id === "string" ? inv.id : undefined;
      return entityRef("invoice", id, id);
    }),
  ]);

  return {
    available: true,
    companies: serializedCompanies,
    users: serializedUsers,
    appointments: serializedAppointments,
    invoices: serializedInvoices,
    supportTickets: ticketResults.map(serializeId),
    entities,
  };
}

export async function findRecentActivity(limit = 50) {
  const companionDb = await getCompanionDb();
  const events = await companionDb
    .collection("audit_events")
    .find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const serialized = events.map(serializeId);
  const entities = dedupeEntities(
    serialized.map((e) => {
      const entityType = isEntityType(e.entityType) ? e.entityType : undefined;
      const entityId = typeof e.entityId === "string" ? e.entityId : undefined;
      if (!entityType) return null;
      return entityRef(entityType, entityId, entityId);
    }),
  );
  return { available: true, count: events.length, events: serialized, entities };
}

export async function findDataQualityAnomalies(limit = 50) {
  const data = await getDataQualityDashboard();
  const samples = data.samples.slice(0, Math.min(limit, 200));
  const entities = dedupeEntities(
    samples.map((s) => {
      const id = typeof s.id === "string" ? s.id : undefined;
      return entityRef("appointment", id, id);
    }),
  );
  return { available: true, counts: data.counts, samples, entities };
}

export async function findAdoptionTrends(from?: string, to?: string) {
  const companionDb = await getCompanionDb();
  const match: Record<string, unknown> = {};
  if (from || to) {
    const dateMatch: Record<string, Date> = {};
    if (from) dateMatch.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateMatch.$lte = toDate;
    }
    match.computedAt = dateMatch;
  }
  const rows = await companionDb
    .collection("adoptionMetrics")
    .find(match)
    .sort({ computedAt: -1 })
    .limit(200)
    .toArray();
  return { available: true, count: rows.length, metrics: rows.map(serializeId) };
}

export async function findFinanceSummary(from?: string, to?: string) {
  if (!from && !to) {
    const totals = await getOverviewTotals();
    return { available: true, ...totals };
  }

  const db = await getDb();
  const match: Record<string, unknown> = {};
  const dateMatch: Record<string, string> = {};
  if (from) dateMatch.$gte = from;
  if (to) dateMatch.$lte = to;
  if (Object.keys(dateMatch).length) match["details.date"] = dateMatch;

  const [result] = await db
    .collection("appointments")
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalAppointments: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          declined: { $sum: { $cond: [{ $eq: ["$status", "declined"] }, 1, 0] } },
          collected: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, { $ifNull: ["$payment.amount", 0] }, 0] },
          },
          lost: {
            $sum: { $cond: [{ $eq: ["$status", "declined"] }, { $ifNull: ["$payment.amount", 0] }, 0] },
          },
        },
      },
    ])
    .toArray();

  return {
    available: true,
    window: { from: from ?? null, to: to ?? null },
    totalAppointments: result?.totalAppointments ?? 0,
    approved: result?.approved ?? 0,
    declined: result?.declined ?? 0,
    collected: result?.collected ?? 0,
    lost: result?.lost ?? 0,
  };
}

export async function findBookingPatterns(from?: string, to?: string) {
  const year = from ? new Date(from).getFullYear() : undefined;
  const summary = await getCompanySummary(year ? { year } : {});
  const companies = summary.slice(0, 200);
  const entities = dedupeEntities(
    companies.map((c) => entityRef("company", c.companyId, c.companyName ?? c.companyId)),
  );
  return { available: true, window: { from: from ?? null, to: to ?? null }, companies, entities };
}
