import * as Tone from "tone";
import { Rain, Vinyl, Wind } from "./ambience";
import { Bass, Drums, Keys, Lead, Pad } from "./instruments";
import { bassFrequency, chordFrequencies, leadMidi, midiToHz } from "./music";
import { STEPS, type EngineParams } from "./types";

/** Every node the engine owns, created together on first play and disposed together. */
interface Graph {
  keys: Keys;
  bass: Bass;
  drums: Drums;
  pad: Pad;
  lead: Lead;
  rain: Rain;
  vinyl: Vinyl;
  wind: Wind;
  mix: Tone.Gain;
  reverb: Tone.Reverb;
  warmth: Tone.Distortion;
  tone: Tone.Filter;
  wobble: Tone.Vibrato;
  compressor: Tone.Compressor;
  master: Tone.Gain;
  limiter: Tone.Limiter;
  loop: Tone.Loop;
}

const FADE_SECONDS = 0.3;
const SHUTDOWN_STEP_MS = 450;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Slider position to output gain. */
const masterGain = (volume: number) => volume ** 2;

/**
 * Owns the AudioContext and all the sound. It knows nothing about React or the UI store:
 * callers push an immutable `EngineParams` snapshot with `update()`.
 *
 * Lifecycle: nothing is created until the first `play()` (browsers require a user gesture).
 * `stop()` fades out, halts the transport and the noise sources, then suspends the context so
 * an idle studio uses no CPU. `dispose()` releases every node and closes the context.
 */
export class AudioEngine {
  private graph: Graph | undefined;
  private building: Promise<Graph> | undefined;
  private params: EngineParams | undefined;
  private playing = false;
  private counter = 0;
  private shutdownTimer: ReturnType<typeof setTimeout> | undefined;
  private stepListener: ((step: number, bar: number) => void) | undefined;
  private playingListener: ((playing: boolean) => void) | undefined;
  private removeStateListener: (() => void) | undefined;

  get isPlaying() {
    return this.playing;
  }

  onStep(listener: ((step: number, bar: number) => void) | undefined) {
    this.stepListener = listener;
  }

  onPlayingChange(listener: ((playing: boolean) => void) | undefined) {
    this.playingListener = listener;
  }

  /** Starts the loop over from the first step of the first bar (a new song began). */
  restartLoop() {
    this.counter = 0;
  }

  /** Applies a new snapshot; only the parts that changed by reference touch the audio graph. */
  update(next: EngineParams) {
    const prev = this.params;
    this.params = next;
    if (this.graph) this.apply(this.graph, next, prev);
  }

  async play() {
    if (!this.params) throw new Error("AudioEngine.update() must be called before play().");
    clearTimeout(this.shutdownTimer);
    const graph = await this.ensureGraph();
    await Tone.getContext().resume();
    // A stop() may have been requested while the context was starting.
    if (this.playing) return;

    this.playing = true;
    this.counter = 0;
    for (const layer of [graph.rain, graph.vinyl, graph.wind]) layer.setRunning(true);
    Tone.getTransport().start("+0.05");
    graph.master.gain.cancelScheduledValues(Tone.now());
    graph.master.gain.rampTo(masterGain(this.params.volume), FADE_SECONDS);
    this.playingListener?.(true);
  }

  stop() {
    const graph = this.graph;
    if (!graph || !this.playing) return;
    this.playing = false;
    this.playingListener?.(false);
    graph.master.gain.rampTo(0, FADE_SECONDS);

    // Once faded: halt the transport and sources, then suspend the context.
    this.shutdownTimer = setTimeout(() => {
      Tone.getTransport().stop();
      graph.keys.releaseAll();
      graph.pad.releaseAll();
      for (const layer of [graph.rain, graph.vinyl, graph.wind]) layer.setRunning(false);
      this.shutdownTimer = setTimeout(() => {
        if (!this.playing) void (Tone.getContext().rawContext as AudioContext).suspend();
      }, SHUTDOWN_STEP_MS);
    }, SHUTDOWN_STEP_MS);
  }

  async dispose() {
    clearTimeout(this.shutdownTimer);
    this.removeStateListener?.();
    this.removeStateListener = undefined;
    this.playing = false;
    const graph = this.graph ?? (await this.building?.catch(() => undefined));
    this.graph = undefined;
    this.building = undefined;
    if (!graph) return;

    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    graph.loop.dispose();
    graph.keys.dispose();
    graph.bass.dispose();
    graph.drums.dispose();
    graph.pad.dispose();
    graph.lead.dispose();
    graph.rain.dispose();
    graph.vinyl.dispose();
    graph.wind.dispose();
    for (const node of [graph.mix, graph.reverb, graph.warmth, graph.tone, graph.wobble, graph.compressor, graph.master, graph.limiter]) {
      node.dispose();
    }
    await Tone.getContext().dispose();
  }

  private ensureGraph(): Promise<Graph> {
    if (this.graph) return Promise.resolve(this.graph);
    this.building ??= this.build().finally(() => {
      this.building = undefined;
    });
    return this.building;
  }

  private async build(): Promise<Graph> {
    // "playback" trades a little latency for lower CPU: right for a background music app.
    Tone.setContext(new Tone.Context({ latencyHint: "playback" }));
    await Tone.start();

    const keys = new Keys();
    const bass = new Bass();
    const drums = new Drums();
    const pad = new Pad();
    const lead = new Lead();
    const rain = new Rain();
    const vinyl = new Vinyl();
    const wind = new Wind();

    const mix = new Tone.Gain(1);
    const reverb = new Tone.Reverb({ decay: 2.4, preDelay: 0.02, wet: 0.2 });
    const warmth = new Tone.Distortion({ distortion: 0.35, wet: 0, oversample: "2x" });
    const tone = new Tone.Filter({ type: "lowpass", frequency: 6000, Q: 0.5, rolloff: -12 });
    const wobble = new Tone.Vibrato({ frequency: 0.55, depth: 0, wet: 0 });
    const compressor = new Tone.Compressor(-20, 3);
    const master = new Tone.Gain(0);
    const limiter = new Tone.Limiter(-1);

    // Music runs through the lo-fi chain; ambience joins after it so rain keeps its highs.
    for (const instrument of [keys, bass, drums, pad, lead]) instrument.output.connect(mix);
    mix.chain(reverb, warmth, tone, wobble, compressor, master);
    for (const layer of [rain, vinyl, wind]) layer.output.connect(master);
    master.chain(limiter, Tone.getDestination());
    await reverb.generate();

    const transport = Tone.getTransport();
    transport.swingSubdivision = "16n";
    const loop = new Tone.Loop((time) => this.tick(time), "16n").start(0);

    const graph: Graph = { keys, bass, drums, pad, lead, rain, vinyl, wind, mix, reverb, warmth, tone, wobble, compressor, master, limiter, loop };
    this.graph = graph;
    if (this.params) this.apply(graph, this.params, undefined);

    // If the OS interrupts audio (device change, sleep), reflect it instead of pretending to play.
    const raw = Tone.getContext().rawContext;
    const onState = () => {
      if (this.playing && raw.state !== "running") this.stop();
    };
    raw.addEventListener("statechange", onState);
    this.removeStateListener = () => raw.removeEventListener("statechange", onState);
    return graph;
  }

  private apply(graph: Graph, next: EngineParams, prev: EngineParams | undefined) {
    const transport = Tone.getTransport();
    if (next.bpm !== prev?.bpm) {
      transport.bpm.value = next.bpm;
      graph.lead.setTempo(next.bpm);
    }
    if (next.swing !== prev?.swing) transport.swing = next.swing * 0.6;
    if (next.volume !== prev?.volume && this.playing) graph.master.gain.rampTo(masterGain(next.volume), 0.05);

    if (next.fx !== prev?.fx) {
      const { tone, wobble, warmth, reverb } = next.fx;
      graph.tone.frequency.rampTo(tone, 0.1);
      graph.wobble.depth.value = wobble * 0.3;
      graph.wobble.wet.value = wobble > 0 ? 1 : 0;
      graph.warmth.wet.value = warmth * 0.5;
      graph.reverb.wet.value = reverb;
    }
    if (next.keys !== prev?.keys) graph.keys.apply(next.keys);
    if (next.bass !== prev?.bass) graph.bass.apply(next.bass);
    if (next.drums !== prev?.drums) graph.drums.apply(next.drums);
    if (next.pad !== prev?.pad) graph.pad.apply(next.pad);
    if (next.lead !== prev?.lead) graph.lead.apply(next.lead);
    if (next.ambience !== prev?.ambience) {
      graph.rain.setLevel(next.ambience.rain);
      graph.vinyl.setLevel(next.ambience.vinyl);
      graph.wind.setLevel(next.ambience.wind);
    }
  }

  /** One 16th note. Reads the latest params every time, so edits are heard on the next step. */
  private tick(time: number) {
    const graph = this.graph;
    const p = this.params;
    if (!graph || !p) return;

    const step = this.counter % STEPS;
    const bar = Math.floor(this.counter / STEPS) % Math.max(1, p.progression.length);
    this.counter++;
    const chord = p.progression[bar];
    const stepSeconds = 60 / p.bpm / 4;

    const loose = p.humanize;
    const at = () => time + Math.random() * loose * 0.02;
    const velocity = (base: number) => clamp01(base * (1 - Math.random() * loose * 0.4));
    const on = (track: keyof EngineParams["pattern"]) => p.pattern[track][step];

    if (on("kick")) graph.drums.playKick(at(), velocity(step % 4 === 0 ? 1 : 0.8));
    if (on("snare")) graph.drums.playSnare(at(), velocity(0.9));
    if (on("hat")) graph.drums.playHat(at(), velocity(step % 4 === 0 ? 0.9 : step % 2 === 0 ? 0.6 : 0.35));
    if (chord && on("bass")) graph.bass.play(bassFrequency(chord), stepSeconds * 2, at(), velocity(0.85));
    if (chord && on("keys")) {
      // A small strum: the notes of the chord start a few ms apart, like fingers on keys.
      const strum = 0.008 + loose * 0.02;
      const base = at();
      chordFrequencies(chord).forEach((frequency, i) => {
        graph.keys.play(frequency, stepSeconds * 4, base + i * strum, velocity(0.55 - i * 0.03));
      });
    }
    // The pad holds each chord for the whole bar; silent pads cost nothing.
    if (chord && step === 0 && graph.pad.level > 0.01) {
      graph.pad.play(chordFrequencies(chord, graph.pad.octave), stepSeconds * STEPS * 0.98, time);
    }
    if (chord && on("lead") && graph.lead.level > 0.01) {
      graph.lead.play(midiToHz(leadMidi(chord, step)), stepSeconds * 1.6, at(), velocity(0.7));
    }

    Tone.getDraw().schedule(() => this.stepListener?.(step, bar), time);
  }
}
