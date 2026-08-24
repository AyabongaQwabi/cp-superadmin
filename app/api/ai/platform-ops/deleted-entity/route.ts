import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findDeletedEntity } from "@/lib/ai-queries/platform-ops";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const entityType = params.get("entityType");
  const entityId = params.get("entityId");
  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }

  return NextResponse.json(await findDeletedEntity(entityType, entityId));
}
