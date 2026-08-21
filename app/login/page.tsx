import Image from "next/image";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="login-screen">
      <main className="login-panel">
        <div className="mb-8">
          <Image
            src="/admin-companion-logo2.png"
            alt="Clinicplus Admin Companion"
            width={320}
            height={134}
            priority
            className="login-logo"
            style={{ width: "min(100%, 20rem)", height: "auto" }}
          />
          <h1 className="text-2xl font-semibold mt-6" style={{ color: "var(--text-primary)" }}>
            Sign in with your ClinicPlus admin account
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Access is limited to production admin users. New accounts receive the first month free.
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
            className="premium-button"
          >
            Sign in
          </button>
        </form>
      </main>
    </div>
  );
}
