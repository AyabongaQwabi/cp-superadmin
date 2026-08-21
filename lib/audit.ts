import { Document } from "mongodb";
import { getCompanionDb } from "./mongodb";

export type AuditEntityType = "appointment" | "user" | "company";
export type AuditActorType = "user" | "admin" | "system";
export type AuditSource = "cp-redesign" | "cp-redesign-admin" | "legacy-import" | "system";

export interface AuditChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface AuditEvent {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  actorType: AuditActorType;
  actorId: string | null;
  actorName: string | null;
  changes?: AuditChange[];
  metadata?: Record<string, unknown>;
  source: AuditSource;
  createdAt: Date;
}

export interface AuditEventFilters {
  entityType?: AuditEntityType;
  entityId?: string;
  actorId?: string;
  action?: string;
  source?: AuditSource;
  dateFrom?: string; // ISO date string, inclusive
  dateTo?: string; // ISO date string, inclusive
  page?: number; // 1-indexed
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 250;
const COLLECTION = "audit_events";

export interface AuditEventPage {
  events: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}

function buildFilter(filters: AuditEventFilters): Document {
  const match: Document = {};
  if (filters.entityType) match.entityType = filters.entityType;
  if (filters.entityId) match.entityId = filters.entityId;
  if (filters.actorId) match.actorId = filters.actorId;
  if (filters.action) match.action = filters.action;
  if (filters.source) match.source = filters.source;

  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Document = {};
    if (filters.dateFrom) createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      // Treat dateTo as inclusive of the whole day when given a bare date.
      const to = new Date(filters.dateTo);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        createdAt.$lte = to;
      }
    }
    if (Object.keys(createdAt).length) match.createdAt = createdAt;
  }

  return match;
}

export async function queryAuditEvents(
  filters: AuditEventFilters = {}
): Promise<AuditEventPage> {
  const db = await getCompanionDb();
  const match = buildFilter(filters);

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * pageSize;

  const collection = db.collection<AuditEvent>(COLLECTION);

  const [events, total] = await Promise.all([
    collection
      .find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    collection.countDocuments(match),
  ]);

  return { events, total, page, pageSize };
}

export async function getEntityTimeline(
  entityType: AuditEntityType,
  entityId: string
): Promise<AuditEvent[]> {
  const db = await getCompanionDb();

  return db
    .collection<AuditEvent>(COLLECTION)
    .find({ entityType, entityId })
    .sort({ createdAt: -1 })
    .limit(1000)
    .toArray();
}
