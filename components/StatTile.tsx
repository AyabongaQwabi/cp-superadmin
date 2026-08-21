export function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warning" | "critical";
}) {
  const toneColor =
    tone === "good"
      ? "var(--status-good-text)"
      : tone === "warning"
        ? "var(--status-warning)"
        : tone === "critical"
          ? "var(--status-critical)"
          : "var(--text-primary)";

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-1"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
      }}
    >
      <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums" style={{ color: toneColor }}>
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}
