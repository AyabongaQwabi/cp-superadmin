import { revalidatePath } from "next/cache";
import { PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";
import { cachedCompanionApi, companionApi } from "@/lib/companion-api";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  billing: "Billing",
  booking: "Booking",
  technical: "Technical",
  other: "Other",
};

type SupportRequest = {
  id: string;
  category: string;
  message: string;
  userName: string;
  userEmail: string;
  status: string;
  response?: string;
  respondedAt?: string;
  createdAt: string;
};

async function respond(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const response = String(formData.get("response") || "");
  await companionApi(`/api/support-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ response }),
  });
  revalidatePath("/support-requests");
}

export default async function Page() {
  const data = await cachedCompanionApi<{ requests: SupportRequest[] }>("/api/support-requests", 30);

  return (
    <PageChrome
      eyebrow="Support"
      title="Support requests"
      subtitle="Problems submitted from ClinicPlus Companion — reply here and the user is emailed."
    >
      <SectionCard title="Queue">
        <div className="flex flex-col gap-4">
          {data.requests.map((request) => (
            <div key={request.id} className="rounded p-4" style={{ border: "1px solid var(--gridline)" }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {request.id} · {CATEGORY_LABELS[request.category] || request.category}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {request.userName} · {request.userEmail} ·{" "}
                    {new Date(request.createdAt).toLocaleString()}
                  </div>
                </div>
                <StatusBadge tone={request.status === "resolved" ? "good" : "warning"}>
                  {request.status}
                </StatusBadge>
              </div>
              <p className="text-sm mt-3 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {request.message}
              </p>
              {request.response && (
                <p className="text-xs mt-2 rounded p-2" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                  <strong>Support team</strong>: {request.response}
                </p>
              )}
              {request.status !== "resolved" && (
                <form action={respond} className="mt-3 flex flex-col gap-2">
                  <input type="hidden" name="id" value={request.id} />
                  <textarea
                    name="response"
                    required
                    placeholder="Reply to the user"
                    className="rounded px-3 py-2 text-sm"
                    style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
                  />
                  <button
                    className="rounded px-3 py-2 text-sm font-semibold self-start"
                    style={{ background: "var(--series-1)", color: "#fff" }}
                  >
                    Send response
                  </button>
                </form>
              )}
            </div>
          ))}
          {!data.requests.length && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No support requests yet.
            </p>
          )}
        </div>
      </SectionCard>
    </PageChrome>
  );
}
