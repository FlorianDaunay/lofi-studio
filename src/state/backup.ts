import { isRecord } from "@/songs/sanitize";
import { SHARE_FORMAT } from "@/songs/share";
import { sanitizeConfig, type PersistedConfig } from "./config";

/**
 * A backup is everything the app remembers, in one file the user keeps: the whole config
 * (songs, playlists, pins, player, tutorial, stats, current sound) plus the theme, which lives
 * apart in the web view's storage. Restoring it goes through the same sanitizer as `config.json`.
 */

export const BACKUP_FORMAT = "lofi-studio-backup";
export const BACKUP_VERSION = 1;

/** The theme choice, as `src/themes/store.ts` persists it. Theme ids are checked by the caller. */
export interface Appearance {
  themeId: string;
  followSystem: boolean;
  lightId: string;
  darkId: string;
}

export interface Backup {
  /** Epoch ms of when the backup was made. */
  createdAt: number;
  config: PersistedConfig;
  /** `null` when the file has none (the current theme is then kept). */
  appearance: Appearance | null;
}

export function toBackupFile(config: PersistedConfig, appearance: Appearance, now: number): string {
  return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: now, appearance, config });
}

export function backupFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `lofi-studio-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

const themeId = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length <= 64 ? v : null);

function sanitizeAppearance(raw: unknown): Appearance | null {
  if (!isRecord(raw)) return null;
  const [id, light, dark] = [themeId(raw.themeId), themeId(raw.lightId), themeId(raw.darkId)];
  if (!id || !light || !dark) return null;
  return { themeId: id, followSystem: raw.followSystem === true, lightId: light, darkId: dark };
}

/** Reads a backup file. Throws an `Error` with a message for people when it is not one. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file is not a Lofi Studio backup (it is not JSON).");
  }
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT) {
    throw new Error(
      isRecord(raw) && raw.format === SHARE_FORMAT
        ? "This is a shared song file: open it from the Receive tab instead."
        : "This file is not a Lofi Studio backup.",
    );
  }
  if (typeof raw.version !== "number" || raw.version > BACKUP_VERSION) {
    throw new Error("This backup comes from a newer version of Lofi Studio: update the app first.");
  }
  const createdAt = typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt) ? raw.createdAt : 0;
  return { createdAt, config: sanitizeConfig(raw.config), appearance: sanitizeAppearance(raw.appearance) };
}
