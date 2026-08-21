import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/auth";
import { warmAdminCompanionCache } from "@/lib/admin-cache-warm";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await warmAdminCompanionCache(session.id));
}
