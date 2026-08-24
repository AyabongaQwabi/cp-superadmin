import { type Document } from "mongodb";
import { getCompanionDb } from "../mongodb";
import { dedupeEntities, entityRef, type EntityType } from "../entity-routes";

type Serialized<T extends { _id?: unknown }> = Omit<T, "_id"> & { _id: string };

function serializeId<T extends { _id?: unknown }>(doc: T): Serialized<T> {
  return { ...doc, _id: String(doc._id ?? "") };
}

const VALID_ENTITY_TYPES: EntityType[] = ["company", "appointment", "user", "employee", "site", "invoice"];

function isEntityType(value: unknown): value is EntityType {
  return typeof value === "string" && (VALID_ENTITY_TYPES as string[]).includes(value);
}

function auditEventEntities(events: Serialized<Document>[]): ReturnType<typeof dedupeEntities> {
  return dedupeEntities(
    events.map((e) => {
      const entityType = isEntityType(e.entityType) ? e.entityType : undefined;
      const entityId = typeof e.entityId === "string" ? e.entityId : undefined;
      if (!entityType) return null;
      return entityRef(entityType, entityId, entityId);
    }),
  );
}

export async function findAuditHistory(entityId: string) {
  const companionDb = await getCompanionDb();
  const events = await companionDb
    .collection("audit_events")
    .find({ $or: [{ entityId }, { actorId: entityId }] })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  const auditEvents = events.map(serializeId);
  return { available: true, count: events.length, auditEvents, entities: auditEventEntities(auditEvents) };
}

export async function findRecentAdminActions(limit = 50) {
  const companionDb = await getCompanionDb();
  const events = await companionDb
    .collection("audit_events")
    .find({ actorType: "admin" })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const serialized = events.map(serializeId);
  return { available: true, count: events.length, events: serialized, entities: auditEventEntities(serialized) };
}

export async function findAuditEventsByActor(actorId: string, limit = 50) {
  const companionDb = await getCompanionDb();
  const events = await companionDb
    .collection("audit_events")
    .find({ actorId })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const serialized = events.map(serializeId);
  const entities = dedupeEntities([entityRef("user", actorId, actorId), ...auditEventEntities(serialized)]);
  return { available: true, count: events.length, events: serialized, entities };
}

export async function findAuditEventsByAction(action: string, limit = 50) {
  const companionDb = await getCompanionDb();
  const events = await companionDb
    .collection("audit_events")
    .find({ action })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const serialized = events.map(serializeId);
  return { available: true, count: events.length, events: serialized, entities: auditEventEntities(serialized) };
}

export async function findAuditEventsBySource(source: string, limit = 50) {
  const companionDb = await getCompanionDb();
  const events = await companionDb
    .collection("audit_events")
    .find({ source })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const serialized = events.map(serializeId);
  return { available: true, count: events.length, events: serialized, entities: auditEventEntities(serialized) };
}

export async function findAuditEventsInRange(from: string, to: string, limit = 50) {
  const companionDb = await getCompanionDb();
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);
  const events = await companionDb
    .collection("audit_events")
    .find({ createdAt: { $gte: fromDate, $lte: toDate } })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const serialized = events.map(serializeId);
  return { available: true, count: events.length, events: serialized, entities: auditEventEntities(serialized) };
}
