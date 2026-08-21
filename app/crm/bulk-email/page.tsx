import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { companionApi } from "@/lib/companion-api";
import { readSession, SESSION_COOKIE } from "@/lib/auth";
import { PageChrome, SectionCard } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

async function sendBulkEmail(formData: FormData) {
  "use server";
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const selected = String(formData.get("recipientIds") || "")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  await companionApi("/api/admin/admin-companion/crm/bulk-email", {
    method: "POST",
    body: JSON.stringify({
      senderId: session?.id,
      senderName: session?.name || "ClinicPlus Admin",
      purpose: String(formData.get("purpose") || "marketing"),
      subject: String(formData.get("subject") || ""),
      message: String(formData.get("message") || ""),
      recipientIds: selected,
    }),
  });
  revalidatePath("/crm/bulk-email");
}

export default function Page() {
  return (
    <PageChrome
      eyebrow="CRM"
      title="Bulk Email Studio"
      subtitle="Send marketing or transactional customer emails. Leave recipients blank to reach the first 500 client contacts."
    >
      <SectionCard title="Compose message" description="Use transactional only for service, billing, appointment, or account notices. Marketing messages should be useful and sparse.">
        <form action={sendBulkEmail} className="crm-compose">
          <label>
            Purpose
            <select name="purpose" defaultValue="marketing">
              <option value="marketing">Marketing</option>
              <option value="transactional">Transactional</option>
            </select>
          </label>
          <label>
            Subject
            <input name="subject" required placeholder="Subject line" />
          </label>
          <label>
            Recipient ids
            <textarea name="recipientIds" rows={3} placeholder="Optional: paste user ids separated by commas or new lines" />
          </label>
          <label>
            Message
            <textarea name="message" required rows={10} placeholder="Write the customer message..." />
          </label>
          <button type="submit">Send email batch</button>
        </form>
      </SectionCard>
    </PageChrome>
  );
}
