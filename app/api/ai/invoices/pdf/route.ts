import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findInvoicePdf } from "@/lib/ai-queries/invoices";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const invoiceId = new URL(request.url).searchParams.get("invoiceId");
  if (!invoiceId) return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });

  return NextResponse.json(await findInvoicePdf(invoiceId));
}
