import { cookies } from "next/headers";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSubscription } from "@/lib/admin-companion";
import { companionApi } from "@/lib/companion-api";
import { createAdminSessionToken, readSession, SESSION_COOKIE } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

function displayDate(date: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

type RemoteBillingState = {
  subscription?: {
    status?: "trialing" | "active" | "expired";
    currentPeriodEndsAt?: string;
    priceCents?: number;
  } | null;
  payments?: {
    _id?: string;
    reference?: string;
    type?: string;
    status?: string;
    amountZAR?: number;
    createdAt?: string;
  }[];
  pending?: {
    _id?: string;
    reference?: string;
    checkoutId?: string;
    createdAt?: string;
  }[];
};

async function returnBaseUrl() {
  const configured = process.env.ADMIN_COMPANION_BASE_URL;
  if (configured) return new URL(configured).origin;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : "http://localhost:3001";
}

async function startCheckout() {
  "use server";
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  const checkout = await companionApi<{ redirectUrl: string }>("/api/admin/admin-companion/billing/checkout", {
    method: "POST",
    body: JSON.stringify({
      adminUserId: session.id,
      email: session.email,
      name: session.name,
      returnBaseUrl: await returnBaseUrl(),
    }),
  });

  redirect(checkout.redirectUrl);
}

async function refreshAccess() {
  "use server";
  const cookieStore = await cookies();
  const session = readSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  const subscription = await getAdminSubscription(session.id);
  if (!subscription.isUsable) redirect("/billing?expired=1");

  cookieStore.set(
    SESSION_COOKIE,
    createAdminSessionToken({
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role,
      subscription: {
        status: subscription.status,
        plan: subscription.plan,
        currentPeriodEndsAt: subscription.currentPeriodEndsAt.toISOString(),
      },
    }),
    {
      httpOnly: true,
      maxAge: 60 * 60 * 8,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  );

  redirect("/");
}

export default async function Page() {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const subscription = session ? await getAdminSubscription(session.id) : null;
  const remoteBilling = session
    ? await companionApi<RemoteBillingState>(
        `/api/admin/admin-companion/billing/subscription?adminUserId=${encodeURIComponent(session.id)}`,
      ).catch(() => null)
    : null;
  const isExpired = subscription ? !subscription.isUsable : true;
  const payments = remoteBilling?.payments || [];
  const pending = remoteBilling?.pending || [];

  return (
    <PageChrome
      eyebrow="Subscription"
      title="Admin Companion subscription"
      subtitle="First month free, then Standard renews manually at R299 per user each month through Yoco."
    >
      <div className="billing-grid">
        <section className="billing-plan">
          <div>
            <p className="billing-kicker">Standard</p>
            <h2>R299</h2>
            <span>per user / month</span>
          </div>
          <ul>
            <li>Production admin sign-in</li>
            <li>Operational intelligence and timing analytics</li>
            <li>Admin interaction telemetry in a separate analytics DB</li>
            <li>Manual Yoco renewal when the paid period expires</li>
          </ul>
          <form action={startCheckout}>
            <button className="billing-primary" type="submit">
              Pay with Yoco
            </button>
          </form>
        </section>

        <SectionCard
          title="Current access"
          description="Yoco payments are one-time payments, so expired accounts are held here until the next paid period is recorded."
        >
          <div className="billing-status">
            <div>
              <p>Status</p>
              <StatusBadge tone={isExpired ? "critical" : subscription?.status === "trialing" ? "warning" : "good"}>
                {subscription?.status ?? "unknown"}
              </StatusBadge>
            </div>
            <div>
              <p>Plan</p>
              <strong>{subscription?.plan ?? "standard"}</strong>
            </div>
            <div>
              <p>Price</p>
              <strong>R{formatNumber((subscription?.priceCents ?? 29900) / 100)}</strong>
            </div>
            <div>
              <p>Access ends</p>
              <strong>{subscription ? displayDate(subscription.currentPeriodEndsAt) : "-"}</strong>
            </div>
          </div>

          {isExpired ? (
            <div className="billing-callout critical">
              <strong>Payment required</strong>
              <span>Your current access period has ended. Pay for the next month to continue using the dashboard.</span>
            </div>
          ) : (
            <div className="billing-callout">
              <strong>
                {subscription?.status === "trialing" ? "Free trial active" : "Subscription active"}
              </strong>
              <span>
                Access remains open until {subscription ? displayDate(subscription.currentPeriodEndsAt) : "the end of the current period"}.
              </span>
            </div>
          )}

          <div className="billing-actions">
            <form action={refreshAccess}>
              <button type="submit">Refresh access</button>
            </form>
            <Link href="/support-tickets">Contact support</Link>
          </div>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Recent Yoco payment events" description="Pulled from the payment records written by the verified Yoco webhook.">
          {payments.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No Yoco payment events found yet.</p>
          ) : (
            <div className="billing-list">
              {payments.map((payment) => (
                <div key={payment._id || payment.reference}>
                  <span>{payment.type || "payment"}</span>
                  <strong>{payment.amountZAR ? `R${formatNumber(payment.amountZAR)}` : "-"}</strong>
                  <em>{payment.status || "unknown"}</em>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Pending Yoco checkouts" description="Open one-time checkout attempts waiting for a signed webhook confirmation.">
          {pending.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No pending Yoco checkouts.</p>
          ) : (
            <div className="billing-list">
              {pending.map((checkout) => (
                <div key={checkout._id || checkout.reference}>
                  <span>{checkout.reference || "checkout"}</span>
                  <strong>{checkout.checkoutId || "-"}</strong>
                  <em>{checkout.createdAt ? displayDate(new Date(checkout.createdAt)) : "-"}</em>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageChrome>
  );
}
