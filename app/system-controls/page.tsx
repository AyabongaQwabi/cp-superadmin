import { revalidatePath } from "next/cache";
import { PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";
import { companionApi } from "@/lib/companion-api";

export const dynamic = "force-dynamic";

type Control = {
  key: string;
  enabled: boolean;
  reason?: string;
  publicMessage?: string;
  setAt?: string;
};

async function toggleControl(formData: FormData) {
  "use server";
  const key = String(formData.get("key") || "");
  const enabled = String(formData.get("enabled")) === "true";
  const reason = String(formData.get("reason") || "");
  const publicMessage = String(formData.get("publicMessage") || "");
  await companionApi(`/api/admin/platform-controls/${key}`, {
    method: "PATCH",
    body: JSON.stringify({ key, enabled, reason, publicMessage, confirmText: key, actorName: "Superadmin" }),
  });
  revalidatePath("/system-controls");
}

async function lockdown(formData: FormData) {
  "use server";
  const enabled = String(formData.get("enabled")) === "true";
  const reason = String(formData.get("reason") || "");
  const publicMessage = String(formData.get("publicMessage") || "");
  await companionApi("/api/admin/platform-controls/lockdown", {
    method: "POST",
    body: JSON.stringify({ enabled, reason, publicMessage, confirmText: "GLOBAL LOCKDOWN", actorName: "Superadmin" }),
  });
  revalidatePath("/system-controls");
}

export default async function Page() {
  const data = await companionApi<{ controls: Control[] }>("/api/admin/platform-controls");
  const active = data.controls.filter((control) => control.enabled);

  return (
    <PageChrome
      eyebrow="Configuration"
      title="System Controls"
      subtitle="Manage platform availability, customer-facing messages, and operational safety controls."
    >
      <SectionCard title="Global lockdown">
        <form action={lockdown} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input name="reason" required placeholder="Reason" className="rounded px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }} />
          <input name="publicMessage" placeholder="Public message" className="rounded px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }} />
          <button name="enabled" value="true" className="rounded px-3 py-2 text-sm font-semibold" style={{ background: "var(--status-critical)", color: "#fff" }}>Enable</button>
          <button name="enabled" value="false" className="rounded px-3 py-2 text-sm font-semibold" style={{ background: "var(--gridline)", color: "var(--text-primary)" }}>Disable</button>
        </form>
      </SectionCard>

      <SectionCard title="Controls" description={`${active.length} active control(s).`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: "1px solid var(--border)" }}><th className="text-left py-2 pr-4">Control</th><th>Status</th><th>Reason</th><th>Public message</th><th>Action</th></tr></thead>
            <tbody>
              {data.controls.map((control) => (
                <tr key={control.key} style={{ borderBottom: "1px solid var(--gridline)" }}>
                  <td className="py-2 pr-4 font-medium">{control.key}</td>
                  <td className="py-2 px-3"><StatusBadge tone={control.enabled ? "critical" : "good"}>{control.enabled ? "Active" : "Off"}</StatusBadge></td>
                  <td className="py-2 px-3">{control.reason || "-"}</td>
                  <td className="py-2 px-3">{control.publicMessage || "-"}</td>
                  <td className="py-2 pl-3">
                    <form action={toggleControl} className="flex gap-2">
                      <input type="hidden" name="key" value={control.key} />
                      <input name="reason" required placeholder="Reason" className="rounded px-2 py-1 text-xs" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }} />
                      <input name="publicMessage" placeholder="Public message" className="rounded px-2 py-1 text-xs" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }} />
                      <button name="enabled" value={String(!control.enabled)} className="rounded px-2 py-1 text-xs font-semibold" style={{ background: "var(--series-1)", color: "#fff" }}>
                        {control.enabled ? "Switch off" : "Switch on"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageChrome>
  );
}
