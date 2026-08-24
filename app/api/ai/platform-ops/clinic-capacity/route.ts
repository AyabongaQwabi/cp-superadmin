import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findClinicCapacity } from "@/lib/ai-queries/platform-ops";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const clinic = new URL(request.url).searchParams.get("clinic");
  if (!clinic) return NextResponse.json({ error: "clinic is required" }, { status: 400 });

  return NextResponse.json(await findClinicCapacity(clinic));
}
