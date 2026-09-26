import { create } from "zustand";
import { BUILT_IN_SONGS } from "@/songs/builtin";
import { DEFAULT_PINNED, fillPinned } from "@/songs/pinned";
import { MAX_USER_SONGS, PINNED_SLOTS, type Song, type SongDraft } from "@/songs/types";

const builtInIds = BUILT_IN_SONGS.map((song) => song.id);
const validIds = (userSongs: readonly Song[]) => [...builtInIds, ...userSongs.map((song) => song.id)];

const makeSong = (draft: SongDraft): Song => ({
  ...draft,
  id: crypto.randomUUID(),
  createdAt: Date.now(),
  builtIn: false,
});

interface LibraryState {
  /** The user's songs, newest first. Built-in songs are not stored here. */
  songs: Song[];
  /** Exactly `PINNED_SLOTS` song ids, shown on the Studio page. */
  pinned: string[];

  /** Returns the new songs (an import may be cut short by the library size limit). */
  addSongs: (drafts: readonly SongDraft[]) => Song[];
  updateSong: (id: string, patch: Partial<SongDraft>) => void;
  deleteSong: (id: string) => void;
  pinSong: (slot: number, id: string) => void;
  hydrate: (songs: Song[], pinned: string[]) => void;
}

export const useLibrary = create<LibraryState>()((set, get) => ({
  songs: [],
  pinned: DEFAULT_PINNED,

  addSongs: (drafts) => {
    const room = Math.max(0, MAX_USER_SONGS - get().songs.length);
    const added = drafts.slice(0, room).map(makeSong);
    if (added.length > 0) set((s) => ({ songs: [...added.reverse(), ...s.songs] }));
    return added;
  },

  updateSong: (id, patch) => set((s) => ({ songs: s.songs.map((song) => (song.id === id ? { ...song, ...patch } : song)) })),

  deleteSong: (id) =>
    set((s) => {
      const songs = s.songs.filter((song) => song.id !== id);
      return { songs, pinned: fillPinned(s.pinned, validIds(songs)) };
    }),

  pinSong: (slot, id) => {
    if (slot < 0 || slot >= PINNED_SLOTS) return;
    set((s) => {
      // Pinning a song that sits in another slot swaps the two, so a song is never pinned twice.
      const pinned = [...s.pinned];
      const from = pinned.indexOf(id);
      if (from >= 0) pinned[from] = pinned[slot]!;
      pinned[slot] = id;
      return { pinned };
    });
  },

  hydrate: (songs, pinned) => set({ songs, pinned: fillPinned(pinned, validIds(songs)) }),
}));

export const findSong = (songs: readonly Song[], id: string | null): Song | undefined =>
  id === null ? undefined : (BUILT_IN_SONGS.find((s) => s.id === id) ?? songs.find((s) => s.id === id));

/** Built-in songs first, then the user's. Pass the `songs` you already selected from the store. */
export const allSongs = (songs: readonly Song[]): Song[] => [...BUILT_IN_SONGS, ...songs];
