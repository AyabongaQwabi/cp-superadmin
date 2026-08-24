import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findSiteCapacity } from "@/lib/ai-queries/sites";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const siteId = new URL(request.url).searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId is required" }, { status: 400 });

  return NextResponse.json(await findSiteCapacity(siteId));
}
