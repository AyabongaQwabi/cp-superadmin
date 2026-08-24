import { ObjectId } from "mongodb";
import { getCompanionDb, getDb } from "../mongodb";
import { dedupeEntities, entityRef } from "../entity-routes";

type Serialized<T extends { _id?: unknown }> = Omit<T, "_id"> & { _id: string };

function serializeId<T extends { _id?: unknown }>(doc: T): Serialized<T> {
  return { ...doc, _id: String(doc._id ?? "") };
}

function toSiteObjectId(siteId: string): ObjectId | null {
  return ObjectId.isValid(siteId) ? new ObjectId(siteId) : null;
}

async function findSiteRaw(siteId: string) {
  const objectId = toSiteObjectId(siteId);
  if (!objectId) return null;
  const companionDb = await getCompanionDb();
  return companionDb.collection("siteDirectory").findOne({ _id: objectId });
}

export async function findSite(siteId: string) {
  const site = await findSiteRaw(siteId);
  if (!site) return { available: true, found: false, site: null };
  const serialized = serializeId(site);
  const name = typeof serialized.name === "string" ? serialized.name : undefined;
  return {
    available: true,
    found: true,
    site: serialized,
    entities: dedupeEntities([entityRef("site", siteId, name ?? `Site ${siteId}`)]),
  };
}

export async function findSiteCompanies(siteId: string, limit = 50) {
  const site = await findSiteRaw(siteId);
  const companyIds: string[] = (site?.companyIds ?? []).slice(0, Math.min(limit, 200));
  const siteName = typeof site?.name === "string" ? site.name : undefined;
  const entities = dedupeEntities([
    entityRef("site", siteId, siteName ?? `Site ${siteId}`),
    ...companyIds.map((id) => entityRef("company", id, id)),
  ]);
  return { available: true, found: !!site, count: companyIds.length, companyIds, entities };
}

export async function findSiteCurrentEmployees(siteId: string, limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("appointments")
    .aggregate([
      { $match: { "details.employees.sites.id": siteId, status: { $ne: "declined" } } },
      { $unwind: { path: "$details.employees", preserveNullAndEmptyArrays: false } },
      { $match: { "details.employees.sites.id": siteId } },
      {
        $group: {
          _id: "$details.employees.id",
          name: { $first: "$details.employees.name" },
          lastSeen: { $max: { $first: "$tracking.date" } },
        },
      },
      { $sort: { lastSeen: -1 } },
      { $limit: Math.min(limit, 200) },
    ])
    .toArray();
  const entities = dedupeEntities([
    entityRef("site", siteId, `Site ${siteId}`),
    ...rows.map((r) => {
      const id = typeof r._id === "string" ? r._id : undefined;
      const name = typeof r.name === "string" ? r.name : undefined;
      return entityRef("employee", id, name ?? id);
    }),
  ]);
  return { available: true, count: rows.length, employees: rows, entities };
}

export async function findSitePastEmployees(siteId: string, limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("appointments")
    .aggregate([
      { $match: { "details.employees.sites.id": siteId } },
      { $unwind: { path: "$details.employees", preserveNullAndEmptyArrays: false } },
      { $match: { "details.employees.sites.id": siteId } },
      {
        $group: {
          _id: "$details.employees.id",
          name: { $first: "$details.employees.name" },
          lastSeen: { $max: { $first: "$tracking.date" } },
        },
      },
      { $sort: { lastSeen: -1 } },
      { $limit: Math.min(limit, 200) },
    ])
    .toArray();
  const entities = dedupeEntities([
    entityRef("site", siteId, `Site ${siteId}`),
    ...rows.map((r) => {
      const id = typeof r._id === "string" ? r._id : undefined;
      const name = typeof r.name === "string" ? r.name : undefined;
      return entityRef("employee", id, name ?? id);
    }),
  ]);
  return { available: true, count: rows.length, employees: rows, entities };
}

export async function findSiteAppointments(siteId: string, limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("appointments")
    .find({ "details.employees.sites.id": siteId })
    .project({ id: 1, status: 1, payment: 1, details: 1, tracking: 1 })
    .sort({ "tracking.0.date": -1, _id: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const appointments = rows.map(serializeId);
  const entities = dedupeEntities([
    entityRef("site", siteId, `Site ${siteId}`),
    ...appointments.map((a) => {
      const id = typeof a.id === "string" ? a.id : undefined;
      return entityRef("appointment", id, id);
    }),
  ]);
  return { available: true, count: rows.length, appointments, entities };
}

export async function findSiteCapacity(siteId: string) {
  const site = await findSiteRaw(siteId);
  if (!site) return { available: true, found: false };
  const name = typeof site.name === "string" ? site.name : undefined;
  return {
    available: true,
    found: true,
    capacity: site.capacity ?? null,
    entities: dedupeEntities([entityRef("site", siteId, name ?? `Site ${siteId}`)]),
  };
}

export async function findSiteAvailability(siteId: string, from?: string, to?: string) {
  const db = await getDb();
  const match: Record<string, unknown> = { "details.employees.sites.id": siteId };
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
  return {
    available: true,
    byDate: rows.map((r) => ({ date: r._id, appointments: r.appointments })),
    entities: dedupeEntities([entityRef("site", siteId, `Site ${siteId}`)]),
  };
}

export async function findSiteDetails(siteId: string) {
  const site = await findSiteRaw(siteId);
  if (!site) return { available: true, found: false, site: null };
  const serialized = serializeId(site);
  const name = typeof serialized.name === "string" ? serialized.name : undefined;
  return {
    available: true,
    found: true,
    site: serialized,
    entities: dedupeEntities([entityRef("site", siteId, name ?? `Site ${siteId}`)]),
  };
}

export async function findSiteDormancyStatus(siteId: string) {
  const site = await findSiteRaw(siteId);
  if (!site) return { available: true, found: false };
  const name = typeof site.name === "string" ? site.name : undefined;
  return {
    available: true,
    found: true,
    status: site.status ?? null,
    lastUsedAt: site.lastUsedAt ?? null,
    entities: dedupeEntities([entityRef("site", siteId, name ?? `Site ${siteId}`)]),
  };
}

export async function findDuplicateSites(limit = 50) {
  const companionDb = await getCompanionDb();
  const rows = await companionDb
    .collection("siteDirectoryDuplicateFlags")
    .find({})
    .sort({ flaggedAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const duplicates = rows.map(serializeId);
  return { available: true, count: rows.length, duplicates };
}
