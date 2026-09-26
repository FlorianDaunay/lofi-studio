import * as Tone from "tone";
import { lfoFloor } from "./music";
import type { BassParams, DrumsParams, KeysParams } from "./types";

/** Every instrument exposes one output node and cleans up after itself. */
export interface Instrument {
  readonly output: Tone.Gain;
  dispose(): void;
}

const db = (linear: number) => Tone.gainToDb(Math.max(linear, 0.0001));

/** Jazzy electric piano: FM synthesis, low-pass with an LFO "wobble", chorus. */
export class Keys implements Instrument {
  readonly output = new Tone.Gain(0.5);
  private readonly synth: Tone.PolySynth<Tone.FMSynth>;
  private readonly filter = new Tone.Filter({ type: "lowpass", frequency: 2400, Q: 0.6, rolloff: -12 });
  private readonly lfo = new Tone.LFO({ frequency: 0.3, min: 800, max: 2400, type: "sine" });
  private readonly chorus = new Tone.Chorus({ frequency: 0.7, delayTime: 3.5, depth: 0.5, wet: 0.45 });

  constructor() {
    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3,
      modulationIndex: 1.4,
      oscillator: { type: "sine" },
      modulation: { type: "sine" },
      envelope: { attack: 0.01, decay: 1.2, sustain: 0.25, release: 1.2 },
      modulationEnvelope: { attack: 0.005, decay: 0.6, sustain: 0.15, release: 0.8 },
    });
    this.synth.maxPolyphony = 16;
    this.chorus.start();
    this.lfo.connect(this.filter.frequency);
    this.lfo.start();
    this.synth.chain(this.filter, this.chorus, this.output);
  }

  apply({ level, wave, adsr, cutoff, lfoRate, lfoDepth }: KeysParams) {
    this.output.gain.rampTo(level, 0.05);
    this.synth.set({ oscillator: { type: wave }, envelope: adsr });
    this.lfo.frequency.rampTo(lfoRate, 0.1);
    this.lfo.max = cutoff;
    this.lfo.min = lfoFloor(cutoff, lfoDepth);
  }

  releaseAll() {
    this.synth.releaseAll();
  }

  play(frequencies: number[], seconds: number, time: number, velocity: number) {
    this.synth.triggerAttackRelease(frequencies, seconds, time, velocity);
  }

  dispose() {
    this.synth.releaseAll();
    for (const node of [this.synth, this.filter, this.lfo, this.chorus, this.output]) node.dispose();
  }
}

/** Round sub bass: a single oscillator through a low-pass. */
export class Bass implements Instrument {
  readonly output = new Tone.Gain(0.6);
  private readonly synth = new Tone.Synth({ oscillator: { type: "triangle" } });
  private readonly filter = new Tone.Filter({ type: "lowpass", frequency: 500, Q: 1, rolloff: -24 });

  constructor() {
    this.synth.chain(this.filter, this.output);
  }

  apply({ level, wave, adsr, cutoff }: BassParams) {
    this.output.gain.rampTo(level, 0.05);
    this.synth.set({ oscillator: { type: wave }, envelope: adsr });
    this.filter.frequency.rampTo(cutoff, 0.05);
  }

  play(frequency: number, seconds: number, time: number, velocity: number) {
    this.synth.triggerAttackRelease(frequency, seconds, time, velocity);
  }

  dispose() {
    for (const node of [this.synth, this.filter, this.output]) node.dispose();
  }
}

/** Kick, snare and hat, all synthesized (pitch-swept sine, filtered noise). */
export class Drums implements Instrument {
  readonly output = new Tone.Gain(0.9);
  private readonly kick = new Tone.MembraneSynth({
    pitchDecay: 0.035,
    octaves: 5,
    envelope: { attack: 0.001, decay: 0.32, sustain: 0, release: 0.1 },
  });
  private readonly snareNoise = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.05 },
  });
  private readonly snareFilter = new Tone.Filter({ type: "bandpass", frequency: 1900, Q: 0.6 });
  private readonly snareBody = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.03 },
  });
  private readonly hat = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.01 },
  });
  private readonly hatFilter = new Tone.Filter({ type: "highpass", frequency: 7500, Q: 0.5 });

  constructor() {
    this.kick.connect(this.output);
    this.snareNoise.chain(this.snareFilter, this.output);
    this.snareBody.connect(this.output);
    this.hat.chain(this.hatFilter, this.output);
  }

  apply({ kick, snare, hat }: DrumsParams) {
    this.kick.volume.value = db(kick);
    this.snareNoise.volume.value = db(snare);
    this.snareBody.volume.value = db(snare * 0.6);
    this.hat.volume.value = db(hat * 0.25);
  }

  playKick(time: number, velocity: number) {
    this.kick.triggerAttackRelease(48, 0.3, time, velocity);
  }

  playSnare(time: number, velocity: number) {
    this.snareNoise.triggerAttackRelease(0.14, time, velocity);
    this.snareBody.triggerAttackRelease(185, 0.08, time, velocity);
  }

  playHat(time: number, velocity: number) {
    this.hat.triggerAttackRelease(0.04, time, velocity);
  }

  dispose() {
    const nodes = [this.kick, this.snareNoise, this.snareFilter, this.snareBody, this.hat, this.hatFilter, this.output];
    for (const node of nodes) node.dispose();
  }
}
