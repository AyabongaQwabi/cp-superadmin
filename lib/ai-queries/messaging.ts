import { type Document } from "mongodb";
import { getCompanionDb, getDb } from "../mongodb";
import { dedupeEntities, entityRef } from "../entity-routes";

type Serialized<T extends { _id?: unknown }> = Omit<T, "_id"> & { _id: string };

function serializeId<T extends { _id?: unknown }>(doc: T): Serialized<T> {
  return { ...doc, _id: String(doc._id ?? "") };
}

const APPOINTMENT_PROJECTION = {
  id: 1,
  status: 1,
  details: 1,
  usersWhoCanManage: 1,
  messages: 1,
};

export async function findThread(threadId: string) {
  const [db, companionDb] = await Promise.all([getDb(), getCompanionDb()]);
  const appointment = await db.collection("appointments").findOne({ id: threadId }, { projection: APPOINTMENT_PROJECTION });
  if (!appointment) return { available: true, found: false };

  const threadMeta = await companionDb.collection("appointmentThreadMeta").findOne({ appointmentId: threadId });
  const serializedAppointment = serializeId(appointment);
  const companyId = typeof appointment.details?.company?.id === "string" ? appointment.details.company.id : undefined;
  const companyName = typeof appointment.details?.company?.name === "string" ? appointment.details.company.name : undefined;
  return {
    available: true,
    found: true,
    status: threadMeta?.status ?? "open",
    messages: appointment.messages ?? [],
    appointment: serializedAppointment,
    entities: dedupeEntities([
      entityRef("appointment", threadId, threadId),
      entityRef("company", companyId, companyName ?? companyId),
    ]),
  };
}

export async function findThreadsByStatus(status: string, limit = 50) {
  const companionDb = await getCompanionDb();
  const threadMetas = await companionDb
    .collection("appointmentThreadMeta")
    .find({ status })
    .sort({ updatedAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();

  const appointmentIds = threadMetas.map((t) => t.appointmentId).filter((id): id is string => typeof id === "string");
  const db = await getDb();
  const appointments = appointmentIds.length
    ? await db.collection("appointments").find({ id: { $in: appointmentIds } }).project(APPOINTMENT_PROJECTION).toArray()
    : [];
  const appointmentsById = new Map(appointments.map((a) => [a.id, serializeId(a)]));
  const threads = threadMetas.map((meta) => ({
    appointmentId: meta.appointmentId,
    status: meta.status,
    updatedAt: meta.updatedAt ?? null,
    appointment: appointmentsById.get(meta.appointmentId) ?? null,
  }));
  const entities = dedupeEntities(
    threads.map((t) => {
      const id = typeof t.appointmentId === "string" ? t.appointmentId : undefined;
      return entityRef("appointment", id, id);
    }),
  );

  return { available: true, count: threadMetas.length, threads, entities };
}

export async function findThreadsByCompany(companyId: string, limit = 50) {
  const db = await getDb();
  const appointments = await db
    .collection("appointments")
    .find({ "details.company.id": companyId, "messages.0": { $exists: true } })
    .project(APPOINTMENT_PROJECTION)
    .sort({ "tracking.0.date": -1, _id: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const threads = appointments.map(serializeId);
  const entities = dedupeEntities([
    entityRef("company", companyId, companyId),
    ...threads.map((t) => {
      const id = typeof t.id === "string" ? t.id : undefined;
      return entityRef("appointment", id, id);
    }),
  ]);
  return { available: true, count: appointments.length, threads, entities };
}

export async function findThreadsByUser(userId: string, limit = 50) {
  const db = await getDb();
  const query: Document = {
    "messages.0": { $exists: true },
    $or: [{ "usersWhoCanManage.id": userId }, { "messages.author.id": userId }],
  };
  const appointments = await db
    .collection("appointments")
    .find(query)
    .project(APPOINTMENT_PROJECTION)
    .sort({ "tracking.0.date": -1, _id: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const threads = appointments.map(serializeId);
  const entities = dedupeEntities([
    entityRef("user", userId, userId),
    ...threads.map((t) => {
      const id = typeof t.id === "string" ? t.id : undefined;
      return entityRef("appointment", id, id);
    }),
  ]);
  return { available: true, count: appointments.length, threads, entities };
}

export async function findThreadMessages(threadId: string, limit = 50) {
  const db = await getDb();
  const appointment = await db.collection("appointments").findOne({ id: threadId }, { projection: { id: 1, messages: 1 } });
  if (!appointment) return { available: true, found: false };
  const messages = (appointment.messages ?? []).slice(0, Math.min(limit, 200));
  return {
    available: true,
    found: true,
    count: messages.length,
    messages,
    entities: dedupeEntities([entityRef("appointment", threadId, threadId)]),
  };
}

export async function findThreadNotes(threadId: string, limit = 50) {
  const companionDb = await getCompanionDb();
  const notes = await companionDb
    .collection("appointmentInternalNotes")
    .find({ appointmentId: threadId })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  return {
    available: true,
    count: notes.length,
    notes: notes.map(serializeId),
    entities: dedupeEntities([entityRef("appointment", threadId, threadId)]),
  };
}

export async function findRecentMessages(limit = 50) {
  const db = await getDb();
  const appointments = await db
    .collection("appointments")
    .find({ "messages.0": { $exists: true } })
    .project({ id: 1, details: 1, messages: 1 })
    .sort({ "tracking.0.date": -1, _id: -1 })
    .limit(Math.min(limit, 200))
    .toArray();

  const flattened = appointments
    .flatMap((a) =>
      (a.messages ?? []).map((m: Record<string, unknown>) => ({
        appointmentId: a.id,
        companyName: a.details?.company?.name ?? null,
        message: m.message,
        author: m.author,
        createdAt: m.createdAt,
      })),
    )
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, Math.min(limit, 200));

  const entities = dedupeEntities(
    flattened.map((m) => {
      const id = typeof m.appointmentId === "string" ? m.appointmentId : undefined;
      return entityRef("appointment", id, id);
    }),
  );

  return { available: true, count: flattened.length, messages: flattened, entities };
}
