import Link from "next/link";
import { PageChrome, SectionCard } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

const CRM_CARDS = [
  {
    href: "/crm/customers",
    title: "Customer directory",
    detail: "Search client contacts, company relationships, and reachable accounts.",
  },
  {
    href: "/crm/bulk-email",
    title: "Bulk email studio",
    detail: "Send marketing or transactional customer messages from one workspace.",
  },
  {
    href: "/crm/user-intelligence",
    title: "User intelligence",
    detail: "Study signup and login source, device, browser, OS, and permission-based location events.",
  },
];

export default function Page() {
  return (
    <PageChrome
      eyebrow="CRM"
      title="Customer Relationship Workspace"
      subtitle="A focused CRM layer for customer communication, audience discovery, and admin-product intelligence."
    >
      <div className="crm-grid">
        {CRM_CARDS.map((card) => (
          <Link key={card.href} href={card.href} className="crm-card">
            <strong>{card.title}</strong>
            <span>{card.detail}</span>
          </Link>
        ))}
      </div>

      <SectionCard title="CRM operating model" description="Bring customer growth, communication, and usage insight into one workspace for better admin support." >
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="crm-mini"><strong>Acquire</strong><span>Understand where signups come from.</span></div>
          <div className="crm-mini"><strong>Engage</strong><span>Send segmented marketing and notices.</span></div>
          <div className="crm-mini"><strong>Retain</strong><span>Study returning users, devices, and friction.</span></div>
        </div>
      </SectionCard>
    </PageChrome>
  );
}
