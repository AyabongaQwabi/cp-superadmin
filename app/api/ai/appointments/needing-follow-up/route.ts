import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findAppointmentsNeedingFollowUp } from "@/lib/ai-queries/appointments";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const limit = Number(new URL(request.url).searchParams.get("limit")) || undefined;

  return NextResponse.json(await findAppointmentsNeedingFollowUp(limit));
}
