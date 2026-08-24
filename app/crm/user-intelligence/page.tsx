import { cachedCompanionApi } from "@/lib/companion-api";
import { formatNumber } from "@/lib/format";
import { StatTile } from "@/components/StatTile";
import { EmptyState, PageChrome, SectionCard } from "@/components/superadmin/PageChrome";

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
  events: IntelEvent[];
};

type TopLocation = {
  key: string;
  latitude: number;
  longitude: number;
  count: number;
  accuracy: number | null;
  latestAt: string | null;
};

type LocationInsight = TopLocation & {
  placeName: string;
  formattedAddress: string | null;
  geocodeStatus: string | null;
};

type GoogleGeocodeComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GoogleGeocodeResult = {
  formatted_address?: string;
  address_components?: GoogleGeocodeComponent[];
};

type GoogleGeocodeResponse = {
  status?: string;
  results?: GoogleGeocodeResult[];
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

function hasCoordinates(event: IntelEvent): event is IntelEvent & { location: { latitude: number; longitude: number; accuracy?: number } } {
  return typeof event.location?.latitude === "number" && typeof event.location.longitude === "number";
}

function topLocations(events: IntelEvent[]): TopLocation[] {
  const locations = new Map<string, TopLocation>();

  for (const event of events) {
    if (!hasCoordinates(event)) continue;

    const latitude = Number(event.location.latitude.toFixed(4));
    const longitude = Number(event.location.longitude.toFixed(4));
    const key = `${latitude},${longitude}`;
    const existing = locations.get(key);
    const createdAt = event.createdAt ?? null;

    if (existing) {
      existing.count++;
      if (typeof event.location.accuracy === "number") {
        existing.accuracy = existing.accuracy === null ? event.location.accuracy : Math.min(existing.accuracy, event.location.accuracy);
      }
      if (createdAt && (!existing.latestAt || new Date(createdAt) > new Date(existing.latestAt))) existing.latestAt = createdAt;
      continue;
    }

    locations.set(key, {
      key,
      latitude,
      longitude,
      count: 1,
      accuracy: typeof event.location.accuracy === "number" ? event.location.accuracy : null,
      latestAt: createdAt,
    });
  }

  return [...locations.values()]
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, 10);
}

function googleStaticMapUrl(locations: TopLocation[]) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || locations.length === 0) return null;

  const params = new URLSearchParams({
    key: apiKey,
    size: "960x420",
    scale: "2",
    maptype: "roadmap",
  });

  locations.slice(0, 9).forEach((location, index) => {
    params.append("markers", `color:red|label:${index + 1}|${location.latitude},${location.longitude}`);
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function componentName(components: GoogleGeocodeComponent[], type: string) {
  return components.find((component) => component.types.includes(type))?.long_name;
}

function marketingPlaceName(result: GoogleGeocodeResult, fallback: TopLocation) {
  const components = result.address_components ?? [];
  const neighborhood =
    componentName(components, "sublocality") ??
    componentName(components, "sublocality_level_1") ??
    componentName(components, "neighborhood");
  const city =
    componentName(components, "locality") ??
    componentName(components, "administrative_area_level_2");
  const province = componentName(components, "administrative_area_level_1");

  const parts = [neighborhood, city, province].filter((part, index, values): part is string =>
    typeof part === "string" && part.length > 0 && values.indexOf(part) === index,
  );

  return parts.length > 0 ? parts.join(", ") : `${fallback.latitude.toFixed(4)}, ${fallback.longitude.toFixed(4)}`;
}

async function reverseGeocodeLocation(location: TopLocation): Promise<LocationInsight> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return {
      ...location,
      placeName: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      formattedAddress: null,
      geocodeStatus: "missing-key",
    };
  }

  const params = new URLSearchParams({
    key: apiKey,
    latlng: `${location.latitude},${location.longitude}`,
    result_type: "street_address|premise|route|neighborhood|sublocality|locality|administrative_area_level_2",
  });

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`, {
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    const data = await response.json() as GoogleGeocodeResponse;
    const result = data.results?.[0];

    if (!response.ok || !result) {
      return {
        ...location,
        placeName: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
        formattedAddress: null,
        geocodeStatus: data.status ?? `http-${response.status}`,
      };
    }

    return {
      ...location,
      placeName: marketingPlaceName(result, location),
      formattedAddress: result.formatted_address ?? null,
      geocodeStatus: data.status ?? null,
    };
  } catch {
    return {
      ...location,
      placeName: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      formattedAddress: null,
      geocodeStatus: "geocode-failed",
    };
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days = "30" } = await searchParams;
  const data = await cachedCompanionApi<IntelData>(
    `/api/admin/admin-companion/crm/user-intelligence?days=${encodeURIComponent(days)}`,
  );
  const locations = topLocations(data.events);
  const locationInsights = await Promise.all(locations.map(reverseGeocodeLocation));
  const mapUrl = googleStaticMapUrl(locations);

  return (
    <PageChrome
      eyebrow="CRM"
      title="Signup and Login Intelligence"
      subtitle="Understand where customers arrive from, what devices they use, and how they access ClinicPlus."
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Observed events" value={formatNumber(data.total)} tone="good" />
        <StatTile label="Window" value={`${data.days} days`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Events"><BucketList rows={data.byEventType} /></SectionCard>
        <SectionCard title="Devices"><BucketList rows={data.byDevice} /></SectionCard>
        <SectionCard title="Browsers"><BucketList rows={data.byBrowser} /></SectionCard>
      </div>

      <SectionCard title="Top locations" description="Permission-based signup and login coordinates, grouped by rounded latitude and longitude.">
        {locations.length === 0 ? (
          <EmptyState
            title="No mapped locations found"
            detail="Location coordinates will appear here once customers share location during signup or login."
          />
        ) : (
          <div className="crm-location-grid">
            {mapUrl ? (
              <img className="crm-location-map" src={mapUrl} alt="Map of top signup and login locations" />
            ) : (
              <div className="crm-location-map-placeholder">Map unavailable. Confirm GOOGLE_MAPS_API_KEY is set and restart the app.</div>
            )}
            <div className="crm-location-list">
              {locationInsights.map((location, index) => (
                <div key={location.key} className="crm-location-row">
                  <span className="crm-location-rank">{index + 1}</span>
                  <div>
                    <strong>{location.placeName}</strong>
                    <span>
                      {location.formattedAddress ?? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                    </span>
                    <span>
                      {location.accuracy !== null ? `Accuracy ${Math.round(location.accuracy)}m` : "Accuracy unavailable"}
                      {location.latestAt ? ` · Latest ${new Date(location.latestAt).toLocaleString("en-ZA")}` : ""}
                      {location.geocodeStatus && location.geocodeStatus !== "OK" ? ` · ${location.geocodeStatus}` : ""}
                    </span>
                  </div>
                  <b>{formatNumber(location.count)}</b>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>
    </PageChrome>
  );
}
