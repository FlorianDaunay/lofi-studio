import { Check, Moon, Search, Sun } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { themes, useActiveTheme, useThemeStore, type Theme, type ThemeScheme } from "@/themes";
import { ThemePreview } from "./ThemePreview";

const GROUPS: { scheme: ThemeScheme; label: string; icon: typeof Sun }[] = [
  { scheme: "light", label: "Light themes", icon: Sun },
  { scheme: "dark", label: "Dark themes", icon: Moon },
];

function ThemeCard({ theme, selected, onSelect }: { theme: Theme; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col gap-2 rounded-card border p-2 text-left transition-colors hover:bg-surface-hover",
        selected && "border-accent bg-accent/10",
      )}
    >
      <ThemePreview theme={theme} />
      <span className="px-1 pb-1">
        <span className="block text-sm font-medium">{theme.name}</span>
        <span className="block truncate text-xs text-text-muted">{theme.description}</span>
      </span>
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-pill bg-accent text-accent-foreground shadow-control">
          <Check className="h-3 w-3" aria-hidden />
        </span>
      )}
    </button>
  );
}

interface ThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Every theme with a live miniature, searchable, grouped by light and dark. */
export function ThemeDialog({ open, onOpenChange }: ThemeDialogProps) {
  const active = useActiveTheme();
  const followSystem = useThemeStore((s) => s.followSystem);
  const selectTheme = useThemeStore((s) => s.selectTheme);
  const setFollowSystem = useThemeStore((s) => s.setFollowSystem);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return themes.filter((t) => !needle || `${t.name} ${t.description}`.toLowerCase().includes(needle));
  }, [query]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Appearance"
      description="Pick a theme for the whole app."
      className="h-[42rem] w-[min(94vw,60rem)]"
      headerAction={<Switch label="Match system" checked={followSystem} onCheckedChange={setFollowSystem} />}
    >
      <div className="border-b px-5 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${themes.length} themes…`}
            aria-label="Search themes"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {matches.length === 0 && <p className="py-10 text-center text-sm text-text-muted">No theme matches “{query}”.</p>}
        {GROUPS.map(({ scheme, label, icon: Icon }) => {
          const group = matches.filter((t) => t.scheme === scheme);
          if (group.length === 0) return null;
          return (
            <section key={scheme} className="mb-6 last:mb-0">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                <Icon className="h-4 w-4" aria-hidden />
                {label} <span className="font-normal">({group.length})</span>
              </h3>
              <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {group.map((theme) => (
                  <ThemeCard key={theme.id} theme={theme} selected={theme.id === active.id} onSelect={() => selectTheme(theme.id)} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Dialog>
  );
}
