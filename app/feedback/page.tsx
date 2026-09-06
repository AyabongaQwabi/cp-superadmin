import Link from "next/link";
import { PageChrome, SectionCard, StatusBadge, EmptyState } from "@/components/superadmin/PageChrome";
import { cachedCompanionApi } from "@/lib/companion-api";
import {
  respondToSupportRequest,
  respondToSupportTicket,
  updateFeatureRequestStatus,
} from "./actions";

export const dynamic = "force-dynamic";

type Tab = "all" | "booking" | "features" | "companion" | "admin";

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
  bookingFeedback: {
    _id: string;
    appointmentId: string;
    companyId?: string;
    rating: number;
    comment?: string;
    source: string;
    createdAt: string;
  }[];
  featureRequests: {
    _id: string;
    userName: string;
    userEmail: string;
    title: string;
    description: string;
    impact?: string;
    source?: string;
    status: string;
    createdAt: string;
  }[];
  supportRequests: {
    _id: string;
    id: string;
    category: string;
    message: string;
    userName: string;
    userEmail: string;
    status: string;
    response?: string;
    createdAt: string;
  }[];
  supportTickets: {
    _id: string;
    id: string;
    category: string;
    message: string;
    submittedByName: string;
    submittedByEmail?: string;
    status: string;
    createdAt: string;
    responses?: { message: string; responderName: string; createdAt: string }[];
  }[];
};

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "booking", label: "Booking ratings" },
  { id: "features", label: "Feature ideas" },
  { id: "companion", label: "Companion support" },
  { id: "admin", label: "Admin portal" },
];

const FEATURE_STATUSES = ["new", "reviewed", "planned", "shipped", "declined"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  billing: "Billing",
  booking: "Booking",
  technical: "Technical",
  other: "Other",
  request: "Request",
  complaint: "Complaint",
  suggestion: "Suggestion",
};

const SOURCE_LABELS: Record<string, string> = {
  "cp-redesign": "Booking site",
  companion: "Companion",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-ZA");
}

function TabBar({ active }: { active: Tab }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.id === "all" ? "/feedback" : `/feedback?tab=${tab.id}`}
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

function SummaryTiles({ summary, satisfactionMetric }: Pick<FeedbackPayload, "summary" | "satisfactionMetric">) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        {
          label: "Booking ratings",
          value: summary.bookingFeedback,
          detail: satisfactionMetric
            ? `${satisfactionMetric.averageRating.toFixed(2)} / 5 avg`
            : "cp-redesign survey",
        },
        {
          label: "Feature ideas",
          value: summary.featureRequests,
          detail: `${summary.newFeatureRequests} new`,
        },
        {
          label: "Companion support",
          value: summary.supportRequests,
          detail: `${summary.openSupportRequests} open`,
        },
        {
          label: "Admin portal",
          value: summary.supportTickets,
          detail: `${summary.openSupportTickets} open`,
        },
      ].map((tile) => (
        <div
          key={tile.label}
          className="rounded-lg p-4"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {tile.label}
          </p>
          <p className="text-2xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
            {tile.value}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            {tile.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

function BookingSection({ items }: { items: FeedbackPayload["bookingFeedback"] }) {
  if (!items.length) return <EmptyState title="No booking ratings yet" detail="Ratings appear after cp-redesign customers submit the post-booking survey." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: "var(--text-muted)" }}>
            <th className="text-left py-2 pr-4 font-medium">Date</th>
            <th className="text-left py-2 pr-4 font-medium">Appointment</th>
            <th className="text-left py-2 pr-4 font-medium">Rating</th>
            <th className="text-left py-2 font-medium">Comment</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row._id} style={{ borderTop: "1px solid var(--gridline)" }}>
              <td className="py-3 pr-4 whitespace-nowrap">{formatDate(row.createdAt)}</td>
              <td className="py-3 pr-4 font-mono text-xs">{row.appointmentId}</td>
              <td className="py-3 pr-4">
                <StatusBadge tone={row.rating <= 2 ? "critical" : row.rating >= 4 ? "good" : "warning"}>
                  {row.rating} ★
                </StatusBadge>
              </td>
              <td className="py-3 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {row.comment || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeaturesSection({ items }: { items: FeedbackPayload["featureRequests"] }) {
  if (!items.length) return <EmptyState title="No feature suggestions yet" />;

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div key={item._id} className="rounded p-4" style={{ border: "1px solid var(--gridline)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {item.userName} · {item.userEmail} · {formatDate(item.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge tone="neutral">{SOURCE_LABELS[item.source || ""] || item.source || "Unknown"}</StatusBadge>
              <StatusBadge tone={item.status === "new" ? "warning" : item.status === "shipped" ? "good" : "neutral"}>
                {item.status}
              </StatusBadge>
            </div>
          </div>
          <p className="text-sm mt-3 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
            {item.description}
          </p>
          {item.impact && (
            <p className="text-xs mt-2 rounded p-2" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
              <strong>Impact:</strong> {item.impact}
            </p>
          )}
          <form action={updateFeatureRequestStatus} className="mt-3 flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={item._id} />
            <select
              name="status"
              defaultValue={item.status}
              className="rounded px-2 py-1 text-sm"
              style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
            >
              {FEATURE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded px-3 py-1 text-sm font-semibold"
              style={{ background: "var(--series-1)", color: "#fff" }}
            >
              Update status
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}

function CompanionSupportSection({ items }: { items: FeedbackPayload["supportRequests"] }) {
  if (!items.length) return <EmptyState title="No Companion support requests yet" />;

  return (
    <div className="flex flex-col gap-4">
      {items.map((request) => (
        <div key={request.id} className="rounded p-4" style={{ border: "1px solid var(--gridline)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">
                {request.id} · {CATEGORY_LABELS[request.category] || request.category}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {request.userName} · {request.userEmail} · {formatDate(request.createdAt)}
              </div>
            </div>
            <StatusBadge tone={request.status === "resolved" ? "good" : "warning"}>{request.status}</StatusBadge>
          </div>
          <p className="text-sm mt-3 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
            {request.message}
          </p>
          {request.response && (
            <p className="text-xs mt-2 rounded p-2" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
              <strong>Support team</strong>: {request.response}
            </p>
          )}
          {request.status !== "resolved" && (
            <form action={respondToSupportRequest} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="id" value={request.id} />
              <textarea
                name="response"
                required
                placeholder="Reply to the user"
                className="rounded px-3 py-2 text-sm"
                style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
              />
              <button
                type="submit"
                className="rounded px-3 py-2 text-sm font-semibold self-start"
                style={{ background: "var(--series-1)", color: "#fff" }}
              >
                Send response
              </button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}

function AdminSupportSection({ items }: { items: FeedbackPayload["supportTickets"] }) {
  if (!items.length) return <EmptyState title="No admin portal support tickets yet" detail="Tickets are submitted from the cp-redesign-admin header menu." />;

  return (
    <div className="flex flex-col gap-4">
      {items.map((ticket) => (
        <div key={ticket.id} className="rounded p-4" style={{ border: "1px solid var(--gridline)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">
                {ticket.id} · {CATEGORY_LABELS[ticket.category] || ticket.category}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {ticket.submittedByName}
                {ticket.submittedByEmail ? ` · ${ticket.submittedByEmail}` : ""} · {formatDate(ticket.createdAt)}
              </div>
            </div>
            <StatusBadge tone={ticket.status === "resolved" ? "good" : "warning"}>{ticket.status}</StatusBadge>
          </div>
          <p className="text-sm mt-3 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
            {ticket.message}
          </p>
          {(ticket.responses || []).map((response) => (
            <p
              key={`${response.createdAt}-${response.responderName}`}
              className="text-xs mt-2 rounded p-2"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
            >
              <strong>{response.responderName}</strong>: {response.message}
            </p>
          ))}
          {ticket.status !== "resolved" && (
            <form action={respondToSupportTicket} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="id" value={ticket.id} />
              <textarea
                name="response"
                required
                placeholder="Reply to the admin user"
                className="rounded px-3 py-2 text-sm"
                style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
              />
              <button
                type="submit"
                className="rounded px-3 py-2 text-sm font-semibold self-start"
                style={{ background: "var(--series-1)", color: "#fff" }}
              >
                Send response
              </button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const tab = (params.tab as Tab) || "all";
  const data = await cachedCompanionApi<FeedbackPayload>("/api/admin/feedback", 30);

  const showBooking = tab === "all" || tab === "booking";
  const showFeatures = tab === "all" || tab === "features";
  const showCompanion = tab === "all" || tab === "companion";
  const showAdmin = tab === "all" || tab === "admin";

  return (
    <PageChrome
      eyebrow="Product feedback"
      title="Feedback inbox"
      subtitle="All user feedback across ClinicPlus Companion, the booking site, and the admin portal — ratings, feature ideas, and support messages in one place."
    >
      <TabBar active={tab} />
      <SummaryTiles summary={data.summary} satisfactionMetric={data.satisfactionMetric} />

      {data.satisfactionMetric && (tab === "all" || tab === "booking") && (
        <SectionCard
          title="Booking satisfaction rollup"
          description={`Computed ${formatDate(data.satisfactionMetric.computedAt)} from ${data.satisfactionMetric.totalResponses} responses.`}
        >
          <div className="flex flex-wrap gap-2 text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
            {Object.entries(data.satisfactionMetric.ratingDistribution).map(([rating, count]) => (
              <span key={rating} className="rounded px-2 py-0.5" style={{ border: "1px solid var(--gridline)" }}>
                {rating}★: {count}
              </span>
            ))}
          </div>
          {data.satisfactionMetric.recentLowRatingComments.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Recent low ratings with comments
              </p>
              {data.satisfactionMetric.recentLowRatingComments.map((item) => (
                <div key={`${item.appointmentId}-${item.createdAt}`} className="text-sm rounded p-2" style={{ background: "var(--surface-2)" }}>
                  <span className="font-mono text-xs">{item.appointmentId}</span> · {item.rating}★ · {formatDate(item.createdAt)}
                  <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
                    {item.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {showBooking && (
        <SectionCard title="Booking ratings" description="Post-booking survey from cp-redesign (1–5 stars + optional comment).">
          <BookingSection items={data.bookingFeedback} />
        </SectionCard>
      )}

      {showFeatures && (
        <SectionCard title="Feature suggestions" description="Ideas from Companion settings and the cp-redesign /feedback page.">
          <FeaturesSection items={data.featureRequests} />
        </SectionCard>
      )}

      {showCompanion && (
        <SectionCard title="Companion support requests" description="Help and problem reports from logged-in Companion users.">
          <CompanionSupportSection items={data.supportRequests} />
        </SectionCard>
      )}

      {showAdmin && (
        <SectionCard title="Admin portal support" description="Requests, complaints, and suggestions from cp-redesign-admin.">
          <AdminSupportSection items={data.supportTickets} />
        </SectionCard>
      )}
    </PageChrome>
  );
}
