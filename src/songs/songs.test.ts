import { describe, expect, it } from "vitest";
import { BUILT_IN_SONGS } from "./builtin";
import { DEFAULT_PARAMS } from "./params";
import { DEFAULT_PINNED, fillPinned } from "./pinned";
import { sanitizeDraft, sanitizeParams } from "./sanitize";
import { parseShare, shareFileName, toShareCode, toShareFile } from "./share";
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
