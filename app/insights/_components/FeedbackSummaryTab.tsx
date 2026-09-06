import Link from "next/link";
import { cachedFeedbackSummary } from "@/lib/cached";
import { StatTile } from "@/components/StatTile";
import { StatusBreakdownChart } from "@/components/charts/StatusBreakdownChart";
import { EmptyState, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";
import { formatNumber } from "@/lib/format";

type FeedbackPayload = {
  summary: {
    bookingFeedback: number;
    featureRequests: number;
    supportRequests: number;
    supportTickets: number;
    openSupportRequests: number;
    openSupportTickets: number;
    newFeatureRequests: number;
  };
  satisfactionMetric: {
    averageRating: number;
    totalResponses: number;
    computedAt: string;
    last30DayAverage: number | null;
    ratingDistribution: Record<string, number>;
    recentLowRatingComments: {
      appointmentId: string;
      rating: number;
      comment: string;
      createdAt: string;
    }[];
  } | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-ZA");
}

export async function FeedbackSummaryTab() {
  const data = (await cachedFeedbackSummary()) as FeedbackPayload;
  const { summary, satisfactionMetric } = data;

  const ratingData = satisfactionMetric
    ? Object.entries(satisfactionMetric.ratingDistribution).map(([name, value]) => ({
        name: `${name}★`,
        value,
      }))
    : [];

  return (
    <>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Read-only feedback summary across all channels. Manage replies on the full feedback inbox.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label="Booking ratings"
          value={formatNumber(summary.bookingFeedback)}
          sub={satisfactionMetric ? `${satisfactionMetric.averageRating.toFixed(2)} / 5 avg` : undefined}
        />
        <StatTile
          label="Feature ideas"
          value={formatNumber(summary.featureRequests)}
          sub={`${summary.newFeatureRequests} new`}
        />
        <StatTile
          label="Companion support"
          value={formatNumber(summary.supportRequests)}
          sub={`${summary.openSupportRequests} open`}
          tone={summary.openSupportRequests ? "warning" : "good"}
        />
        <StatTile
          label="Admin portal"
          value={formatNumber(summary.supportTickets)}
          sub={`${summary.openSupportTickets} open`}
          tone={summary.openSupportTickets ? "warning" : "good"}
        />
      </div>

      {satisfactionMetric && (
        <div className="grid lg:grid-cols-2 gap-6">
          <SectionCard
            title="Booking satisfaction rollup"
            description={`Computed ${formatDate(satisfactionMetric.computedAt)} from ${formatNumber(satisfactionMetric.totalResponses)} responses.`}
          >
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatTile label="All-time average" value={`${satisfactionMetric.averageRating.toFixed(2)} / 5`} tone="good" />
              <StatTile
                label="30-day average"
                value={
                  satisfactionMetric.last30DayAverage === null
                    ? "—"
                    : `${satisfactionMetric.last30DayAverage.toFixed(2)} / 5`
                }
              />
            </div>
            <StatusBreakdownChart data={ratingData} />
          </SectionCard>

          <SectionCard title="Recent low ratings with comments">
            {satisfactionMetric.recentLowRatingComments.length === 0 ? (
              <EmptyState title="No recent low ratings with comments" />
            ) : (
              <div className="flex flex-col gap-2">
                {satisfactionMetric.recentLowRatingComments.slice(0, 8).map((item) => (
                  <div
                    key={`${item.appointmentId}-${item.createdAt}`}
                    className="text-sm rounded p-2"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{item.appointmentId}</span>
                      <StatusBadge tone={item.rating <= 2 ? "critical" : "warning"}>
                        {item.rating}★
                      </StatusBadge>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {formatDate(item.createdAt)}
                    </p>
                    {item.comment && (
                      <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
                        {item.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      <SectionCard title="Manage replies">
        <Link
          href="/feedback"
          className="inline-block rounded px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--series-1)", color: "#fff" }}
        >
          Open feedback inbox
        </Link>
      </SectionCard>
    </>
  );
}
