import { Sidebar } from "@/components/layout/Sidebar";
import { LearnPage } from "@/pages/LearnPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { PlaylistsPage } from "@/pages/PlaylistsPage";
import { SharePage } from "@/pages/SharePage";
import { StudioPage } from "@/pages/StudioPage";
import { useNavigation, type Page } from "@/state/navigation";

const PAGE_COMPONENTS: Record<Page, () => React.JSX.Element> = {
  studio: StudioPage,
  library: LibraryPage,
  playlists: PlaylistsPage,
  share: SharePage,
  learn: LearnPage,
};

export default function App() {
  const page = useNavigation((s) => s.page);
  const Current = PAGE_COMPONENTS[page];
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="min-w-0 flex-1 overflow-y-auto">
        {/* Keyed by page so each page starts scrolled to the top and with fresh local state. */}
        <main key={page} className="mx-auto flex max-w-4xl flex-col gap-5 p-6">
          <Current />
        </main>
      </div>
    </div>
  );
}
