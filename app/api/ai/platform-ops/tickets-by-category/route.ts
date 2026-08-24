import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findTicketsByCategory } from "@/lib/ai-queries/platform-ops";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const category = params.get("category");
  if (!category) return NextResponse.json({ error: "category is required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findTicketsByCategory(category, limit));
}
