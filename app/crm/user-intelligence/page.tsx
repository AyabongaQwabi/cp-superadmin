import { companionApi } from "@/lib/companion-api";
import { formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { PageChrome, SectionCard, StatusBadge } from "@/components/superadmin/PageChrome";

export const dynamic = "force-dynamic";

type Bucket = { label: string; count: number };
type IntelEvent = {
  _id: string;
  eventType?: string;
  userName?: string;
  email?: string;
  source?: string;
  device?: { deviceType?: string; browser?: string; os?: string; timezone?: string };
  location?: { latitude?: number; longitude?: number; accuracy?: number } | null;
  locationPermission?: string;
  ip?: string;
  createdAt?: string;
};

type IntelData = {
  days: number;
  total: number;
  byEventType: Bucket[];
  byDevice: Bucket[];
  byBrowser: Bucket[];
  byOs: Bucket[];
  byLocationPermission: Bucket[];
  events: IntelEvent[];
};

function BucketList({ rows }: { rows: Bucket[] }) {
  return (
    <div className="crm-buckets">
      {rows.map((row) => (
        <div key={row.label}><span>{row.label}</span><strong>{formatNumber(row.count)}</strong></div>
      ))}
      {rows.length === 0 && <p>No data yet.</p>}
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days = "30" } = await searchParams;
  const data = await companionApi<IntelData>(
    `/api/admin/admin-companion/crm/user-intelligence?days=${encodeURIComponent(days)}`,
  );

  return (
    <PageChrome
      eyebrow="CRM"
      title="Signup and Login Intelligence"
      subtitle="Permission-based location, device, browser, and source data collected from cp-redesign after successful signup or login."
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Observed events" value={formatNumber(data.total)} tone="good" />
        <StatTile label="Window" value={`${data.days} days`} />
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <SectionCard title="Events"><BucketList rows={data.byEventType} /></SectionCard>
        <SectionCard title="Devices"><BucketList rows={data.byDevice} /></SectionCard>
        <SectionCard title="Browsers"><BucketList rows={data.byBrowser} /></SectionCard>
        <SectionCard title="Location permission"><BucketList rows={data.byLocationPermission} /></SectionCard>
      </div>

      <SectionCard title="Recent signup and login events">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left py-2 pr-4">User</th>
                <th className="text-left py-2 px-3">Event</th>
                <th className="text-left py-2 px-3">Device</th>
                <th className="text-left py-2 px-3">Location</th>
                <th className="text-right py-2 pl-3">When</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => (
                <tr key={event._id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                  <td className="py-2 pr-4">
                    <div className="font-medium">{event.userName || event.email || "Unknown user"}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{event.email || event.ip || "-"}</div>
                  </td>
                  <td className="py-2 px-3"><StatusBadge>{event.eventType || "event"}</StatusBadge></td>
                  <td className="py-2 px-3">
                    {[event.device?.deviceType, event.device?.browser, event.device?.os].filter(Boolean).join(" / ") || "-"}
                  </td>
                  <td className="py-2 px-3">
                    {event.location
                      ? `${event.location.latitude?.toFixed(4)}, ${event.location.longitude?.toFixed(4)}`
                      : event.locationPermission || "-"}
                  </td>
                  <td className="py-2 pl-3 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {event.createdAt ? new Date(event.createdAt).toLocaleString("en-ZA") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageChrome>
  );
}
