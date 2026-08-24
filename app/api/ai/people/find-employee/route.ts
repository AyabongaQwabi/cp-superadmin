import { NextResponse } from "next/server";
import { checkAiAgentSecret } from "@/lib/ai-agent-auth";
import { findEmployee } from "@/lib/ai-queries/people";

export async function GET(request: Request) {
  const authError = checkAiAgentSecret(request);
  if (authError) return authError;

  const employeeId = new URL(request.url).searchParams.get("employeeId");
  if (!employeeId) return NextResponse.json({ error: "employeeId is required" }, { status: 400 });

  return NextResponse.json(await findEmployee(employeeId));
}
