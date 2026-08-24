import { NextResponse } from "next/server";
import { safeEqual } from "./auth";

export function checkAiAgentSecret(request: Request): NextResponse | null {
  const secret = process.env.AI_AGENT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "AI_AGENT_SECRET is not configured" }, { status: 500 });
  }

  const provided = request.headers.get("x-ai-agent-secret");
  if (!provided || !safeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
