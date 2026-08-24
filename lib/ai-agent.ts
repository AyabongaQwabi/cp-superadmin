import { createLogger } from "./server-logger";

const AI_AGENT_URL = process.env.AI_AGENT_URL || "http://localhost:8787";
const AI_AGENT_SECRET = process.env.AI_AGENT_SECRET;
const log = createLogger("ai-agent");

export async function aiAgentChatStream(body: {
  message: string;
  userId: string;
  sessionId?: string;
}): Promise<Response> {
  if (!AI_AGENT_SECRET) throw new Error("AI_AGENT_SECRET is not configured");

  log.info("calling agent server", { url: `${AI_AGENT_URL}/chat`, hasSessionId: !!body.sessionId });

  try {
    const res = await fetch(`${AI_AGENT_URL}/chat`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-ai-agent-secret": AI_AGENT_SECRET,
      },
      body: JSON.stringify(body),
    });
    log.info("agent server responded", { status: res.status, ok: res.ok, hasBody: !!res.body });
    return res;
  } catch (error) {
    log.error("fetch to agent server failed", {
      url: AI_AGENT_URL,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
