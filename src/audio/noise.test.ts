import { describe, expect, it } from "vitest";
import { generateBubbles, generateCrackle, generateCrickets, generateDroplets, generateRustle } from "./noise";

/** A deterministic generator so failures are reproducible. */
const seeded = (start: number) => {
  let seed = start;
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
};

const SAMPLE_RATE = 32000;
const peak = (data: Float32Array) => data.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
/** The biggest step between two neighbouring samples: a click is a big one. */
const biggestJump = (data: Float32Array) => data.reduce((max, v, i) => (i === 0 ? max : Math.max(max, Math.abs(v - data[i - 1]!))), 0);

describe("ambience buffers", () => {
  const buffers = {
    droplets: (seed: number) => generateDroplets({ seconds: 2, sampleRate: SAMPLE_RATE, density: 110 }, seeded(seed)),
    crackle: (seed: number) => generateCrackle({ seconds: 2, sampleRate: SAMPLE_RATE, density: 16, popChance: 0.1 }, seeded(seed)),
    bubbles: (seed: number) => generateBubbles({ seconds: 2, sampleRate: SAMPLE_RATE, density: 40 }, seeded(seed)),
    crickets: (seed: number) => generateCrickets({ seconds: 2, sampleRate: SAMPLE_RATE, crickets: 3 }, seeded(seed)),
    rustle: (seed: number) => generateRustle({ seconds: 2, sampleRate: SAMPLE_RATE }, seeded(seed)),
  };

  it("fill the whole buffer with finite samples in range, and are not silent", () => {
    for (const [name, generate] of Object.entries(buffers)) {
      const data = generate(1);
      expect(data.length, name).toBe(2 * SAMPLE_RATE);
      expect(data.every((v) => Number.isFinite(v) && v >= -1 && v <= 1), name).toBe(true);
      expect(peak(data), name).toBeGreaterThan(0.02);
    }
  });

  it("keep the rain soft: no pops, no hard clicks", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const data = buffers.droplets(seed);
      expect(peak(data)).toBeLessThan(0.5);
      expect(biggestJump(data)).toBeLessThan(0.6);
    }
  });

  it("loop without a seam: the wrap is no bigger a step than the rest", () => {
    for (const [name, generate] of Object.entries(buffers)) {
      const data = generate(3);
      const wrap = Math.abs(data[0]! - data[data.length - 1]!);
      expect(wrap, name).toBeLessThanOrEqual(biggestJump(data));
    }
  });
});
