import { describe, expect, it } from "vitest";
import { BUILT_IN_SONGS } from "./builtin";
import { DEFAULT_PARAMS } from "./params";
import { DEFAULT_PINNED, fillPinned } from "./pinned";
import { sanitizeDraft, sanitizeParams } from "./sanitize";
import { parseShare, shareFileName, toShareCode, toShareFile } from "./share";
import { MAX_BARS, parseChord, parseProgression, withBarAdded, withBarRemoved, withChord } from "./chords";
import { RANDOMIZE_KINDS, randomize } from "./randomize";
import { PINNED_SLOTS } from "./types";

const song = BUILT_IN_SONGS[0]!;

describe("sanitizeParams", () => {
  it("keeps valid params untouched", () => {
    expect(sanitizeParams(DEFAULT_PARAMS)).toEqual(DEFAULT_PARAMS);
  });

  it("clamps numbers, rejects bad enums and falls back on malformed data", () => {
    const result = sanitizeParams({
      bpm: 9999,
      swing: "lots",
      keys: { wave: "noise", cutoff: -5, adsr: { attack: Infinity } },
      pattern: { kick: [true] },
      progression: [{ pc: 2, quality: "nope" }],
    });
    expect(result.bpm).toBe(100);
    expect(result.swing).toBe(DEFAULT_PARAMS.swing);
    expect(result.keys.wave).toBe(DEFAULT_PARAMS.keys.wave);
    expect(result.keys.cutoff).toBe(300);
    expect(result.keys.adsr.attack).toBe(DEFAULT_PARAMS.keys.adsr.attack);
    expect(result.pattern.kick).toEqual(DEFAULT_PARAMS.pattern.kick);
    expect(result.progression).toEqual(DEFAULT_PARAMS.progression);
  });

  it("survives non-object input", () => {
    expect(sanitizeParams(null)).toEqual(DEFAULT_PARAMS);
    expect(sanitizeParams("x")).toEqual(DEFAULT_PARAMS);
  });
});

describe("sanitizeDraft", () => {
  it("trims and caps text, and names unnamed songs", () => {
    expect(sanitizeDraft({ name: "  Hi  ", description: "d".repeat(500) }).description).toHaveLength(140);
    expect(sanitizeDraft({ name: "  Hi  " }).name).toBe("Hi");
    expect(sanitizeDraft({ name: "   " }).name).toBe("Untitled song");
  });

  it("never carries a volume", () => {
    expect("volume" in sanitizeDraft({ params: { volume: 0.1 } }).params).toBe(false);
  });
});

describe("share format", () => {
  it("round-trips through a file and through a share code", () => {
    const expected = [{ name: song.name, description: song.description, params: song.params }];
    expect(parseShare(toShareFile([song]))).toEqual({ songs: expected });
    expect(parseShare(toShareCode([song]))).toEqual({ songs: expected });
  });

  it("round-trips non-ASCII names", () => {
    const named = { ...song, name: "Café nocturne ☕" };
    const result = parseShare(toShareCode([named]));
    expect("songs" in result && result.songs[0]?.name).toBe("Café nocturne ☕");
  });

  it("explains what is wrong instead of throwing", () => {
    for (const bad of ["", "not json", "lofi1:%%%", "{}", '{"format":"lofi-studio","version":99,"songs":[]}', '{"format":"lofi-studio","version":1,"songs":[]}']) {
      expect(parseShare(bad)).toHaveProperty("error");
    }
  });

  it("builds safe file names", () => {
    expect(shareFileName([{ name: "Rainy Study!" }])).toBe("rainy-study.lofi.json");
    expect(shareFileName([{ name: "???" }])).toBe("song.lofi.json");
    expect(shareFileName([{ name: "a" }, { name: "b" }])).toBe("lofi-studio-library.lofi.json");
  });
});

describe("fillPinned", () => {
  const ids = ["a", "b", "c", "d", "e"];

  it("keeps valid pins and replaces missing songs with unpinned ones", () => {
    expect(fillPinned(["a", "gone", "c", "d"], ids)).toEqual(["a", "b", "c", "d"]);
  });

  it("always returns one id per slot", () => {
    expect(fillPinned([], ids)).toHaveLength(PINNED_SLOTS);
    expect(fillPinned(["a"], ["a"])).toHaveLength(PINNED_SLOTS);
  });

  it("defaults to the built-in songs", () => {
    expect(DEFAULT_PINNED).toHaveLength(PINNED_SLOTS);
  });
});

describe("randomize", () => {
  // A deterministic generator so failures are reproducible.
  const seeded = (start: number) => {
    let seed = start;
    return () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  };
  const runs = Array.from({ length: 200 }, (_, i) => i + 1);

  it("always produces params the sanitizer accepts unchanged", () => {
    for (const kind of RANDOMIZE_KINDS) {
      for (const seed of runs) {
        const result = randomize(kind, DEFAULT_PARAMS, seeded(seed));
        expect(sanitizeParams(result)).toEqual(result);
      }
    }
  });

  it("changes only what each kind promises", () => {
    const groove = randomize("groove", DEFAULT_PARAMS, seeded(1));
    expect({ ...groove, pattern: DEFAULT_PARAMS.pattern }).toEqual(DEFAULT_PARAMS);

    const chords = randomize("chords", DEFAULT_PARAMS, seeded(2));
    expect({ ...chords, progression: DEFAULT_PARAMS.progression }).toEqual(DEFAULT_PARAMS);
    expect(chords.progression).not.toEqual(DEFAULT_PARAMS.progression);

    const sound = randomize("sound", DEFAULT_PARAMS, seeded(3));
    expect(sound.pattern).toEqual(DEFAULT_PARAMS.pattern);
    expect(sound.progression).toEqual(DEFAULT_PARAMS.progression);
    expect(sound.bpm).toBe(DEFAULT_PARAMS.bpm);
  });

  it("never moves volume or instrument levels, and keeps the lo-fi tempo", () => {
    for (const seed of runs) {
      const result = randomize("surprise", DEFAULT_PARAMS, seeded(seed));
      expect(result.volume).toBe(DEFAULT_PARAMS.volume);
      expect(result.keys.level).toBe(DEFAULT_PARAMS.keys.level);
      expect(result.bass.level).toBe(DEFAULT_PARAMS.bass.level);
      expect(result.drums).toEqual(DEFAULT_PARAMS.drums);
      expect(result.bpm).toBeGreaterThanOrEqual(72);
      expect(result.bpm).toBeLessThanOrEqual(85);
    }
  });

  it("keeps the backbone of every groove", () => {
    for (const seed of runs) {
      const { pattern } = randomize("groove", DEFAULT_PARAMS, seeded(seed));
      expect([pattern.kick[0], pattern.snare[4], pattern.snare[12], pattern.bass[0], pattern.keys[0]]).toEqual([true, true, true, true, true]);
    }
  });

  it("picks a new progression and always leaves something audible in the ambience", () => {
    for (const seed of runs) {
      const result = randomize("surprise", DEFAULT_PARAMS, seeded(seed));
      expect(result.progression).not.toEqual(DEFAULT_PARAMS.progression);
      expect(Object.values(result.ambience).some((level) => level > 0)).toBe(true);
    }
  });
});

describe("built-in library", () => {
  it("has twelve distinct songs", () => {
    expect(BUILT_IN_SONGS).toHaveLength(12);
    expect(new Set(BUILT_IN_SONGS.map((s) => s.id)).size).toBe(12);
    expect(new Set(BUILT_IN_SONGS.map((s) => s.name)).size).toBe(12);
  });

  it("only contains valid, lo-fi-paced songs", () => {
    for (const s of BUILT_IN_SONGS) {
      expect({ ...sanitizeParams(s.params), volume: undefined }).toEqual({ ...s.params, volume: undefined });
      expect(s.params.bpm).toBeGreaterThanOrEqual(70);
      expect(s.params.bpm).toBeLessThanOrEqual(85);
      expect(s.params.progression).toHaveLength(4);
      expect(Object.values(s.params.ambience).some((level) => level > 0)).toBe(true);
    }
  });

  it("does not repeat the same groove and chords twice", () => {
    const fingerprints = BUILT_IN_SONGS.map((s) => JSON.stringify([s.params.pattern, s.params.progression]));
    expect(new Set(fingerprints).size).toBe(BUILT_IN_SONGS.length);
  });
});

describe("chords", () => {
  it("parses chord symbols", () => {
    expect(parseChord("Dm9")).toEqual({ pc: 2, quality: "m9" });
    expect(parseChord("Bb13")).toEqual({ pc: 10, quality: "dom13" });
    expect(parseChord("F#maj7")).toEqual({ pc: 6, quality: "maj7" });
    expect(parseProgression("Cmaj7  A7")).toHaveLength(2);
    expect(() => parseChord("H7")).toThrow();
    expect(() => parseChord("Cfoo")).toThrow();
  });

  it("edits a progression without mutating it", () => {
    const start = parseProgression("Dm9 G13");
    expect(withChord(start, 1, { quality: "dom7" })[1]).toEqual({ pc: 7, quality: "dom7" });
    expect(start[1]).toEqual({ pc: 7, quality: "dom13" });
  });

  it("keeps between one and eight bars", () => {
    let progression = parseProgression("Dm9");
    expect(withBarRemoved(progression, 0)).toHaveLength(1);
    for (let i = 0; i < 12; i++) progression = withBarAdded(progression);
    expect(progression).toHaveLength(MAX_BARS);
    expect(withBarAdded(progression)).toHaveLength(MAX_BARS);
    expect(withBarRemoved(progression, 3)).toHaveLength(MAX_BARS - 1);
  });
});
