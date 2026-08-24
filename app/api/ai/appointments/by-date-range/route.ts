import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findAppointmentsByDateRange } from "@/lib/ai-queries/appointments";
import { appointmentFilters } from "../filters";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");
  if (!from || !to) return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findAppointmentsByDateRange(from, to, limit, appointmentFilters(params)));
}
