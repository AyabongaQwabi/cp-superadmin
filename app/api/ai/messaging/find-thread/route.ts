import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findThread } from "@/lib/ai-queries/messaging";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const threadId = new URL(request.url).searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "threadId is required" }, { status: 400 });

  return NextResponse.json(await findThread(threadId));
}
