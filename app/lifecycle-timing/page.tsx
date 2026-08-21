import { cachedLifecycleTiming } from "@/lib/cached";
import { formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { DayHourHeatmaps, SlotBars, TopTimingSlots } from "@/components/superadmin/TimingAnalysis";
import { EmptyState, PageChrome, SectionCard } from "@/components/superadmin/PageChrome";
import type { LifecycleIntervalBucket } from "@/lib/superadmin-read-model";

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

function IntervalBucketCard({ bucket }: { bucket: LifecycleIntervalBucket }) {
  return (
    <div className="rounded-lg p-4 flex flex-col gap-3" style={{ border: "1px solid var(--border)", background: "var(--background)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {bucket.label}
          </h3>
          <p className="text-xs mt-1 tabular-nums" style={{ color: "var(--text-muted)" }}>
            {bucket.window}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums" style={{ color: "var(--series-1)" }}>
            {formatNumber(bucket.total)}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            events
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded p-2" style={{ border: "1px solid var(--gridline)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Person-actions</p>
          <p className="text-lg font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
            {formatNumber(bucket.participantTotal)}
          </p>
        </div>
        <div className="rounded p-2" style={{ border: "1px solid var(--gridline)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Companies</p>
          <p className="text-lg font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
            {formatNumber(bucket.companies.length)}
          </p>
        </div>
      </div>

      {bucket.showPeople ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>
            People
          </p>
          {bucket.people.length ? (
            <div className="grid gap-2">
              {bucket.people.map((person) => (
                <div key={person.userId} className="rounded p-2" style={{ border: "1px solid var(--gridline)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{person.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{person.email ?? person.userId}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--series-1)" }}>
                      {formatNumber(person.count)}
                    </span>
                  </div>
                  {person.companies.length > 0 && (
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                      {person.companies.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No responsible users identified.</p>
          )}
        </div>
      ) : (
        <p className="text-xs rounded p-2" style={{ color: "var(--text-muted)", border: "1px solid var(--gridline)" }}>
          Names hidden for this high-volume daytime bucket.
        </p>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>
          Companies
        </p>
        {bucket.companies.length ? (
          <div className="flex flex-wrap gap-2">
            {bucket.companies.map((company) => (
              <span key={company.name} className="rounded px-2 py-1 text-xs" style={{ border: "1px solid var(--gridline)", color: "var(--text-secondary)" }}>
                {company.name} · {formatNumber(company.count)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>No company context found.</p>
        )}
      </div>
    </div>
  );
}

export default async function Page() {
  let data: Awaited<ReturnType<typeof cachedLifecycleTiming>>;
  try {
    data = await cachedLifecycleTiming();
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

          <SectionCard title="Interval personas" description="Who is responsible for activity in the unusual parts of the day, grouped by lifecycle interaction.">
            <div className="grid gap-6">
              {data.intervals.map((group) => (
                <div key={group.eventType}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                    {group.label}
                  </h3>
                  <div className="grid lg:grid-cols-2 gap-4">
                    {group.buckets.map((bucket) => (
                      <IntervalBucketCard key={`${group.eventType}-${bucket.id}`} bucket={bucket} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
