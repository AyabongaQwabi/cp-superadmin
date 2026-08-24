import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findAuditEventsBySource } from "@/lib/ai-queries/audit";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const source = params.get("source");
  if (!source) return NextResponse.json({ error: "source is required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findAuditEventsBySource(source, limit));
}
