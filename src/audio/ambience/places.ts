import * as Tone from "tone";
import { generateCrackle, generateTicks } from "../noise";
import { AmbienceLayer, between, disposeAll, everySeconds, loopBuffer, sampleRate, type Teardown } from "./layer";

/** Vinyl: sparse random crackle and pops over a faint hiss, plus a low rumble. */
export class Vinyl extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 0.8;
  }

  protected start(output: Tone.Gain): Teardown {
    const crackleFilter = new Tone.Filter({ type: "highpass", frequency: 900 });
    crackleFilter.connect(output);
    const crackle = loopBuffer(
      generateTicks({ seconds: 9, sampleRate: sampleRate(), density: 7, decayMs: 2.5, popChance: 0.18, hiss: 0.012 }),
      crackleFilter,
    );
    const rumble = new Tone.Noise("brown");
    const rumbleFilter = new Tone.Filter({ type: "lowpass", frequency: 90 });
    const rumbleGain = new Tone.Gain(0.25);
    rumble.chain(rumbleFilter, rumbleGain, output);
    rumble.start();

    return () => {
      crackle();
      disposeAll(crackleFilter, rumble, rumbleFilter, rumbleGain)();
    };
  }
}

/** A fireplace: the low roar of the flames, breathing slowly, under warm crackles and pops. */
export class Fire extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 0.7;
  }

  protected start(output: Tone.Gain): Teardown {
    const roar = new Tone.Noise("brown");
    const roarFilter = new Tone.Filter({ type: "lowpass", frequency: 280 });
    const roarGain = new Tone.Gain(0.5);
    const breath = new Tone.LFO({ frequency: 0.17, min: 0.3, max: 0.6, type: "sine" });
    roar.chain(roarFilter, roarGain, output);
    breath.connect(roarGain.gain);
    roar.start();
    breath.start();

    const crackleFilter = new Tone.Filter({ type: "bandpass", frequency: 2200, Q: 0.5 });
    const crackleGain = new Tone.Gain(0.9);
    crackleFilter.chain(crackleGain, output);
    const crackle = loopBuffer(generateCrackle({ seconds: 9, sampleRate: sampleRate(), density: 16, popChance: 0.1 }), crackleFilter);

    return () => {
      crackle();
      disposeAll(roar, roarFilter, roarGain, breath, crackleFilter, crackleGain)();
    };
  }
}

/** A clock on the wall: tick, tock, locked to the song's beat. */
export class Clock extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 1.5;
  }

  protected start(output: Tone.Gain): Teardown {
    const click = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.022, sustain: 0, release: 0.01 } });
    const body = new Tone.Filter({ type: "bandpass", frequency: 3000, Q: 5 });
    click.chain(body, output);
    let tock = false;
    const loop = new Tone.Loop((time) => {
      body.frequency.setValueAtTime(tock ? 2300 : 3200, time);
      click.triggerAttackRelease(0.02, time, tock ? 0.8 : 1);
      tock = !tock;
    }, "4n").start(0);

    return () => {
      loop.dispose();
      disposeAll(click, body)();
    };
  }
}

/**
 * The city at night: a distant hum of traffic, and now and then a car passing by from one side to
 * the other (it gets brighter as it comes close, then fades away).
 */
export class City extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 0.7;
  }

  protected start(output: Tone.Gain): Teardown {
    const hum = new Tone.Noise("brown");
    const humFilter = new Tone.Filter({ type: "lowpass", frequency: 200 });
    const humGain = new Tone.Gain(0.5);
    hum.chain(humFilter, humGain, output);
    const far = new Tone.Noise("pink");
    const farFilter = new Tone.Filter({ type: "lowpass", frequency: 650 });
    const farGain = new Tone.Gain(0.08);
    far.chain(farFilter, farGain, output);

    const car = new Tone.Noise("pink");
    const carFilter = new Tone.Filter({ type: "bandpass", frequency: 400, Q: 0.7 });
    const pan = new Tone.Panner(0);
    const carGain = new Tone.Gain(0);
    car.chain(carFilter, pan, carGain, output);
    for (const source of [hum, far, car]) source.start();

    let next = Tone.now() + between(2, 6);
    const pass = (time: number) => {
      const half = between(2, 3.5);
      const side = Math.random() < 0.5 ? -1 : 1;
      const peak = between(0.25, 0.55);
      carGain.gain.cancelScheduledValues(time);
      carGain.gain.setValueAtTime(0, time);
      carGain.gain.linearRampToValueAtTime(peak, time + half);
      carGain.gain.linearRampToValueAtTime(0, time + half * 2);
      carFilter.frequency.cancelScheduledValues(time);
      carFilter.frequency.setValueAtTime(350, time);
      carFilter.frequency.exponentialRampToValueAtTime(between(900, 1300), time + half);
      carFilter.frequency.exponentialRampToValueAtTime(300, time + half * 2);
      pan.pan.cancelScheduledValues(time);
      pan.pan.setValueAtTime(-0.8 * side, time);
      pan.pan.linearRampToValueAtTime(0.8 * side, time + half * 2);
      return half * 2;
    };
    const stopClock = everySeconds(0.5, (time) => {
      if (time < next) return;
      next = time + pass(time) + between(5, 18);
    });

    return () => {
      stopClock();
      disposeAll(hum, humFilter, humGain, far, farFilter, farGain, car, carFilter, pan, carGain)();
    };
  }
}

/** A train ride: the cabin's low rumble and the wheels clacking over the rail joints, on the beat. */
export class Train extends AmbienceLayer {
  protected override gainFor(level: number) {
    return level ** 2 * 0.6;
  }

  protected start(output: Tone.Gain): Teardown {
    const rumble = new Tone.Noise("brown");
    const rumbleFilter = new Tone.Filter({ type: "lowpass", frequency: 140 });
    const sway = new Tone.LFO({ frequency: 0.21, min: 100, max: 190, type: "sine" });
    const rumbleGain = new Tone.Gain(0.7);
    rumble.chain(rumbleFilter, rumbleGain, output);
    sway.connect(rumbleFilter.frequency);
    const rattle = new Tone.Noise("pink");
    const rattleFilter = new Tone.Filter({ type: "bandpass", frequency: 450, Q: 1 });
    const rattleGain = new Tone.Gain(0.1);
    rattle.chain(rattleFilter, rattleGain, output);
    rumble.start();
    rattle.start();
    sway.start();

    const clack = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.002, decay: 0.06, sustain: 0, release: 0.02 } });
    const clackFilter = new Tone.Filter({ type: "bandpass", frequency: 1300, Q: 1.4 });
    const thump = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 2, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 } });
    const thumpGain = new Tone.Gain(0.35);
    clack.chain(clackFilter, output);
    thump.chain(thumpGain, output);
    // "Da-dum": the front then the back wheels, a sixteenth apart, twice a bar.
    const loop = new Tone.Loop((time) => {
      const gap = Tone.Time("16n").toSeconds();
      for (const [offset, velocity] of [
        [0, 0.6],
        [gap, 0.85],
      ] as const) {
        clack.triggerAttackRelease(0.05, time + offset, velocity);
        thump.triggerAttackRelease(55, 0.1, time + offset, velocity);
      }
    }, "2n").start(0);

    return () => {
      loop.dispose();
      disposeAll(rumble, rumbleFilter, sway, rumbleGain, rattle, rattleFilter, rattleGain, clack, clackFilter, thump, thumpGain)();
    };
  }
}
