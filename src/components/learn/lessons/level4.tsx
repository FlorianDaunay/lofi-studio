import { Check, Circle, ClipboardCopy } from "lucide-react";
import { useMemo, useState } from "react";
import { ThemeDialog } from "@/components/appearance/ThemeDialog";
import { ThemePreview } from "@/components/appearance/ThemePreview";
import { SlotPicker } from "@/components/library/SlotPicker";
import { SongForm } from "@/components/library/SongForm";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useShareCode } from "@/components/share/use-share-code";
import { toShareFile } from "@/songs/share";
import { saveCurrentAs } from "@/state/actions";
import { useLibrary } from "@/state/library";
import { useNavigation } from "@/state/navigation";
import { currentSongParams, useStudio } from "@/state/studio";
import { findTheme, useActiveTheme, useThemeStore } from "@/themes";
import { P, Term, Tip, Try } from "../parts";

function Step({ done, title, text, children }: { done: boolean; title: string; text: string; children?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-control border bg-canvas p-3">
      {done ? (
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-label="Done" />
      ) : (
        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-text-muted" aria-label="To do" />
      )}
      <div className="flex-1">
        <p className={cn("text-sm font-medium", done && "text-text-secondary line-through decoration-1")}>{title}</p>
        <p className="text-xs text-text-muted">{text}</p>
      </div>
      {children}
    </li>
  );
}

export function Save() {
  const userSongs = useLibrary((s) => s.songs);
  const pinned = useLibrary((s) => s.pinned);
  const go = useNavigation((s) => s.go);
  const [naming, setNaming] = useState(false);
  const [pinning, setPinning] = useState(false);

  const newest = userSongs[0];
  const saved = userSongs.length > 0;
  const isPinned = userSongs.some((song) => pinned.includes(song.id));

  return (
    <>
      <P>
        The moment you change anything, the song shows a <Term>Modified</Term> badge. <Term>Save</Term> overwrites your own song with the new version;{" "}
        <Term>Save as…</Term> keeps the original and stores a new one. The songs that ship with the app are never overwritten, so you can experiment freely and
        start over by loading them again.
      </P>
      <Try title="Your first saved song">
        <ol className="flex flex-col gap-2">
          <Step done={saved} title="Save your current sound" text="It goes to My songs in the Library.">
            <Button size="sm" variant={saved ? "secondary" : "primary"} onClick={() => setNaming(true)}>
              Save as…
            </Button>
          </Step>
          <Step done={isPinned} title="Pin it to the Studio" text="Pinned songs are one click away on the Studio page.">
            <Button size="sm" disabled={!newest} onClick={() => setPinning(true)}>
              Pin…
            </Button>
          </Step>
          <Step done={false} title="Visit your library" text="Rename, export or delete your songs there.">
            <Button size="sm" onClick={() => go("library")}>
              Open
            </Button>
          </Step>
        </ol>
      </Try>
      <Tip>Nothing is lost if you forget to save: the sound you were working on comes back next time you open the app.</Tip>
      <SongForm
        open={naming}
        onOpenChange={setNaming}
        title="Save as a new song"
        description="It is added to My songs."
        submitLabel="Save song"
        initial={{ name: "My first loop", description: "" }}
        onSubmit={saveCurrentAs}
      />
      <SlotPicker song={pinning ? (newest ?? null) : null} onClose={() => setPinning(false)} />
    </>
  );
}

const PREVIEW_LINES = 28;

export function Share() {
  const params = useStudio((s) => s.params);
  const [copied, setCopied] = useState(false);
  const selection = useMemo(
    () => ({ songs: [{ name: "Current sound", description: "Exported from the Studio.", params: currentSongParams(params) }], playlists: [] }),
    [params],
  );
  const code = useShareCode(selection);
  const file = toShareFile(selection);
  const preview = file.split("\n").slice(0, PREVIEW_LINES).join("\n");

  const copy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <P>
        A shared song contains <Term>no audio</Term>, only the recipe: tempo, chords, the grid, the settings. When a friend imports it, their app cooks the same
        sound. That is why a whole song fits in about a kilobyte.
      </P>
      <P>
        You can send it as a <Term>file</Term> (<code className="font-mono text-xs">.lofi.json</code>) or as a <Term>share code</Term>, one line of text that
        starts with <code className="font-mono text-xs">lofi2:</code> and pastes into any chat. Whole <Term>playlists</Term> travel the same way.
      </P>
      <Try title="Look inside your current sound">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="primary" onClick={() => void copy()}>
            <ClipboardCopy className="h-4 w-4" aria-hidden />
            {copied ? "Copied" : "Copy share code"}
          </Button>
          <span className="text-xs text-text-muted">
            {code?.length ?? "…"} characters · {new Blob([file]).size} bytes as a file
          </span>
        </div>
        <pre
          tabIndex={0}
          aria-label="Preview of the song file"
          className="max-h-56 overflow-auto rounded-control border bg-canvas p-3 font-mono text-[11px] leading-relaxed text-text-secondary"
        >
          {preview}
          {file.split("\n").length > PREVIEW_LINES ? "\n…" : ""}
        </pre>
      </Try>
      <Tip>
        Importing never overwrites anything: the songs you receive are added to My songs. Open <Term>Share</Term> in the menu to send or receive.
      </Tip>
    </>
  );
}

const SHOWCASE = ["light", "dark", "sepia", "nord", "dracula", "solarized-light", "tokyo-night", "catppuccin-mocha"];

export function Look() {
  const active = useActiveTheme();
  const selectTheme = useThemeStore((s) => s.selectTheme);
  const followSystem = useThemeStore((s) => s.followSystem);
  const setFollowSystem = useThemeStore((s) => s.setFollowSystem);
  const [browsing, setBrowsing] = useState(false);
  const themes = SHOWCASE.map(findTheme).filter((t) => t !== undefined);

  return (
    <>
      <P>
        A theme changes more than colors: corner shapes, borders, shadows and even the spacing. There are <Term>59</Term> of them, from a soft light look to a
        neon terminal.
      </P>
      <Try title="Try a few">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {themes.map((theme) => (
            <li key={theme.id}>
              <button
                type="button"
                aria-pressed={theme.id === active.id}
                onClick={() => selectTheme(theme.id)}
                className={cn(
                  "flex w-full flex-col gap-1.5 rounded-card border p-1.5 text-left transition-colors hover:bg-surface-hover",
                  theme.id === active.id && "border-accent bg-accent/10",
                )}
              >
                <ThemePreview theme={theme} />
                <span className="px-1 text-xs font-medium">{theme.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Switch label="Match my system's light or dark mode" checked={followSystem} onCheckedChange={setFollowSystem} />
          <Button size="sm" onClick={() => setBrowsing(true)}>
            Browse all themes
          </Button>
        </div>
      </Try>
      <Tip>The same gallery is one click away under Appearance (Theme on a phone) whenever you want to change your mind.</Tip>
      <ThemeDialog open={browsing} onOpenChange={setBrowsing} />
    </>
  );
}
