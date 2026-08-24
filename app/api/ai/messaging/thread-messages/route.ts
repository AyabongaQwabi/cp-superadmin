import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findThreadMessages } from "@/lib/ai-queries/messaging";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const threadId = params.get("threadId");
  if (!threadId) return NextResponse.json({ error: "threadId is required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findThreadMessages(threadId, limit));
}
