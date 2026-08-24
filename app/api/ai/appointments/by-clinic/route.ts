import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findAppointmentsByClinic } from "@/lib/ai-queries/appointments";
import { appointmentFilters } from "../filters";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const clinic = params.get("clinic");
  if (!clinic) return NextResponse.json({ error: "clinic is required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findAppointmentsByClinic(clinic, limit, appointmentFilters(params)));
}
