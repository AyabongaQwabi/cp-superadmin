import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logAdminInteraction } from "@/lib/admin-companion";
import { readSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  await logAdminInteraction({
    adminUserId: session.id,
    action: typeof body.action === "string" ? body.action : "interaction",
    path: typeof body.path === "string" ? body.path : undefined,
    role: session.role,
    email: session.email,
    metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : undefined,
  });

  return NextResponse.json({ ok: true });
}
