import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findClinicAvailability } from "@/lib/ai-queries/platform-ops";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const clinic = params.get("clinic");
  if (!clinic) return NextResponse.json({ error: "clinic is required" }, { status: 400 });
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  return NextResponse.json(await findClinicAvailability(clinic, from, to));
}
