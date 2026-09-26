import { isRecord, sanitizeDraft } from "./sanitize";
import type { Song, SongDraft } from "./types";

/**
 * The sharing format: one JSON document, `{ format, version, songs }`, written to a `.lofi.json`
 * file or copied as a "share code" (`lofi1:` + base64 of that JSON) for pasting in a chat.
 */

export const SHARE_FORMAT = "lofi-studio";
export const SHARE_VERSION = 1;
const CODE_PREFIX = "lofi1:";
/** Generous for a hand-made library, small enough that a hostile file cannot hang the app. */
export const MAX_SHARE_BYTES = 1024 * 1024;
export const MAX_SHARED_SONGS = 100;

/** What a share document carries of a song. */
export type Shareable = Pick<Song, "name" | "description" | "params">;

export type ShareResult = { songs: SongDraft[] } | { error: string };

export interface ShareDocument {
  format: typeof SHARE_FORMAT;
  version: number;
  songs: SongDraft[];
}

export function toShareDocument(songs: readonly Shareable[]): ShareDocument {
  return {
    format: SHARE_FORMAT,
    version: SHARE_VERSION,
    songs: songs.map(({ name, description, params }) => ({ name, description, params })),
  };
}

export const toShareFile = (songs: readonly Shareable[]) => JSON.stringify(toShareDocument(songs), null, 2);

const toBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const fromBase64 = (base64: string) => {
  const binary = atob(base64);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
};

export const toShareCode = (songs: readonly Shareable[]) => CODE_PREFIX + toBase64(JSON.stringify(toShareDocument(songs)));

/** Reads a share code or a JSON document; never throws, returns a message for the user instead. */
export function parseShare(input: string): ShareResult {
  const source = input.trim();
  if (!source) return { error: "Nothing to import: paste a share code or open a file." };
  if (source.length > MAX_SHARE_BYTES) return { error: "This is too large to be a Lofi Studio song." };

  let json: unknown;
  try {
    json = JSON.parse(source.startsWith(CODE_PREFIX) ? fromBase64(source.slice(CODE_PREFIX.length)) : source);
  } catch {
    return { error: "This is not a valid share code or song file." };
  }

  if (!isRecord(json) || json.format !== SHARE_FORMAT) return { error: "This does not look like a Lofi Studio song." };
  if (typeof json.version !== "number" || json.version > SHARE_VERSION) {
    return { error: "This song was made with a newer version of Lofi Studio." };
  }
  if (!Array.isArray(json.songs) || json.songs.length === 0) return { error: "This file does not contain any song." };
  return { songs: json.songs.slice(0, MAX_SHARED_SONGS).map(sanitizeDraft) };
}

/** A safe file name for a song (`Rainy Study!` becomes `rainy-study.lofi.json`). */
export function shareFileName(songs: readonly Pick<Song, "name">[]): string {
  const base = songs.length === 1 ? songs[0]!.name : "lofi-studio-library";
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug || "song"}.lofi.json`;
}
