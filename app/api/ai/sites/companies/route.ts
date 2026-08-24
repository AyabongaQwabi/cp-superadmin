import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findSiteCompanies } from "@/lib/ai-queries/sites";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const siteId = params.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findSiteCompanies(siteId, limit));
}
