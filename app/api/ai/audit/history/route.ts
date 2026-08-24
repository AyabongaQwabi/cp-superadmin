import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findAuditHistory } from "@/lib/ai-queries/audit";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const entityId = new URL(request.url).searchParams.get("entityId");
  if (!entityId) return NextResponse.json({ error: "entityId is required" }, { status: 400 });

  return NextResponse.json(await findAuditHistory(entityId));
}
