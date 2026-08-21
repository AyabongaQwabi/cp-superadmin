import { Suspense } from "react";
import { cachedEmployeeSummary } from "@/lib/cached";
import { SegmentTable, type SegmentRow } from "@/components/SegmentTable";
import { StatTile } from "@/components/StatTile";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

async function EmployeesList() {
  const employees = await cachedEmployeeSummary();

  const rows: SegmentRow[] = employees.map((e) => ({
    key: e.userId,
    name: e.name,
    totalAppointments: e.totalAppointments,
    approved: e.approved,
    declined: e.declined,
    pendingLive: e.pendingLive,
    collected: e.collected,
    completed: e.completed,
  }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Employees
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Appointments by the ClinicPlus admin user managing them (
          <code>usersWhoCanManage</code>). There is no separate &quot;staff&quot; role in this
          system&apos;s data — every user is either <code>admin</code> or{" "}
          <code>client</code>.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatTile label="Appointment managers" value={formatNumber(employees.length)} />
      </div>

      <section
        className="rounded-lg p-5"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          By admin user, ranked by revenue collected
        </h2>
        <SegmentTable rows={rows} nameLabel="Admin user" emptyLabel="No employee data found." />
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-6 py-16 text-center" style={{ color: "var(--text-muted)" }}>
          Loading employees…
        </div>
      }
    >
      <EmployeesList />
    </Suspense>
  );
}
