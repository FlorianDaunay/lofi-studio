import { create } from "zustand";

export const PAGES = ["studio", "library", "playlists", "share", "learn"] as const;
export type Page = (typeof PAGES)[number];

interface NavigationState {
  page: Page;
  go: (page: Page) => void;
}

const isPage = (value: unknown): value is Page => PAGES.includes(value as Page);

/** Which page is showing. Deliberately not persisted: the app always opens on the Studio. */
export const useNavigation = create<NavigationState>()((set, get) => ({
  page: "studio",
  go: (page) => {
    if (page === get().page) return;
    // Each page is a history entry, so the Android back button (and the mouse back button) go back a page.
    history.pushState({ page }, "");
    set({ page });
  },
}));

/** Follows the browser history (back / forward) into the store. Returns a cleanup function. */
export function startHistorySync(): () => void {
  history.replaceState({ page: useNavigation.getState().page }, "");
  const onPop = (event: PopStateEvent) => {
    const page: unknown = (event.state as { page?: unknown } | null)?.page;
    useNavigation.setState({ page: isPage(page) ? page : "studio" });
  };
  window.addEventListener("popstate", onPop);
  return () => window.removeEventListener("popstate", onPop);
}
