import { displayDate } from "@/lib/superadmin-read-model";
import { cachedInvoiceDashboard } from "@/lib/cached";
import { formatCurrency, formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { EmptyState, InlineLink, PageChrome, SectionCard } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await cachedInvoiceDashboard();

  return (
    <PageChrome eyebrow="Finance" title="Invoice Oversight" subtitle="Read-only invoice coverage, totals, clinic mix, top companies, and recent generated documents.">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Invoices" value={formatNumber(data.total)} />
        <StatTile label="Invoice amount" value={formatCurrency(data.amount)} tone="good" />
        <StatTile label="With PDF URL" value={formatNumber(data.withUrl)} />
        <StatTile label="Missing PDF URL" value={formatNumber(Math.max(data.total - data.withUrl, 0))} tone={data.total - data.withUrl ? "warning" : "good"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="By clinic">
          <div className="flex flex-col gap-2">
            {data.byClinic.map((row) => (
              <div key={String(row._id)} className="flex justify-between gap-3 text-sm">
                <span>{String(row._id)}</span>
                <span className="tabular-nums">{formatCurrency(row.amount ?? 0)} · {formatNumber(row.count ?? 0)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Top companies">
          <div className="flex flex-col gap-2">
            {data.byCompany.map((row) => (
              <div key={String(row._id?.id ?? row._id?.name)} className="flex justify-between gap-3 text-sm">
                <span>{row._id?.name ?? "Unknown company"}</span>
                <span className="tabular-nums">{formatCurrency(row.amount ?? 0)} · {formatNumber(row.count ?? 0)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Recent invoices">
        {data.recent.length === 0 ? (
          <EmptyState title="No invoices found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 pr-4">Invoice</th>
                  <th className="text-left py-2 px-3">Company</th>
                  <th className="text-left py-2 px-3">Client</th>
                  <th className="text-right py-2 px-3">Amount</th>
                  <th className="text-right py-2 pl-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((invoice) => (
                  <tr key={invoice._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                    <td className="py-2 pr-4 font-medium">{invoice.url ? <InlineLink href={invoice.url}>{invoice.id ?? invoice._id}</InlineLink> : invoice.id ?? invoice._id}</td>
                    <td className="py-2 px-3">{invoice.company?.name ?? invoice.appointment?.company?.name ?? "-"}</td>
                    <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{[invoice.client?.name, invoice.client?.surname].filter(Boolean).join(" ") || "-"}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(invoice.payment?.amount ?? 0)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>{displayDate(invoice.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </PageChrome>
  );
}
