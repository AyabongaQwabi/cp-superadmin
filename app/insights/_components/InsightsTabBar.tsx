import Link from "next/link";

export type InsightsTabId =
  | "overview"
  | "appointments"
  | "companies"
  | "sites"
  | "people"
  | "services"
  | "finance"
  | "operations"
  | "feedback"
  | "usage";

export const INSIGHTS_TABS: { id: InsightsTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "appointments", label: "Appointments" },
  { id: "companies", label: "Companies" },
  { id: "sites", label: "Sites" },
  { id: "people", label: "People" },
  { id: "services", label: "Services" },
  { id: "finance", label: "Finance" },
  { id: "operations", label: "Operations" },
  { id: "feedback", label: "Feedback" },
  { id: "usage", label: "Usage" },
];

export function InsightsTabBar({ active }: { active: InsightsTabId }) {
  return (
    <div className="flex flex-wrap gap-2">
      {INSIGHTS_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.id === "overview" ? "/insights" : `/insights?tab=${tab.id}`}
          className="rounded px-3 py-1.5 text-sm font-medium"
          style={{
            background: active === tab.id ? "var(--series-1)" : "var(--surface-2)",
            color: active === tab.id ? "#fff" : "var(--text-secondary)",
            border: active === tab.id ? "none" : "1px solid var(--border)",
          }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export function parseInsightsTab(value?: string): InsightsTabId {
  const match = INSIGHTS_TABS.find((tab) => tab.id === value);
  return match?.id ?? "overview";
}
