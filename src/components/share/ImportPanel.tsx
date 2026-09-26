import { FileUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { openTextFile } from "@/lib/files";
import { parseShare } from "@/songs/share";
import { useLibrary } from "@/state/library";
import { useNavigation } from "@/state/navigation";

type Outcome = { kind: "added"; names: string[]; skipped: number } | { kind: "error"; message: string };

/** Open a song file or paste a share code; valid songs are added to the library. */
export function ImportPanel() {
  const addSongs = useLibrary((s) => s.addSongs);
  const go = useNavigation((s) => s.go);
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const importText = (text: string) => {
    const result = parseShare(text);
    if ("error" in result) return setOutcome({ kind: "error", message: result.error });
    const added = addSongs(result.songs);
    if (added.length === 0) return setOutcome({ kind: "error", message: "Your library is full: delete a song first." });
    setOutcome({ kind: "added", names: added.map((song) => song.name), skipped: result.songs.length - added.length });
    setCode("");
  };

  const openFile = async () => {
    try {
      const text = await openTextFile();
      if (text !== null) importText(text);
    } catch (error) {
      setOutcome({ kind: "error", message: `Could not open the file: ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  return (
    <section aria-label="Import" className="surface flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-base font-semibold">Import</h2>
        <p className="text-xs text-text-muted">Songs you import are added to My songs. Nothing is overwritten.</p>
      </div>

      <div>
        <Button variant="primary" onClick={() => void openFile()}>
          <FileUp className="h-4 w-4" aria-hidden />
          Open file…
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="share-code" className="text-xs text-text-secondary">
          Or paste a share code
        </label>
        <Textarea
          id="share-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={4}
          spellCheck={false}
          placeholder="lofi1:eyJmb3JtYXQiOi…"
          className="font-mono text-xs"
        />
        <div>
          <Button onClick={() => importText(code)} disabled={!code.trim()}>
            Import code
          </Button>
        </div>
      </div>

      {outcome?.kind === "error" && (
        <p role="alert" className="text-sm text-danger">
          {outcome.message}
        </p>
      )}
      {outcome?.kind === "added" && (
        <div role="status" className="flex flex-col gap-2 text-sm">
          <p className="text-success">
            Added {outcome.names.length} {outcome.names.length === 1 ? "song" : "songs"}: {outcome.names.join(", ")}.
            {outcome.skipped > 0 && ` ${outcome.skipped} skipped (library full).`}
          </p>
          <div>
            <Button size="sm" onClick={() => go("library")}>
              Open the library
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
