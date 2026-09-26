import { Check, ClipboardCopy, Download, PackageOpen } from "lucide-react";
import { useState } from "react";
import { SongCover } from "@/components/library/SongCover";
import { Button } from "@/components/ui/button";
import { saveTextFile } from "@/lib/files";
import { cn } from "@/lib/utils";
import { shareFileName, toShareFile, type ExportSelection } from "@/songs/share";
import { useShareCode } from "./use-share-code";

const MAX_STACK = 5;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What is about to be sent: a stack of covers, the counts, the code, and the two ways to send it. */
export function ExportSummary({ selection }: { selection: ExportSelection }) {
  const code = useShareCode(selection);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  const covers = [...selection.songs, ...selection.playlists.flatMap((list) => list.songs)].slice(0, MAX_STACK);
  const playlistSongs = selection.playlists.reduce((total, list) => total + list.songs.length, 0);
  const empty = selection.songs.length === 0 && selection.playlists.length === 0;

  const fail = (error: unknown) => setNotice({ text: `Could not export: ${error instanceof Error ? error.message : String(error)}`, error: true });

  const saveFile = async () => {
    try {
      if (await saveTextFile(shareFileName(selection), toShareFile(selection))) setNotice({ text: "File saved.", error: false });
    } catch (error) {
      fail(error);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setNotice(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      fail(error);
    }
  };

  return (
    <aside aria-label="What you are sending" className="surface flex flex-col gap-4 p-5 lg:sticky lg:top-6">
      <div className="flex items-center gap-4">
        {empty ? (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-tile bg-surface-hover text-text-muted" aria-hidden>
            <PackageOpen className="h-7 w-7" />
          </span>
        ) : (
          <span className="relative h-16 shrink-0" style={{ width: `${4 + (covers.length - 1) * 0.9}rem` }} aria-hidden>
            {covers.map((song, i) => (
              <span key={i} className="absolute top-0 w-16 transition-all" style={{ left: `${i * 0.9}rem`, zIndex: MAX_STACK - i }}>
                <SongCover params={song.params} className="w-16 shadow-control ring-2 ring-surface" />
              </span>
            ))}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{empty ? "Nothing picked yet" : "Ready to send"}</h2>
          <p className="text-xs text-text-muted">
            {empty
              ? "Tick songs or playlists to build what you send."
              : [
                  selection.songs.length > 0 && plural(selection.songs.length, "song"),
                  selection.playlists.length > 0 && `${plural(selection.playlists.length, "playlist")} (${plural(playlistSongs, "song")})`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-text-secondary">Share code</span>
        <button
          type="button"
          onClick={() => void copyCode()}
          disabled={empty || !code}
          className="group relative flex min-h-16 w-full items-start rounded-control border bg-canvas p-3 text-left font-mono text-[11px] leading-relaxed text-text-secondary transition-colors hover:border-accent disabled:pointer-events-none disabled:opacity-50"
          aria-label="Copy the share code"
        >
          <span className="line-clamp-3 break-all">{empty ? "lofi2:…" : (code ?? "Packing…")}</span>
          <span
            className={cn(
              "absolute bottom-2 right-2 rounded-pill px-2 py-0.5 font-sans text-[0.65rem] transition-all",
              copied ? "bg-success text-accent-foreground" : "bg-surface text-text-muted opacity-0 group-hover:opacity-100",
            )}
          >
            {copied ? "Copied" : "Click to copy"}
          </span>
        </button>
        {code && !empty && <span className="text-[0.65rem] text-text-muted">{code.length.toLocaleString()} characters, fits in any chat.</span>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" onClick={() => void copyCode()} disabled={empty || !code}>
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <ClipboardCopy className="h-4 w-4" aria-hidden />}
          {copied ? "Copied" : "Copy code"}
        </Button>
        <Button onClick={() => void saveFile()} disabled={empty}>
          <Download className="h-4 w-4" aria-hidden />
          Save file…
        </Button>
      </div>

      {notice && (
        <p role={notice.error ? "alert" : "status"} className={cn("text-sm", notice.error ? "text-danger" : "text-success")}>
          {notice.text}
        </p>
      )}
    </aside>
  );
}
