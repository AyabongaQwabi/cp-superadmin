import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/auth";
import { getConversationMessages } from "@/lib/assistant-conversations";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const messages = await getConversationMessages(session.id, id);
  if (messages === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ messages });
}
