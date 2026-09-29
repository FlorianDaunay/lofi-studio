import { openTextFile, saveTextFile } from "@/lib/files";
import { findTheme, useThemeStore } from "@/themes";
import { backupFileName, parseBackup, toBackupFile, type Appearance, type Backup } from "./backup";
import { engine } from "./bridge";
import { applyConfig, snapshot } from "./persist";

/** Saving and restoring a backup file (see `backup.ts` for what is in it). */

function currentAppearance(): Appearance {
  const { themeId, followSystem, lightId, darkId } = useThemeStore.getState();
  return { themeId, followSystem, lightId, darkId };
}

/** Asks where to save a backup of everything. Returns false if the user cancelled. */
export function exportBackup(): Promise<boolean> {
  const now = new Date();
  return saveTextFile(backupFileName(now), toBackupFile(snapshot(), currentAppearance(), now.getTime()));
}

/** Asks for a backup file and reads it, without applying it. `null` if the user cancelled; throws on a bad file. */
export async function pickBackup(): Promise<Backup | null> {
  const text = await openTextFile();
  return text === null ? null : parseBackup(text);
}

/** Replaces everything the app remembers with the backup. The music stops first. */
export function restoreBackup(backup: Backup): void {
  engine.stop();
  applyConfig(backup.config);
  const appearance = backup.appearance;
  // A theme that no longer exists keeps the current choice rather than breaking the look.
  if (appearance && [appearance.themeId, appearance.lightId, appearance.darkId].every((id) => findTheme(id))) {
    useThemeStore.setState(appearance);
  }
}
