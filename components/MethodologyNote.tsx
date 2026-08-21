export function MethodologyNote() {
  return (
    <details
      className="rounded-lg p-4 text-sm"
      style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
    >
      <summary className="cursor-pointer font-medium" style={{ color: "var(--text-primary)" }}>
        Methodology &amp; data caveats
      </summary>
      <div className="mt-3 space-y-2" style={{ color: "var(--text-secondary)" }}>
        <p>
          <strong>Coverage window:</strong> reliable records begin{" "}
          <strong>December 2022</strong>, not 6+ years ago. This dashboard reports on what is
          actually in the database — earlier history, if it exists, is not in this dataset.
        </p>
        <p>
          <strong>Payment definition:</strong> ClinicPlus payment happens offline (bank
          transfer). An admin marks an appointment <strong>Approved</strong> only after
          confirming payment was received — there is no separate &quot;paid&quot; flag in the
          data. Collected revenue is counted only when <code>status = &quot;approved&quot;</code>{" "}
          and <code>details.date</code> is today or in the past. Approved future appointments
          are paid, but not yet completed.
        </p>
        <p>
          <strong>Deleted appointments:</strong> ~25% of all appointments ever created were later
          soft-deleted. This dashboard unions live and deleted appointments (deduped by id) so
          historical totals aren&apos;t undercounted — 2023 alone is ~35x higher once deleted
          records are included. Deleted appointments that were still <em>pending</em> at deletion
          time are reported separately as &quot;abandoned bookings&quot; (a volume metric, not a
          rand-value loss) rather than folded into &quot;lost revenue,&quot; since no payment
          decision was ever reached on them. Deleted appointments that were <em>approved</em>{" "}
          before deletion are still counted as collected revenue, on the assumption that deletion
          here is administrative record-keeping, not a refund.
        </p>
        <p>
          <strong>Excluded:</strong> a fourth database (&quot;archive&quot;, ~13k appointments,
          mostly a 2023 snapshot) exists but is not included here — its overlap with the appointments
          shown was not resolved with confidence, and including it risked double-counting 2023.
        </p>
        <p>
          <strong>Dates:</strong> volume charts use the appointment creation timestamp
          (<code>tracking[0].date</code>). Completion and collected-revenue metrics use the
          scheduled service date (<code>details.date</code>).
        </p>
      </div>
    </details>
  );
}
