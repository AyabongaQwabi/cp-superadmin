import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findSupportTicket } from "@/lib/ai-queries/platform-ops";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const ticketId = new URL(request.url).searchParams.get("ticketId");
  if (!ticketId) return NextResponse.json({ error: "ticketId is required" }, { status: 400 });

  return NextResponse.json(await findSupportTicket(ticketId));
}
