import { cachedFinanceAnalytics, cachedInvoiceDashboard } from "@/lib/cached";
import { displayDate } from "@/lib/superadmin-read-model";
import { StatTile } from "@/components/StatTile";
import { EmptyState, InlineLink, SectionCard } from "@/components/superadmin/PageChrome";
import { formatCurrency, formatNumber } from "@/lib/format";

type FinanceAnalyticsPayload = {
  monthKey: string;
  type: string;
  totals?: {
    appointments?: number;
    revenue?: number;
    approved?: number;
    pending?: number;
    declined?: number;
  };
  byClinic?: { clinic: string; appointments: number; revenue: number }[];
};

export async function FinanceTab() {
  const [invoices, finance] = await Promise.all([
    cachedInvoiceDashboard(),
    cachedFinanceAnalytics().catch(() => null) as Promise<FinanceAnalyticsPayload | null>,
  ]);

  return (
    <>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Invoice oversight plus current-month finance analytics from cp-companion.{" "}
        <InlineLink href="/invoices">Open invoices →</InlineLink>
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Invoices" value={formatNumber(invoices.total)} />
        <StatTile label="Invoice amount" value={formatCurrency(invoices.amount)} tone="good" />
        <StatTile label="With PDF URL" value={formatNumber(invoices.withUrl)} />
        <StatTile
          label="Missing PDF URL"
          value={formatNumber(Math.max(invoices.total - invoices.withUrl, 0))}
          tone={invoices.total - invoices.withUrl ? "warning" : "good"}
        />
      </div>

      {finance?.totals && (
        <SectionCard
          title={`Finance analytics (${finance.monthKey})`}
          description="Cached monthly clinic finance breakdown from cp-companion sync."
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Appointments" value={formatNumber(finance.totals.appointments ?? 0)} />
            <StatTile label="Revenue" value={formatCurrency(finance.totals.revenue ?? 0)} tone="good" />
            <StatTile label="Approved" value={formatNumber(finance.totals.approved ?? 0)} tone="good" />
            <StatTile label="Pending" value={formatNumber(finance.totals.pending ?? 0)} tone="warning" />
          </div>
        </SectionCard>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Invoices by clinic">
          {invoices.byClinic.length === 0 ? (
            <EmptyState title="No clinic invoice data" />
          ) : (
            <div className="flex flex-col gap-2">
              {invoices.byClinic.map((row) => (
                <div key={String(row._id)} className="flex justify-between gap-3 text-sm">
                  <span>{String(row._id)}</span>
                  <span className="tabular-nums">
                    {formatCurrency(row.amount ?? 0)} · {formatNumber(row.count ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Top invoiced companies">
          {invoices.byCompany.length === 0 ? (
            <EmptyState title="No company invoice data" />
          ) : (
            <div className="flex flex-col gap-2">
              {invoices.byCompany.map((row) => (
                <div key={String(row._id?.id ?? row._id?.name)} className="flex justify-between gap-3 text-sm">
                  <span>{row._id?.name ?? "Unknown company"}</span>
                  <span className="tabular-nums">
                    {formatCurrency(row.amount ?? 0)} · {formatNumber(row.count ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {finance?.byClinic && finance.byClinic.length > 0 && (
        <SectionCard title="Current month revenue by clinic">
          <div className="flex flex-col gap-2">
            {finance.byClinic.map((row) => (
              <div key={row.clinic} className="flex justify-between gap-3 text-sm">
                <span>{row.clinic}</span>
                <span className="tabular-nums">
                  {formatCurrency(row.revenue)} · {formatNumber(row.appointments)} appts
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Recent invoices">
        {invoices.recent.length === 0 ? (
          <EmptyState title="No invoices found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Invoice</th>
                  <th className="text-left py-2 px-3">Company</th>
                  <th className="text-right py-2 px-3">Amount</th>
                  <th className="text-right py-2 pl-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices.recent.slice(0, 10).map((invoice) => (
                  <tr key={invoice._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                    <td className="py-2 pr-4 font-medium">{invoice.id ?? invoice._id}</td>
                    <td className="py-2 px-3">{invoice.company?.name ?? invoice.appointment?.company?.name ?? "-"}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(invoice.payment?.amount ?? 0)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {displayDate(invoice.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
