export type EntityType = "company" | "appointment" | "user" | "employee" | "site" | "invoice";

export interface EntityRef {
  type: EntityType;
  id: string;
  label: string;
  href: string;
}

const ENTITY_ROUTES: Record<EntityType, (id: string) => string> = {
  company: (id) => `/companies/${encodeURIComponent(id)}`,
  appointment: (id) => `/audit-events/appointment/${encodeURIComponent(id)}`,
  user: (id) => `/audit-events/user/${encodeURIComponent(id)}`,
  employee: (id) => `/audit-events/employee/${encodeURIComponent(id)}`,
  site: (id) => `/audit-events/site/${encodeURIComponent(id)}`,
  invoice: (id) => `/audit-events/invoice/${encodeURIComponent(id)}`,
};

/**
 * Builds one entity reference. Returns null for a missing id/label so callers
 * can inline this in a .filter(Boolean) chain without a manual guard.
 */
export function entityRef(type: EntityType, id: string | null | undefined, label: string | null | undefined): EntityRef | null {
  if (!id || !label) return null;
  return { type, id, label, href: ENTITY_ROUTES[type](id) };
}

/**
 * Dedupes entity refs by type+id, keeping the first occurrence (e.g. the
 * first, most-relevant label if the same entity appears more than once in
 * one response).
 */
export function dedupeEntities(entities: (EntityRef | null | undefined)[]): EntityRef[] {
  const seen = new Set<string>();
  const result: EntityRef[] = [];
  for (const entity of entities) {
    if (!entity) continue;
    const key = `${entity.type}:${entity.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entity);
  }
  return result;
}
