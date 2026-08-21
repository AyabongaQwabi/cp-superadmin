import { getLifecycleTimingDashboard } from "@/lib/superadmin-read-model";
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
      eyebrow="Lifecycle"
      title="Creation Timing"
      subtitle="Signup, appointment, and company creation timing will appear here when the analytics database is reachable."
    >
      <SectionCard title="Creation data unavailable">
        <EmptyState
          title="Could not load creation timing"
          detail={detail}
        />
      </SectionCard>
    </PageChrome>
  );
}

export default async function Page() {
  let data: Awaited<ReturnType<typeof getLifecycleTimingDashboard>>;
  try {
    data = await getLifecycleTimingDashboard();
  } catch (error) {
    return <DataUnavailable detail={errorDetail(error)} />;
  }

  const totalEvents = data.summaries.reduce((sum, row) => sum + row.total, 0);

  return (
    <PageChrome
      eyebrow="Lifecycle"
      title="Creation Timing"
      subtitle={`Study when users sign up, appointments are created, and companies are created. Times are grouped in ${data.timezone} from each record's first tracking date.`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatTile label="Observed creation events" value={formatNumber(totalEvents)} sub={`Across ${data.timezone}`} tone="good" />
        {data.summaries.map((summary) => (
          <StatTile
            key={summary.eventType}
            label={summary.label}
            value={formatNumber(summary.total)}
            sub={`Peak window: ${summary.peakDay} ${summary.peakHour}`}
            tone={summary.total ? "good" : undefined}
          />
        ))}
      </div>

      {totalEvents === 0 ? (
        <SectionCard title="No creation timing found">
          <EmptyState
            title="No dated creation events were found"
            detail="The page is ready, but users, appointments, and companies do not currently expose first tracking dates in the connected data."
          />
        </SectionCard>
      ) : (
        <>
          <SectionCard title="When the lifecycle moves" description="Each cell is one day and hour in local time. Compare the three matrices to see when demand enters the system.">
            <DayHourHeatmaps groups={data.dayHour} />
          </SectionCard>

          <SectionCard title="Highest-volume windows" description="The eight busiest windows for each creation event, ranked by observed records.">
            <TopTimingSlots groups={data.topSlots} />
          </SectionCard>

          <div className="grid lg:grid-cols-2 gap-6">
            <SectionCard title="Weekly rhythm" description="Which weekdays carry the most creation activity?">
              <SlotBars groups={data.byDay} />
            </SectionCard>
            <SectionCard title="Hourly rhythm" description="Which hours are most active across the lifecycle?">
              <SlotBars groups={data.byHour} />
            </SectionCard>
          </div>
        </>
      )}
    </PageChrome>
  );
}
