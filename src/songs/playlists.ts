import { isRecord } from "./sanitize";
import { MAX_PLAYLIST_SONGS, MAX_PLAYLISTS, MAX_SONG_NAME, type Playlist } from "./types";

/** Adds a song at the end unless it is already there or the playlist is full. */
export const withSongAdded = (songIds: readonly string[], id: string): string[] =>
  songIds.includes(id) || songIds.length >= MAX_PLAYLIST_SONGS ? [...songIds] : [...songIds, id];

export const withSongRemoved = (songIds: readonly string[], id: string): string[] => songIds.filter((s) => s !== id);

/** Moves the song at `from` to position `to` (both clamped into range). */
export function withSongMoved(songIds: readonly string[], from: number, to: number): string[] {
  const result = [...songIds];
  if (from < 0 || from >= result.length) return result;
  const [moved] = result.splice(from, 1);
  result.splice(Math.min(Math.max(to, 0), result.length), 0, moved!);
  return result;
}

/** Keeps only ids that exist, without duplicates (a song may have been deleted or an id forged). */
export const pruneSongIds = (songIds: readonly unknown[], valid: ReadonlySet<string>): string[] => [
  ...new Set(songIds.filter((id): id is string => typeof id === "string" && valid.has(id))),
].slice(0, MAX_PLAYLIST_SONGS);

/** Playlists read from the config file: untrusted, so rebuilt field by field. */
export function sanitizePlaylists(raw: unknown, validSongIds: readonly string[]): Playlist[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(validSongIds);
  const seen = new Set<string>();
  const playlists: Playlist[] = [];
  for (const item of raw.slice(0, MAX_PLAYLISTS)) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === "string" && item.id.length > 0 && item.id.length <= 64 ? item.id : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = typeof item.name === "string" && item.name.trim() ? item.name.trim().slice(0, MAX_SONG_NAME) : "Untitled playlist";
    playlists.push({
      id,
      name,
      songIds: pruneSongIds(Array.isArray(item.songIds) ? item.songIds : [], valid),
      createdAt: typeof item.createdAt === "number" && Number.isFinite(item.createdAt) ? item.createdAt : 0,
    });
  }
  return playlists;
}
