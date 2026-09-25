import { AdvancedPanels } from "@/components/studio/AdvancedPanels";
import { Ambience } from "@/components/studio/Ambience";
import { Presets } from "@/components/studio/Presets";
import { ThemePicker } from "@/components/studio/ThemePicker";
import { Transport } from "@/components/studio/Transport";

export default function App() {
  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto flex max-w-4xl flex-col gap-5 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Lofi Studio</h1>
            <p className="text-xs text-text-muted">Every sound is synthesized live. No samples.</p>
          </div>
          <ThemePicker />
        </header>
        <Transport />
        <Presets />
        <Ambience />
        <AdvancedPanels />
      </main>
    </div>
  );
}
