import { UI_LOCALE, formatSpent } from "@/lib/format";
import { keyDate } from "@/songs/insights";

/** The smallest "round" number (1, 2, 2.5, 5 × 10ⁿ) at or above `value`: a readable axis top. */
export function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * power >= value) ?? 10;
  return step * power;
}

/** An axis top for seconds: round minutes (or hours) rather than round seconds. */
export const niceSeconds = (seconds: number) =>
  seconds <= 60 ? 60 : seconds <= 3600 ? niceCeil(seconds / 60) * 60 : niceCeil(seconds / 3600) * 3600;

/** How a value of a chart reads: time spent, or a count. */
export const formatValue = (value: number, kind: "time" | "count") =>
  kind === "time" ? formatSpent(value) : String(Math.round(value));

const dayFormat = new Intl.DateTimeFormat(UI_LOCALE, { month: "short", day: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat(UI_LOCALE, { weekday: "short" });
const longFormat = new Intl.DateTimeFormat(UI_LOCALE, { weekday: "long", month: "long", day: "numeric" });

export const shortDay = (key: string) => dayFormat.format(keyDate(key));
export const weekday = (key: string) => weekdayFormat.format(keyDate(key));
export const longDay = (key: string) => longFormat.format(keyDate(key));
