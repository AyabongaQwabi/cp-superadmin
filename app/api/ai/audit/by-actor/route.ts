import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findAuditEventsByActor } from "@/lib/ai-queries/audit";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const actorId = params.get("actorId");
  if (!actorId) return NextResponse.json({ error: "actorId is required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findAuditEventsByActor(actorId, limit));
}
