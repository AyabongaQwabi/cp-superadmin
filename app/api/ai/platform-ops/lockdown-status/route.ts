import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findLockdownStatus } from "@/lib/ai-queries/platform-ops";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const entityId = new URL(request.url).searchParams.get("entityId") ?? undefined;

  return NextResponse.json(await findLockdownStatus(entityId));
}
