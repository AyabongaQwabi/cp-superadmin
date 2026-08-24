export type ConversationGroup = "today" | "yesterday" | "previous7Days" | "older";

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  group: ConversationGroup;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}
