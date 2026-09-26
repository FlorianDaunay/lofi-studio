import type { CoverScene, CoverWorld } from "@/songs/cover";

/**
 * Shared helpers for drawing covers. The art's palette is derived from the song, not from the
 * theme, so a cover looks the same in every theme: this folder is the one place colors are computed.
 */

export const hsl = (hue: number, saturation: number, lightness: number) =>
  `hsl(${(((hue % 360) + 360) % 360).toFixed(1)} ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** How much of layer `index` (out of `count`) shows at `amount`: layers fade in one after another. */
export const fadeIn = (amount: number, count: number, index: number) => clamp01(amount * count - index);

/** A fixed pseudo-random table: covers never flicker and never depend on chance. */
const SPREAD = Array.from({ length: 64 }, (_, i) => Math.abs((Math.sin(i * 12.9898 + 1.7) * 43758.5453) % 1));
export const spread = (index: number) => SPREAD[index % SPREAD.length] ?? 0;

/** Where the ground ends and the pattern strip begins. */
export const GROUND = 86;

/** The color each world pulls its ground toward (a desert is sandy whatever the key). */
const WORLD_HUES: Record<CoverWorld, number | null> = { city: null, sea: 205, mountains: 225, forest: 135, desert: 35, fields: 90 };

/** Mixes two hues the short way around the circle. */
const mixHue = (a: number, b: number, t: number) => a + (((((b - a) % 360) + 540) % 360) - 180) * t;

export interface Palette {
  hue: number;
  saturation: number;
  /** Lightness of the top of the sky; everything else is placed relative to it. */
  top: number;
  groundHue: number;
}

export function palette(scene: CoverScene): Palette {
  const hue = scene.hue * 360;
  const target = WORLD_HUES[scene.world];
  return {
    hue,
    saturation: 25 + scene.saturation * 45,
    top: 13 + scene.lightness * 27 - scene.night * 5,
    groundHue: target === null ? hue : mixHue(hue, target, 0.6),
  };
}

const WAVE_POINTS = 24;

/** A filled band whose top edge is a sine wave: hills, dunes, waves. */
export function wavePath(base: number, amplitude: number, frequency: number, phase: number): string {
  const points = Array.from({ length: WAVE_POINTS + 1 }, (_, i) => {
    const x = (i / WAVE_POINTS) * 100;
    const y = base + amplitude * Math.sin((x / 100) * frequency * 2 * Math.PI + phase);
    return `${x.toFixed(1)},${y.toFixed(2)}`;
  });
  return `M0,100 L${points.join(" L")} L100,100 Z`;
}
