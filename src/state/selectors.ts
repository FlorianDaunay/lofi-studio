import { useMemo } from "react";
import type { Song } from "@/songs/types";
import type { Playlist } from "@/songs/types";
import { allSongs, findSong, useLibrary } from "./library";
import { useStudio } from "./studio";

/** Every song the user can pick: built-ins first, then their own. */
export function useAllSongs(): Song[] {
  const songs = useLibrary((s) => s.songs);
  return useMemo(() => allSongs(songs), [songs]);
}

/** The saved song the studio is currently based on, if it still exists. */
export function useCurrentSong(): Song | undefined {
  const songId = useStudio((s) => s.songId);
  const songs = useLibrary((s) => s.songs);
  return useMemo(() => findSong(songs, songId), [songs, songId]);
}

/** The songs of a playlist, in order (ids that no longer resolve are skipped). */
export function usePlaylistSongs(playlist: Playlist): Song[] {
  const songs = useLibrary((s) => s.songs);
  return useMemo(() => playlist.songIds.flatMap((id) => findSong(songs, id) ?? []), [songs, playlist.songIds]);
}
