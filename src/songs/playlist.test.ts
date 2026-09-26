import { describe, expect, it } from "vitest";
import { BUILT_IN_SONGS } from "./builtin";
import { BUILT_IN_PLAYLISTS } from "./builtin-playlists";
import { COVER_WORLDS, coverScene, coverWorld, sceneDistance } from "./cover";
import { planImport, resolvePlaylist } from "./import-plan";
import { buildQueue, loopsFor, nextInQueue, previousInQueue, shuffleOrder, songSeconds } from "./playback";
import { pruneSongIds, sanitizePlaylists, withSongAdded, withSongMoved, withSongRemoved } from "./playlists";
import { MAX_PLAYLIST_SONGS, MAX_PLAYLISTS } from "./types";

/** Deterministic RNG so shuffles are reproducible. */
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe("playlist editing", () => {
  it("adds without duplicates and respects the size limit", () => {
    expect(withSongAdded(["a"], "b")).toEqual(["a", "b"]);
    expect(withSongAdded(["a"], "a")).toEqual(["a"]);
    const full = Array.from({ length: MAX_PLAYLIST_SONGS }, (_, i) => `s${i}`);
    expect(withSongAdded(full, "extra")).toEqual(full);
  });

  it("removes and moves songs", () => {
    expect(withSongRemoved(["a", "b", "c"], "b")).toEqual(["a", "c"]);
    expect(withSongMoved(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(withSongMoved(["a", "b", "c"], 2, -5)).toEqual(["c", "a", "b"]);
    expect(withSongMoved(["a", "b"], 9, 0)).toEqual(["a", "b"]);
  });

  it("prunes unknown and repeated ids", () => {
    expect(pruneSongIds(["a", "x", "a", 3, "b"], new Set(["a", "b"]))).toEqual(["a", "b"]);
  });
});

describe("sanitizePlaylists", () => {
  const valid = ["a", "b"];

  it("rebuilds every field from untrusted data", () => {
    const result = sanitizePlaylists(
      [
        { id: "p1", name: "  Night  ", songIds: ["a", "gone", "a", "b"], createdAt: 5 },
        { id: "p1", name: "duplicate id" },
        { id: "", name: "no id" },
        { id: "p2", name: 42, songIds: "nope", createdAt: "x" },
        "junk",
      ],
      valid,
    );
    expect(result).toEqual([
      { id: "p1", name: "Night", description: "", builtIn: false, songIds: ["a", "b"], createdAt: 5 },
      { id: "p2", name: "Untitled playlist", description: "", builtIn: false, songIds: [], createdAt: 0 },
    ]);
  });

  it("survives non-array input and caps the number of playlists", () => {
    expect(sanitizePlaylists(null, valid)).toEqual([]);
    const many = Array.from({ length: MAX_PLAYLISTS + 10 }, (_, i) => ({ id: `p${i}`, name: "x" }));
    expect(sanitizePlaylists(many, valid)).toHaveLength(MAX_PLAYLISTS);
  });
});

describe("play queue", () => {
  const ids = ["a", "b", "c", "d"];

  it("shuffles into a permutation, keeping the first song in front", () => {
    const order = shuffleOrder(ids, seeded(7), { first: "c" });
    expect(order[0]).toBe("c");
    expect([...order].sort()).toEqual(ids);
  });

  it("never starts a reshuffle with the song that just played", () => {
    for (let seed = 1; seed < 40; seed++) expect(shuffleOrder(ids, seeded(seed), { avoid: "a" })[0]).not.toBe("a");
  });

  it("keeps a shuffled queue valid after the source changes", () => {
    expect(buildQueue(["a", "c", "e"], true, ["c", "b", "a", "c"])).toEqual(["c", "a", "e"]);
    expect(buildQueue(ids, false, ["d"])).toEqual(ids);
  });

  it("steps forward, stopping or wrapping at the end", () => {
    expect(nextInQueue(ids, "b", "off", true)).toEqual({ id: "c", wrapped: false });
    expect(nextInQueue(ids, "d", "off", true)).toEqual({ id: null, wrapped: false });
    expect(nextInQueue(ids, "d", "all", true)).toEqual({ id: "a", wrapped: true });
    expect(nextInQueue(ids, null, "off", false).id).toBe("a");
    expect(nextInQueue(ids, "gone", "off", false).id).toBe("a");
    expect(nextInQueue([], "a", "all", true).id).toBeNull();
  });

  it("repeat-one replays on its own but a manual next still moves on", () => {
    expect(nextInQueue(ids, "b", "one", true).id).toBe("b");
    expect(nextInQueue(ids, "b", "one", false).id).toBe("c");
  });

  it("steps back, restarting or wrapping at the start", () => {
    expect(previousInQueue(ids, "c", "off")).toBe("b");
    expect(previousInQueue(ids, "a", "off")).toBe("a");
    expect(previousInQueue(ids, "a", "all")).toBe("d");
    expect(previousInQueue([], "a", "all")).toBeNull();
  });

  it("repeats a short loop until the song lasts a couple of minutes", () => {
    for (const song of BUILT_IN_SONGS) {
      const loops = loopsFor(song.params);
      const seconds = songSeconds(song.params);
      expect(loops).toBeGreaterThanOrEqual(1);
      expect(seconds).toBeGreaterThan(60);
      expect(seconds).toBeLessThan(200);
    }
  });
});

describe("cover scenes", () => {
  it("are deterministic", () => {
    const song = BUILT_IN_SONGS[0]!;
    expect(coverScene(song.params)).toEqual(coverScene(song.params));
  });

  it("differ between every pair of built-in songs", () => {
    const scenes = BUILT_IN_SONGS.map((song) => coverScene(song.params));
    for (let i = 0; i < scenes.length; i++) {
      for (let j = i + 1; j < scenes.length; j++) expect(sceneDistance(scenes[i]!, scenes[j]!)).toBeGreaterThan(0.02);
    }
  });

  it("spread the built-in songs over every world", () => {
    const counts = Object.fromEntries(
      COVER_WORLDS.map((world) => [world, BUILT_IN_SONGS.filter((song) => coverWorld(song.params) === world).map((song) => song.name)]),
    );
    for (const world of COVER_WORLDS) expect(counts[world]!.length, JSON.stringify(counts)).toBeGreaterThanOrEqual(2);
  });

  it("change a little when a song changes a little, and more for another song", () => {
    const base = BUILT_IN_SONGS[0]!.params;
    const tweaked = {
      ...base,
      bpm: base.bpm + 2,
      fx: { ...base.fx, warmth: Math.min(1, base.fx.warmth + 0.05) },
      ambience: { ...base.ambience, rain: Math.min(1, base.ambience.rain + 0.05) },
    };
    const small = sceneDistance(coverScene(base), coverScene(tweaked));
    expect(small).toBeGreaterThan(0);
    for (const other of BUILT_IN_SONGS.slice(1)) expect(sceneDistance(coverScene(base), coverScene(other.params))).toBeGreaterThan(small * 3);
  });
});

describe("built-in playlists", () => {
  it("only reference built-in songs, without repeats, under unique ids", () => {
    const songIds = new Set(BUILT_IN_SONGS.map((song) => song.id));
    expect(new Set(BUILT_IN_PLAYLISTS.map((list) => list.id)).size).toBe(BUILT_IN_PLAYLISTS.length);
    for (const list of BUILT_IN_PLAYLISTS) {
      expect(list.songIds.length).toBeGreaterThanOrEqual(4);
      expect(new Set(list.songIds).size).toBe(list.songIds.length);
      for (const id of list.songIds) expect(songIds.has(id), `${list.name}: ${id}`).toBe(true);
    }
  });

  it("put every built-in song in at least one playlist", () => {
    const listed = new Set(BUILT_IN_PLAYLISTS.flatMap((list) => list.songIds));
    for (const song of BUILT_IN_SONGS) expect(listed.has(song.id), song.name).toBe(true);
  });
});

describe("import plan", () => {
  const [a, b, c] = BUILT_IN_SONGS.map((song) => ({ name: song.name, description: song.description, params: song.params }));
  const shared = {
    songs: [a!, b!, c!],
    playlists: [{ name: "Mix", description: "", items: [{ song: 1 }, { builtIn: "rainy-study" }, { song: 2 }] }],
  };
  const twin = { ...BUILT_IN_SONGS[2]!, id: "mine", builtIn: false };

  it("brings a playlist's songs along and reuses identical songs", () => {
    const plan = planImport(shared, { songs: new Set([0]), playlists: new Set([0]) }, [twin]);
    expect(plan.add.map((item) => item.index)).toEqual([0, 1]);
    expect([...plan.existing]).toEqual([[2, "mine"]]);
    expect(plan.playlists).toHaveLength(1);
  });

  it("imports only ticked songs when no playlist is ticked", () => {
    const plan = planImport(shared, { songs: new Set([2]), playlists: new Set() }, []);
    expect(plan.add.map((item) => item.index)).toEqual([2]);
    expect(plan.playlists).toEqual([]);
  });

  it("maps playlist items to ids, dropping songs that could not be added", () => {
    const ids = new Map([[1, "x"]]);
    expect(resolvePlaylist(shared.playlists[0]!, ids)).toEqual(["x", "rainy-study"]);
  });
});
