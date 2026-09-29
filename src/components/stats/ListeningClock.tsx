import { useState } from "react";
import { formatSpent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { peakDayPart, type DayPart } from "@/songs/insights";
import { ChartTooltip } from "./ChartTooltip";
import { StatCard } from "./StatCard";
import { useWidth } from "./use-width";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const PERSONAS: Record<DayPart, string> = {
  morning: "Early bird: most of your listening happens in the morning.",
  afternoon: "Afternoon focus: most of your listening happens after lunch.",
  evening: "Evening unwinder: most of your listening happens after 6 pm.",
  night: "Night owl: most of your listening happens late at night.",
};

/** Opacity steps of the accent, light to dark: a sequential scale of one hue. */
const STEPS = [0.18, 0.36, 0.56, 0.78, 1];
const LABEL_WIDTH = 36;

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/** When the listening happens: weekday × hour, darker = more. */
export function ListeningClock({ week }: { week: readonly (readonly number[])[] }) {
  const [hover, setHover] = useState<{ day: number; hour: number } | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();
  const peak = Math.max(0, ...week.flat());
  const part = peakDayPart(week);
  const step = (seconds: number) => STEPS[Math.min(STEPS.length - 1, Math.floor((seconds / peak) * STEPS.length))] ?? 1;

  const cell = Math.max(10, (width - LABEL_WIDTH) / 24);
  const hovered = hover ? (week[hover.day]?.[hover.hour] ?? 0) : 0;

  return (
    <StatCard title="When you listen" subtitle={part ? PERSONAS[part] : "Play some music to see your rhythm."}>
      <div ref={ref} className="relative">
        <div className="grid gap-[2px]" style={{ gridTemplateColumns: `${LABEL_WIDTH - 2}px repeat(24, minmax(0, 1fr))` }}>
          {week.map((row, day) => (
            <div key={WEEKDAYS[day]} className="contents">
              <span className="self-center text-[10px] text-text-muted">{WEEKDAYS[day]?.slice(0, 3)}</span>
              {HOURS.map((hour) => {
                const seconds = row[hour] ?? 0;
                return (
                  <button
                    key={hour}
                    type="button"
                    aria-label={`${WEEKDAYS[day]}, ${hourLabel(hour)}: ${seconds > 0 ? formatSpent(seconds) : "nothing"}`}
                    onPointerEnter={() => setHover({ day, hour })}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover({ day, hour })}
                    onBlur={() => setHover(null)}
                    className={cn(
                      "aspect-square min-w-0 rounded-tile transition-transform hover:scale-125 focus-visible:scale-125",
                      seconds > 0 ? "bg-accent" : "bg-surface-hover",
                    )}
                    style={seconds > 0 ? { opacity: step(seconds) } : undefined}
                  />
                );
              })}
            </div>
          ))}
          <span />
          {HOURS.map((hour) => (
            <span key={hour} className="text-center text-[10px] text-text-muted">
              {hour % 6 === 0 ? hour : ""}
            </span>
          ))}
        </div>
        {hover && (
          <ChartTooltip
            x={LABEL_WIDTH + (hover.hour + 0.5) * cell}
            y={hover.day * (cell + 2)}
            width={width}
            value={hovered > 0 ? formatSpent(hovered) : "Nothing yet"}
            label={`${WEEKDAYS[hover.day]}s, ${hourLabel(hover.hour)} to ${hourLabel((hover.hour + 1) % 24)}`}
          />
        )}
      </div>
      <div className="flex items-center justify-end gap-1 text-[10px] text-text-muted" aria-hidden>
        Less
        <span className="h-2.5 w-2.5 rounded-tile bg-surface-hover" />
        {STEPS.map((opacity) => (
          <span key={opacity} className="h-2.5 w-2.5 rounded-tile bg-accent" style={{ opacity }} />
        ))}
        More
      </div>
    </StatCard>
  );
}
