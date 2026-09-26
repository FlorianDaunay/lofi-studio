import { create } from "zustand";
import { BUILT_IN_SONGS } from "@/songs/builtin";
import { DEFAULT_PINNED, fillPinned } from "@/songs/pinned";
import { pruneSongIds, sanitizePlaylists, withSongAdded, withSongMoved, withSongRemoved } from "@/songs/playlists";
import { MAX_PLAYLISTS, MAX_SONG_NAME, MAX_USER_SONGS, PINNED_SLOTS, type Playlist, type Song, type SongDraft } from "@/songs/types";

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
  /** The user's playlists, newest first. */
  playlists: Playlist[];

  /** Returns the new songs (an import may be cut short by the library size limit). */
  addSongs: (drafts: readonly SongDraft[]) => Song[];
  updateSong: (id: string, patch: Partial<SongDraft>) => void;
  deleteSong: (id: string) => void;
  pinSong: (slot: number, id: string) => void;
  /** Returns the new playlist, or `undefined` when the limit is reached. */
  createPlaylist: (name: string, songIds?: readonly string[]) => Playlist | undefined;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (id: string, songId: string) => void;
  removeFromPlaylist: (id: string, songId: string) => void;
  moveInPlaylist: (id: string, from: number, to: number) => void;
  hydrate: (songs: Song[], pinned: string[], playlists: unknown) => void;
}

type Setter = (fn: (state: LibraryState) => Partial<LibraryState>) => void;

function updatePlaylist(set: Setter, id: string, change: (list: Playlist) => Partial<Playlist>) {
  set((s) => ({ playlists: s.playlists.map((list) => (list.id === id ? { ...list, ...change(list) } : list)) }));
}

export const useLibrary = create<LibraryState>()((set, get) => ({
  songs: [],
  pinned: DEFAULT_PINNED,
  playlists: [],

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
      // A deleted song must not linger in playlists.
      const playlists = s.playlists.map((list) => ({ ...list, songIds: withSongRemoved(list.songIds, id) }));
      return { songs, playlists, pinned: fillPinned(s.pinned, validIds(songs)) };
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

  createPlaylist: (name, songIds = []) => {
    if (get().playlists.length >= MAX_PLAYLISTS) return undefined;
    const playlist: Playlist = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, MAX_SONG_NAME) || "Untitled playlist",
      songIds: pruneSongIds(songIds, new Set(validIds(get().songs))),
      createdAt: Date.now(),
    };
    set((s) => ({ playlists: [playlist, ...s.playlists] }));
    return playlist;
  },

  renamePlaylist: (id, name) => {
    const trimmed = name.trim().slice(0, MAX_SONG_NAME);
    if (trimmed) updatePlaylist(set, id, () => ({ name: trimmed }));
  },
  deletePlaylist: (id) => set((s) => ({ playlists: s.playlists.filter((list) => list.id !== id) })),
  addToPlaylist: (id, songId) => updatePlaylist(set, id, (list) => ({ songIds: withSongAdded(list.songIds, songId) })),
  removeFromPlaylist: (id, songId) => updatePlaylist(set, id, (list) => ({ songIds: withSongRemoved(list.songIds, songId) })),
  moveInPlaylist: (id, from, to) => updatePlaylist(set, id, (list) => ({ songIds: withSongMoved(list.songIds, from, to) })),

  hydrate: (songs, pinned, playlists) =>
    set({ songs, pinned: fillPinned(pinned, validIds(songs)), playlists: sanitizePlaylists(playlists, validIds(songs)) }),
}));

export const findPlaylist = (playlists: readonly Playlist[], id: string): Playlist | undefined => playlists.find((list) => list.id === id);

export const findSong = (songs: readonly Song[], id: string | null): Song | undefined =>
  id === null ? undefined : (BUILT_IN_SONGS.find((s) => s.id === id) ?? songs.find((s) => s.id === id));

/** Built-in songs first, then the user's. Pass the `songs` you already selected from the store. */
export const allSongs = (songs: readonly Song[]): Song[] => [...BUILT_IN_SONGS, ...songs];
