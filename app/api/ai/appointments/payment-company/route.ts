import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findAppointmentPaymentCompany } from "@/lib/ai-queries/appointments";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const appointmentId = new URL(request.url).searchParams.get("appointmentId");
  if (!appointmentId) return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });

  return NextResponse.json(await findAppointmentPaymentCompany(appointmentId));
}
