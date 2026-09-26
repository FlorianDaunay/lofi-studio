import { ClipboardCopy, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { saveTextFile } from "@/lib/files";
import { shareFileName, toShareCode, toShareFile, type Shareable } from "@/songs/share";
import { useAllSongs } from "@/state/selectors";
import { currentSongParams, useStudio } from "@/state/studio";

const CURRENT = "current";

interface Item {
  key: string;
  song: Shareable;
  hint: string;
}

/** Pick songs, then save them as a file or copy a share code. */
export function ExportPanel() {
  const songs = useAllSongs();
  const params = useStudio((s) => s.params);
  const songId = useStudio((s) => s.songId);
  const dirty = useStudio((s) => s.dirty);
  const known = songs.some((song) => song.id === songId);

  // The live sound is offered too when it is not exactly a saved song (unsaved or modified).
  const items = useMemo<Item[]>(() => {
    const list: Item[] = songs.map((song) => ({ key: song.id, song, hint: song.builtIn ? "Built-in" : "Mine" }));
    if (!known || dirty) {
      list.unshift({
        key: CURRENT,
        song: { name: "Current sound", description: "Exported from the Studio.", params: currentSongParams(params) },
        hint: "Unsaved",
      });
    }
    return list;
  }, [songs, params, known, dirty]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(songId && known ? [songId] : [CURRENT]));
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  const chosen = items.filter((item) => selected.has(item.key)).map((item) => item.song);
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const run = async (action: () => Promise<string | null>) => {
    try {
      const text = await action();
      if (text) setNotice({ text, error: false });
    } catch (error) {
      setNotice({ text: `Could not export: ${error instanceof Error ? error.message : String(error)}`, error: true });
    }
  };

  const saveFile = () =>
    run(async () => ((await saveTextFile(shareFileName(chosen), toShareFile(chosen))) ? "File saved." : null));
  const copyCode = () =>
    run(async () => {
      await navigator.clipboard.writeText(toShareCode(chosen));
      return "Share code copied. Paste it in a message: whoever has Lofi Studio can import it.";
    });

  return (
    <section aria-label="Export" className="surface flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-base font-semibold">Export</h2>
        <p className="text-xs text-text-muted">Choose songs to share as a file or as a code you can paste anywhere.</p>
      </div>

      <fieldset className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-control border bg-canvas p-2">
        <legend className="sr-only">Songs to export</legend>
        {items.map((item) => (
          <label key={item.key} className="flex cursor-pointer items-center gap-3 rounded-control px-2 py-1.5 text-sm hover:bg-surface-hover">
            <input
              type="checkbox"
              checked={selected.has(item.key)}
              onChange={() => toggle(item.key)}
              className="h-4 w-4 accent-[rgb(var(--color-accent))]"
            />
            <span className="flex-1 truncate">{item.song.name}</span>
            <span className="text-xs text-text-muted">{item.hint}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => void saveFile()} disabled={chosen.length === 0}>
          <Download className="h-4 w-4" aria-hidden />
          Save file…
        </Button>
        <Button onClick={() => void copyCode()} disabled={chosen.length === 0}>
          <ClipboardCopy className="h-4 w-4" aria-hidden />
          Copy share code
        </Button>
        <span className="text-xs text-text-muted">{chosen.length} selected</span>
      </div>

      {notice && (
        <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-sm text-danger" : "text-sm text-success"}>
          {notice.text}
        </p>
      )}
    </section>
  );
}
