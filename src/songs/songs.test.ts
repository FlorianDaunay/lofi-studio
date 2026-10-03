import { describe, expect, it } from "vitest";
import { BUILT_IN_SONGS } from "./builtin";
import { DEFAULT_PARAMS, SILENT_AMBIENCE } from "./params";
import { DEFAULT_PINNED, fillPinned } from "./pinned";
import { sanitizeDraft, sanitizeParams } from "./sanitize";
import { autoLoops } from "./playback";
import { parseShare, shareFileName, toShareCode, toShareDocument, toShareFile, type Shareable } from "./share";
import { MAX_BARS, parseChord, parseProgression, withBarAdded, withBarRemoved, withChord } from "./chords";
import { RANDOMIZE_KINDS, randomize } from "./randomize";
import { PINNED_SLOTS, type Song, type SongParams } from "./types";
import { AMBIENCE_LAYERS, BASS_VOICES, DRUM_KITS, KEYS_VOICES, LEAD_VOICES, PAD_VOICES, PERC_VOICES } from "@/audio/types";

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

  it("gives songs saved without a length about two minutes, and keeps whole loops", () => {
    const { loops: _loops, ...old } = { ...DEFAULT_PARAMS, bpm: 60 };
    expect(sanitizeParams(old).loops).toBe(autoLoops({ bpm: 60, progression: DEFAULT_PARAMS.progression }));
    expect(sanitizeParams({ ...DEFAULT_PARAMS, loops: 7.6 }).loops).toBe(8);
    expect(sanitizeParams({ ...DEFAULT_PARAMS, loops: 500 }).loops).toBe(32);
    expect(sanitizeParams({ ...DEFAULT_PARAMS, loops: -2 }).loops).toBe(1);
  });

  it("reads songs saved by 0.7 as they were: every newer setting off", () => {
    // A song as 0.7 wrote it: no transpose, percussion, crush, pump, or ambience besides rain, vinyl and wind.
    const saved = {
      ...DEFAULT_PARAMS,
      transpose: undefined,
      pattern: { ...DEFAULT_PARAMS.pattern, perc: undefined },
      drums: { kit: "brushes", kick: 0.6, snare: 0.5, hat: 0.4 },
      fx: { tone: 4000, wobble: 0.5, warmth: 0.4, reverb: 0.3 },
      ambience: { rain: 0.6, vinyl: 0.2, wind: 0.1 },
    };
    const read = sanitizeParams(JSON.parse(JSON.stringify(saved)));
    expect(read.transpose).toBe(0);
    expect(read.pattern.perc.some(Boolean)).toBe(false);
    expect(read.drums).toMatchObject(saved.drums);
    expect(read.fx).toEqual({ ...saved.fx, crush: 0, pump: 0 });
    expect(read.ambience).toEqual({ ...SILENT_AMBIENCE, ...saved.ambience });
    expect({ ...read, transpose: undefined, pattern: { ...read.pattern, perc: undefined }, drums: undefined, fx: undefined, ambience: undefined }).toEqual({
      ...saved,
      drums: undefined,
      fx: undefined,
      ambience: undefined,
    });
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
  const draft = (s: Shareable) => ({ name: s.name, description: s.description, params: s.params });
  const only = (songs: Shareable[]) => ({ songs, playlists: [] });

  it("round-trips songs through a file and through a share code", async () => {
    const expected = { songs: [draft(song)], playlists: [] };
    expect(await parseShare(toShareFile(only([song])))).toEqual(expected);
    expect(await parseShare(await toShareCode(only([song])))).toEqual(expected);
  });

  it("writes version 1 without playlists, so older apps can still read it", () => {
    expect(toShareDocument(only([song])).version).toBe(1);
    expect(toShareDocument(only([song]))).not.toHaveProperty("playlists");
  });

  it("compresses share codes", async () => {
    const code = await toShareCode(only(BUILT_IN_SONGS));
    expect(code.startsWith("lofi2:")).toBe(true);
    expect(code.length).toBeLessThan(toShareFile(only(BUILT_IN_SONGS)).length / 3);
  });

  it("still reads the old uncompressed codes", async () => {
    const legacy = "lofi1:" + Buffer.from(JSON.stringify({ format: "lofi-studio", version: 1, songs: [draft(song)] })).toString("base64");
    expect(await parseShare(legacy)).toEqual({ songs: [draft(song)], playlists: [] });
  });

  it("carries playlists: user songs are embedded once, built-ins referenced by id", async () => {
    const mine: Song = { ...song, id: "u1", builtIn: false, name: "Mine" };
    const selection = {
      songs: [mine],
      playlists: [{ name: "Mix", description: "d", songs: [song, mine, BUILT_IN_SONGS[1]!] }],
    };
    const document = toShareDocument(selection);
    expect(document.version).toBe(2);
    expect(document.songs).toHaveLength(1);
    expect(document.playlists).toEqual([{ name: "Mix", description: "d", items: [{ builtIn: song.id }, { song: 0 }, { builtIn: BUILT_IN_SONGS[1]!.id }] }]);
    expect(await parseShare(await toShareCode(selection))).toEqual({ songs: [draft(mine)], playlists: document.playlists });
  });

  it("drops playlist items that point nowhere", async () => {
    const text = JSON.stringify({
      format: "lofi-studio",
      version: 2,
      songs: [],
      playlists: [{ name: " P ", items: [{ song: 0 }, { builtIn: "not-a-song" }, { builtIn: song.id }, "x", { song: -1 }] }],
    });
    expect(await parseShare(text)).toEqual({ songs: [], playlists: [{ name: "P", description: "", items: [{ builtIn: song.id }] }] });
  });

  it("explains what is wrong instead of throwing", async () => {
    const bad = [
      "",
      "not json",
      "lofi1:%%%",
      "lofi2:%%%",
      "lofi2:AAAA",
      "{}",
      '{"format":"lofi-studio","version":99,"songs":[]}',
      '{"format":"lofi-studio","version":1,"songs":[]}',
    ];
    for (const text of bad) expect(await parseShare(text)).toHaveProperty("error");
  });

  it("builds safe file names", () => {
    expect(shareFileName(only([{ ...song, name: "Rainy Study!" }]))).toBe("rainy-study.lofi.json");
    expect(shareFileName(only([{ ...song, name: "???" }]))).toBe("song.lofi.json");
    expect(shareFileName(only([song, song]))).toBe("lofi-studio-share.lofi.json");
    expect(shareFileName({ songs: [], playlists: [{ name: "Night Mix", description: "", songs: [] }] })).toBe("night-mix.lofi.json");
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
      expect({ ...result.drums, kit: undefined, percVoice: undefined }).toEqual({ ...DEFAULT_PARAMS.drums, kit: undefined, percVoice: undefined });
      expect(result.pad.level).toBe(DEFAULT_PARAMS.pad.level);
      expect(result.lead.level).toBe(DEFAULT_PARAMS.lead.level);
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
  it("has thirty songs with unique ids and names", () => {
    expect(BUILT_IN_SONGS).toHaveLength(30);
    expect(new Set(BUILT_IN_SONGS.map((s) => s.id)).size).toBe(30);
    expect(new Set(BUILT_IN_SONGS.map((s) => s.name)).size).toBe(30);
  });

  it("only contains valid, lo-fi-paced songs", () => {
    for (const s of BUILT_IN_SONGS) {
      expect({ ...sanitizeParams(s.params), volume: undefined }).toEqual({ ...s.params, volume: undefined });
      expect(s.params.bpm).toBeGreaterThanOrEqual(60);
      expect(s.params.bpm).toBeLessThanOrEqual(96);
      expect(Object.values(s.params.ambience).some((level) => level > 0)).toBe(true);
    }
  });

  it("uses every voice and kit somewhere", () => {
    const used = (pick: (p: SongParams) => string) => new Set(BUILT_IN_SONGS.map((s) => pick(s.params)));
    expect(used((p) => p.keys.voice)).toEqual(new Set(KEYS_VOICES));
    expect(used((p) => p.bass.voice)).toEqual(new Set(BASS_VOICES));
    expect(used((p) => p.drums.kit)).toEqual(new Set(DRUM_KITS));
    expect(used((p) => (p.pad.level > 0 ? p.pad.voice : "off"))).toEqual(new Set([...PAD_VOICES, "off"]));
    expect(used((p) => (p.lead.level > 0 ? p.lead.voice : "off"))).toEqual(new Set([...LEAD_VOICES, "off"]));
    expect(used((p) => (p.pattern.perc.some(Boolean) && p.drums.perc > 0 ? p.drums.percVoice : "off"))).toEqual(new Set([...PERC_VOICES, "off"]));
  });

  it("makes every pair of songs audibly different", () => {
    // What a listener notices first: the instruments, the tempo, the chords, the texture.
    const traits = (p: SongParams) => [
      p.keys.voice,
      p.bass.voice,
      p.drums.kit,
      p.pad.level > 0 ? p.pad.voice : "no pad",
      p.lead.level > 0 ? p.lead.voice : "no lead",
      Math.round(p.bpm / 8),
      p.progression.map((c) => `${c.pc}${c.quality}`).join(),
      p.drums.kick + p.drums.snare < 0.2 ? "no beat" : "beat",
      p.swing < 0.4 ? "straight" : p.swing < 0.6 ? "swung" : "shuffled",
      AMBIENCE_LAYERS.reduce((a, b) => (p.ambience[b] > p.ambience[a] ? b : a)),
    ];
    const tooClose: string[] = [];
    for (let i = 0; i < BUILT_IN_SONGS.length; i++) {
      for (let j = i + 1; j < BUILT_IN_SONGS.length; j++) {
        const a = traits(BUILT_IN_SONGS[i]!.params);
        const b = traits(BUILT_IN_SONGS[j]!.params);
        const differences = a.filter((trait, k) => trait !== b[k]).length;
        if (differences < 5) tooClose.push(`${BUILT_IN_SONGS[i]!.name} / ${BUILT_IN_SONGS[j]!.name} (${differences})`);
      }
    }
    expect(tooClose).toEqual([]);
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
