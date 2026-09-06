import { Suspense } from "react";
import { PageChrome } from "@/components/superadmin/PageChrome";
import { InsightsTabBar, parseInsightsTab } from "./_components/InsightsTabBar";
import { OverviewTab } from "./_components/OverviewTab";
import { AppointmentsTab } from "./_components/AppointmentsTab";
import { CompaniesTab } from "./_components/CompaniesTab";
import { SitesTab } from "./_components/SitesTab";
import { PeopleTab } from "./_components/PeopleTab";
import { ServicesTab } from "./_components/ServicesTab";
import { FinanceTab } from "./_components/FinanceTab";
import { OperationsTab } from "./_components/OperationsTab";
import { FeedbackSummaryTab } from "./_components/FeedbackSummaryTab";
import { UsageTab } from "./_components/UsageTab";

export const dynamic = "force-dynamic";

function TabContent({ tab }: { tab: ReturnType<typeof parseInsightsTab> }) {
  switch (tab) {
    case "appointments":
      return <AppointmentsTab />;
    case "companies":
      return <CompaniesTab />;
    case "sites":
      return <SitesTab />;
    case "people":
      return <PeopleTab />;
    case "services":
      return <ServicesTab />;
    case "finance":
      return <FinanceTab />;
    case "operations":
      return <OperationsTab />;
    case "feedback":
      return <FeedbackSummaryTab />;
    case "usage":
      return <UsageTab />;
    case "overview":
    default:
      return <OverviewTab />;
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const tab = parseInsightsTab(params.tab);

  return (
    <PageChrome
      eyebrow="Insights"
      title="Insights hub"
      subtitle="Consolidated ClinicPlus business analytics — appointments, companies, sites, people, services, finance, operations, feedback, and usage — without replacing the dedicated pages."
    >
      <InsightsTabBar active={tab} />
      <Suspense
        fallback={
          <div className="py-16 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Loading {tab} insights…
          </div>
        }
      >
        <TabContent tab={tab} />
      </Suspense>
    </PageChrome>
  );
}
