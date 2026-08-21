import { createHmac } from "node:crypto";

export const SESSION_COOKIE = "superadmin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

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

export function isValidSessionToken(token: string | undefined) {
  if (!token) return false;

  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature || Number.isNaN(Number(expiresAt))) return false;

  return (
    Number(expiresAt) > Math.floor(Date.now() / 1000) &&
    safeEqual(signature, sign(expiresAt))
  );
}

export function areValidCredentials(email: string, password: string) {
  const expectedEmail = process.env.AUTH_EMAIL;
  const expectedPassword = process.env.AUTH_PASSWORD;
  if (!expectedEmail || !expectedPassword) return false;

  return safeEqual(email, expectedEmail) && safeEqual(password, expectedPassword);
}
