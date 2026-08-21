import { revalidatePath } from "next/cache";
import { PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";
import { companionApi } from "@/lib/companion-api";

export const dynamic = "force-dynamic";

type Ticket = {
  id: string;
  category: string;
  message: string;
  submittedByName: string;
  status: string;
  responses?: { id: string; message: string; responderName: string; createdAt: string }[];
};

async function respond(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const response = String(formData.get("response") || "");
  const status = String(formData.get("status") || "resolved");
  await companionApi(`/api/admin/support-tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ response, status, actorName: "Superadmin" }),
  });
  revalidatePath("/support-tickets");
}

export default async function Page() {
  const data = await companionApi<{ tickets: Ticket[] }>("/api/admin/support-tickets");

  return (
    <PageChrome eyebrow="Support" title="Support Tickets" subtitle="Requests, complaints, and suggestions submitted from cp-redesign-admin.">
      <SectionCard title="Tickets">
        <div className="flex flex-col gap-4">
          {data.tickets.map((ticket) => (
            <div key={ticket.id} className="rounded p-4" style={{ border: "1px solid var(--gridline)" }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{ticket.id} · {ticket.category}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{ticket.submittedByName}</div>
                </div>
                <StatusBadge tone={ticket.status === "resolved" ? "good" : "warning"}>{ticket.status}</StatusBadge>
              </div>
              <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>{ticket.message}</p>
              {(ticket.responses || []).map((response) => (
                <p key={response.id} className="text-xs mt-2 rounded p-2" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                  <strong>{response.responderName}</strong>: {response.message}
                </p>
              ))}
              <form action={respond} className="mt-3 flex flex-col gap-2">
                <input type="hidden" name="id" value={ticket.id} />
                <textarea name="response" required placeholder="Reply" className="rounded px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }} />
                <select name="status" defaultValue="resolved" className="rounded px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button className="rounded px-3 py-2 text-sm font-semibold self-start" style={{ background: "var(--series-1)", color: "#fff" }}>Send response</button>
              </form>
            </div>
          ))}
          {!data.tickets.length && <p className="text-sm" style={{ color: "var(--text-muted)" }}>No support tickets found.</p>}
        </div>
      </SectionCard>
    </PageChrome>
  );
}
