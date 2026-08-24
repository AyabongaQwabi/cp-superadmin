import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findAppointmentsByUser } from "@/lib/ai-queries/appointments";
import { appointmentFilters } from "../filters";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const userId = params.get("userId");
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findAppointmentsByUser(userId, limit, appointmentFilters(params)));
}
