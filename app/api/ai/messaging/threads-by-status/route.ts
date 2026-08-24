import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findThreadsByStatus } from "@/lib/ai-queries/messaging";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  if (!status) return NextResponse.json({ error: "status is required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findThreadsByStatus(status, limit));
}
