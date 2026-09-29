import { ArchiveRestore, FolderOpen, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { UI_LOCALE, formatSpent } from "@/lib/format";
import type { Backup } from "@/state/backup";
import { exportBackup, pickBackup, restoreBackup } from "@/state/backup-actions";

const dateFormat = new Intl.DateTimeFormat(UI_LOCALE, { dateStyle: "long", timeStyle: "short" });
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

const CONTENTS = ["Your songs and playlists", "Pinned songs and player settings", "Tutorial progress", "Your stats", "The current sound and the theme"];

/** What a backup holds, for the confirmation. */
function describe(backup: Backup): string {
  const { songs, playlists, stats } = backup.config;
  const made = backup.createdAt > 0 ? `Made ${dateFormat.format(backup.createdAt)}. ` : "";
  return `${made}${plural(songs.length, "song")}, ${plural(playlists.length, "playlist")}, ${formatSpent(stats.total.listen)} of listening.`;
}

/** Save everything to a file, or bring it all back (after a reinstall, or on another device). */
export function BackupPanel() {
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);

  const save = async () => {
    try {
      if (await exportBackup()) setNotice({ text: "Backup saved. Keep the file somewhere safe (a cloud drive, a USB stick…)." });
    } catch (error) {
      setNotice({ text: `Could not save the backup: ${error instanceof Error ? error.message : String(error)}`, error: true });
    }
  };

  const open = async () => {
    try {
      const backup = await pickBackup();
      if (backup) setPending(backup);
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : String(error), error: true });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <section aria-label="Back up" className="surface flex flex-col gap-3 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-tile bg-accent/10 text-accent" aria-hidden>
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h2 className="text-base font-semibold">Back up everything</h2>
        <p className="text-sm text-text-muted">
          One file with all the app remembers. Uninstalling the app on a phone erases its data: keep a backup to get it all back.
        </p>
        <ul className="flex flex-col gap-1 text-sm text-text-secondary">
          {CONTENTS.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
        <Button variant="primary" className="mt-auto self-start" onClick={() => void save()}>
          <Save className="h-4 w-4" aria-hidden />
          Save backup file…
        </Button>
      </section>

      <section aria-label="Restore" className="surface flex flex-col gap-3 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-tile bg-accent/10 text-accent" aria-hidden>
          <ArchiveRestore className="h-5 w-5" />
        </span>
        <h2 className="text-base font-semibold">Restore a backup</h2>
        <p className="text-sm text-text-muted">
          Replaces what is in the app now with the content of a backup file. You see what is inside before anything changes.
        </p>
        <Button className="mt-auto self-start" onClick={() => void open()}>
          <FolderOpen className="h-4 w-4" aria-hidden />
          Open backup file…
        </Button>
      </section>

      {notice && (
        <p role={notice.error ? "alert" : "status"} className={`rounded-control border bg-surface px-3 py-2 text-sm md:col-span-2 ${notice.error ? "text-danger" : "text-text-secondary"}`}>
          {notice.text}
        </p>
      )}

      <Dialog
        open={pending !== null}
        onOpenChange={(isOpen) => !isOpen && setPending(null)}
        title="Replace everything with this backup?"
        description={pending ? describe(pending) : ""}
        className="w-[min(92vw,28rem)]"
      >
        <p className="px-5 py-4 text-sm text-text-secondary">
          Your current songs, playlists, stats and settings are replaced, and the music stops. To keep what you have now, save a backup of it first.
        </p>
        <DialogFooter>
          <Button onClick={() => setPending(null)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (pending) restoreBackup(pending);
              setPending(null);
              setNotice({ text: "Backup restored." });
            }}
          >
            Restore
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
