import { createHmac } from "node:crypto";
import bcrypt from "bcrypt-nodejs";
import { getDb } from "./mongodb";

export const SESSION_COOKIE = "superadmin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AdminSession = {
  id: string;
  name: string;
  email: string;
  role: string;
  sessionExpiresAt: number;
  subscription: {
    status: "trialing" | "active" | "expired";
    plan: "standard";
    currentPeriodEndsAt: string;
  };
};

export type ProductionAdminUser = {
  _id?: unknown;
  id: string;
  role?: string;
  hash?: string;
  details?: {
    name?: string;
    surname?: string;
    email?: string;
    contactNumber?: string;
  };
  companiesCanEdit?: { id: string; name: string }[];
  companiesManaging?: { id: string; name: string }[];
};

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET is not set. Add it to .env.local.");
  }
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return leftBuffer.equals(rightBuffer);
}

export function createSessionToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

export function createAdminSessionToken(session: Omit<AdminSession, "sessionExpiresAt">) {
  const payload = Buffer.from(
    JSON.stringify({
      ...session,
      sessionExpiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSession(token: string | undefined): AdminSession | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    if (!decoded.sessionExpiresAt || decoded.sessionExpiresAt <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function isValidSessionToken(token: string | undefined) {
  return !!readSession(token);
}

function comparePassword(password: string, hash: string) {
  return new Promise<boolean>((resolve, reject) => {
    bcrypt.compare(password, hash, (error: Error | null, result: boolean) => {
      if (error) reject(error);
      else resolve(!!result);
    });
  });
}

function fullName(user: ProductionAdminUser) {
  return [user.details?.name, user.details?.surname].filter(Boolean).join(" ").trim();
}

export async function verifyAdminCredentials(email: string, password: string) {
  const db = await getDb();
  const user = await db.collection<ProductionAdminUser>("users").findOne({
    "details.email": email.toLowerCase(),
  });

  if (!user?.hash) return null;
  if (user.role !== "admin" && user.role !== "superadmin") return null;

  const isValid = await comparePassword(password, user.hash);
  if (!isValid) return null;

  return {
    ...user,
    id: user.id || String(user._id),
    details: {
      ...user.details,
      email: user.details?.email || email,
    },
    displayName: fullName(user) || user.details?.email || "ClinicPlus admin",
  };
}
