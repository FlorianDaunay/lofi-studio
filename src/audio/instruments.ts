import * as Tone from "tone";
import { lfoFloor } from "./music";
import type { Adsr, BassParams, BassVoice, DrumKit, DrumsParams, KeysParams, KeysVoice, LeadParams, LeadVoice, PadParams, PadVoice, Waveform } from "./types";

/** Every instrument exposes one output node and cleans up after itself. */
export interface Instrument {
  readonly output: Tone.Gain;
  dispose(): void;
}

type FmSettings = Parameters<Tone.PolySynth<Tone.FMSynth>["set"]>[0];

const db = (linear: number) => Tone.gainToDb(Math.max(linear, 0.0001));

/**
 * One way of synthesizing a polyphonic instrument. Voices are swapped whole when the user picks
 * another one, so each can use a different kind of synth.
 */
interface Voice {
  readonly node: Tone.ToneAudioNode;
  shape(adsr: Adsr, wave: Waveform): void;
  play(frequency: number, seconds: number, time: number, velocity: number): void;
  releaseAll(): void;
  dispose(): void;
}

function fmVoice(options: FmSettings, maxPolyphony = 16): Voice {
  const synth = new Tone.PolySynth(Tone.FMSynth);
  synth.set(options);
  synth.maxPolyphony = maxPolyphony;
  return {
    node: synth,
    shape: (adsr, wave) => synth.set({ envelope: adsr, oscillator: { type: wave } }),
    play: (frequency, seconds, time, velocity) => synth.triggerAttackRelease(frequency, seconds, time, velocity),
    releaseAll: () => synth.releaseAll(),
    dispose: () => {
      synth.releaseAll();
      synth.dispose();
    },
  };
}

/** A fixed timbre from harmonic partials; `envelope` adapts the user's ADSR to the instrument's nature. */
function partialsVoice(partials: number[], envelope: (adsr: Adsr) => Adsr, maxPolyphony = 16): Voice {
  const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "custom", partials } });
  synth.maxPolyphony = maxPolyphony;
  return {
    node: synth,
    shape: (adsr) => synth.set({ envelope: envelope(adsr) }),
    play: (frequency, seconds, time, velocity) => synth.triggerAttackRelease(frequency, seconds, time, velocity),
    releaseAll: () => synth.releaseAll(),
    dispose: () => {
      synth.releaseAll();
      synth.dispose();
    },
  };
}

/** Plucked strings (Karplus-Strong). PluckSynth is monophonic, so notes rotate over a few strings. */
function guitarVoice(): Voice {
  const output = new Tone.Gain(1.6);
  const strings = Array.from({ length: 6 }, () => new Tone.PluckSynth({ attackNoise: 0.8, dampening: 2600, resonance: 0.95 }).connect(output));
  let next = 0;
  return {
    node: output,
    // A longer decay lets the strings ring: it maps to how little energy each round trip loses.
    shape: (adsr) => strings.forEach((string) => string.set({ resonance: 0.9 + Math.min(adsr.decay / 3, 1) * 0.085 })),
    play: (frequency, _seconds, time, velocity) => {
      const string = strings[next]!;
      next = (next + 1) % strings.length;
      string.volume.value = db(velocity);
      string.triggerAttack(frequency, time);
    },
    releaseAll: () => undefined,
    dispose: () => {
      for (const string of strings) string.dispose();
      output.dispose();
    },
  };
}

const KEYS_VOICES: Record<KeysVoice, () => Voice> = {
  rhodes: () =>
    fmVoice({
      harmonicity: 3,
      modulationIndex: 1.4,
      modulation: { type: "sine" },
      modulationEnvelope: { attack: 0.005, decay: 0.6, sustain: 0.15, release: 0.8 },
    }),
  vibes: () =>
    fmVoice({
      harmonicity: 4,
      modulationIndex: 2.5,
      modulation: { type: "sine" },
      modulationEnvelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.3 },
    }),
  // A felt piano always dies away, whatever sustain was set.
  piano: () => partialsVoice([1, 0.35, 0.15, 0.06, 0.03], (adsr) => ({ ...adsr, attack: Math.min(adsr.attack, 0.03), sustain: Math.min(adsr.sustain, 0.12) })),
  // An organ holds its notes.
  organ: () => partialsVoice([1, 0.7, 0.45, 0, 0.3, 0, 0, 0.15], (adsr) => ({ ...adsr, sustain: Math.max(adsr.sustain, 0.8) })),
  guitar: guitarVoice,
};

/** Jazzy chords with a choice of voice, through a low-pass with an LFO "wobble" and a chorus. */
export class Keys implements Instrument {
  readonly output = new Tone.Gain(0.5);
  private voice: Voice | undefined;
  private voiceId: KeysVoice | undefined;
  private readonly filter = new Tone.Filter({ type: "lowpass", frequency: 2400, Q: 0.6, rolloff: -12 });
  private readonly lfo = new Tone.LFO({ frequency: 0.3, min: 800, max: 2400, type: "sine" });
  private readonly chorus = new Tone.Chorus({ frequency: 0.7, delayTime: 3.5, depth: 0.5, wet: 0.45 });

  constructor() {
    this.chorus.start();
    this.lfo.connect(this.filter.frequency);
    this.lfo.start();
    this.filter.chain(this.chorus, this.output);
  }

  apply({ level, voice, wave, adsr, cutoff, lfoRate, lfoDepth }: KeysParams) {
    if (voice !== this.voiceId) {
      this.voice?.dispose();
      this.voice = KEYS_VOICES[voice]();
      this.voice.node.connect(this.filter);
      this.voiceId = voice;
    }
    this.voice?.shape(adsr, wave);
    this.output.gain.rampTo(level, 0.05);
    this.lfo.frequency.rampTo(lfoRate, 0.1);
    this.lfo.max = cutoff;
    this.lfo.min = lfoFloor(cutoff, lfoDepth);
  }

  releaseAll() {
    this.voice?.releaseAll();
  }

  play(frequency: number, seconds: number, time: number, velocity: number) {
    this.voice?.play(frequency, seconds, time, velocity);
  }

  dispose() {
    this.voice?.dispose();
    for (const node of [this.filter, this.lfo, this.chorus, this.output]) node.dispose();
  }
}

/** How each bass voice sets up the same mono synth: its envelope, filter and filter sweep. */
type MonoSettings = Parameters<Tone.MonoSynth["set"]>[0];
type PadSettings = Parameters<Tone.PolySynth<Tone.Synth>["set"]>[0];

function bassSettings(voice: BassVoice, { wave, adsr, cutoff }: BassParams): MonoSettings {
  switch (voice) {
    case "sub":
      return { oscillator: { type: wave }, envelope: adsr, filter: { Q: 1 }, filterEnvelope: { baseFrequency: cutoff, octaves: 0 } };
    case "upright":
      // A plucked string: fast attack, short body, a filter that closes right after the pluck.
      return {
        oscillator: { type: "triangle" },
        envelope: { ...adsr, attack: 0.005, sustain: Math.min(adsr.sustain, 0.3) },
        filter: { Q: 2 },
        filterEnvelope: { attack: 0.003, decay: 0.2, sustain: 0.3, release: 0.2, baseFrequency: cutoff * 0.6, octaves: 2 },
      };
    case "synth":
      return {
        oscillator: { type: wave },
        envelope: adsr,
        filter: { Q: 5 },
        filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.3, baseFrequency: cutoff * 0.5, octaves: 2.5 },
      };
  }
}

/** Bass on a mono synth with a filter envelope: a round sub, a plucked upright or a squelchy synth. */
export class Bass implements Instrument {
  readonly output = new Tone.Gain(0.6);
  private readonly synth = new Tone.MonoSynth({ filter: { type: "lowpass", rolloff: -24 } });

  constructor() {
    this.synth.connect(this.output);
  }

  apply(params: BassParams) {
    this.output.gain.rampTo(params.level, 0.05);
    this.synth.set(bassSettings(params.voice, params));
  }

  play(frequency: number, seconds: number, time: number, velocity: number) {
    this.synth.triggerAttackRelease(frequency, seconds, time, velocity);
  }

  dispose() {
    this.synth.dispose();
    this.output.dispose();
  }
}

interface KitSettings {
  kick: { note: number; pitchDecay: number; octaves: number; decay: number };
  snare: { noise: "white" | "pink"; decay: number; frequency: number; q: number; body: number; bodyNote: number };
  hat: { decay: number; frequency: number; gain: number };
}

const KITS: Record<DrumKit, KitSettings> = {
  boombap: {
    kick: { note: 48, pitchDecay: 0.035, octaves: 5, decay: 0.32 },
    snare: { noise: "white", decay: 0.16, frequency: 1900, q: 0.6, body: 0.6, bodyNote: 185 },
    hat: { decay: 0.045, frequency: 7500, gain: 0.25 },
  },
  // Soft and dry, like brushes on a jazz kit.
  brushes: {
    kick: { note: 55, pitchDecay: 0.02, octaves: 3, decay: 0.22 },
    snare: { noise: "pink", decay: 0.34, frequency: 1200, q: 0.4, body: 0.2, bodyNote: 170 },
    hat: { decay: 0.09, frequency: 5200, gain: 0.18 },
  },
  // A long, low 808-style kick and a tight, bright snare.
  deep: {
    kick: { note: 38, pitchDecay: 0.08, octaves: 6, decay: 0.85 },
    snare: { noise: "white", decay: 0.11, frequency: 2800, q: 1, body: 0.8, bodyNote: 220 },
    hat: { decay: 0.03, frequency: 9000, gain: 0.3 },
  },
};

/** Kick, snare and hat, all synthesized (pitch-swept sine, filtered noise), in one of a few kits. */
export class Drums implements Instrument {
  readonly output = new Tone.Gain(0.9);
  private kit = KITS.boombap;
  private readonly kick = new Tone.MembraneSynth({ envelope: { attack: 0.001, sustain: 0, release: 0.1 } });
  private readonly snareNoise = new Tone.NoiseSynth({ envelope: { attack: 0.001, sustain: 0, release: 0.05 } });
  private readonly snareFilter = new Tone.Filter({ type: "bandpass" });
  private readonly snareBody = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.03 },
  });
  private readonly hat = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, sustain: 0, release: 0.01 } });
  private readonly hatFilter = new Tone.Filter({ type: "highpass", Q: 0.5 });

  constructor() {
    this.kick.connect(this.output);
    this.snareNoise.chain(this.snareFilter, this.output);
    this.snareBody.connect(this.output);
    this.hat.chain(this.hatFilter, this.output);
  }

  apply({ kit, kick, snare, hat }: DrumsParams) {
    const k = KITS[kit];
    this.kit = k;
    this.kick.set({ pitchDecay: k.kick.pitchDecay, octaves: k.kick.octaves, envelope: { decay: k.kick.decay } });
    this.snareNoise.set({ noise: { type: k.snare.noise }, envelope: { decay: k.snare.decay } });
    this.snareFilter.set({ frequency: k.snare.frequency, Q: k.snare.q });
    this.hat.set({ envelope: { decay: k.hat.decay } });
    this.hatFilter.frequency.value = k.hat.frequency;

    this.kick.volume.value = db(kick);
    this.snareNoise.volume.value = db(snare);
    this.snareBody.volume.value = db(snare * k.snare.body);
    this.hat.volume.value = db(hat * k.hat.gain);
  }

  playKick(time: number, velocity: number) {
    this.kick.triggerAttackRelease(this.kit.kick.note, this.kit.kick.decay, time, velocity);
  }

  playSnare(time: number, velocity: number) {
    this.snareNoise.triggerAttackRelease(this.kit.snare.decay * 0.9, time, velocity);
    this.snareBody.triggerAttackRelease(this.kit.snare.bodyNote, 0.08, time, velocity);
  }

  playHat(time: number, velocity: number) {
    this.hat.triggerAttackRelease(this.kit.hat.decay * 0.9, time, velocity);
  }

  dispose() {
    const nodes = [this.kick, this.snareNoise, this.snareFilter, this.snareBody, this.hat, this.hatFilter, this.output];
    for (const node of nodes) node.dispose();
  }
}

const PAD_OSCILLATORS: Record<PadVoice, { oscillator: PadSettings["oscillator"]; octave: number }> = {
  warm: { oscillator: { type: "fattriangle", count: 3, spread: 18 }, octave: 0 },
  strings: { oscillator: { type: "fatsawtooth", count: 3, spread: 28 }, octave: 0 },
  air: { oscillator: { type: "fatsine", count: 3, spread: 12 }, octave: 1 },
};

/** Long chords that swell in under the keys, one per bar. */
export class Pad implements Instrument {
  readonly output = new Tone.Gain(0);
  private readonly synth = new Tone.PolySynth(Tone.Synth);
  private readonly filter = new Tone.Filter({ type: "lowpass", frequency: 1800, Q: 0.3, rolloff: -24 });
  private voice: PadVoice = "warm";
  level = 0;

  constructor() {
    this.synth.maxPolyphony = 12;
    this.synth.chain(this.filter, this.output);
  }

  /** The pad's register: the airy voice sits an octave up. */
  get octave() {
    return PAD_OSCILLATORS[this.voice].octave;
  }

  apply({ level, voice, attack, cutoff }: PadParams) {
    if (voice !== this.voice) this.synth.releaseAll();
    this.voice = voice;
    this.level = level;
    this.output.gain.rampTo(level * 0.5, 0.05);
    this.filter.frequency.rampTo(cutoff, 0.1);
    this.synth.set({
      oscillator: PAD_OSCILLATORS[voice].oscillator,
      envelope: { attack, decay: 0.6, sustain: 0.85, release: Math.max(1.2, attack) },
    });
  }

  play(frequencies: number[], seconds: number, time: number) {
    this.synth.triggerAttackRelease(frequencies, seconds, time, 0.5);
  }

  releaseAll() {
    this.synth.releaseAll();
  }

  dispose() {
    this.synth.releaseAll();
    for (const node of [this.synth, this.filter, this.output]) node.dispose();
  }
}

const LEAD_VOICES: Record<LeadVoice, { voice: () => Voice; vibrato: number; cutoff: number }> = {
  flute: {
    voice: () => partialsVoice([1, 0.08, 0.03], () => ({ attack: 0.07, decay: 0.2, sustain: 0.7, release: 0.35 }), 4),
    vibrato: 0.12,
    cutoff: 4200,
  },
  musicbox: {
    voice: () =>
      fmVoice(
        {
          harmonicity: 5,
          modulationIndex: 4,
          envelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 1 },
          modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 },
        },
        6,
      ),
    vibrato: 0,
    cutoff: 6000,
  },
  square: {
    voice: () => partialsVoice([1, 0, 0.33, 0, 0.2, 0, 0.14], () => ({ attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.25 }), 4),
    vibrato: 0.05,
    cutoff: 2200,
  },
};

/** A single-line melody with a tempo-synced echo. */
export class Lead implements Instrument {
  readonly output = new Tone.Gain(0);
  private voice: Voice | undefined;
  private voiceId: LeadVoice | undefined;
  private readonly filter = new Tone.Filter({ type: "lowpass", frequency: 4000, Q: 0.5 });
  private readonly vibrato = new Tone.Vibrato({ frequency: 5, depth: 0.1 });
  private readonly echo = new Tone.FeedbackDelay({ delayTime: 0.3, feedback: 0.35, wet: 0 });
  level = 0;

  constructor() {
    this.filter.chain(this.vibrato, this.echo, this.output);
  }

  apply({ level, voice, echo }: LeadParams) {
    const settings = LEAD_VOICES[voice];
    if (voice !== this.voiceId) {
      this.voice?.dispose();
      this.voice = settings.voice();
      this.voice.node.connect(this.filter);
      // The lead's voices ignore the ADSR: their shape is part of their character.
      this.voice.shape({ attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 }, "sine");
      this.voiceId = voice;
    }
    this.level = level;
    this.output.gain.rampTo(level * 0.6, 0.05);
    this.filter.frequency.rampTo(settings.cutoff, 0.1);
    this.vibrato.depth.value = settings.vibrato;
    this.echo.wet.value = echo * 0.5;
  }

  /** The echo lands on the dotted eighth, whatever the tempo. */
  setTempo(bpm: number) {
    this.echo.delayTime.rampTo((60 / bpm) * 0.75, 0.1);
  }

  play(frequency: number, seconds: number, time: number, velocity: number) {
    this.voice?.play(frequency, seconds, time, velocity);
  }

  dispose() {
    this.voice?.dispose();
    for (const node of [this.filter, this.vibrato, this.echo, this.output]) node.dispose();
  }
}
