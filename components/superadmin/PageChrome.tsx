import Link from "next/link";

export function PageChrome({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div className="timing-page-header">
        {eyebrow && (
          <p className="text-xs uppercase font-semibold tracking-wide mb-2" style={{ color: "var(--series-1)" }}>
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm mt-2 max-w-3xl leading-6" style={{ color: "var(--text-muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <span className="timing-page-mark" aria-hidden="true" />
        </div>
      </div>
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-lg p-5"
      style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
        {description && (
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "good" | "warning" | "critical" | "neutral";
}) {
  const styles =
    tone === "good"
      ? { background: "rgba(12, 163, 12, 0.12)", color: "var(--status-good-text)" }
      : tone === "warning"
        ? { background: "rgba(250, 178, 25, 0.16)", color: "var(--status-warning)" }
        : tone === "critical"
          ? { background: "rgba(208, 59, 59, 0.14)", color: "var(--status-critical)" }
          : { background: "var(--gridline)", color: "var(--text-secondary)" };

  return (
    <span className="inline-block rounded px-2 py-0.5 text-xs font-medium" style={styles}>
      {children}
    </span>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {title}
      </p>
      {detail && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {detail}
        </p>
      )}
    </div>
  );
}

export function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="hover:underline" style={{ color: "var(--series-1)" }}>
      {children}
    </Link>
  );
}
