import type { Song, SongDraft } from "@/songs/types";
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
