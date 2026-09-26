import { CircleAlert, CircleCheck, ListMusic, Library, LoaderCircle, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseShare } from "@/songs/share";
import { importShare, type ImportOutcome } from "@/state/actions";
import { useNavigation } from "@/state/navigation";
import { playSource } from "@/state/playback";
import { useStudio } from "@/state/studio";
import { DropZone } from "./DropZone";
import { ImportPreview, type Shared } from "./ImportPreview";

/** Pasted codes are read as the user types, once they pause. */
const PARSE_DELAY_MS = 250;

type State =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "error"; message: string }
  /** `key` remounts the preview, so a new share starts with everything ticked. */
  | { kind: "preview"; shared: Shared; key: number }
  | { kind: "done"; outcome: ImportOutcome };

/** Open, drop or paste a share, look inside, pick what to add. */
export function ImportPanel() {
  const go = useNavigation((s) => s.go);
  const loadSong = useStudio((s) => s.loadSong);
  const [code, setCode] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const read = async (text: string) => {
    setState({ kind: "reading" });
    const result = await parseShare(text);
    setState("error" in result ? { kind: "error", message: result.error } : { kind: "preview", shared: result, key: Date.now() });
  };

  useEffect(() => {
    if (!code.trim()) return setState((s) => (s.kind === "done" ? s : { kind: "idle" }));
    const timer = window.setTimeout(() => void read(code), PARSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [code]);

  const finish = (shared: Shared, chosen: { songs: ReadonlySet<number>; playlists: ReadonlySet<number> }) => {
    setState({ kind: "done", outcome: importShare(shared, chosen) });
    setCode("");
  };

  const playImported = (outcome: ImportOutcome) => {
    const playlist = outcome.playlists[0];
    if (playlist) return void playSource({ kind: "playlist", id: playlist.id });
    const song = outcome.songs[0];
    if (song) {
      loadSong(song);
      go("studio");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <DropZone code={code} onCodeChange={setCode} onFile={(text) => void read(text)} onError={(message) => setState({ kind: "error", message })} />

      {state.kind === "reading" && (
        <p role="status" className="flex items-center gap-2 text-sm text-text-muted">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          Reading…
        </p>
      )}
      {state.kind === "error" && (
        <p role="alert" className="flex items-center gap-2 rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      )}
      {state.kind === "preview" && <ImportPreview key={state.key} shared={state.shared} onImport={(chosen) => finish(state.shared, chosen)} />}
      {state.kind === "done" && <Done outcome={state.outcome} onPlay={() => playImported(state.outcome)} onOpen={go} />}
    </div>
  );
}

function Done({ outcome, onPlay, onOpen }: { outcome: ImportOutcome; onPlay: () => void; onOpen: (page: "library" | "playlists") => void }) {
  const { songs, playlists, reused, skipped } = outcome;
  const names = [...playlists.map((list) => list.name), ...songs.map((song) => song.name)];
  return (
    <section role="status" className="surface flex flex-col gap-3 border-success/40 p-5">
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{names.length > 0 ? "Added to your library" : "Nothing new to add"}</h2>
          <p className="text-sm text-text-secondary">
            {names.length > 0 ? names.join(", ") : "You already had all of it."}
            {reused > 0 && ` ${reused} ${reused === 1 ? "song was" : "songs were"} already there.`}
            {skipped > 0 && ` ${skipped} skipped: your library is full.`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {names.length > 0 && (
          <Button variant="primary" onClick={onPlay}>
            <Play className="h-4 w-4 fill-current" aria-hidden />
            Play it
          </Button>
        )}
        {playlists.length > 0 && (
          <Button onClick={() => onOpen("playlists")}>
            <ListMusic className="h-4 w-4" aria-hidden />
            Playlists
          </Button>
        )}
        <Button onClick={() => onOpen("library")}>
          <Library className="h-4 w-4" aria-hidden />
          Library
        </Button>
      </div>
    </section>
  );
}
