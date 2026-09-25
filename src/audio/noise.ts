/**
 * Procedural noise buffers: nothing is loaded from disk. The buffers are generated once from
 * a sparse random process, then looped by a buffer source.
 */

export interface TickOptions {
  seconds: number;
  sampleRate: number;
  /** Average number of ticks per second (Poisson-like). */
  density: number;
  /** Decay time constant of one tick, in ms. */
  decayMs: number;
  /** Probability that a tick is a loud pop. */
  popChance: number;
  /** Constant background hiss level. */
  hiss: number;
}

/** Random ticks made of a short decaying noise burst: vinyl crackle or rain droplets. */
export function generateTicks({ seconds, sampleRate, density, decayMs, popChance, hiss }: TickOptions): Float32Array {
  const length = Math.floor(seconds * sampleRate);
  const data = new Float32Array(length);
  const decay = Math.max(1, (decayMs / 1000) * sampleRate);
  const burst = Math.floor(decay * 6);

  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * hiss;

  const ticks = Math.floor(seconds * density);
  for (let t = 0; t < ticks; t++) {
    const start = Math.floor(Math.random() * length);
    const isPop = Math.random() < popChance;
    const gain = (isPop ? 0.6 + Math.random() * 0.4 : Math.random() ** 3 * 0.35) * (Math.random() < 0.5 ? -1 : 1);
    const span = Math.min(burst * (isPop ? 2 : 1), length - start);
    for (let i = 0; i < span; i++) data[start + i]! += gain * Math.exp(-i / (isPop ? decay * 1.6 : decay)) * (Math.random() * 2 - 1);
  }

  // Loop seam: fade the last few ms so the wrap is inaudible.
  const fade = Math.min(length, Math.floor(sampleRate * 0.01));
  for (let i = 0; i < fade; i++) data[length - 1 - i]! *= i / fade;

  for (let i = 0; i < length; i++) data[i] = Math.max(-1, Math.min(1, data[i]!));
  return data;
}
