import { describe, expect, it } from "vitest";
import { AMBIENCE_LAYERS } from "@/audio/types";
import { BUILT_IN_SONGS } from "./builtin";
import { soundProfile, type SoundProfile } from "./insights";
import { SILENT_AMBIENCE } from "./params";
import { TEMPO_SPREAD, seededRng, songForProfile } from "./recommend";
import { sanitizeSongParams } from "./sanitize";

const seeds = Array.from({ length: 200 }, (_, i) => i + 1);

/** A listener who mostly hears felt piano with rain, a bit of vibes, around 70 BPM. */
const pianoInTheRain: SoundProfile = {
  bpm: 70,
  traits: { swing: 0.4, looseness: 0.3, warmth: 0.3, wobble: 0.2, space: 0.3, muffle: 0.6 },
  voices: {
    keys: { piano: 0.85, vibes: 0.15 },
    bass: { upright: 1 },
    drums: { brushes: 1 },
    pad: { off: 0.7, warm: 0.3 },
    lead: { off: 1 },
  },
  ambience: { ...SILENT_AMBIENCE, rain: 0.5, vinyl: 0.1 },
  tempos: { "70": 3600 },
};

describe("made for you", () => {
  it("always produces params the sanitizer accepts unchanged", () => {
    const profiles = [pianoInTheRain, soundProfile(BUILT_IN_SONGS.map((song, i) => ({ params: song.params, seconds: 60 + i * 30 })))!];
    for (const profile of profiles) {
      for (const seed of seeds) {
        const { params } = songForProfile(profile, seededRng(seed));
        expect(sanitizeSongParams(params)).toEqual(params);
      }
    }
  });

  it("favors the voices heard the most, without always picking them", () => {
    const keys = seeds.map((seed) => songForProfile(pianoInTheRain, seededRng(seed)).params.keys.voice);
    const piano = keys.filter((voice) => voice === "piano").length;
    expect(piano).toBeGreaterThan(seeds.length * 0.8);
    expect(piano).toBeLessThan(seeds.length);
    expect(new Set(keys)).toEqual(new Set(["piano", "vibes"]));
  });

  it("stays near the usual tempo and only uses ambience that was heard", () => {
    for (const seed of seeds) {
      const { params, name } = songForProfile(pianoInTheRain, seededRng(seed));
      expect(Math.abs(params.bpm - pianoInTheRain.bpm)).toBeLessThanOrEqual(TEMPO_SPREAD);
      const used = AMBIENCE_LAYERS.filter((id) => params.ambience[id] > 0);
      expect(used.length).toBeGreaterThan(0);
      expect(used.every((id) => id === "rain" || id === "vinyl")).toBe(true);
      expect(params.lead.level).toBe(0);
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("is reproducible from its seed", () => {
    expect(songForProfile(pianoInTheRain, seededRng(42))).toEqual(songForProfile(pianoInTheRain, seededRng(42)));
    expect(songForProfile(pianoInTheRain, seededRng(42))).not.toEqual(songForProfile(pianoInTheRain, seededRng(43)));
  });
});
