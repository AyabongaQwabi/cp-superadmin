import { formatNumber } from "@/lib/format";
import type { DayHourSlot, TimingSlot } from "@/lib/superadmin-read-model";

type SlotGroup<TSlot> = {
  group: string;
  label: string;
  slots: TSlot[];
};

export function SlotBars({ groups }: { groups: Array<SlotGroup<TimingSlot>> }) {
  const max = Math.max(1, ...groups.flatMap((group) => group.slots.map((slot) => slot.count)));

  return (
    <div className="grid gap-5">
      {groups.map((group) => (
        <div key={group.group} className="grid gap-2">
          <h3 className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            {group.label}
          </h3>
          <div className="grid gap-1">
            {group.slots.map((slot) => (
              <div key={`${group.group}-${slot.key}`} className="grid grid-cols-[4.5rem_1fr_4rem] items-center gap-2 text-xs">
                <span style={{ color: "var(--text-muted)" }}>{slot.label}</span>
                <div className="h-2 rounded" style={{ background: "var(--gridline)" }}>
                  <div
                    className="h-2 rounded"
                    style={{
                      width: `${Math.max(2, (slot.count / max) * 100)}%`,
                      background: slot.count ? "var(--series-1)" : "transparent",
                    }}
                  />
                </div>
                <span className="text-right tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {formatNumber(slot.count)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DayHourHeatmaps({ groups }: { groups: Array<SlotGroup<DayHourSlot>> }) {
  const max = Math.max(1, ...groups.flatMap((group) => group.slots.map((slot) => slot.count)));
  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  return (
    <div className="grid gap-6">
      {groups.map((group) => (
        <div key={group.group} className="grid gap-3">
          <h3 className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            {group.label}
          </h3>
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[3rem_repeat(24,minmax(1.6rem,1fr))] gap-1 text-[10px]">
                <span />
                {hours.map((hour) => (
                  <span key={hour} className="text-center tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {hour}
                  </span>
                ))}
                {[1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => {
                  const daySlots = group.slots.filter((slot) => slot.dayOfWeek === dayOfWeek);
                  return (
                    <div key={dayOfWeek} className="contents">
                      <span className="py-1" style={{ color: "var(--text-muted)" }}>
                        {daySlots[0]?.dayLabel ?? dayOfWeek}
                      </span>
                      {daySlots.map((slot) => {
                      const opacity = slot.count ? 0.16 + (slot.count / max) * 0.74 : 0.04;
                      return (
                        <div
                          key={`${dayOfWeek}-${slot.hour}`}
                          title={`${daySlots[0]?.dayLabel ?? dayOfWeek} ${String(slot.hour).padStart(2, "0")}:00 - ${formatNumber(slot.count)}`}
                          className="h-7 rounded-sm"
                          style={{
                            background: `rgba(14, 124, 123, ${opacity})`,
                            border: "1px solid var(--gridline)",
                          }}
                        />
                      );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopTimingSlots({ groups }: { groups: Array<SlotGroup<DayHourSlot>> }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map((group) => (
        <div key={group.group} className="rounded p-3" style={{ border: "1px solid var(--gridline)" }}>
          <h3 className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
            {group.label}
          </h3>
          {group.slots.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No dated events found.
            </p>
          ) : (
            <ol className="grid gap-1 text-sm">
              {group.slots.map((slot) => (
                <li key={`${slot.dayOfWeek}-${slot.hour}`} className="flex items-center justify-between gap-3">
                  <span style={{ color: "var(--text-primary)" }}>
                    {slot.dayLabel} {String(slot.hour).padStart(2, "0")}:00
                  </span>
                  <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {formatNumber(slot.count)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
