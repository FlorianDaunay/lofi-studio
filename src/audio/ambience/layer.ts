import * as Tone from "tone";
import type { Chord } from "../types";

/** What a running layer hands back: stops its sources and releases every node it created. */
export type Teardown = () => void;

/**
 * One ambience layer. It only holds audio nodes while it is audible: at level 0, or when the
 * studio is stopped, everything but its output gain is disposed. Fifteen layers therefore cost
 * nothing until someone turns one up, which matters on phones.
 */
export abstract class AmbienceLayer {
  readonly output = new Tone.Gain(0);
  private current = 0;
  private running = false;
  private teardown: Teardown | undefined;
  private stopTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(protected readonly lowPower = false) {}

  /** Builds the layer's nodes, connects them to `output` and starts them. */
  protected abstract start(output: Tone.Gain): Teardown;

  /** Maps the 0..1 slider to a gain (perceptual curve). */
  protected gainFor(level: number): number {
    return level ** 2;
  }

  /** The slider position, for layers whose activity (not only loudness) follows it. */
  protected get level(): number {
    return this.current;
  }

  /** The chord being played; most layers ignore it. */
  setChord(_chord: Chord, _transpose: number): void {}

  /** The other ambience levels; most layers ignore them. */
  setSurroundings(_levels: Readonly<Record<string, number>>): void {}

  setLevel(level: number) {
    if (level === this.current) return;
    this.current = level;
    this.output.gain.rampTo(this.gainFor(level), 0.2);
    this.sync();
  }

  setRunning(running: boolean) {
    this.running = running;
    this.sync();
  }

  private sync() {
    const wanted = this.running && this.current > 0.001;
    if (wanted) {
      clearTimeout(this.stopTimer);
      this.stopTimer = undefined;
      this.teardown ??= this.start(this.output);
    } else if (this.teardown && this.stopTimer === undefined) {
      // Let the gain ramp finish before cutting the sources.
      this.stopTimer = setTimeout(() => {
        this.stopTimer = undefined;
        this.teardown?.();
        this.teardown = undefined;
      }, 350);
    }
  }

  dispose() {
    clearTimeout(this.stopTimer);
    this.teardown?.();
    this.teardown = undefined;
    this.output.dispose();
  }
}

/** Disposes every node of a layer (sources are stopped by their own `dispose`). */
export const disposeAll =
  (...nodes: { dispose(): unknown }[]): Teardown =>
  () => {
    for (const node of nodes) node.dispose();
  };

/** A looping, procedurally generated buffer (not loaded from any file). */
export function loopBuffer(data: Float32Array, destination: Tone.InputNode): Teardown {
  const buffer = new Tone.ToneAudioBuffer().fromArray(data) as Tone.ToneAudioBuffer;
  // Starting at a random point: two layers built from the same kind of buffer never line up.
  const source = new Tone.ToneBufferSource({ url: buffer, loop: true }).connect(destination);
  source.start(undefined, Math.random() * buffer.duration);
  return () => {
    source.stop();
    source.dispose();
    buffer.dispose();
  };
}

/**
 * Calls `tick(time, interval)` every `interval` seconds on the audio clock. Unlike a timer it
 * keeps its pace while the page is hidden (app in the background, window in the tray).
 */
export function everySeconds(interval: number, tick: (time: number, interval: number) => void): Teardown {
  const clock = new Tone.Clock((time) => tick(time, interval), 1 / interval).start();
  return () => clock.dispose();
}

/** True with the probability of at least one event in `interval` seconds, at `perSecond` on average. */
export const chance = (perSecond: number, interval: number) => Math.random() < 1 - Math.exp(-perSecond * interval);

export const between = (min: number, max: number) => min + Math.random() * (max - min);

export const sampleRate = () => Tone.getContext().sampleRate;
