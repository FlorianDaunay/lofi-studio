import { sanitizeDraft, sanitizeParams, isRecord } from "@/songs/sanitize";
import { sanitizeLearned } from "./learning";
import { BUILT_IN_SONGS } from "@/songs/builtin";
import { sanitizePlaylists } from "@/songs/playlists";
import { MAX_SONG_NAME, MAX_USER_SONGS, type Playlist, type Song } from "@/songs/types";
import { sanitizePlayer, type PlayerPrefs } from "./player";

export const PANEL_IDS = ["sequencer", "chords", "instruments", "effects"] as const;
export type PanelId = (typeof PANEL_IDS)[number];

export const DEFAULT_PANELS: Record<PanelId, boolean> = { sequencer: false, chords: false, instruments: false, effects: false };

/** What is written to `config.json` (the Rust side stores it verbatim, after checking it is JSON). */
export interface PersistedConfig {
  version: 2;
  params: ReturnType<typeof sanitizeParams>;
  songId: string | null;
  dirty: boolean;
  panels: Record<PanelId, boolean>;
  songs: Song[];
  pinned: string[];
  playlists: Playlist[];
  player: PlayerPrefs;
  /** Tutorial lessons marked as done. */
  learned: string[];
}

const id = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length <= 64 ? v : null);

function sanitizeSongs(raw: unknown): Song[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const songs: Song[] = [];
  for (const item of raw.slice(0, MAX_USER_SONGS)) {
    const songId = isRecord(item) ? id(item.id) : null;
    if (!songId || seen.has(songId)) continue;
    seen.add(songId);
    const draft = sanitizeDraft(item);
    const createdAt = isRecord(item) && typeof item.createdAt === "number" ? item.createdAt : 0;
    songs.push({ ...draft, name: draft.name.slice(0, MAX_SONG_NAME), id: songId, createdAt, builtIn: false });
  }
  return songs;
}

/**
 * Rebuilds a config from untrusted JSON. Older files are accepted: version 1 stored the current
 * song as `presetId` and had no library.
 */
export function sanitizeConfig(raw: unknown): PersistedConfig {
  const r = isRecord(raw) ? raw : {};
  const panels = isRecord(r.panels) ? r.panels : {};
  const songs = sanitizeSongs(r.songs);
  return {
    version: 2,
    params: sanitizeParams(r.params),
    songId: id(r.songId) ?? id(r.presetId),
    dirty: r.dirty === true,
    panels: Object.fromEntries(PANEL_IDS.map((panel) => [panel, panels[panel] === true])) as Record<PanelId, boolean>,
    songs,
    pinned: Array.isArray(r.pinned) ? r.pinned : [],
    playlists: sanitizePlaylists(r.playlists, [...BUILT_IN_SONGS, ...songs].map((song) => song.id)),
    player: sanitizePlayer(r.player),
    learned: sanitizeLearned(r.learned),
  };
}
