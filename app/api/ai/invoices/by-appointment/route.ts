import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findInvoicesByAppointment } from "@/lib/ai-queries/invoices";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const appointmentId = params.get("appointmentId");
  if (!appointmentId) return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findInvoicesByAppointment(appointmentId, limit));
}
