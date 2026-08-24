import { type Document } from "mongodb";
import { getCompanionDb, getDb } from "../mongodb";
import { getAppointmentExceptions } from "../superadmin-read-model";
import { dedupeEntities, entityRef } from "../entity-routes";

const APPOINTMENT_PROJECTION = {
  id: 1,
  status: 1,
  lifecycleStatus: 1,
  payment: 1,
  details: 1,
  tracking: 1,
  usersWhoCanManage: 1,
  messages: 1,
};

const APPOINTMENT_LIST_PROJECTION = {
  id: 1,
  status: 1,
  lifecycleStatus: 1,
  details: 1,
  usersWhoCanManage: 1,
};

type Serialized<T extends { _id?: unknown }> = Omit<T, "_id"> & { _id: string };

type AppointmentSearchFilters = {
  status?: string | null;
  from?: string | null;
  to?: string | null;
  clinic?: string | null;
  companyId?: string | null;
  employeeId?: string | null;
  userId?: string | null;
};

function serializeId<T extends { _id?: unknown }>(doc: T): Serialized<T> {
  return { ...doc, _id: String(doc._id ?? "") };
}

function serializeAppointmentList(doc: Document) {
  const appointment = serializeId(doc);
  const details = appointment.details ?? {};
  const company = details.company ?? null;
  const managers = Array.isArray(appointment.usersWhoCanManage) ? appointment.usersWhoCanManage : [];

  return {
    id: appointment.id ?? appointment._id,
    status: appointment.status ?? null,
    lifecycleStatus: appointment.lifecycleStatus ?? null,
    date: details.date ?? null,
    clinic: details.clinic ?? null,
    company: company
      ? { id: company.id ?? null, name: company.name ?? null }
      : null,
    employees: managers.map((manager: Record<string, unknown>) => ({
      id: manager.id ?? null,
      name: manager.name ?? null,
    })),
  };
}

async function findAppointmentRaw(appointmentId: string) {
  const db = await getDb();
  const live = await db
    .collection("appointments")
    .findOne({ id: appointmentId }, { projection: APPOINTMENT_PROJECTION });
  if (live) return { appointment: live, isDeleted: false };

  const deleted = await db
    .collection("deleted_appointments")
    .findOne({ id: appointmentId }, { projection: APPOINTMENT_PROJECTION });
  if (deleted) return { appointment: deleted, isDeleted: true };

  return null;
}

function appointmentEntities(appointment: Serialized<Document>, appointmentId: string): ReturnType<typeof dedupeEntities> {
  const companyId = typeof appointment.details?.company?.id === "string" ? appointment.details.company.id : undefined;
  const companyName = typeof appointment.details?.company?.name === "string" ? appointment.details.company.name : undefined;
  const managerEntities = Array.isArray(appointment.usersWhoCanManage)
    ? appointment.usersWhoCanManage.map((m: Record<string, unknown>) => {
        const id = typeof m.id === "string" ? m.id : undefined;
        const name = typeof m.name === "string" ? m.name : undefined;
        return entityRef("user", id, name);
      })
    : [];
  return dedupeEntities([
    entityRef("appointment", appointmentId, appointmentId),
    entityRef("company", companyId, companyName ?? companyId),
    ...managerEntities,
  ]);
}

function appointmentListEntities(appointments: Array<{ id?: unknown; _id?: unknown }>): ReturnType<typeof dedupeEntities> {
  return dedupeEntities(
    appointments.map((a) => {
      const id = typeof a.id === "string" ? a.id : typeof a._id === "string" ? a._id : undefined;
      return entityRef("appointment", id, id);
    }),
  );
}

function cleanFilter(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function buildAppointmentSearchQuery(filters: AppointmentSearchFilters): Document {
  const query: Document = {};
  const status = cleanFilter(filters.status);
  const from = cleanFilter(filters.from);
  const to = cleanFilter(filters.to);
  const clinic = cleanFilter(filters.clinic);
  const companyId = cleanFilter(filters.companyId);
  const employeeId = cleanFilter(filters.employeeId);
  const userId = cleanFilter(filters.userId);

  if (status) query.status = status;
  if (from || to) {
    query["details.date"] = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }
  if (clinic) query["details.clinic"] = clinic;
  if (companyId) query["details.company.id"] = companyId;
  if (employeeId) query["usersWhoCanManage.id"] = employeeId;
  if (userId) query.$or = [{ "usersWhoCanManage.id": userId }, { "tracking.doer": userId }];

  return query;
}

async function findAppointments(filters: AppointmentSearchFilters, limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("appointments")
    .find(buildAppointmentSearchQuery(filters))
    .project(APPOINTMENT_LIST_PROJECTION)
    .sort({ "details.date": 1, "tracking.0.date": -1, _id: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const appointments = rows.map(serializeAppointmentList);
  return { available: true, count: rows.length, appointments, entities: appointmentListEntities(appointments) };
}

export async function findAppointment(appointmentId: string) {
  const result = await findAppointmentRaw(appointmentId);
  if (!result) return { available: true, found: false };
  const appointment = serializeId(result.appointment);
  return {
    available: true,
    found: true,
    isDeleted: result.isDeleted,
    appointment,
    entities: appointmentEntities(appointment, appointmentId),
  };
}

export async function findAppointmentsByStatus(status: string, limit = 50, filters: Omit<AppointmentSearchFilters, "status"> = {}) {
  return findAppointments({ ...filters, status }, limit);
}

export async function findAppointmentsByClinic(clinic: string, limit = 50, filters: Omit<AppointmentSearchFilters, "clinic"> = {}) {
  return findAppointments({ ...filters, clinic }, limit);
}

export async function findAppointmentsByDateRange(from: string, to: string, limit = 50, filters: Omit<AppointmentSearchFilters, "from" | "to"> = {}) {
  return findAppointments({ ...filters, from, to }, limit);
}

export async function findAppointmentsByCompany(companyId: string, limit = 50, filters: Omit<AppointmentSearchFilters, "companyId"> = {}) {
  const result = await findAppointments({ ...filters, companyId }, limit);
  const entities = dedupeEntities([entityRef("company", companyId, companyId), ...appointmentListEntities(result.appointments)]);
  return { ...result, entities };
}

export async function findAppointmentsByEmployee(employeeId: string, limit = 50, filters: Omit<AppointmentSearchFilters, "employeeId"> = {}) {
  const result = await findAppointments({ ...filters, employeeId }, limit);
  const entities = dedupeEntities([entityRef("user", employeeId, employeeId), ...appointmentListEntities(result.appointments)]);
  return { ...result, entities };
}

export async function findAppointmentsByUser(userId: string, limit = 50, filters: Omit<AppointmentSearchFilters, "userId"> = {}) {
  const result = await findAppointments({ ...filters, userId }, limit);
  const entities = dedupeEntities([entityRef("user", userId, userId), ...appointmentListEntities(result.appointments)]);
  return { ...result, entities };
}

export async function findAppointmentManager(appointmentId: string) {
  const result = await findAppointmentRaw(appointmentId);
  if (!result) return { available: true, found: false };
  const managers = result.appointment.usersWhoCanManage ?? [];
  const entities = dedupeEntities([
    entityRef("appointment", appointmentId, appointmentId),
    ...(Array.isArray(managers)
      ? managers.map((m: Record<string, unknown>) => {
          const id = typeof m.id === "string" ? m.id : undefined;
          const name = typeof m.name === "string" ? m.name : undefined;
          return entityRef("user", id, name);
        })
      : []),
  ]);
  return { available: true, found: true, managers, entities };
}

export async function findAppointmentMedicalCompany(appointmentId: string) {
  const result = await findAppointmentRaw(appointmentId);
  if (!result) return { available: true, found: false };
  const company = result.appointment.details?.company ?? null;
  const companyId = typeof company?.id === "string" ? company.id : undefined;
  const companyName = typeof company?.name === "string" ? company.name : undefined;
  const entities = dedupeEntities([
    entityRef("appointment", appointmentId, appointmentId),
    entityRef("company", companyId, companyName ?? companyId),
  ]);
  return { available: true, found: true, company, entities };
}

export async function findAppointmentPaymentCompany(_appointmentId: string) {
  return {
    available: false,
    reason:
      "No distinct 'payment company' concept exists on the appointment schema -- only a single details.company field was found. Would need schema clarification before building this.",
  };
}

export async function findAppointmentPaymentStatus(appointmentId: string) {
  const result = await findAppointmentRaw(appointmentId);
  if (!result) return { available: true, found: false };
  return {
    available: true,
    found: true,
    status: result.appointment.status ?? null,
    amount: result.appointment.payment?.amount ?? null,
    entities: dedupeEntities([entityRef("appointment", appointmentId, appointmentId)]),
  };
}

export async function findAppointmentInvoice(appointmentId: string) {
  const companionDb = await getCompanionDb();
  const invoice = await companionDb.collection("invoices").findOne({ "appointment.id": appointmentId });
  if (!invoice) return { available: true, found: false, invoice: null };
  const serialized = serializeId(invoice);
  const invoiceId = typeof serialized.id === "string" ? serialized.id : undefined;
  const entities = dedupeEntities([
    entityRef("appointment", appointmentId, appointmentId),
    entityRef("invoice", invoiceId, invoiceId),
  ]);
  return { available: true, found: true, invoice: serialized, entities };
}

export async function findAppointmentAuditHistory(appointmentId: string) {
  const companionDb = await getCompanionDb();
  const events = await companionDb
    .collection("audit_events")
    .find({ $or: [{ entityType: "appointment", entityId: appointmentId }, { "metadata.appointmentId": appointmentId }] })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  const result = await findAppointmentRaw(appointmentId);
  const tracking = result?.appointment.tracking ?? [];
  return {
    available: true,
    auditEvents: events.map(serializeId),
    legacyTracking: tracking,
    entities: dedupeEntities([entityRef("appointment", appointmentId, appointmentId)]),
  };
}

export async function findAppointmentThread(appointmentId: string) {
  const [result, companionDb] = await Promise.all([findAppointmentRaw(appointmentId), getCompanionDb()]);
  if (!result) return { available: true, found: false };

  const [threadMeta, internalNotes] = await Promise.all([
    companionDb.collection("appointmentThreadMeta").findOne({ appointmentId }),
    companionDb.collection("appointmentInternalNotes").find({ appointmentId }).sort({ createdAt: -1 }).limit(50).toArray(),
  ]);

  return {
    available: true,
    found: true,
    status: threadMeta?.status ?? "open",
    messages: result.appointment.messages ?? [],
    internalNotes: internalNotes.map(serializeId),
    entities: dedupeEntities([entityRef("appointment", appointmentId, appointmentId)]),
  };
}

export async function findAppointmentsNeedingFollowUp(limit = 50) {
  const exceptions = await getAppointmentExceptions();
  const appointments = exceptions.stalePending.slice(0, Math.min(limit, 200));
  const entities = dedupeEntities(
    appointments.map((a: Record<string, unknown>) => {
      const id = typeof a.id === "string" ? a.id : undefined;
      return entityRef("appointment", id, id);
    }),
  );
  return { available: true, count: exceptions.stalePending.length, appointments, entities };
}

export async function findAppointmentsWithAnomalies(limit = 50) {
  const exceptions = await getAppointmentExceptions();
  const cappedLimit = Math.min(limit, 200);
  const duplicateIds = exceptions.duplicateIds.slice(0, cappedLimit);
  const deletedApproved = exceptions.deletedApproved.slice(0, cappedLimit);
  const entities = dedupeEntities([
    ...duplicateIds.map((d: Record<string, unknown>) => {
      const id = typeof d._id === "string" ? d._id : undefined;
      return entityRef("appointment", id, id);
    }),
    ...deletedApproved.map((a: Record<string, unknown>) => {
      const id = typeof a.id === "string" ? a.id : undefined;
      return entityRef("appointment", id, id);
    }),
  ]);
  return {
    available: true,
    anomalies: exceptions.anomalies.slice(0, cappedLimit),
    duplicateIds,
    deletedApproved,
    entities,
  };
}

export async function findDeletedAppointments(limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("deleted_appointments")
    .find({})
    .project(APPOINTMENT_PROJECTION)
    .sort({ "tracking.0.date": -1, _id: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const appointments = rows.map(serializeId);
  return { available: true, count: rows.length, appointments, entities: appointmentListEntities(appointments) };
}
