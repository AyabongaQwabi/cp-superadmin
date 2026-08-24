import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/auth";
import { createConversation, listConversations } from "@/lib/assistant-conversations";

export async function GET() {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await listConversations(session.id);
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const firstMessage = typeof body.firstMessage === "string" ? body.firstMessage : undefined;

  const conversation = await createConversation(session.id, firstMessage);
  return NextResponse.json(conversation, { status: 201 });
}
