import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findEmployeeJobSpecs } from "@/lib/ai-queries/people";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const employeeId = params.get("employeeId");
  if (!employeeId) return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  const limit = Number(params.get("limit")) || undefined;

  return NextResponse.json(await findEmployeeJobSpecs(employeeId, limit));
}
