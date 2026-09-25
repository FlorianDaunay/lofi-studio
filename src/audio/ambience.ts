import * as Tone from "tone";
import { generateTicks } from "./noise";

/**
 * An ambience layer only holds audio sources while it is audible: at level 0, or when the
 * studio is stopped, its noise generators are stopped and its buffers released.
 */
abstract class AmbienceLayer {
  readonly output = new Tone.Gain(0);
  private level = 0;
  private running = false;
  private active = false;
  private stopTimer: ReturnType<typeof setTimeout> | undefined;

  protected abstract begin(): void;
  protected abstract end(): void;
  /** Maps the 0..1 slider to a gain (perceptual curve). */
  protected gainFor(level: number): number {
    return level ** 2;
  }

  setLevel(level: number) {
    this.level = level;
    this.output.gain.rampTo(this.gainFor(level), 0.2);
    this.sync();
  }

  setRunning(running: boolean) {
    this.running = running;
    this.sync();
  }

  private sync() {
    const wanted = this.running && this.level > 0.001;
    if (wanted) {
      clearTimeout(this.stopTimer);
      this.stopTimer = undefined;
      if (!this.active) {
        this.begin();
        this.active = true;
      }
    } else if (this.active && this.stopTimer === undefined) {
      // Let the gain ramp finish before cutting the source.
      this.stopTimer = setTimeout(() => {
        this.stopTimer = undefined;
        if (this.active) this.end();
        this.active = false;
      }, 350);
    }
  }

  dispose() {
    clearTimeout(this.stopTimer);
    if (this.active) this.end();
    this.active = false;
    this.output.dispose();
  }
}

/** A looping procedurally generated buffer (not loaded from any file). */
class LoopingBuffer {
  private source: Tone.ToneBufferSource | undefined;
  private buffer: Tone.ToneAudioBuffer | undefined;

  start(data: Float32Array, destination: Tone.InputNode) {
    this.buffer = new Tone.ToneAudioBuffer().fromArray(data) as Tone.ToneAudioBuffer;
    this.source = new Tone.ToneBufferSource({ url: this.buffer, loop: true }).connect(destination);
    this.source.start();
  }

  stop() {
    this.source?.stop();
    this.source?.dispose();
    this.buffer?.dispose();
    this.source = undefined;
    this.buffer = undefined;
  }
}

const sampleRate = () => Tone.getContext().sampleRate;

/** Rain: filtered pink noise for the wash, random droplet ticks for the patter. */
export class Rain extends AmbienceLayer {
  private wash = new Tone.Noise("pink");
  private washFilter = new Tone.Filter({ type: "bandpass", frequency: 2600, Q: 0.35 });
  private washGain = new Tone.Gain(0.55);
  private patterFilter = new Tone.Filter({ type: "highpass", frequency: 1800 });
  private patterGain = new Tone.Gain(0.5);
  private patter = new LoopingBuffer();

  constructor() {
    super();
    this.wash.chain(this.washFilter, this.washGain, this.output);
    this.patterFilter.chain(this.patterGain, this.output);
  }

  protected override gainFor(level: number) {
    return level ** 2 * 0.9;
  }

  protected begin() {
    this.wash.start();
    this.patter.start(
      generateTicks({ seconds: 5, sampleRate: sampleRate(), density: 90, decayMs: 3, popChance: 0.02, hiss: 0 }),
      this.patterFilter,
    );
  }

  protected end() {
    this.wash.stop();
    this.patter.stop();
  }

  override dispose() {
    super.dispose();
    for (const node of [this.wash, this.washFilter, this.washGain, this.patterFilter, this.patterGain]) node.dispose();
  }
}

/** Vinyl: sparse random crackle and pops over a faint hiss, plus a low rumble. */
export class Vinyl extends AmbienceLayer {
  private crackle = new LoopingBuffer();
  private crackleFilter = new Tone.Filter({ type: "highpass", frequency: 900 });
  private rumble = new Tone.Noise("brown");
  private rumbleFilter = new Tone.Filter({ type: "lowpass", frequency: 90 });
  private rumbleGain = new Tone.Gain(0.25);

  constructor() {
    super();
    this.crackleFilter.connect(this.output);
    this.rumble.chain(this.rumbleFilter, this.rumbleGain, this.output);
  }

  protected override gainFor(level: number) {
    return level ** 2 * 0.8;
  }

  protected begin() {
    this.crackle.start(
      generateTicks({ seconds: 9, sampleRate: sampleRate(), density: 7, decayMs: 2.5, popChance: 0.18, hiss: 0.012 }),
      this.crackleFilter,
    );
    this.rumble.start();
  }

  protected end() {
    this.crackle.stop();
    this.rumble.stop();
  }

  override dispose() {
    super.dispose();
    for (const node of [this.crackleFilter, this.rumble, this.rumbleFilter, this.rumbleGain]) node.dispose();
  }
}

/** Wind: brown noise through a band-pass whose center and loudness drift slowly (two LFOs). */
export class Wind extends AmbienceLayer {
  private noise = new Tone.Noise("brown");
  private filter = new Tone.Filter({ type: "bandpass", frequency: 500, Q: 1.2 });
  private swell = new Tone.Gain(0.7);
  private sweep = new Tone.LFO({ frequency: 0.07, min: 260, max: 900, type: "sine" });
  private gust = new Tone.LFO({ frequency: 0.11, min: 0.25, max: 1, type: "sine" });

  constructor() {
    super();
    this.noise.chain(this.filter, this.swell, this.output);
    this.sweep.connect(this.filter.frequency);
    this.gust.connect(this.swell.gain);
  }

  protected override gainFor(level: number) {
    return level ** 2 * 1.4;
  }

  protected begin() {
    this.noise.start();
    this.sweep.start();
    this.gust.start();
  }

  protected end() {
    this.noise.stop();
    this.sweep.stop();
    this.gust.stop();
  }

  override dispose() {
    super.dispose();
    for (const node of [this.noise, this.filter, this.swell, this.sweep, this.gust]) node.dispose();
  }
}
