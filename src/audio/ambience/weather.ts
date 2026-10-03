import * as Tone from "tone";
import { chimeMidi, midiToHz } from "../music";
import { generateBubbles, generateDroplets } from "../noise";
import type { Chord } from "../types";
import { AmbienceLayer, between, chance, disposeAll, everySeconds, loopBuffer, sampleRate, type Teardown } from "./layer";

/** Floor for exponential ramps, which cannot reach zero. */
const SILENT = 0.0001;

/** Rain: filtered pink noise for the wash, soft droplets for the patter. */
export class Rain extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 0.9;
  }

  protected start(output: Tone.Gain): Teardown {
    const wash = new Tone.Noise("pink");
    const washFilter = new Tone.Filter({ type: "bandpass", frequency: 2600, Q: 0.35 });
    const washGain = new Tone.Gain(0.55);
    wash.chain(washFilter, washGain, output);
    wash.start();

    // The low-pass takes the sharp edge off the droplets: rain should patter, not crackle.
    const patterHigh = new Tone.Filter({ type: "highpass", frequency: 1600 });
    const patterLow = new Tone.Filter({ type: "lowpass", frequency: 9000, rolloff: -12 });
    const patterGain = new Tone.Gain(0.6);
    patterHigh.chain(patterLow, patterGain, output);
    const patter = loopBuffer(generateDroplets({ seconds: 6, sampleRate: sampleRate(), density: 110 }), patterHigh);

    return () => {
      patter();
      disposeAll(wash, washFilter, washGain, patterHigh, patterLow, patterGain)();
    };
  }
}

/** Wind: brown noise through a band-pass whose center and loudness drift slowly (two LFOs). */
export class Wind extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 1.4;
  }

  protected start(output: Tone.Gain): Teardown {
    const noise = new Tone.Noise("brown");
    const filter = new Tone.Filter({ type: "bandpass", frequency: 500, Q: 1.2 });
    const swell = new Tone.Gain(0.7);
    const sweep = new Tone.LFO({ frequency: 0.07, min: 260, max: 900, type: "sine" });
    const gust = new Tone.LFO({ frequency: 0.11, min: 0.25, max: 1, type: "sine" });
    noise.chain(filter, swell, output);
    sweep.connect(filter.frequency);
    gust.connect(swell.gain);
    noise.start();
    sweep.start();
    gust.start();
    return disposeAll(noise, filter, swell, sweep, gust);
  }
}

/**
 * Distant thunder: a low rumble that rolls in a few swells and dies away, every 20 to 50 seconds
 * (the first one soon after the layer is turned on). Nearer strikes are louder and brighter.
 */
export class Thunder extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 1.2;
  }

  protected start(output: Tone.Gain): Teardown {
    const noise = new Tone.Noise("brown");
    const filter = new Tone.Filter({ type: "lowpass", frequency: 200, rolloff: -24 });
    const envelope = new Tone.Gain(0);
    noise.chain(filter, envelope, output);
    noise.start();

    let next = Tone.now() + between(3, 8);
    const strike = (time: number) => {
      const near = Math.random();
      const peak = 0.35 + near * 0.65;
      const gain = envelope.gain;
      gain.cancelScheduledValues(time);
      gain.setValueAtTime(SILENT, time);
      // Two or three swells, each fainter than the last.
      let at = time;
      const swells = 2 + Math.floor(Math.random() * 2);
      for (let s = 0; s < swells; s++) {
        const level = peak * 0.6 ** s;
        at += s === 0 ? between(0.08, 0.5) : between(0.7, 1.6);
        gain.exponentialRampToValueAtTime(level, at);
        gain.exponentialRampToValueAtTime(level * 0.3, at + between(0.6, 1.2));
      }
      gain.exponentialRampToValueAtTime(SILENT, at + between(3, 6));
      filter.frequency.cancelScheduledValues(time);
      filter.frequency.setValueAtTime(300 + near * 900, time);
      filter.frequency.exponentialRampToValueAtTime(110, time + 3);
    };
    const stopClock = everySeconds(0.5, (time) => {
      if (time < next) return;
      strike(time);
      next = time + between(20, 50);
    });

    return () => {
      stopClock();
      disposeAll(noise, filter, envelope)();
    };
  }
}

/** Ocean waves: each one rises as its filter opens, breaks, then washes back, every 7 to 13 seconds. */
export class Waves extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 0.9;
  }

  protected start(output: Tone.Gain): Teardown {
    const noise = new Tone.Noise("pink");
    const filter = new Tone.Filter({ type: "lowpass", frequency: 500, Q: 0.6 });
    const envelope = new Tone.Gain(0.12);
    // The far surf: always there under the waves.
    const surf = new Tone.Noise("brown");
    const surfFilter = new Tone.Filter({ type: "lowpass", frequency: 350 });
    const surfGain = new Tone.Gain(0.25);
    noise.chain(filter, envelope, output);
    surf.chain(surfFilter, surfGain, output);
    noise.start();
    surf.start();

    let next = Tone.now() + 0.2;
    const wave = (time: number) => {
      const rise = between(2.5, 4);
      const peak = between(0.55, 1);
      const gain = envelope.gain;
      const frequency = filter.frequency;
      gain.cancelScheduledValues(time);
      frequency.cancelScheduledValues(time);
      gain.setValueAtTime(0.12, time);
      frequency.setValueAtTime(450, time);
      gain.exponentialRampToValueAtTime(peak, time + rise);
      frequency.exponentialRampToValueAtTime(between(1800, 2800), time + rise);
      gain.exponentialRampToValueAtTime(peak * 0.4, time + rise + 1.2);
      gain.exponentialRampToValueAtTime(0.12, time + rise + 4);
      frequency.exponentialRampToValueAtTime(450, time + rise + 4.5);
      return rise + between(4, 8);
    };
    const stopClock = everySeconds(0.5, (time) => {
      if (time < next) return;
      next = time + wave(time);
    });

    return () => {
      stopClock();
      disposeAll(noise, filter, envelope, surf, surfFilter, surfGain)();
    };
  }
}

/** A babbling stream: bubbles over a soft flow of water. */
export class Stream extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 1.2;
  }

  protected start(output: Tone.Gain): Teardown {
    const flow = new Tone.Noise("pink");
    const flowFilter = new Tone.Filter({ type: "bandpass", frequency: 900, Q: 0.5 });
    const flowGain = new Tone.Gain(0.18);
    flow.chain(flowFilter, flowGain, output);
    flow.start();

    const bubbleFilter = new Tone.Filter({ type: "highpass", frequency: 300 });
    const bubbleGain = new Tone.Gain(0.8);
    bubbleFilter.chain(bubbleGain, output);
    const bubbles = loopBuffer(generateBubbles({ seconds: 11, sampleRate: sampleRate(), density: 40 }), bubbleFilter);

    return () => {
      bubbles();
      disposeAll(flow, flowFilter, flowGain, bubbleFilter, bubbleGain)();
    };
  }
}

/**
 * Wind chimes: metallic notes on the tones of the chord being played (so they are always in
 * tune), struck in little clusters. They ring more often the stronger the wind layer blows.
 */
export class Chimes extends AmbienceLayer {
  private notes: number[] = [84, 88, 91, 95];
  private wind = 0;

  protected override gainFor(level: number) {
    return level ** 2 * 1;
  }

  override setChord(chord: Chord, transpose: number) {
    this.notes = chimeMidi(chord).map((midi) => midi + transpose);
  }

  override setSurroundings(levels: Readonly<Record<string, number>>) {
    this.wind = levels.wind ?? 0;
  }

  protected start(output: Tone.Gain): Teardown {
    const synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.5,
      modulationIndex: 7,
      envelope: { attack: 0.002, decay: 3, sustain: 0, release: 1.8 },
      modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.5 },
    });
    synth.maxPolyphony = this.lowPower ? 6 : 10;
    const filter = new Tone.Filter({ type: "highpass", frequency: 700 });
    synth.chain(filter, output);

    const strike = (time: number) => {
      const count = 1 + Math.floor(Math.random() * 3);
      let at = time;
      for (let i = 0; i < count; i++) {
        const midi = this.notes[Math.floor(Math.random() * this.notes.length)] ?? 84;
        synth.triggerAttackRelease(midiToHz(midi), 1.2, at, between(0.15, 0.5));
        at += between(0.06, 0.3);
      }
    };
    const stopClock = everySeconds(0.25, (time, interval) => {
      if (chance(0.12 + this.wind * 0.5, interval)) strike(time + Math.random() * interval);
    });

    return () => {
      stopClock();
      synth.releaseAll();
      disposeAll(synth, filter)();
    };
  }
}
