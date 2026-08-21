import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { isValidSessionToken, SESSION_COOKIE } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClinicPlus Analytics",
  description: "Read-only business analytics dashboard for ClinicPlus.",
};

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/operations", label: "Operations" },
  { href: "/system-controls", label: "Controls" },
  { href: "/support-tickets", label: "Support" },
  { href: "/usage-patterns", label: "Usage" },
  { href: "/lifecycle-timing", label: "Timing" },
  { href: "/appointments", label: "Appointments" },
  { href: "/appointments/exceptions", label: "Exceptions" },
  { href: "/companies", label: "Companies" },
  { href: "/users", label: "Users" },
  { href: "/people", label: "People" },
  { href: "/services", label: "Services" },
  { href: "/invoices", label: "Invoices" },
  { href: "/clinics/capacity", label: "Capacity" },
  { href: "/companion-access", label: "Companion" },
  { href: "/data-quality", label: "Quality" },
  { href: "/audit", label: "Audit" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  const isAuthenticated = isValidSessionToken(sessionCookie);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {isAuthenticated && (
          <header
            className="sticky top-0 z-10"
            style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--border)" }}
          >
            <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="font-semibold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                ClinicPlus Analytics
              </span>
              <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{ color: "var(--text-secondary)" }}
                    className="hover:underline"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
        )}
        <main className="flex-1" style={{ background: "var(--background)" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
