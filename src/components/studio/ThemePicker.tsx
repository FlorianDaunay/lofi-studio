import { Switch } from "@/components/ui/switch";
import { themes, useActiveTheme, useThemeStore } from "@/themes";

const groups = [
  { scheme: "dark", label: "Dark" },
  { scheme: "light", label: "Light" },
] as const;

export function ThemePicker() {
  const active = useActiveTheme();
  const followSystem = useThemeStore((s) => s.followSystem);
  const selectTheme = useThemeStore((s) => s.selectTheme);
  const setFollowSystem = useThemeStore((s) => s.setFollowSystem);

  return (
    <div className="flex items-center gap-4">
      <Switch label="Match system" checked={followSystem} onCheckedChange={setFollowSystem} />
      <label className="flex items-center gap-2 text-xs text-text-secondary">
        Theme
        <select
          value={active.id}
          onChange={(event) => selectTheme(event.target.value)}
          className="h-8 rounded-control border bg-surface px-2 text-sm text-text-primary shadow-control hover:bg-surface-hover"
        >
          {groups.map(({ scheme, label }) => (
            <optgroup key={scheme} label={label}>
              {themes
                .filter((theme) => theme.scheme === scheme)
                .map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
    </div>
  );
}
