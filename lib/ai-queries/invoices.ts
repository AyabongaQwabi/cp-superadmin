import { getCompanionDb, getDb } from "../mongodb";
import { dedupeEntities, entityRef } from "../entity-routes";

type Serialized<T extends { _id?: unknown }> = Omit<T, "_id"> & { _id: string };

function serializeId<T extends { _id?: unknown }>(doc: T): Serialized<T> {
  return { ...doc, _id: String(doc._id ?? "") };
}

export async function findInvoice(invoiceId: string) {
  const db = await getDb();
  const invoice = await db.collection("invoices").findOne({ id: invoiceId });
  if (!invoice) return { available: true, found: false, invoice: null };
  return {
    available: true,
    found: true,
    invoice: serializeId(invoice),
    entities: dedupeEntities([entityRef("invoice", invoiceId, invoiceId)]),
  };
}

export async function findInvoicesByCompany(companyId: string, limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("invoices")
    .find({ "company.id": companyId })
    .project({ id: 1, client: 1, company: 1, appointment: 1, payment: 1, clinic: 1, date: 1, url: 1 })
    .sort({ date: -1, _id: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const invoices = rows.map(serializeId);
  const entities = dedupeEntities([
    entityRef("company", companyId, companyId),
    ...invoices.map((inv) => {
      const id = typeof inv.id === "string" ? inv.id : undefined;
      return entityRef("invoice", id, id);
    }),
  ]);
  return { available: true, count: rows.length, invoices, entities };
}

export async function findInvoicesByAppointment(appointmentId: string, limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("invoices")
    .find({ "appointment.id": appointmentId })
    .project({ id: 1, client: 1, company: 1, appointment: 1, payment: 1, clinic: 1, date: 1, url: 1 })
    .sort({ date: -1, _id: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const invoices = rows.map(serializeId);
  const entities = dedupeEntities([
    entityRef("appointment", appointmentId, appointmentId),
    ...invoices.map((inv) => {
      const id = typeof inv.id === "string" ? inv.id : undefined;
      return entityRef("invoice", id, id);
    }),
  ]);
  return { available: true, count: rows.length, invoices, entities };
}

export async function findUnpaidInvoices(limit = 50) {
  const db = await getDb();
  const rows = await db
    .collection("invoices")
    .find({ $or: [{ "payment.amount": { $lte: 0 } }, { "payment.amount": { $exists: false } }, { "payment.status": { $ne: "paid" } }] })
    .project({ id: 1, client: 1, company: 1, appointment: 1, payment: 1, clinic: 1, date: 1, url: 1 })
    .sort({ date: -1, _id: -1 })
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

export async function findInvoicePdf(invoiceId: string) {
  const db = await getDb();
  const invoice = await db.collection("invoices").findOne({ id: invoiceId }, { projection: { id: 1, url: 1 } });
  if (!invoice) return { available: true, found: false };
  return {
    available: true,
    found: true,
    url: invoice.url ?? null,
    entities: dedupeEntities([entityRef("invoice", invoiceId, invoiceId)]),
  };
}

export async function findInvoicesWithAnomalies(limit = 50) {
  const companionDb = await getCompanionDb();
  const rows = await companionDb
    .collection("anomalyFlags")
    .find({ $or: [{ invoiceId: { $exists: true, $ne: null } }, { flagType: { $regex: "invoice", $options: "i" } }] })
    .sort({ flaggedAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  const anomalies = rows.map(serializeId);
  const entities = dedupeEntities(
    anomalies.map((a) => {
      const id = typeof a.invoiceId === "string" ? a.invoiceId : undefined;
      return entityRef("invoice", id, id);
    }),
  );
  return { available: true, count: rows.length, anomalies, entities };
}

export async function findLegacyVsCanonicalInvoice(invoiceId: string) {
  const [db, companionDb] = await Promise.all([getDb(), getCompanionDb()]);
  const [legacy, canonical] = await Promise.all([
    db.collection("invoices").findOne({ id: invoiceId }),
    companionDb.collection("invoices").findOne({ $or: [{ id: invoiceId }, { legacyInvoiceId: invoiceId }] }),
  ]);
  if (!legacy && !canonical) return { available: true, found: false };
  return {
    available: true,
    found: true,
    legacy: legacy ? serializeId(legacy) : null,
    canonical: canonical ? serializeId(canonical) : null,
    entities: dedupeEntities([entityRef("invoice", invoiceId, invoiceId)]),
  };
}
