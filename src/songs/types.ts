import type { EngineParams } from "@/audio";

/** Everything that makes a song sound like itself. The master volume is the listener's, not the song's. */
export type SongParams = Omit<EngineParams, "volume">;

export interface Song {
  /** Stable unique id (built-ins use a readable slug, user songs a UUID). */
  id: string;
  name: string;
  description: string;
  /** Epoch milliseconds; `0` for built-ins. */
  createdAt: number;
  /** Built-in songs ship with the app: they cannot be edited or deleted, only copied. */
  builtIn: boolean;
  params: SongParams;
}

/** A song before the library has given it an id (what the user types or an import provides). */
export type SongDraft = Pick<Song, "name" | "description" | "params">;

export const PINNED_SLOTS = 4;
export const MAX_SONG_NAME = 60;
export const MAX_SONG_DESCRIPTION = 140;
export const MAX_USER_SONGS = 200;

/** An ordered list of songs (built-in or the user's), played in order or shuffled. */
export interface Playlist {
  id: string;
  name: string;
  /** Ids of songs that exist in the library; a song may appear once. */
  songIds: string[];
  createdAt: number;
}

// Kept low on purpose: the config file the Rust side accepts is capped at 1 MB.
export const MAX_PLAYLISTS = 30;
export const MAX_PLAYLIST_SONGS = 100;
