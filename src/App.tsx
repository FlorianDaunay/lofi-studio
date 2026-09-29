import { MobileNav } from "@/components/layout/MobileNav";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { Sidebar } from "@/components/layout/Sidebar";
import { LearnPage } from "@/pages/LearnPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { PlaylistsPage } from "@/pages/PlaylistsPage";
import { SharePage } from "@/pages/SharePage";
import { StatsPage } from "@/pages/StatsPage";
import { StudioPage } from "@/pages/StudioPage";
import { useNavigation, type Page } from "@/state/navigation";
import { useWindowMode } from "@/state/window";

const PAGE_COMPONENTS: Record<Page, () => React.JSX.Element> = {
  studio: StudioPage,
  library: LibraryPage,
  playlists: PlaylistsPage,
  stats: StatsPage,
  share: SharePage,
  learn: LearnPage,
};

export default function App() {
  const page = useNavigation((s) => s.page);
  const mini = useWindowMode((s) => s.mode === "mini");
  // Desktop: the window shrunk to a mini player. The engine lives on in this page, so it keeps playing.
  if (mini) return <MiniPlayer />;
  const Current = PAGE_COMPONENTS[page];
  return (
    <div className="flex h-full">
      <Sidebar />
      {/* The page scrolls vertically only: a widget that is too wide must scroll inside itself, never pan the whole page. */}
      {/* Relative: absolutely positioned content (e.g. `sr-only` text) is placed in the page, not the window, which would scroll the whole app. */}
      <div className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        {/* Keyed by page so each page starts scrolled to the top and with fresh local state. */}
        {/* On phones the bottom bars cover the end of the page: leave room for them. */}
        <main
          key={page}
          className="mx-auto flex max-w-4xl flex-col gap-5 px-4 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:p-6"
        >
          <Current />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
