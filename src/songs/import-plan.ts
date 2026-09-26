import { BUILT_IN_SONGS } from "./builtin";
import { deepEqual } from "./equal";
import type { SharedPlaylist } from "./share";
import type { Song, SongDraft } from "./types";

/**
 * Turns what the user ticked in a share into concrete steps, before touching the library: which
 * songs to add, which are already there (identical name, description and sound), and how each
 * playlist maps to song ids. Pure, so it can be tested without a store.
 */

export interface ImportPlan {
  /** Songs to add, with their index in the share. */
  add: { index: number; draft: SongDraft }[];
  /** Share index to the id of an identical song already in the library. */
  existing: Map<number, string>;
  playlists: SharedPlaylist[];
}

/** An identical song (same name, description and sound) already in the library. */
export const findTwin = (draft: SongDraft, library: readonly Song[]): Song | undefined =>
  library.find((song) => song.name === draft.name && song.description === draft.description && deepEqual(song.params, draft.params));

/** The songs of a shared playlist as displayable songs (shared ones get a temporary id). */
export const sharedPlaylistSongs = (playlist: SharedPlaylist, drafts: readonly SongDraft[]): Song[] =>
  playlist.items.flatMap((item) => {
    if ("builtIn" in item) return BUILT_IN_SONGS.find((song) => song.id === item.builtIn) ?? [];
    const draft = drafts[item.song];
    return draft ? [{ ...draft, id: `shared-${item.song}`, createdAt: 0, builtIn: false }] : [];
  });

/** Song indexes a playlist needs: importing a playlist brings its songs along. */
export const playlistSongIndexes = (playlist: SharedPlaylist): number[] => playlist.items.flatMap((item) => ("song" in item ? [item.song] : []));

export function planImport(
  shared: { songs: readonly SongDraft[]; playlists: readonly SharedPlaylist[] },
  chosen: { songs: ReadonlySet<number>; playlists: ReadonlySet<number> },
  library: readonly Song[],
): ImportPlan {
  const playlists = shared.playlists.filter((_, i) => chosen.playlists.has(i));
  const needed = new Set([...chosen.songs, ...playlists.flatMap(playlistSongIndexes)]);
  const add: ImportPlan["add"] = [];
  const existing = new Map<number, string>();
  for (const index of [...needed].sort((a, b) => a - b)) {
    const draft = shared.songs[index];
    if (!draft) continue;
    const twin = findTwin(draft, library);
    if (twin) existing.set(index, twin.id);
    else add.push({ index, draft });
  }
  return { add, existing, playlists };
}

/** A playlist's song ids once the songs exist; songs that could not be added are left out. */
export const resolvePlaylist = (playlist: SharedPlaylist, idOf: ReadonlyMap<number, string>): string[] =>
  playlist.items.flatMap((item) => {
    if ("builtIn" in item) return [item.builtIn];
    const id = idOf.get(item.song);
    return id === undefined ? [] : [id];
  });
