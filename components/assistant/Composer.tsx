"use client";

import { useEffect, useRef } from "react";

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }, [value]);

  return (
    <div className="assistant-composer-wrap">
      <div className="assistant-composer">
        <form
          className="assistant-composer-box"
          onSubmit={(e) => {
            e.preventDefault();
            if (isStreaming) return;
            onSend();
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!isStreaming && value.trim()) onSend();
              }
            }}
            placeholder="Ask about appointments, companies, people, sites, invoices, audit history, messaging, or platform operations…"
            rows={1}
          />
          {isStreaming ? (
            <button type="button" className="assistant-send-button is-stop" onClick={onStop} aria-label="Stop">
              ■
            </button>
          ) : (
            <button type="submit" className="assistant-send-button" disabled={!value.trim()} aria-label="Send">
              ↑
            </button>
          )}
        </form>
        <p className="assistant-disclaimer">The assistant can make mistakes. Verify important information.</p>
      </div>
    </div>
  );
}
