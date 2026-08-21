import type { AdminSession, ProductionAdminUser } from "./auth";
import { getAdminCompanionDb } from "./mongodb";

const STANDARD_PRICE_CENTS = 29900;
const STANDARD_PRICE_DISPLAY = "R299";
const TRIAL_DAYS = 30;

type AdminSubscriptionStatus = "trialing" | "active" | "expired";

export type AdminSubscriptionSummary = {
  status: AdminSubscriptionStatus;
  plan: "standard";
  priceCents: number;
  priceDisplay: string;
  currency: "ZAR";
  trialEndsAt: Date;
  currentPeriodEndsAt: Date;
  isUsable: boolean;
};

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function companiesForAdmin(user: ProductionAdminUser) {
  const seen = new Set<string>();
  return [...(user.companiesCanEdit || []), ...(user.companiesManaging || [])].filter((company) => {
    if (!company?.id || seen.has(company.id)) return false;
    seen.add(company.id);
    return true;
  });
}

export function isSubscriptionUsable(subscription: Pick<AdminSubscriptionSummary, "currentPeriodEndsAt">) {
  return subscription.currentPeriodEndsAt.getTime() > Date.now();
}

function deriveStatus(rawStatus: string | undefined, currentPeriodEndsAt: Date): AdminSubscriptionStatus {
  if (currentPeriodEndsAt.getTime() <= Date.now()) return "expired";
  return rawStatus === "active" ? "active" : "trialing";
}

export async function syncAdminCompanionUser(user: ProductionAdminUser & { displayName?: string }) {
  const db = await getAdminCompanionDb();
  const now = new Date();
  const companies = companiesForAdmin(user);
  const name =
    user.displayName ||
    [user.details?.name, user.details?.surname].filter(Boolean).join(" ").trim() ||
    user.details?.email ||
    "ClinicPlus admin";

  await db.collection("adminUsers").updateOne(
    { productionUserId: user.id },
    {
      $set: {
        productionUserId: user.id,
        email: user.details?.email?.toLowerCase(),
        name,
        role: user.role,
        contactNumber: user.details?.contactNumber,
        companies,
        companyIds: companies.map((company) => company.id),
        updatedAt: now,
        lastSeenAt: now,
      },
      $setOnInsert: {
        createdAt: now,
        firstSeenAt: now,
      },
    },
    { upsert: true },
  );
}

export async function getOrCreateAdminSubscription(adminUserId: string): Promise<AdminSubscriptionSummary> {
  const db = await getAdminCompanionDb();
  const now = new Date();
  const subscriptions = db.collection("adminSubscriptions");
  const existing = await subscriptions.findOne({ adminUserId, plan: "standard" });

  if (!existing) {
    const trialEndsAt = addDays(now, TRIAL_DAYS);
    const doc = {
      adminUserId,
      plan: "standard",
      status: "trialing",
      priceCents: STANDARD_PRICE_CENTS,
      priceDisplay: STANDARD_PRICE_DISPLAY,
      currency: "ZAR",
      billingProvider: "yoco",
      billingMode: "manual_renewal",
      seats: 1,
      trialStartedAt: now,
      trialEndsAt,
      currentPeriodStartedAt: now,
      currentPeriodEndsAt: trialEndsAt,
      createdAt: now,
      updatedAt: now,
    };
    await subscriptions.insertOne(doc);
    return {
      status: "trialing",
      plan: "standard",
      priceCents: STANDARD_PRICE_CENTS,
      priceDisplay: STANDARD_PRICE_DISPLAY,
      currency: "ZAR",
      trialEndsAt,
      currentPeriodEndsAt: trialEndsAt,
      isUsable: true,
    };
  }

  const currentPeriodEndsAt = new Date(existing.currentPeriodEndsAt);
  const trialEndsAt = new Date(existing.trialEndsAt ?? existing.currentPeriodEndsAt);
  const status = deriveStatus(existing.status, currentPeriodEndsAt);
  if (status !== existing.status) {
    const update: Record<string, unknown> = { status, updatedAt: now };
    if (status === "expired") update.expiredAt = now;
    await subscriptions.updateOne(
      { _id: existing._id },
      { $set: update },
    );
  }

  return {
    status,
    plan: "standard",
    priceCents: existing.priceCents ?? STANDARD_PRICE_CENTS,
    priceDisplay: existing.priceDisplay ?? STANDARD_PRICE_DISPLAY,
    currency: "ZAR",
    trialEndsAt,
    currentPeriodEndsAt,
    isUsable: currentPeriodEndsAt.getTime() > now.getTime(),
  };
}

export async function getAdminSubscription(adminUserId: string) {
  return getOrCreateAdminSubscription(adminUserId);
}

export async function prepareAdminSession(user: ProductionAdminUser & { displayName?: string }) {
  await syncAdminCompanionUser(user);
  const subscription = await getOrCreateAdminSubscription(user.id);
  await logAdminInteraction({
    adminUserId: user.id,
    action: "login",
    source: "clinicplus-admin-companion",
    path: "/login",
    role: user.role,
    email: user.details?.email,
  });

  return {
    id: user.id,
    name:
      user.displayName ||
      [user.details?.name, user.details?.surname].filter(Boolean).join(" ").trim() ||
      user.details?.email ||
      "ClinicPlus admin",
    email: user.details?.email || "",
    role: user.role || "admin",
    subscription: {
      status: subscription.status,
      plan: subscription.plan,
      currentPeriodEndsAt: subscription.currentPeriodEndsAt.toISOString(),
    },
  } satisfies Omit<AdminSession, "sessionExpiresAt">;
}

export async function logAdminInteraction(input: {
  adminUserId: string;
  action: string;
  source?: string;
  path?: string;
  role?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getAdminCompanionDb();
  await db.collection("adminInteractionEvents").insertOne({
    ...input,
    source: input.source || "clinicplus-admin-companion",
    occurredAt: new Date(),
  });
}
