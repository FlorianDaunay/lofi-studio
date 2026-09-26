import { BUILT_IN_SONGS } from "./builtin";
import { isRecord, sanitizeDraft } from "./sanitize";
import { MAX_PLAYLIST_SONGS, MAX_SONG_DESCRIPTION, MAX_SONG_NAME, type Playlist, type Song, type SongDraft } from "./types";

/**
 * The sharing format: one JSON document, `{ format, version, songs, playlists? }`, written to a
 * `.lofi.json` file or copied as a "share code" for pasting in a chat.
 *
 * - Version 1 carries songs only; version 2 adds playlists. A document without playlists is still
 *   written as version 1, so older copies of the app can read it.
 * - A playlist lists its songs as `{ song: index }` (into the document's `songs`) or, for songs
 *   that ship with the app, `{ builtIn: id }`, so built-ins are never duplicated.
 * - Codes are `lofi2:` + base64url of the deflated JSON (much shorter), or `lofi1:` + base64 of
 *   the plain JSON where compression is not available. Both are read.
 */

export const SHARE_FORMAT = "lofi-studio";
export const SHARE_VERSION = 2;
const PLAIN_PREFIX = "lofi1:";
const DEFLATE_PREFIX = "lofi2:";
/** Generous for a hand-made library, small enough that a hostile file cannot hang the app. */
export const MAX_SHARE_BYTES = 1024 * 1024;
export const MAX_SHARED_SONGS = 100;
export const MAX_SHARED_PLAYLISTS = 30;

/** What a share document carries of a song. */
export type Shareable = Pick<Song, "name" | "description" | "params">;

export type SharedItem = { song: number } | { builtIn: string };

export interface SharedPlaylist {
  name: string;
  description: string;
  items: SharedItem[];
}

export interface ShareDocument {
  format: typeof SHARE_FORMAT;
  version: number;
  songs: SongDraft[];
  playlists?: SharedPlaylist[];
}

/** What the user picked to export. A playlist brings its songs along. */
export interface ExportSelection {
  songs: readonly Shareable[];
  playlists: readonly (Pick<Playlist, "name" | "description"> & { songs: readonly Song[] })[];
}

export type ShareResult = { songs: SongDraft[]; playlists: SharedPlaylist[] } | { error: string };

const builtInIds = new Set(BUILT_IN_SONGS.map((song) => song.id));

export function toShareDocument({ songs, playlists }: ExportSelection): ShareDocument {
  const drafts: SongDraft[] = [];
  // Songs picked on their own and songs pulled in by a playlist are written once.
  const indexOf = new Map<Shareable, number>();
  const add = (song: Shareable) => {
    const known = indexOf.get(song);
    if (known !== undefined) return known;
    indexOf.set(song, drafts.length);
    return drafts.push({ name: song.name, description: song.description, params: song.params }) - 1;
  };

  songs.forEach(add);
  const shared = playlists.map((list) => ({
    name: list.name,
    description: list.description,
    items: list.songs.map((song): SharedItem => (song.builtIn && builtInIds.has(song.id) ? { builtIn: song.id } : { song: add(song) })),
  }));

  return shared.length > 0 ? { format: SHARE_FORMAT, version: 2, songs: drafts, playlists: shared } : { format: SHARE_FORMAT, version: 1, songs: drafts };
}

export const toShareFile = (selection: ExportSelection) => JSON.stringify(toShareDocument(selection), null, 2);

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};
const base64ToBytes = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
const toBase64Url = (base64: string) => base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (text: string) =>
  text
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(text.length / 4) * 4, "=");

const canCompress = typeof CompressionStream === "function" && typeof DecompressionStream === "function";

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const piped = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(piped).arrayBuffer());
}

export async function toShareCode(selection: ExportSelection): Promise<string> {
  const json = JSON.stringify(toShareDocument(selection));
  const bytes = new TextEncoder().encode(json);
  if (!canCompress) return PLAIN_PREFIX + bytesToBase64(bytes);
  return DEFLATE_PREFIX + toBase64Url(bytesToBase64(await pipe(bytes, new CompressionStream("deflate-raw"))));
}

/** The JSON text behind a code or a file; throws on anything unreadable. */
async function decode(source: string): Promise<string> {
  if (source.startsWith(PLAIN_PREFIX)) return new TextDecoder().decode(base64ToBytes(source.slice(PLAIN_PREFIX.length).replace(/\s/g, "")));
  if (source.startsWith(DEFLATE_PREFIX)) {
    if (!canCompress) throw new Error("compression is not supported here");
    const inflated = await pipe(base64ToBytes(fromBase64Url(source.slice(DEFLATE_PREFIX.length).replace(/\s/g, ""))), new DecompressionStream("deflate-raw"));
    // A tiny code could inflate to gigabytes: refuse anything a real share would never reach.
    if (inflated.length > MAX_SHARE_BYTES) throw new Error("too large");
    return new TextDecoder().decode(inflated);
  }
  return source;
}

function sanitizeItems(raw: unknown, songCount: number): SharedItem[] {
  if (!Array.isArray(raw)) return [];
  const items: SharedItem[] = [];
  for (const item of raw.slice(0, MAX_PLAYLIST_SONGS)) {
    if (!isRecord(item)) continue;
    if (typeof item.song === "number" && Number.isInteger(item.song) && item.song >= 0 && item.song < songCount) items.push({ song: item.song });
    // A built-in this version does not ship (shared from a newer app) is dropped.
    else if (typeof item.builtIn === "string" && builtInIds.has(item.builtIn)) items.push({ builtIn: item.builtIn });
  }
  return items;
}

function sanitizePlaylists(raw: unknown, songCount: number): SharedPlaylist[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_SHARED_PLAYLISTS).flatMap((item) => {
    if (!isRecord(item)) return [];
    const name = typeof item.name === "string" && item.name.trim() ? item.name.trim().slice(0, MAX_SONG_NAME) : "Shared playlist";
    const description = typeof item.description === "string" ? item.description.trim().slice(0, MAX_SONG_DESCRIPTION) : "";
    return [{ name, description, items: sanitizeItems(item.items, songCount) }];
  });
}

/** Reads a share code or a JSON document; never throws, returns a message for the user instead. */
export async function parseShare(input: string): Promise<ShareResult> {
  const source = input.trim();
  if (!source) return { error: "Nothing to import: paste a share code or open a file." };
  if (source.length > MAX_SHARE_BYTES) return { error: "This is too large to be a Lofi Studio share." };

  let json: unknown;
  try {
    json = JSON.parse(await decode(source));
  } catch {
    return { error: "This is not a valid share code or song file." };
  }

  if (!isRecord(json) || json.format !== SHARE_FORMAT) return { error: "This does not look like a Lofi Studio share." };
  if (typeof json.version !== "number" || json.version > SHARE_VERSION) {
    return { error: "This was made with a newer version of Lofi Studio." };
  }
  const songs = Array.isArray(json.songs) ? json.songs.slice(0, MAX_SHARED_SONGS).map(sanitizeDraft) : [];
  const playlists = sanitizePlaylists(json.playlists, songs.length);
  if (songs.length === 0 && playlists.length === 0) return { error: "There is nothing to import in this share." };
  return { songs, playlists };
}

/** A safe file name (`Rainy Study!` becomes `rainy-study.lofi.json`). */
export function shareFileName({ songs, playlists }: ExportSelection): string {
  const only = songs.length + playlists.length === 1 ? (songs[0] ?? playlists[0]) : undefined;
  const slug = (only?.name ?? "lofi-studio-share")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "song"}.lofi.json`;
}
