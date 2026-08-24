"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatSidebar } from "../assistant/ChatSidebar";
import { MessageList } from "../assistant/MessageList";
import { Composer } from "../assistant/Composer";
import { EmptyState } from "../assistant/EmptyState";
import type { ChatMessage, ConversationSummary } from "../assistant/types";

type AdkEvent = {
  content?: { role?: string; parts?: { text?: string; thought?: boolean }[] };
  error?: string;
  conversationId?: string;
};

export function AssistantChat({ adminName, adminEmail }: { adminName?: string; adminEmail?: string }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const sessionIdRef = useRef<string | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshConversations = useCallback(async () => {
    const res = await fetch("/api/assistant/conversations");
    if (!res.ok) return;
    const data = await res.json();
    setConversations(data.conversations ?? []);
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  async function loadConversation(conversationId: string) {
    setActiveConversationId(conversationId);
    setIsMobileSidebarOpen(false);
    const res = await fetch(`/api/assistant/conversations/${conversationId}/messages`);
    if (!res.ok) {
      setMessages([]);
      return;
    }
    const data = await res.json();
    setMessages((data.messages ?? []).map((m: { role: "user" | "assistant"; text: string }) => ({ role: m.role, text: m.text })));
  }

  function startNewChat() {
    setActiveConversationId(null);
    setMessages([]);
    sessionIdRef.current = undefined;
    setIsMobileSidebarOpen(false);
  }

  async function renameConversation(id: string, title: string) {
    if (!title.trim()) return;
    await fetch(`/api/assistant/conversations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    refreshConversations();
  }

  async function archiveConversation(id: string) {
    await fetch(`/api/assistant/conversations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (id === activeConversationId) startNewChat();
    refreshConversations();
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" });
    if (id === activeConversationId) startNewChat();
    refreshConversations();
  }

  function stopStreaming() {
    abortControllerRef.current?.abort();
  }

  async function send(overrideText?: string) {
    const message = (overrideText ?? input).trim();
    if (!message || isStreaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: message }, { role: "assistant", text: "" }]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          sessionId: sessionIdRef.current,
          conversationId: activeConversationId ?? undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;

          let event: AdkEvent;
          try {
            event = JSON.parse(payload);
          } catch {
            continue;
          }

          if (event.conversationId && !activeConversationId) {
            setActiveConversationId(event.conversationId);
          }

          if (event.error) {
            appendToLastAssistantMessage(`\n\nError: ${event.error}`);
            continue;
          }

          const text = event.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
          if (text && event.content?.role !== "user") {
            appendToLastAssistantMessage(text);
          }
        }
      }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        appendToLastAssistantMessage(`\n\nSomething went wrong: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      refreshConversations();
    }
  }

  function appendToLastAssistantMessage(chunk: string) {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant") {
        next[next.length - 1] = { ...last, text: last.text + chunk };
      }
      return next;
    });
  }

  const showEmptyState = messages.length === 0;

  return (
    <div className="assistant-shell">
      <ChatSidebar
        isOpen={isMobileSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        conversations={conversations}
        activeConversationId={activeConversationId}
        adminName={adminName}
        adminEmail={adminEmail}
        onNewChat={startNewChat}
        onSelectConversation={loadConversation}
        onRenameConversation={renameConversation}
        onArchiveConversation={archiveConversation}
        onDeleteConversation={deleteConversation}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <div className="assistant-main">
        <div className="assistant-header">
          <button
            type="button"
            className="assistant-sidebar-toggle"
            aria-label="Toggle sidebar"
            onClick={() => {
              setIsSidebarCollapsed((v) => !v);
              setIsMobileSidebarOpen((v) => !v);
            }}
          >
            ☰
          </button>
        </div>

        {showEmptyState ? (
          <EmptyState onSelectSuggestion={(text) => send(text)} />
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}

        <Composer value={input} onChange={setInput} onSend={() => send()} onStop={stopStreaming} isStreaming={isStreaming} />
      </div>
    </div>
  );
}
