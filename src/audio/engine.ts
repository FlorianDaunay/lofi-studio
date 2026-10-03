import * as Tone from "tone";
import { createAmbience, type AmbienceLayer } from "./ambience";
import { Bass, Drums, Keys, Lead, Pad } from "./instruments";
import { bassFrequency, chordFrequencies, leadMidi, midiToHz } from "./music";
import { AMBIENCE_LAYERS, STEPS, type AmbienceLayerId, type EngineParams } from "./types";

/** Every node the engine owns, created together on first play and disposed together. */
interface Graph {
  keys: Keys;
  bass: Bass;
  drums: Drums;
  pad: Pad;
  lead: Lead;
  ambience: Record<AmbienceLayerId, AmbienceLayer>;
  /** The pitched instruments, which duck under the kick when "pump" is up. */
  pump: Tone.Gain;
  mix: Tone.Gain;
  reverb: Tone.Reverb;
  warmth: Tone.Distortion;
  crusher: Tone.WaveShaper;
  crush: Tone.CrossFade;
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
/** Bit depth of the crusher: from a barely-there 12 bits down to a gritty 3. */
const crushBits = (crush: number) => 12 - crush * 9;

/**
 * Owns the AudioContext and all the sound. It knows nothing about React or the UI store:
 * callers push an immutable `EngineParams` snapshot with `update()`.
 *
 * Lifecycle: nothing is created until the first `play()` (browsers require a user gesture).
 * `stop()` fades out, halts the transport and the noise sources, then suspends the context so
 * an idle studio uses no CPU. `dispose()` releases every node and closes the context.
 */
export interface EngineOptions {
  /**
   * Phones: a lighter graph (32 kHz, fewer voices, cheaper reverb and saturation) and a longer
   * scheduling window, so neither a busy audio thread nor a janky page makes the sound crackle.
   */
  lowPower?: boolean;
}

/** The step being heard: `loop` counts the loops completed since the song started. */
export type StepListener = (step: number, bar: number, loop: number) => void;

export class AudioEngine {
  constructor(private readonly options: EngineOptions = {}) {}

  private graph: Graph | undefined;
  private building: Promise<Graph> | undefined;
  private params: EngineParams | undefined;
  private playing = false;
  private counter = 0;
  /** Loops completed since `play()` or `restartLoop()`. */
  private loop = 0;
  /** Audio time at which the first step of the current song sounded. */
  private songStart = 0;
  private shutdownTimer: ReturnType<typeof setTimeout> | undefined;
  /** Set while fading out before a stop (the sleep timer). */
  private fadeTimer: ReturnType<typeof setTimeout> | undefined;
  private stepListener: StepListener | undefined;
  private playingListener: ((playing: boolean) => void) | undefined;
  private readonly loopEndListeners = new Set<(loops: number) => void>();
  private removeStateListener: (() => void) | undefined;

  get isPlaying() {
    return this.playing;
  }

  /**
   * Seconds of audio rendered so far. It stands still while the context is suspended (stopped,
   * or the computer asleep), so differences of it are exactly the time the music was heard.
   */
  get audioTime(): number {
    return this.graph ? Tone.getContext().currentTime : 0;
  }

  /** Seconds of the current song heard so far (since `play()` or `restartLoop()`); 0 when stopped. */
  get songTime(): number {
    return this.playing && this.graph ? Math.max(0, Tone.getContext().currentTime - this.songStart) : 0;
  }

  /**
   * The step being heard, for the UI. It is delivered on animation frames, so set it to
   * `undefined` while the page is hidden: frames stop there and would only pile up.
   */
  onStep(listener: StepListener | undefined) {
    this.stepListener = listener;
  }

  /**
   * Calls `listener` as the last step of the progression is scheduled, on the audio clock: unlike
   * `onStep`, it keeps firing while the page is hidden (app in the background, window in the tray).
   * It receives the number of loops completed since the song started. Returns a function that
   * removes the listener.
   */
  addLoopEndListener(listener: (loops: number) => void): () => void {
    this.loopEndListeners.add(listener);
    return () => this.loopEndListeners.delete(listener);
  }

  onPlayingChange(listener: ((playing: boolean) => void) | undefined) {
    this.playingListener = listener;
  }

  /** Starts the loop over from the first step of the first bar (a new song began). */
  restartLoop() {
    this.counter = 0;
    this.loop = 0;
    // The next tick sets the exact time; until then, the song starts about now.
    if (this.graph) this.songStart = Tone.getContext().currentTime + Tone.getContext().lookAhead;
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
    this.cancelFade();
    const graph = await this.ensureGraph();
    await Tone.getContext().resume();
    // A stop() may have been requested while the context was starting.
    if (this.playing) return;

    this.playing = true;
    this.restartLoop();
    for (const layer of Object.values(graph.ambience)) layer.setRunning(true);
    Tone.getTransport().start("+0.05");
    graph.master.gain.cancelScheduledValues(Tone.now());
    graph.master.gain.rampTo(masterGain(this.params.volume), FADE_SECONDS);
    this.playingListener?.(true);
  }

  stop() {
    const graph = this.graph;
    if (!graph || !this.playing) return;
    this.cancelFade();
    this.playing = false;
    this.playingListener?.(false);
    graph.master.gain.rampTo(0, FADE_SECONDS);

    // Once faded: halt the transport and sources, then suspend the context.
    this.shutdownTimer = setTimeout(() => {
      Tone.getTransport().stop();
      graph.keys.releaseAll();
      graph.pad.releaseAll();
      for (const layer of Object.values(graph.ambience)) layer.setRunning(false);
      this.shutdownTimer = setTimeout(() => {
        if (!this.playing) void (Tone.getContext().rawContext as AudioContext).suspend();
      }, SHUTDOWN_STEP_MS);
    }, SHUTDOWN_STEP_MS);
  }

  /** Fades the music out over `seconds`, then stops: the end of a sleep timer. Playing or stopping cancels it. */
  fadeOut(seconds: number) {
    const graph = this.graph;
    if (!graph || !this.playing || this.fadeTimer !== undefined) return;
    graph.master.gain.cancelScheduledValues(Tone.now());
    graph.master.gain.rampTo(0, seconds);
    this.fadeTimer = setTimeout(() => {
      this.fadeTimer = undefined;
      this.stop();
    }, seconds * 1000);
  }

  private cancelFade() {
    clearTimeout(this.fadeTimer);
    this.fadeTimer = undefined;
  }

  async dispose() {
    clearTimeout(this.shutdownTimer);
    this.cancelFade();
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
    for (const instrument of [graph.keys, graph.bass, graph.drums, graph.pad, graph.lead, ...Object.values(graph.ambience)]) instrument.dispose();
    const nodes = [graph.pump, graph.mix, graph.reverb, graph.warmth, graph.crusher, graph.crush, graph.tone, graph.wobble, graph.compressor, graph.master, graph.limiter];
    for (const node of nodes) node.dispose();
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
    const lowPower = this.options.lowPower === true;
    // The master low-pass keeps everything under ~12 kHz anyway: 32 kHz loses nothing audible and saves a third of the work.
    const audioContext = new AudioContext({ latencyHint: "playback", ...(lowPower ? { sampleRate: 32000 } : {}) });
    Tone.setContext(new Tone.Context({ context: audioContext, lookAhead: lowPower ? 0.3 : 0.1 }));
    await Tone.start();

    const keys = new Keys(lowPower);
    const bass = new Bass();
    const drums = new Drums();
    const pad = new Pad(lowPower);
    const lead = new Lead();
    const ambience = createAmbience(lowPower);

    const pump = new Tone.Gain(1);
    const mix = new Tone.Gain(1);
    const reverb = new Tone.Reverb({ decay: lowPower ? 1.6 : 2.4, preDelay: 0.02, wet: 0.2 });
    const warmth = new Tone.Distortion({ distortion: 0.35, wet: 0, oversample: lowPower ? "none" : "2x" });
    // Bit reduction from a plain wave shaper: unlike Tone's BitCrusher it needs no audio worklet, so it is cheap on phones.
    const crusher = new Tone.WaveShaper(undefined, 4096);
    const crush = new Tone.CrossFade(0);
    const tone = new Tone.Filter({ type: "lowpass", frequency: 6000, Q: 0.5, rolloff: -12 });
    const wobble = new Tone.Vibrato({ frequency: 0.55, depth: 0, wet: 0 });
    const compressor = new Tone.Compressor(-20, 3);
    const master = new Tone.Gain(0);
    const limiter = new Tone.Limiter(-1);

    // Music runs through the lo-fi chain; ambience joins after it so rain keeps its highs.
    for (const instrument of [keys, bass, pad, lead]) instrument.output.connect(pump);
    pump.connect(mix);
    drums.output.connect(mix);
    mix.chain(reverb, warmth);
    warmth.connect(crush.a);
    warmth.chain(crusher, crush.b);
    crush.chain(tone, wobble, compressor, master);
    for (const layer of Object.values(ambience)) layer.output.connect(master);
    master.chain(limiter, Tone.getDestination());
    await reverb.generate();

    const transport = Tone.getTransport();
    transport.swingSubdivision = "16n";
    const loop = new Tone.Loop((time) => this.tick(time), "16n").start(0);

    const graph: Graph = { keys, bass, drums, pad, lead, ambience, pump, mix, reverb, warmth, crusher, crush, tone, wobble, compressor, master, limiter, loop };
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
    // During a sleep fade the volume stays on its way down.
    if (next.volume !== prev?.volume && this.playing && this.fadeTimer === undefined) graph.master.gain.rampTo(masterGain(next.volume), 0.05);

    if (next.fx !== prev?.fx) {
      const { tone, wobble, warmth, reverb, crush, pump } = next.fx;
      graph.tone.frequency.rampTo(tone, 0.1);
      graph.wobble.depth.value = wobble * 0.3;
      graph.wobble.wet.value = wobble > 0 ? 1 : 0;
      graph.warmth.wet.value = warmth * 0.5;
      graph.reverb.wet.value = reverb;
      if (crush !== prev?.fx.crush) {
        const steps = 2 ** (crushBits(crush) - 1);
        graph.crusher.setMap((x) => Math.round(x * steps) / steps, 4096);
        graph.crush.fade.rampTo(Math.min(1, crush * 3), 0.05);
      }
      if (pump === 0) graph.pump.gain.rampTo(1, 0.05);
    }
    if (next.keys !== prev?.keys) graph.keys.apply(next.keys);
    if (next.bass !== prev?.bass) graph.bass.apply(next.bass);
    if (next.drums !== prev?.drums) graph.drums.apply(next.drums);
    if (next.pad !== prev?.pad) graph.pad.apply(next.pad);
    if (next.lead !== prev?.lead) graph.lead.apply(next.lead);
    if (next.ambience !== prev?.ambience) {
      for (const id of AMBIENCE_LAYERS) {
        graph.ambience[id].setLevel(next.ambience[id]);
        graph.ambience[id].setSurroundings(next.ambience);
      }
    }
  }

  /** The music ducks under the kick and swells back within the beat: the "pumping" of chillhop. */
  private duck(graph: Graph, time: number, amount: number, bpm: number) {
    const gain = graph.pump.gain;
    gain.cancelScheduledValues(time);
    gain.setTargetAtTime(1 - amount * 0.7, time, 0.004);
    gain.setTargetAtTime(1, time + 0.03, (60 / bpm) * 0.15);
  }

  /** One 16th note. Reads the latest params every time, so edits are heard on the next step. */
  private tick(time: number) {
    const graph = this.graph;
    const p = this.params;
    if (!graph || !p) return;

    if (this.counter === 0) this.songStart = time;
    const step = this.counter % STEPS;
    const bar = Math.floor(this.counter / STEPS) % Math.max(1, p.progression.length);
    const loop = this.loop;
    this.counter++;
    const chord = p.progression[bar];
    const stepSeconds = 60 / p.bpm / 4;
    // Transposing scales every pitch: the chords keep their register instead of wrapping around an octave.
    const pitch = 2 ** (p.transpose / 12);

    const loose = p.humanize;
    const at = () => time + Math.random() * loose * 0.02;
    const velocity = (base: number) => clamp01(base * (1 - Math.random() * loose * 0.4));
    const on = (track: keyof EngineParams["pattern"]) => p.pattern[track][step];

    if (on("kick")) {
      const kickTime = at();
      graph.drums.playKick(kickTime, velocity(step % 4 === 0 ? 1 : 0.8));
      if (p.fx.pump > 0) this.duck(graph, kickTime, p.fx.pump, p.bpm);
    }
    if (on("snare")) graph.drums.playSnare(at(), velocity(0.9));
    if (on("hat")) graph.drums.playHat(at(), velocity(step % 4 === 0 ? 0.9 : step % 2 === 0 ? 0.6 : 0.35));
    if (on("perc") && p.drums.perc > 0) graph.drums.playPerc(at(), velocity(step % 4 === 0 ? 0.9 : 0.7), step);
    if (chord && on("bass")) graph.bass.play(bassFrequency(chord) * pitch, stepSeconds * 2, at(), velocity(0.85));
    if (chord && on("keys")) {
      // A small strum: the notes of the chord start a few ms apart, like fingers on keys.
      const strum = 0.008 + loose * 0.02;
      const base = at();
      chordFrequencies(chord).forEach((frequency, i) => {
        graph.keys.play(frequency * pitch, stepSeconds * 4, base + i * strum, velocity(0.55 - i * 0.03));
      });
    }
    if (chord && step === 0) {
      // The pad holds each chord for the whole bar; silent pads cost nothing.
      if (graph.pad.level > 0.01) {
        graph.pad.play(
          chordFrequencies(chord, graph.pad.octave).map((frequency) => frequency * pitch),
          stepSeconds * STEPS * 0.98,
          time,
        );
      }
      for (const layer of Object.values(graph.ambience)) layer.setChord(chord, p.transpose);
    }
    if (chord && on("lead") && graph.lead.level > 0.01) {
      graph.lead.play(midiToHz(leadMidi(chord, step)) * pitch, stepSeconds * 1.6, at(), velocity(0.7));
    }

    // The loop number travels with the step, so a display never sees the next loop before its last step sounds.
    if (this.stepListener) Tone.getDraw().schedule(() => this.stepListener?.(step, bar, loop), time);
    // Last: a listener may switch songs, which restarts the loop for the next tick.
    if (step === STEPS - 1 && bar === p.progression.length - 1) {
      this.loop++;
      for (const listener of this.loopEndListeners) listener(this.loop);
    }
  }
}
