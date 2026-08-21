import { formatNumber } from "@/lib/format";
import type { DayHourSlot, TimingSlot } from "@/lib/superadmin-read-model";

type SlotGroup<TSlot> = {
  group: string;
  label: string;
  slots: TSlot[];
};

const dayOrder = [1, 2, 3, 4, 5, 6, 7];
const hourOrder = Array.from({ length: 24 }, (_, hour) => hour);

function cellColor(count: number, max: number) {
  if (!count) return "var(--heatmap-empty)";
  const intensity = 0.18 + (count / Math.max(max, 1)) * 0.72;
  return `color-mix(in srgb, var(--series-1) ${Math.round(intensity * 100)}%, var(--surface-1))`;
}

export function SlotBars({ groups }: { groups: Array<SlotGroup<TimingSlot>> }) {
  return (
    <div className="timing-bar-groups">
      {groups.map((group) => {
        const max = Math.max(1, ...group.slots.map((slot) => slot.count));
        return (
          <div key={group.group} className="timing-bar-group">
            <div className="timing-group-heading">
              <span>{group.label}</span>
              <span>{formatNumber(group.slots.reduce((sum, slot) => sum + slot.count, 0))} total</span>
            </div>
            <div className="timing-bars" role="list" aria-label={`${group.label} timing counts`}>
              {group.slots.map((slot) => (
                <div key={`${group.group}-${slot.key}`} className="timing-bar-row" role="listitem">
                  <span className="timing-bar-label">{slot.label}</span>
                  <div className="timing-bar-track" aria-hidden="true">
                    <div
                      className="timing-bar-fill"
                      style={{ width: slot.count ? `${Math.max(3, (slot.count / max) * 100)}%` : "0%" }}
                    />
                  </div>
                  <span className="timing-bar-value">{formatNumber(slot.count)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DayHourHeatmaps({ groups }: { groups: Array<SlotGroup<DayHourSlot>> }) {
  return (
    <div className="timing-heatmaps">
      {groups.map((group) => {
        const max = Math.max(1, ...group.slots.map((slot) => slot.count));
        const slotByKey = new Map(group.slots.map((slot) => [`${slot.dayOfWeek}:${slot.hour}`, slot]));

        return (
          <div key={group.group} className="timing-heatmap-group">
            <div className="timing-group-heading">
              <span>{group.label}</span>
              <span>Peak intensity {formatNumber(max)}</span>
            </div>
            <div className="timing-heatmap-scroll">
              <div className="timing-heatmap" role="grid" aria-label={`${group.label} day and hour heatmap`}>
                <div className="timing-heatmap-corner" />
                {hourOrder.map((hour) => (
                  <span key={hour} className="timing-hour-label">
                    {String(hour).padStart(2, "0")}
                  </span>
                ))}
                {dayOrder.map((dayOfWeek) => {
                  const firstSlot = slotByKey.get(`${dayOfWeek}:0`);
                  return (
                    <div key={dayOfWeek} className="timing-heatmap-row" role="row">
                      <span className="timing-day-label">{firstSlot?.dayLabel ?? dayOfWeek}</span>
                      {hourOrder.map((hour) => {
                        const slot = slotByKey.get(`${dayOfWeek}:${hour}`);
                        const count = slot?.count ?? 0;
                        return (
                          <span
                            key={`${dayOfWeek}-${hour}`}
                            role="gridcell"
                            className="timing-heatmap-cell"
                            title={`${slot?.dayLabel ?? dayOfWeek} ${String(hour).padStart(2, "0")}:00 - ${formatNumber(count)} events`}
                            style={{ background: cellColor(count, max) }}
                          >
                            {count > 0 ? formatNumber(count) : ""}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="timing-heatmap-legend" aria-hidden="true">
              <span>Less</span>
              <i style={{ background: "var(--heatmap-empty)" }} />
              <i style={{ background: cellColor(max * 0.25, max) }} />
              <i style={{ background: cellColor(max * 0.6, max) }} />
              <i style={{ background: cellColor(max, max) }} />
              <span>More</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TopTimingSlots({ groups }: { groups: Array<SlotGroup<DayHourSlot>> }) {
  return (
    <div className="timing-top-grid">
      {groups.map((group) => (
        <div key={group.group} className="timing-top-list">
          <div className="timing-group-heading">
            <span>{group.label}</span>
            <span>Top windows</span>
          </div>
          {group.slots.length === 0 ? (
            <p className="timing-empty">No dated events found.</p>
          ) : (
            <ol>
              {group.slots.map((slot, index) => (
                <li key={`${slot.dayOfWeek}-${slot.hour}`}>
                  <span className="timing-rank">{String(index + 1).padStart(2, "0")}</span>
                  <span>{slot.dayLabel} {String(slot.hour).padStart(2, "0")}:00</span>
                  <strong>{formatNumber(slot.count)}</strong>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
