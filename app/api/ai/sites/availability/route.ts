import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findSiteAvailability } from "@/lib/ai-queries/sites";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const siteId = params.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  return NextResponse.json(await findSiteAvailability(siteId, from, to));
}
