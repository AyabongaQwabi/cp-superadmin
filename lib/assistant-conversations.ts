import { ObjectId } from "mongodb";
import { getAdminCompanionDb } from "./mongodb";

export interface AssistantConversation {
  _id: ObjectId;
  adminUserId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
}

export interface AssistantMessage {
  _id: ObjectId;
  conversationId: ObjectId;
  role: "user" | "assistant";
  text: string;
  createdAt: Date;
}

export type ConversationGroup = "today" | "yesterday" | "previous7Days" | "older";

export interface SerializedConversation {
  id: string;
  title: string;
  updatedAt: string;
  group: ConversationGroup;
}

const TITLE_MAX_LENGTH = 60;

function serializeConversation(conversation: AssistantConversation): SerializedConversation {
  return {
    id: String(conversation._id),
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
    group: groupForDate(conversation.updatedAt),
  };
}

function groupForDate(date: Date): ConversationGroup {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  if (date >= startOfToday) return "today";
  if (date >= startOfYesterday) return "yesterday";
  if (date >= sevenDaysAgo) return "previous7Days";
  return "older";
}

export function titleFromMessage(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, " ");
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed || "New chat";
  return `${trimmed.slice(0, TITLE_MAX_LENGTH - 1)}…`;
}

export async function listConversations(adminUserId: string): Promise<SerializedConversation[]> {
  const db = await getAdminCompanionDb();
  const rows = await db
    .collection<AssistantConversation>("assistantConversations")
    .find({ adminUserId, archived: { $ne: true } })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();
  return rows.map(serializeConversation);
}

export async function createConversation(adminUserId: string, firstMessage?: string) {
  const db = await getAdminCompanionDb();
  const now = new Date();
  const doc: Omit<AssistantConversation, "_id"> = {
    adminUserId,
    title: firstMessage ? titleFromMessage(firstMessage) : "New chat",
    createdAt: now,
    updatedAt: now,
    archived: false,
  };
  const { insertedId } = await db.collection<Omit<AssistantConversation, "_id">>("assistantConversations").insertOne(doc);
  return { id: String(insertedId) };
}

async function assertOwnedConversation(adminUserId: string, conversationId: string) {
  if (!ObjectId.isValid(conversationId)) return null;
  const db = await getAdminCompanionDb();
  const conversation = await db
    .collection<AssistantConversation>("assistantConversations")
    .findOne({ _id: new ObjectId(conversationId), adminUserId });
  return conversation;
}

export async function renameConversation(adminUserId: string, conversationId: string, title: string) {
  const conversation = await assertOwnedConversation(adminUserId, conversationId);
  if (!conversation) return false;
  const db = await getAdminCompanionDb();
  await db
    .collection<AssistantConversation>("assistantConversations")
    .updateOne({ _id: conversation._id }, { $set: { title: titleFromMessage(title), updatedAt: new Date() } });
  return true;
}

export async function archiveConversation(adminUserId: string, conversationId: string) {
  const conversation = await assertOwnedConversation(adminUserId, conversationId);
  if (!conversation) return false;
  const db = await getAdminCompanionDb();
  await db
    .collection<AssistantConversation>("assistantConversations")
    .updateOne({ _id: conversation._id }, { $set: { archived: true, updatedAt: new Date() } });
  return true;
}

export async function deleteConversation(adminUserId: string, conversationId: string) {
  const conversation = await assertOwnedConversation(adminUserId, conversationId);
  if (!conversation) return false;
  const db = await getAdminCompanionDb();
  await Promise.all([
    db.collection<AssistantConversation>("assistantConversations").deleteOne({ _id: conversation._id }),
    db.collection<AssistantMessage>("assistantMessages").deleteMany({ conversationId: conversation._id }),
  ]);
  return true;
}

export async function getConversationMessages(adminUserId: string, conversationId: string) {
  const conversation = await assertOwnedConversation(adminUserId, conversationId);
  if (!conversation) return null;
  const db = await getAdminCompanionDb();
  const rows = await db
    .collection<AssistantMessage>("assistantMessages")
    .find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .limit(500)
    .toArray();
  return rows.map((row) => ({ role: row.role, text: row.text, createdAt: row.createdAt.toISOString() }));
}

export async function appendMessage(
  adminUserId: string,
  conversationId: string,
  role: "user" | "assistant",
  text: string,
) {
  const conversation = await assertOwnedConversation(adminUserId, conversationId);
  if (!conversation) return false;
  const db = await getAdminCompanionDb();
  const now = new Date();
  await Promise.all([
    db.collection<Omit<AssistantMessage, "_id">>("assistantMessages").insertOne({
      conversationId: conversation._id,
      role,
      text,
      createdAt: now,
    }),
    db
      .collection<AssistantConversation>("assistantConversations")
      .updateOne({ _id: conversation._id }, { $set: { updatedAt: now } }),
  ]);
  return true;
}
