import { planImport, resolvePlaylist } from "@/songs/import-plan";
import type { SharedPlaylist } from "@/songs/share";
import type { Playlist, Song, SongDraft } from "@/songs/types";
import { findSong, useLibrary } from "./library";
import { currentSongParams, useStudio } from "./studio";

/**
 * Operations that touch both the studio and the library. They live here (not in a store) so
 * neither store needs to know about the other.
 */

/** Stores the current sound as a new song and makes it the studio's current song. */
export function saveCurrentAs({ name, description }: Pick<SongDraft, "name" | "description">): Song | undefined {
  const { params, markSaved } = useStudio.getState();
  const [song] = useLibrary.getState().addSongs([{ name, description, params: currentSongParams(params) }]);
  if (song) markSaved(song.id);
  return song;
}

/** True when the current song is one of the user's own (so it can be overwritten). */
export function canOverwriteCurrent(): boolean {
  const { songId } = useStudio.getState();
  return findSong(useLibrary.getState().songs, songId)?.builtIn === false;
}

/** Overwrites the user's current song with the current sound. */
export function saveCurrentChanges(): void {
  const { params, songId, markSaved } = useStudio.getState();
  if (!songId || !canOverwriteCurrent()) return;
  useLibrary.getState().updateSong(songId, { params: currentSongParams(params) });
  markSaved(songId);
}

/** Copies any song (typically a built-in) into the user's library. */
export function copySong(song: Song): Song | undefined {
  return useLibrary.getState().addSongs([{ name: `${song.name} (copy)`.slice(0, 60), description: song.description, params: song.params }])[0];
}

/** Saves an editable copy of any playlist (typically a built-in one). */
export function copyPlaylist(playlist: Playlist): Playlist | undefined {
  return useLibrary.getState().createPlaylist(`${playlist.name} (copy)`, playlist.songIds, playlist.description);
}

export interface ImportOutcome {
  songs: Song[];
  playlists: Playlist[];
  /** Songs that were already in the library and were not added again. */
  reused: number;
  /** Items that did not fit (library or playlist limit reached). */
  skipped: number;
}

/** Adds the chosen songs and playlists of a share. Nothing existing is overwritten. */
export function importShare(
  shared: { songs: readonly SongDraft[]; playlists: readonly SharedPlaylist[] },
  chosen: { songs: ReadonlySet<number>; playlists: ReadonlySet<number> },
): ImportOutcome {
  const library = useLibrary.getState();
  const plan = planImport(shared, chosen, library.songs);
  const added = library.addSongs(plan.add.map((item) => item.draft));

  const idOf = new Map(plan.existing);
  plan.add.forEach((item, i) => {
    const song = added[i];
    if (song) idOf.set(item.index, song.id);
  });

  const playlists = plan.playlists.flatMap(
    (playlist) => useLibrary.getState().createPlaylist(playlist.name, resolvePlaylist(playlist, idOf), playlist.description) ?? [],
  );
  return {
    // Only the songs the user ticked are reported: the ones pulled in by a playlist show in that playlist.
    songs: added,
    playlists,
    reused: plan.existing.size,
    skipped: plan.add.length - added.length + plan.playlists.length - playlists.length,
  };
}
