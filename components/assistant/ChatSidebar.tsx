"use client";

import { useState } from "react";
import Link from "next/link";
import type { ConversationGroup, ConversationSummary } from "./types";

const GROUP_LABELS: Record<ConversationGroup, string> = {
  today: "Today",
  yesterday: "Yesterday",
  previous7Days: "Previous 7 days",
  older: "Older",
};

const GROUP_ORDER: ConversationGroup[] = ["today", "yesterday", "previous7Days", "older"];

function groupConversations(conversations: ConversationSummary[]) {
  const groups = new Map<ConversationGroup, ConversationSummary[]>();
  for (const conversation of conversations) {
    const bucket = groups.get(conversation.group) ?? [];
    bucket.push(conversation);
    groups.set(conversation.group, bucket);
  }
  return GROUP_ORDER.map((group) => ({ group, conversations: groups.get(group) ?? [] })).filter(
    (row) => row.conversations.length > 0,
  );
}

export function ChatSidebar({
  isOpen,
  isCollapsed,
  conversations,
  activeConversationId,
  adminName,
  adminEmail,
  onNewChat,
  onSelectConversation,
  onRenameConversation,
  onArchiveConversation,
  onDeleteConversation,
  onCloseMobile,
}: {
  isOpen: boolean;
  isCollapsed: boolean;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  adminName?: string;
  adminEmail?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onArchiveConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onCloseMobile: () => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const grouped = groupConversations(conversations);

  return (
    <>
      <div
        className={`assistant-mobile-backdrop ${isOpen ? "is-open" : ""}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside
        className={`assistant-inner-sidebar ${isCollapsed ? "is-collapsed" : ""} ${isOpen ? "is-open" : ""}`}
      >
        <Link href="/" className="assistant-back-link">
          ← Back to dashboard
        </Link>

        <button type="button" className="assistant-new-chat" onClick={onNewChat}>
          + New chat
        </button>

        <nav className="assistant-history" aria-label="Conversation history">
          {grouped.map(({ group, conversations: rows }) => (
            <div key={group} className="assistant-history-group">
              <p>{GROUP_LABELS[group]}</p>
              {rows.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`assistant-history-row ${conversation.id === activeConversationId ? "is-active" : ""}`}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  {renamingId === conversation.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onRenameConversation(conversation.id, renameValue);
                          setRenamingId(null);
                        } else if (e.key === "Escape") {
                          setRenamingId(null);
                        }
                      }}
                      onBlur={() => setRenamingId(null)}
                      className="assistant-history-title"
                      style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)" }}
                    />
                  ) : (
                    <span className="assistant-history-title">{conversation.title}</span>
                  )}
                  <div className="assistant-history-actions">
                    <button
                      type="button"
                      aria-label="Rename conversation"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(conversation.id);
                        setRenameValue(conversation.title);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      aria-label="Archive conversation"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveConversation(conversation.id);
                      }}
                    >
                      ⊡
                    </button>
                    <button
                      type="button"
                      aria-label="Delete conversation"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conversation.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </nav>

        {(adminName || adminEmail) && (
          <div className="assistant-inner-sidebar-footer">
            {adminName && <strong>{adminName}</strong>}
            {adminEmail && <span>{adminEmail}</span>}
          </div>
        )}
      </aside>
    </>
  );
}
