import { describe, expect, it } from "vitest";
import { BUILT_IN_SONGS } from "@/songs/builtin";
import { addListening, emptyStats, LIBRARY_SOURCE } from "@/songs/stats";
import { backupFileName, parseBackup, toBackupFile, type Appearance } from "./backup";
import { sanitizeConfig } from "./config";

const appearance: Appearance = { themeId: "nord", followSystem: false, lightId: "light", darkId: "dark" };

describe("backups", () => {
  it("round-trips everything the app remembers", () => {
    const song = { ...BUILT_IN_SONGS[0]!, id: "mine-1", name: "Mine", builtIn: false, createdAt: 5 };
    const stats = addListening(emptyStats(1000), new Date(2026, 0, 2), 90, song.id, LIBRARY_SOURCE);
    const config = sanitizeConfig({ songs: [song], pinned: ["mine-1"], stats, learned: [] });
    const backup = parseBackup(toBackupFile(config, appearance, 1234));
    expect(backup.createdAt).toBe(1234);
    expect(backup.appearance).toEqual(appearance);
    expect(backup.config.songs).toEqual(config.songs);
    expect(backup.config.stats).toEqual(config.stats);
    expect(backup.config.pinned).toEqual(config.pinned);
  });

  it("names files by date", () => {
    expect(backupFileName(new Date(2026, 8, 3))).toBe("lofi-studio-backup-2026-09-03.json");
  });

  it("rejects what is not a backup, with a helpful message", () => {
    expect(() => parseBackup("nope")).toThrow(/not JSON/);
    expect(() => parseBackup(JSON.stringify({ format: "lofi-studio", version: 2, songs: [] }))).toThrow(/Receive/);
    expect(() => parseBackup(JSON.stringify({ format: "other" }))).toThrow(/not a Lofi Studio backup/);
    expect(() => parseBackup(JSON.stringify({ format: "lofi-studio-backup", version: 99 }))).toThrow(/newer version/);
  });

  it("sanitizes the content like config.json", () => {
    const backup = parseBackup(JSON.stringify({ format: "lofi-studio-backup", version: 1, config: { params: { bpm: 5000 } }, appearance: { themeId: 3 } }));
    expect(backup.config.params.bpm).toBe(100);
    expect(backup.appearance).toBeNull();
    expect(backup.createdAt).toBe(0);
  });
});
