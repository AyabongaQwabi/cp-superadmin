import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findAppointmentsByStatus } from "@/lib/ai-queries/appointments";
import { appointmentFilters } from "../filters";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  if (!status) return NextResponse.json({ error: "status is required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findAppointmentsByStatus(status, limit, appointmentFilters(params)));
}
