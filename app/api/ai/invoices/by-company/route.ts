import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findInvoicesByCompany } from "@/lib/ai-queries/invoices";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const companyId = params.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findInvoicesByCompany(companyId, limit));
}
