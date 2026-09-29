import { describe, expect, it } from "vitest";
import { formatClock, formatDuration, formatSpent } from "./format";

describe("formatting durations", () => {
  it("shows positions as a clock", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(125.4)).toBe("2:05");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-3)).toBe("0:00");
  });

  it("rounds totals to minutes", () => {
    expect(formatDuration(125)).toBe("2 min");
    expect(formatDuration(4500)).toBe("1 h 15");
  });

  it("keeps small amounts of time spent precise", () => {
    expect(formatSpent(42)).toBe("42 s");
    expect(formatSpent(720)).toBe("12 min");
    expect(formatSpent(3.4 * 3600)).toBe("3.4 h");
    expect(formatSpent(128 * 3600)).toBe("128 h");
  });
});
