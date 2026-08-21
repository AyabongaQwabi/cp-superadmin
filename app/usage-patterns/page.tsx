import { getRoleLoginTimingDashboard } from "@/lib/superadmin-read-model";
import { formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { DayHourHeatmaps, SlotBars, TopTimingSlots } from "@/components/superadmin/TimingAnalysis";
import { EmptyState, PageChrome, SectionCard } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

function errorDetail(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "Unknown data connection error");
  if (message.includes("querySrv ETIMEOUT")) {
    return "MongoDB DNS lookup timed out while connecting to Atlas. Try refreshing once the network or Atlas DNS is reachable.";
  }
  if (message.includes("frame.join")) {
    return "The page hit a rendering issue while showing timing data. Refresh after the latest update has compiled.";
  }
  return message;
}

function DataUnavailable({ detail }: { detail: string }) {
  return (
    <PageChrome
      eyebrow="Usage"
      title="Login Timing by Role"
      subtitle="Admin and client login timing will appear here when the analytics database is reachable."
    >
      <SectionCard title="Usage data unavailable">
        <EmptyState
          title="Could not load login timing"
          detail={detail}
        />
      </SectionCard>
    </PageChrome>
  );
}

export default async function Page() {
  let data: Awaited<ReturnType<typeof getRoleLoginTimingDashboard>>;
  try {
    data = await getRoleLoginTimingDashboard();
  } catch (error) {
    return <DataUnavailable detail={errorDetail(error)} />;
  }

  const totalEvents = data.summaries.reduce((sum, row) => sum + row.total, 0);

  return (
    <PageChrome
      eyebrow="Usage"
      title="Login Timing by Role"
      subtitle={`Admin and client login timing in ${data.timezone}. Uses production login tracking when present, Companion audit login events, and Companion first-login records as fallback evidence.`}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Observed login events" value={formatNumber(totalEvents)} />
        {data.summaries.map((summary) => (
          <StatTile
            key={summary.role}
            label={`${summary.role} logins`}
            value={formatNumber(summary.total)}
            sub={`Peak ${summary.peakDay} ${summary.peakHour}`}
          />
        ))}
      </div>

      {totalEvents === 0 ? (
        <SectionCard title="No login timing found">
          <EmptyState
            title="No login events were found"
            detail="The page is ready, but the connected data does not currently expose dated login records for admin or client users."
          />
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Day and hour heatmap" description="Darker cells indicate more observed logins in that role and time slot.">
            <DayHourHeatmaps groups={data.dayHour} />
          </SectionCard>

          <SectionCard title="Peak login windows">
            <TopTimingSlots groups={data.topSlots} />
          </SectionCard>

          <div className="grid lg:grid-cols-2 gap-6">
            <SectionCard title="Logins by day">
              <SlotBars groups={data.byDay} />
            </SectionCard>
            <SectionCard title="Logins by hour">
              <SlotBars groups={data.byHour} />
            </SectionCard>
          </div>

          <SectionCard title="Sources">
            <div className="grid sm:grid-cols-3 gap-3">
              {Object.entries(data.sourceCounts).map(([source, count]) => (
                <StatTile key={source} label={source.replaceAll("-", " ")} value={formatNumber(count)} />
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </PageChrome>
  );
}
