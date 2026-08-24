import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findAuditEventsByAction } from "@/lib/ai-queries/audit";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const action = params.get("action");
  if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findAuditEventsByAction(action, limit));
}
