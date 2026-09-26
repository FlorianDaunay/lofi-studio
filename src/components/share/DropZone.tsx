import { FileUp, Upload } from "lucide-react";
import { useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { openTextFile } from "@/lib/files";
import { cn } from "@/lib/utils";
import { MAX_SHARE_BYTES } from "@/songs/share";

interface DropZoneProps {
  /** Pasted text, owned by the parent so it can parse it live. */
  code: string;
  onCodeChange: (code: string) => void;
  /** The text of a file that was opened or dropped. */
  onFile: (text: string) => void;
  onError: (message: string) => void;
}

/** The three ways in: drop a file, open one, or paste a code. */
export function DropZone({ code, onCodeChange, onFile, onError }: DropZoneProps) {
  const [over, setOver] = useState(false);

  const openFile = async () => {
    try {
      const text = await openTextFile();
      if (text !== null) onFile(text);
    } catch (error) {
      onError(`Could not open the file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const drop = async (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer.files[0];
    if (!file) return;
    if (file.size > MAX_SHARE_BYTES) return onError("This file is too large to be a Lofi Studio share.");
    onFile(await file.text());
  };

  return (
    <section aria-label="Open or paste a share" className="surface flex flex-col gap-4 p-4 sm:p-5">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => void drop(event)}
        className={cn(
          "flex flex-col items-center gap-3 rounded-card border-2 border-dashed px-4 py-8 text-center transition-colors",
          over ? "border-accent bg-accent/10" : "bg-canvas",
        )}
      >
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-pill transition-transform",
            over ? "scale-110 bg-accent text-accent-foreground" : "bg-surface-hover text-accent",
          )}
          aria-hidden
        >
          <Upload className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium">{over ? "Drop it!" : "Drop a .lofi.json file here"}</p>
          <p className="text-xs text-text-muted">Songs and playlists are added to yours. Nothing is overwritten.</p>
        </div>
        <Button variant="primary" onClick={() => void openFile()}>
          <FileUp className="h-4 w-4" aria-hidden />
          Open file…
        </Button>
      </div>

      <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
        Or paste a share code
        <Textarea value={code} onChange={(e) => onCodeChange(e.target.value)} rows={3} spellCheck={false} placeholder="lofi2:…" className="font-mono text-xs" />
      </label>
    </section>
  );
}
