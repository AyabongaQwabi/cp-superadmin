"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message.includes("querySrv ETIMEOUT")
    ? "MongoDB DNS lookup timed out while connecting to Atlas. Try again once the network or Atlas DNS is reachable."
    : error.message || "The usage patterns page could not load.";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <section
        className="rounded-lg p-5"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
      >
        <p className="text-xs uppercase font-semibold tracking-wide mb-1" style={{ color: "var(--series-1)" }}>
          Usage
        </p>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Login Timing by Role
        </h1>
        <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
          {message}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded px-3 py-1.5 text-sm font-medium mt-4"
          style={{ background: "var(--text-primary)", color: "var(--surface-1)" }}
        >
          Retry
        </button>
      </section>
    </div>
  );
}
