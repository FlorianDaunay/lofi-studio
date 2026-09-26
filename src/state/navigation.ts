import { create } from "zustand";

export const PAGES = ["studio", "library", "share", "learn"] as const;
export type Page = (typeof PAGES)[number];

interface NavigationState {
  page: Page;
  go: (page: Page) => void;
}

/** Which page is showing. Deliberately not persisted: the app always opens on the Studio. */
export const useNavigation = create<NavigationState>()((set) => ({
  page: "studio",
  go: (page) => set({ page }),
}));
