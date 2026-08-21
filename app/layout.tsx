import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { readSession, SESSION_COOKIE } from "@/lib/auth";
import { AdminInteractionTracker } from "@/components/superadmin/AdminInteractionTracker";
import { BackgroundDataPreloader } from "@/components/superadmin/BackgroundDataPreloader";
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
  title: "Clinicplus Admin Companion",
  description: "Premium administration, billing, operations, and analytics for ClinicPlus.",
};

const NAV = [
  {
    label: "Command",
    items: [
      { href: "/", label: "Overview", icon: "OV" },
      { href: "/operations", label: "Operations", icon: "OP" },
      { href: "/system-controls", label: "Controls", icon: "CT" },
      { href: "/support-tickets", label: "Support", icon: "SP" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/usage-patterns", label: "Usage patterns", icon: "UP" },
      { href: "/lifecycle-timing", label: "Lifecycle timing", icon: "LT" },
      { href: "/data-quality", label: "Data quality", icon: "DQ" },
      { href: "/audit", label: "Audit trail", icon: "AT" },
    ],
  },
  {
    label: "ClinicPlus",
    items: [
      { href: "/appointments", label: "Appointments", icon: "AP" },
      { href: "/appointments/exceptions", label: "Exceptions", icon: "EX" },
      { href: "/companies", label: "Companies", icon: "CO" },
      { href: "/users", label: "Users", icon: "US" },
      { href: "/people", label: "People", icon: "PE" },
      { href: "/services", label: "Services", icon: "SV" },
      { href: "/invoices", label: "Invoices", icon: "IN" },
      { href: "/clinics/capacity", label: "Capacity", icon: "CA" },
      { href: "/companion-access", label: "Admin access", icon: "AA" },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/crm", label: "CRM overview", icon: "CR" },
      { href: "/crm/customers", label: "Customers", icon: "CU" },
      { href: "/crm/bulk-email", label: "Bulk email", icon: "EM" },
      { href: "/crm/user-intelligence", label: "User intelligence", icon: "UI" },
    ],
  },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = readSession(sessionCookie);
  const isAuthenticated = !!session;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {isAuthenticated && (
          <aside className="admin-sidebar">
            <Link href="/" className="admin-brand" aria-label="Clinicplus Admin Companion home">
              <Image
                src="/admin-companion-logo2.png"
                alt="Clinicplus Admin Companion"
                width={380}
                height={158}
                priority
                style={{ width: "100%", height: "auto" }}
              />
            </Link>
            <nav className="admin-nav" aria-label="Primary">
              {NAV.map((group) => (
                <section key={group.label} className="admin-nav-group">
                  <p>{group.label}</p>
                  {group.items.map((item) => (
                    <Link key={item.href} href={item.href} className="admin-nav-link">
                      <span aria-hidden="true">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                </section>
              ))}
            </nav>
            <div className="admin-sidebar-footer">
              <div>
                <strong>{session?.name}</strong>
                <span>{session?.email}</span>
              </div>
              <form action="/api/logout" method="post">
                <button type="submit">Sign out</button>
              </form>
            </div>
          </aside>
        )}
        {isAuthenticated && (
          <header className="admin-topbar">
            <div>
              <p>Clinicplus Admin Companion</p>
              <strong>Production command workspace</strong>
            </div>
            <div className="admin-actions">
              <Link href="/billing">Subscription</Link>
              <Link href="/support-tickets">Support queue</Link>
              <Link href="/system-controls">Controls</Link>
            </div>
          </header>
        )}
        <main className={isAuthenticated ? "admin-main" : ""} style={{ background: "var(--background)" }}>
          {children}
        </main>
        {isAuthenticated && (
          <>
            <AdminInteractionTracker />
            <BackgroundDataPreloader />
          </>
        )}
      </body>
    </html>
  );
}
