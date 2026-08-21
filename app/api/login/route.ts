import { NextResponse } from "next/server";
import { prepareAdminSession } from "@/lib/admin-companion";
import { createAdminSessionToken, SESSION_COOKIE, verifyAdminCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const admin = await verifyAdminCredentials(email, password);
  if (!admin) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  const session = await prepareAdminSession(admin);
  const isSubscriptionUsable = new Date(session.subscription.currentPeriodEndsAt).getTime() > Date.now();
  const response = NextResponse.redirect(
    new URL(isSubscriptionUsable ? "/" : "/billing?expired=1", request.url),
    303,
  );
  response.cookies.set(SESSION_COOKIE, createAdminSessionToken(session), {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
