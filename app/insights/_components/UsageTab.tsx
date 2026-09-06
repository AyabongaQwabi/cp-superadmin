import { cachedLifecycleTiming, cachedRoleLoginTiming, cachedUserIntelligence } from "@/lib/cached";
import { formatNumber } from "@/lib/format";
import { displayDate } from "@/lib/superadmin-read-model";
import { StatTile } from "@/components/StatTile";
import { DayHourHeatmaps, SlotBars, TopTimingSlots } from "@/components/superadmin/TimingAnalysis";
import { EmptyState, InlineLink, SectionCard } from "@/components/superadmin/PageChrome";
import type { LifecycleIntervalBucket } from "@/lib/superadmin-read-model";

type IntelData = {
  days: number;
  total: number;
  byEventType: { label: string; count: number }[];
  byDevice: { label: string; count: number }[];
  byBrowser: { label: string; count: number }[];
};

function IntervalBucketCard({ bucket }: { bucket: LifecycleIntervalBucket }) {
  return (
    <div className="rounded-lg p-4 flex flex-col gap-3" style={{ border: "1px solid var(--border)", background: "var(--background)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{bucket.label}</h3>
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
    </div>
  );
}

export async function UsageTab() {
  const [loginTiming, lifecycleTiming, userIntel] = await Promise.all([
    cachedRoleLoginTiming(),
    cachedLifecycleTiming(),
    cachedUserIntelligence(30).catch(() => null) as Promise<IntelData | null>,
  ]);

  const loginSummaries = Array.isArray(loginTiming.summaries) ? loginTiming.summaries : [];
  const totalLoginEvents = loginSummaries.reduce((sum, row) => sum + row.total, 0);
  const lifecycleIntervals = Array.isArray(lifecycleTiming.intervals) ? lifecycleTiming.intervals : [];

  return (
    <>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Login timing, lifecycle creation patterns, and CRM user-intelligence buckets.{" "}
        <InlineLink href="/usage-patterns">Usage patterns →</InlineLink> ·{" "}
        <InlineLink href="/lifecycle-timing">Lifecycle timing →</InlineLink> ·{" "}
        <InlineLink href="/crm/user-intelligence">User intelligence →</InlineLink>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile label="Observed login events" value={formatNumber(totalLoginEvents)} sub={loginTiming.timezone} tone="good" />
        {loginSummaries.map((summary) => (
          <StatTile
            key={summary.role}
            label={`${summary.role} login activity`}
            value={formatNumber(summary.total)}
            sub={`Peak: ${summary.peakDay} ${summary.peakHour}`}
          />
        ))}
      </div>

      {totalLoginEvents > 0 ? (
        <>
          <SectionCard title="Login timing heatmaps">
            <DayHourHeatmaps groups={loginTiming.dayHour ?? []} />
          </SectionCard>
          <SectionCard title="Top login slots">
            <TopTimingSlots groups={loginTiming.topSlots ?? []} />
          </SectionCard>
          <div className="grid lg:grid-cols-2 gap-6">
            <SectionCard title="Weekly rhythm">
              <SlotBars groups={loginTiming.byDay ?? []} />
            </SectionCard>
            <SectionCard title="Hourly rhythm">
              <SlotBars groups={loginTiming.byHour ?? []} />
            </SectionCard>
          </div>
        </>
      ) : (
        <SectionCard title="Login timing">
          <EmptyState title="No login events found" />
        </SectionCard>
      )}

      <SectionCard title="Lifecycle creation timing">
        {lifecycleIntervals.length === 0 ? (
          <EmptyState title="No lifecycle timing buckets" />
        ) : (
          <div className="grid gap-6">
            {lifecycleIntervals.map((group) => (
              <div key={group.eventType}>
                <h3 className="text-sm font-semibold mb-3">{group.label}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {group.buckets.map((bucket) => (
                    <IntervalBucketCard key={`${group.eventType}-${bucket.id}`} bucket={bucket} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {userIntel && (
        <div className="grid lg:grid-cols-3 gap-6">
          <SectionCard title={`CRM events (${userIntel.days} days)`}>
            <StatTile label="Total events" value={formatNumber(userIntel.total)} tone="good" />
            <div className="flex flex-col gap-2 mt-4">
              {userIntel.byEventType.slice(0, 8).map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {formatNumber(row.count)}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Devices">
            <div className="flex flex-col gap-2">
              {userIntel.byDevice.slice(0, 8).map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {formatNumber(row.count)}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Browsers">
            <div className="flex flex-col gap-2">
              {userIntel.byBrowser.slice(0, 8).map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {formatNumber(row.count)}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {Array.isArray(loginTiming.recentLogins) && loginTiming.recentLogins.length > 0 && (
        <SectionCard title="Recent login events">
          <div className="flex flex-col gap-2">
            {loginTiming.recentLogins.slice(0, 8).map((login, index) => (
              <div
                key={`${login.userId ?? login.userName ?? "unknown"}-${String(login.createdAt)}-${index}`}
                className="flex justify-between text-sm py-1"
              >
                <span>
                  {login.group ?? "unknown"} · {login.userName ?? login.userId ?? "—"}
                </span>
                <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                  {displayDate(login.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </>
  );
}
