import {
  BellRing,
  Bird,
  Bug,
  Building,
  Clock,
  CloudLightning,
  CloudRain,
  Disc3,
  Droplets,
  Flame,
  Leaf,
  Sprout,
  TrainFront,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { AmbienceLayerId } from "@/audio";

export interface AmbienceLabel {
  label: string;
  icon: LucideIcon;
  hint: string;
}

/** Display name, icon and a one-line description of every ambience layer. */
export const AMBIENCE_LABELS: Record<AmbienceLayerId, AmbienceLabel> = {
  rain: { label: "Rain", icon: CloudRain, hint: "A soft wash with gentle droplets" },
  wind: { label: "Wind", icon: Wind, hint: "Slowly drifting gusts" },
  thunder: { label: "Thunder", icon: CloudLightning, hint: "Distant rumbles every half minute or so" },
  waves: { label: "Ocean waves", icon: Waves, hint: "Swells breaking and washing back" },
  stream: { label: "Stream", icon: Droplets, hint: "A babbling creek" },
  chimes: { label: "Wind chimes", icon: BellRing, hint: "Chimes in tune with the chords; more with the wind" },
  birds: { label: "Birds", icon: Bird, hint: "Chirps, trills and whistles" },
  crickets: { label: "Crickets", icon: Bug, hint: "Night insects at different distances" },
  frogs: { label: "Frogs", icon: Sprout, hint: "Croaks from a pond at night" },
  leaves: { label: "Leaves", icon: Leaf, hint: "Foliage rustling in gusts" },
  vinyl: { label: "Vinyl", icon: Disc3, hint: "Crackle, pops and hiss" },
  fire: { label: "Fireplace", icon: Flame, hint: "The roar of the flames and warm crackles" },
  clock: { label: "Clock", icon: Clock, hint: "Tick-tock on the beat" },
  city: { label: "City night", icon: Building, hint: "Traffic hum and passing cars" },
  train: { label: "Train ride", icon: TrainFront, hint: "Cabin rumble and rail clacks on the beat" },
};

/** The layers by kind, in the order the picker shows them. */
export const AMBIENCE_GROUPS: readonly { label: string; layers: readonly AmbienceLayerId[] }[] = [
  { label: "Weather & water", layers: ["rain", "wind", "thunder", "waves", "stream", "chimes"] },
  { label: "Nature", layers: ["birds", "crickets", "frogs", "leaves"] },
  { label: "Indoors & city", layers: ["vinyl", "fire", "clock", "city", "train"] },
];
