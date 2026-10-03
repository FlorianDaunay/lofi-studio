import * as Tone from "tone";
import { generateCrickets, generateRustle } from "../noise";
import { AmbienceLayer, between, chance, disposeAll, everySeconds, loopBuffer, sampleRate, type Teardown } from "./layer";

/** One sine voice whose pitch and loudness are drawn note by note: a bird, a frog. */
interface Singer {
  frequency: Tone.Signal<"frequency">;
  gain: Tone.Param<"gain">;
  /** Audio time until which it is still singing. */
  busyUntil: number;
}

type Song = (singer: Singer, time: number, pitch: number) => number;

/** Quick downward chirps, two to six of them. */
const chirps: Song = ({ frequency, gain }, time, pitch) => {
  let at = time;
  const count = 2 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i++) {
    const length = between(0.04, 0.08);
    const top = pitch * between(0.95, 1.08);
    frequency.setValueAtTime(top, at);
    frequency.exponentialRampToValueAtTime(top * 0.6, at + length);
    gain.setValueAtTime(0, at);
    gain.linearRampToValueAtTime(between(0.5, 1), at + 0.006);
    gain.linearRampToValueAtTime(0, at + length);
    at += length + between(0.05, 0.12);
  }
  return at - time;
};

/** A fast trill between two notes. */
const trill: Song = ({ frequency, gain }, time, pitch) => {
  let at = time;
  const count = 6 + Math.floor(Math.random() * 8);
  const low = pitch * between(0.75, 0.88);
  for (let i = 0; i < count; i++) {
    frequency.setValueAtTime(i % 2 === 0 ? pitch : low, at);
    gain.setValueAtTime(0, at);
    gain.linearRampToValueAtTime(0.6, at + 0.005);
    gain.linearRampToValueAtTime(0, at + 0.03);
    at += 0.04;
  }
  return at - time;
};

/** Two or three slow, sliding whistles, like a blackbird. */
const whistle: Song = ({ frequency, gain }, time, pitch) => {
  let at = time;
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const length = between(0.18, 0.4);
    const from = pitch * between(0.55, 0.75);
    frequency.setValueAtTime(from, at);
    frequency.exponentialRampToValueAtTime(from * between(0.8, 1.35), at + length);
    gain.setValueAtTime(0, at);
    gain.linearRampToValueAtTime(0.7, at + 0.04);
    gain.linearRampToValueAtTime(0, at + length);
    at += length + between(0.08, 0.2);
  }
  return at - time;
};

/** Two birds (one high, one lower) singing now and then, never both at once. */
export class Birds extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 0.22;
  }

  protected start(output: Tone.Gain): Teardown {
    const filter = new Tone.Filter({ type: "highpass", frequency: 1200 });
    filter.connect(output);
    const nodes: { dispose(): unknown }[] = [filter];
    const singers: (Singer & { pitch: number })[] = [4200, 3000].map((pitch) => {
      const oscillator = new Tone.Oscillator(pitch, "sine").start();
      const gain = new Tone.Gain(0);
      oscillator.chain(gain, filter);
      nodes.push(oscillator, gain);
      return { frequency: oscillator.frequency, gain: gain.gain, busyUntil: 0, pitch };
    });
    const songs = [chirps, chirps, trill, whistle];

    const stopClock = everySeconds(0.25, (time, interval) => {
      if (!chance(0.3, interval)) return;
      const singer = singers[Math.floor(Math.random() * singers.length)];
      const song = songs[Math.floor(Math.random() * songs.length)];
      if (!singer || !song || singers.some((s) => s.busyUntil > time)) return;
      const at = time + Math.random() * interval;
      singer.busyUntil = at + song(singer, at, singer.pitch * between(0.9, 1.1)) + 0.3;
    });

    return () => {
      stopClock();
      disposeAll(...nodes)();
    };
  }
}

/** Crickets: pulsing chirps from a few insects at different distances. */
export class Crickets extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 1.3;
  }

  protected start(output: Tone.Gain): Teardown {
    const filter = new Tone.Filter({ type: "bandpass", frequency: 4600, Q: 0.8 });
    filter.connect(output);
    const song = loopBuffer(generateCrickets({ seconds: 8, sampleRate: sampleRate(), crickets: 3 }), filter);
    return () => {
      song();
      filter.dispose();
    };
  }
}

/** One croak: two or three nasal pulses, each a little lower. */
function croak({ frequency, gain }: Singer, time: number, pitch: number): number {
  let at = time;
  const pulses = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < pulses; i++) {
    const length = between(0.05, 0.09);
    frequency.setValueAtTime(pitch * 0.97 ** i, at);
    frequency.linearRampToValueAtTime(pitch * 0.97 ** i * 0.9, at + length);
    gain.setValueAtTime(0, at);
    gain.linearRampToValueAtTime(0.9, at + 0.01);
    gain.linearRampToValueAtTime(0, at + length);
    at += length + between(0.02, 0.05);
  }
  return at - time;
}

/** Frogs by a pond at night: a low one and a higher one answering each other. */
export class Frogs extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 1;
  }

  protected start(output: Tone.Gain): Teardown {
    // A buzzy wave through a vocal-like band: the throat of the frog.
    const formant = new Tone.Filter({ type: "bandpass", frequency: 850, Q: 2.5 });
    const soften = new Tone.Filter({ type: "lowpass", frequency: 2500 });
    formant.chain(soften, output);
    const nodes: { dispose(): unknown }[] = [formant, soften];
    const frogs: (Singer & { pitch: number })[] = [130, 290].map((pitch) => {
      const oscillator = new Tone.Oscillator(pitch, "sawtooth").start();
      const gain = new Tone.Gain(0);
      oscillator.chain(gain, formant);
      nodes.push(oscillator, gain);
      return { frequency: oscillator.frequency, gain: gain.gain, busyUntil: 0, pitch };
    });

    const stopClock = everySeconds(0.25, (time, interval) => {
      if (!chance(0.45, interval)) return;
      const frog = frogs[Math.floor(Math.random() * frogs.length)];
      if (!frog || frog.busyUntil > time) return;
      const at = time + Math.random() * interval;
      // Frogs often croak twice in a row.
      let length = croak(frog, at, frog.pitch * between(0.95, 1.05));
      if (Math.random() < 0.4) length += croak(frog, at + length + 0.15, frog.pitch) + 0.15;
      frog.busyUntil = at + length + 0.2;
    });

    return () => {
      stopClock();
      disposeAll(...nodes)();
    };
  }
}

/** Leaves rustling in gusts. */
export class Leaves extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 10;
  }

  protected start(output: Tone.Gain): Teardown {
    const filter = new Tone.Filter({ type: "bandpass", frequency: 3200, Q: 0.4 });
    filter.connect(output);
    const rustle = loopBuffer(generateRustle({ seconds: 10, sampleRate: sampleRate() }), filter);
    return () => {
      rustle();
      filter.dispose();
    };
  }
}
