import { cachedRoleLoginTiming } from "@/lib/cached";
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
  let data: Awaited<ReturnType<typeof cachedRoleLoginTiming>>;
  try {
    data = await cachedRoleLoginTiming();
  } catch (error) {
    return <DataUnavailable detail={errorDetail(error)} />;
  }

  const totalEvents = data.summaries.reduce((sum, row) => sum + row.total, 0);

  return (
    <PageChrome
      eyebrow="Usage"
      title="Login Timing by Role"
      subtitle={`Admin and client login timing in ${data.timezone}. Combines explicit app login events, legacy production login tracking, audit login events, and Companion first-login records.`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile label="Observed login events" value={formatNumber(totalEvents)} sub={`Across ${data.timezone}`} tone="good" />
        {data.summaries.map((summary) => (
          <StatTile
            key={summary.role}
            label={`${summary.role} login activity`}
            value={formatNumber(summary.total)}
            sub={`Peak window: ${summary.peakDay} ${summary.peakHour}`}
            tone={summary.total ? "good" : undefined}
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
          <SectionCard title="When people sign in" description="Each cell is one day and hour in local time. Labels appear inside active cells; hover a cell for its exact count.">
            <DayHourHeatmaps groups={data.dayHour} />
          </SectionCard>

          <SectionCard title="Highest-volume windows" description="The eight busiest windows for each role, ranked by observed events.">
            <TopTimingSlots groups={data.topSlots} />
          </SectionCard>

          <div className="grid lg:grid-cols-2 gap-6">
            <SectionCard title="Weekly rhythm" description="A compact comparison of activity by weekday.">
              <SlotBars groups={data.byDay} />
            </SectionCard>
            <SectionCard title="Hourly rhythm" description="Use this view to spot coverage gaps or operational peaks.">
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
