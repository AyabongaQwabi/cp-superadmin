"use client";

import { useEffect, useRef } from "react";
import { MarkdownMessage } from "./MarkdownMessage";
import type { ChatMessage } from "./types";

export function MessageList({ messages, isStreaming }: { messages: ChatMessage[]; isStreaming: boolean }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  return (
    <div className="assistant-conversation">
      <div className="assistant-conversation-inner">
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          if (message.role === "user") {
            return (
              <div key={index} className="assistant-message-row is-user">
                <div className="assistant-user-bubble">{message.text}</div>
              </div>
            );
          }
          return (
            <div key={index} className="assistant-message-row">
              <div className="assistant-response">
                <span className="assistant-avatar" aria-hidden="true">
                  AI
                </span>
                <div className="assistant-response-body">
                  {message.text ? (
                    <MarkdownMessage text={message.text} />
                  ) : isLast && isStreaming ? (
                    <span style={{ color: "var(--text-muted)" }}>Thinking…</span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
