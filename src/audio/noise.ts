/**
 * Procedural noise buffers: nothing is loaded from disk. The buffers are generated once from
 * a sparse random process, then looped by a buffer source. Pure (no Web Audio), so testable.
 *
 * Except for the vinyl ticks, every generator writes its events around the end of the buffer
 * (index modulo the length), so an event that crosses the loop point carries on at its start:
 * the loops have no seam to fade.
 */

export type Random = () => number;

const clampSample = (value: number) => Math.max(-1, Math.min(1, value));

/** Adds `value` at `index`, wrapping around the buffer. */
const addAt = (data: Float32Array, index: number, value: number) => {
  const i = index % data.length;
  data[i] = data[i]! + value;
};

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

/** Random ticks made of a short decaying noise burst: vinyl crackle. Clicky on purpose. */
export function generateTicks({ seconds, sampleRate, density, decayMs, popChance, hiss }: TickOptions, random: Random = Math.random): Float32Array {
  const length = Math.floor(seconds * sampleRate);
  const data = new Float32Array(length);
  const decay = Math.max(1, (decayMs / 1000) * sampleRate);
  const burst = Math.floor(decay * 6);

  for (let i = 0; i < length; i++) data[i] = (random() * 2 - 1) * hiss;

  const ticks = Math.floor(seconds * density);
  for (let t = 0; t < ticks; t++) {
    const start = Math.floor(random() * length);
    const isPop = random() < popChance;
    const gain = (isPop ? 0.6 + random() * 0.4 : random() ** 3 * 0.35) * (random() < 0.5 ? -1 : 1);
    const span = Math.min(burst * (isPop ? 2 : 1), length - start);
    for (let i = 0; i < span; i++) data[start + i]! += gain * Math.exp(-i / (isPop ? decay * 1.6 : decay)) * (random() * 2 - 1);
  }

  // Loop seam: fade the last few ms so the wrap is inaudible.
  const fade = Math.min(length, Math.floor(sampleRate * 0.01));
  for (let i = 0; i < fade; i++) data[length - 1 - i]! *= i / fade;

  for (let i = 0; i < length; i++) data[i] = clampSample(data[i]!);
  return data;
}

interface Burst {
  start: number;
  gain: number;
  /** Rise time in samples: a burst that starts at full level is heard as a click. */
  attack: number;
  /** Decay time constant in samples. */
  decay: number;
  /** 0..1: how much a one-pole low-pass softens the noise (0 = raw white noise). */
  dull?: number;
}

/** A noise burst with a raised-cosine attack and an exponential decay. */
function addBurst(data: Float32Array, { start, gain, attack, decay, dull = 0 }: Burst, random: Random) {
  const span = Math.floor(attack + decay * 6);
  let smooth = 0;
  for (let i = 0; i < span; i++) {
    const rise = i < attack ? 0.5 - 0.5 * Math.cos((Math.PI * i) / attack) : 1;
    const fall = i < attack ? 1 : Math.exp(-(i - attack) / decay);
    smooth = smooth * dull + (random() * 2 - 1) * (1 - dull);
    addAt(data, start + i, gain * rise * fall * smooth);
  }
}

export interface DropletOptions {
  seconds: number;
  sampleRate: number;
  /** Droplets per second. */
  density: number;
}

/**
 * Rain droplets: many soft, short bursts. Unlike vinyl ticks they never start at full level and
 * there are no loud pops, so the patter stays smooth instead of crackling.
 */
export function generateDroplets({ seconds, sampleRate, density }: DropletOptions, random: Random = Math.random): Float32Array {
  const length = Math.floor(seconds * sampleRate);
  const data = new Float32Array(length);
  const ms = sampleRate / 1000;
  const count = Math.floor(seconds * density);
  for (let d = 0; d < count; d++) {
    addBurst(
      data,
      {
        start: Math.floor(random() * length),
        // Mostly faint drops, a few closer ones: never a pop.
        gain: (0.04 + random() ** 2.5 * 0.22) * (random() < 0.5 ? -1 : 1),
        attack: (0.4 + random() * 0.6) * ms,
        decay: (1.5 + random() * 3) * ms,
        dull: random() * 0.5,
      },
      random,
    );
  }
  for (let i = 0; i < length; i++) data[i] = clampSample(data[i]!);
  return data;
}

export interface CrackleOptions {
  seconds: number;
  sampleRate: number;
  /** Crackles per second. */
  density: number;
  /** Share of the crackles that are deeper pops (a log splitting). */
  popChance: number;
}

/** A fire's crackle: bursts in little clusters, with now and then a deeper pop. Soft-edged, like the rain. */
export function generateCrackle({ seconds, sampleRate, density, popChance }: CrackleOptions, random: Random = Math.random): Float32Array {
  const length = Math.floor(seconds * sampleRate);
  const data = new Float32Array(length);
  const ms = sampleRate / 1000;
  const clusters = Math.floor((seconds * density) / 3);
  for (let c = 0; c < clusters; c++) {
    const at = Math.floor(random() * length);
    const size = 1 + Math.floor(random() * 5);
    for (let k = 0; k < size; k++) {
      const pop = random() < popChance;
      addBurst(
        data,
        {
          start: at + Math.floor(random() * 120 * ms),
          gain: (pop ? 0.35 + random() * 0.3 : 0.05 + random() ** 2 * 0.3) * (random() < 0.5 ? -1 : 1),
          attack: (pop ? 1.2 : 0.3 + random() * 0.4) * ms,
          decay: (pop ? 6 + random() * 10 : 0.6 + random() * 1.8) * ms,
          dull: pop ? 0.75 : random() * 0.3,
        },
        random,
      );
    }
  }
  for (let i = 0; i < length; i++) data[i] = clampSample(data[i]!);
  return data;
}

export interface BubbleOptions {
  seconds: number;
  sampleRate: number;
  /** Bubbles per second. */
  density: number;
}

/**
 * A babbling stream: little bubbles, each a short sine whose pitch rises as it decays (the way a
 * bubble rings as it closes), from 400 Hz to 1.8 kHz.
 */
export function generateBubbles({ seconds, sampleRate, density }: BubbleOptions, random: Random = Math.random): Float32Array {
  const length = Math.floor(seconds * sampleRate);
  const data = new Float32Array(length);
  const count = Math.floor(seconds * density);
  for (let b = 0; b < count; b++) {
    const start = Math.floor(random() * length);
    const frequency = 400 * 4.5 ** random();
    const duration = (0.012 + random() * 0.05) * sampleRate;
    const rise = 0.4 + random() * 0.8;
    const gain = 0.05 + random() ** 2 * 0.22;
    const attack = 0.001 * sampleRate;
    let phase = 0;
    for (let i = 0; i < duration * 3; i++) {
      const t = i / duration;
      phase += (2 * Math.PI * frequency * (1 + rise * Math.min(t, 1.5))) / sampleRate;
      const envelope = (i < attack ? i / attack : 1) * Math.exp(-t * 2.2);
      addAt(data, start + i, gain * envelope * Math.sin(phase));
    }
  }
  for (let i = 0; i < length; i++) data[i] = clampSample(data[i]!);
  return data;
}

export interface CricketOptions {
  seconds: number;
  sampleRate: number;
  /** How many crickets sing, each at its own pitch, pace and distance. */
  crickets: number;
}

/**
 * Crickets: each sings chirps of 2 to 4 short pulses on a 4 to 5.5 kHz tone. Every cricket's pace
 * divides the buffer length exactly, so its rhythm carries on unbroken across the loop.
 */
export function generateCrickets({ seconds, sampleRate, crickets }: CricketOptions, random: Random = Math.random): Float32Array {
  const length = Math.floor(seconds * sampleRate);
  const data = new Float32Array(length);
  for (let c = 0; c < crickets; c++) {
    const frequency = 4000 + random() * 1500;
    const chirps = Math.max(1, Math.round(seconds / (0.45 + random() * 0.5)));
    const period = length / chirps;
    const pulses = 2 + Math.floor(random() * 3);
    const pulseLength = (0.012 + random() * 0.008) * sampleRate;
    const pulseGap = (0.028 + random() * 0.012) * sampleRate;
    // The first is close, the others further away.
    const gain = c === 0 ? 0.28 : 0.08 + random() * 0.12;
    const offset = random() * period;
    for (let k = 0; k < chirps; k++) {
      // A chirp now and then is skipped, so the song does not sound mechanical.
      if (random() < 0.12) continue;
      const chirpStart = Math.floor(offset + k * period);
      for (let p = 0; p < pulses; p++) {
        const start = chirpStart + Math.floor(p * pulseGap);
        for (let i = 0; i < pulseLength; i++) {
          const window = Math.sin((Math.PI * i) / pulseLength) ** 2;
          addAt(data, start + i, gain * window * Math.sin((2 * Math.PI * frequency * i) / sampleRate));
        }
      }
    }
  }
  for (let i = 0; i < length; i++) data[i] = clampSample(data[i]!);
  return data;
}

export interface RustleOptions {
  seconds: number;
  sampleRate: number;
}

/**
 * Leaves in the wind: a dense swarm of tiny noise grains whose density and loudness follow slow
 * gusts. The gust curve is made of sines that fit the buffer exactly, so it loops smoothly too.
 */
export function generateRustle({ seconds, sampleRate }: RustleOptions, random: Random = Math.random): Float32Array {
  const length = Math.floor(seconds * sampleRate);
  const data = new Float32Array(length);
  const ms = sampleRate / 1000;
  const waves = [1, 2, 3].map((cycles) => ({ cycles, phase: random() * 2 * Math.PI, weight: 1 / cycles }));
  const total = waves.reduce((sum, wave) => sum + wave.weight, 0);
  const gust = (i: number) => {
    const x = (i / length) * 2 * Math.PI;
    const raw = waves.reduce((sum, wave) => sum + wave.weight * Math.sin(wave.cycles * x + wave.phase), 0) / total;
    return ((raw + 1) / 2) ** 2;
  };
  // Grains are drawn per 10 ms slice, at the rate the gust allows there.
  const slice = Math.floor(10 * ms);
  for (let at = 0; at < length; at += slice) {
    const strength = gust(at);
    // Many faint, soft-edged grains rather than a few loud ones: a rustle, not a crackle.
    const grains = Math.round((120 + strength * 1500) * 0.01 * (0.5 + random()));
    for (let g = 0; g < grains; g++) {
      addBurst(
        data,
        {
          start: at + Math.floor(random() * slice),
          gain: (0.01 + random() ** 1.5 * 0.035) * (0.25 + strength) * (random() < 0.5 ? -1 : 1),
          attack: 0.5 * ms,
          decay: (0.6 + random() * 2) * ms,
          dull: random() * 0.6,
        },
        random,
      );
    }
  }
  for (let i = 0; i < length; i++) data[i] = clampSample(data[i]!);
  return data;
}
