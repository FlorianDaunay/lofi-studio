import { ArrowLeftRight, GraduationCap, Library, ListMusic, SlidersHorizontal, type LucideIcon } from "lucide-react";
import type { Page } from "@/state/navigation";

/** The main pages, in menu order: shared by the desktop sidebar and the phone tab bar. */
export const NAV_ITEMS: readonly { page: Page; label: string; icon: LucideIcon }[] = [
  { page: "studio", label: "Studio", icon: SlidersHorizontal },
  { page: "library", label: "Library", icon: Library },
  { page: "playlists", label: "Playlists", icon: ListMusic },
  { page: "share", label: "Share", icon: ArrowLeftRight },
  { page: "learn", label: "Learn", icon: GraduationCap },
];
