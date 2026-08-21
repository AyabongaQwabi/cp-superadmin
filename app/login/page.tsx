type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: "var(--background)" }}>
      <main
        className="w-full max-w-md rounded-lg p-8"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
      >
        <div className="mb-8">
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            ClinicPlus Analytics
          </p>
          <h1 className="text-2xl font-semibold mt-2" style={{ color: "var(--text-primary)" }}>
            Sign in to continue
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Use your admin credentials to access the dashboard.
          </p>
        </div>

        {error === "invalid" && (
          <p
            className="rounded-md px-3 py-2 text-sm mb-5"
            role="alert"
            style={{ color: "var(--status-critical)", background: "rgba(208, 59, 59, 0.1)" }}
          >
            The email or password is incorrect.
          </p>
        )}

        <form action="/api/login" method="post" className="flex flex-col gap-5">
          <label className="flex flex-col gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              className="rounded-md px-3 py-2 outline-none"
              style={{ color: "var(--text-primary)", background: "var(--background)", border: "1px solid var(--border)" }}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-md px-3 py-2 outline-none"
              style={{ color: "var(--text-primary)", background: "var(--background)", border: "1px solid var(--border)" }}
            />
          </label>
          <button
            type="submit"
            className="rounded-md px-4 py-2.5 font-semibold"
            style={{ color: "#fff", background: "var(--series-1)" }}
          >
            Sign in
          </button>
        </form>
      </main>
    </div>
  );
}
