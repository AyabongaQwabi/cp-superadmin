import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/auth";
import { aiAgentChatStream } from "@/lib/ai-agent";
import { appendMessage, createConversation } from "@/lib/assistant-conversations";
import { createLogger, textPreview } from "@/lib/server-logger";

const log = createLogger("assistant-chat");

interface AdkEvent {
  content?: { role?: string; parts?: { text?: string; thought?: boolean }[] };
  error?: string;
}

function extractAssistantText(buffer: string): string {
  let text = "";
  for (const part of buffer.split("\n\n")) {
    const line = part.trim();
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]" || !payload) continue;
    try {
      const event: AdkEvent = JSON.parse(payload);
      if (event.content && event.content.role !== "user") {
        text += event.content.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
      }
    } catch {
      // ignore malformed chunks -- best-effort persistence, not the source of truth for the client
    }
  }
  return text;
}

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) {
    log.warn("rejected: no session", { requestId });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
  let conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
  if (!message.trim()) {
    log.warn("rejected: empty message", { requestId });
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  log.info("chat request received", {
    requestId,
    adminUserId: session.id,
    hasConversationId: !!conversationId,
    message: textPreview(message),
  });

  if (!conversationId) {
    const conversation = await createConversation(session.id, message);
    conversationId = conversation.id;
    log.info("created conversation", { requestId, conversationId });
  }
  await appendMessage(session.id, conversationId, "user", message);

  let upstream: Response;
  try {
    upstream = await aiAgentChatStream({ message, userId: session.id, sessionId });
  } catch (error) {
    log.error("agent server unreachable", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Assistant service is unreachable" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const errorBody = await upstream.text().catch(() => "");
    log.error("agent server returned a non-OK response", {
      requestId,
      status: upstream.status,
      bodyPreview: textPreview(errorBody, 200),
    });
    return NextResponse.json({ error: `Assistant request failed (${upstream.status})` }, { status: 502 });
  }

  const conversationIdForClosure = conversationId;
  const adminUserId = session.id;
  const upstreamReader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let rawBuffer = "";
  let chunkCount = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const conversationHeader = `data: ${JSON.stringify({ conversationId: conversationIdForClosure })}\n\n`;
      controller.enqueue(new TextEncoder().encode(conversationHeader));

      try {
        while (true) {
          const { done, value } = await upstreamReader.read();
          if (done) break;
          chunkCount++;
          rawBuffer += decoder.decode(value, { stream: true });
          controller.enqueue(value);
        }
      } catch (error) {
        log.error("error while reading upstream stream", {
          requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        controller.close();
      }

      const assistantText = extractAssistantText(rawBuffer);
      log.info("chat request complete", {
        requestId,
        conversationId: conversationIdForClosure,
        chunkCount,
        rawBufferLength: rawBuffer.length,
        assistantTextLength: assistantText.length,
        durationMs: Date.now() - startedAt,
      });

      if (assistantText.trim()) {
        await appendMessage(adminUserId, conversationIdForClosure, "assistant", assistantText);
      } else {
        // Structure only, never the raw SSE payload -- it may contain tool
        // results with real business data (appointment/company details, etc).
        const sseLineCount = rawBuffer.split("\n\n").filter((l) => l.trim().startsWith("data:")).length;
        log.warn("no assistant text extracted from upstream stream -- nothing persisted", {
          requestId,
          conversationId: conversationIdForClosure,
          rawBufferLength: rawBuffer.length,
          sseLineCount,
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
