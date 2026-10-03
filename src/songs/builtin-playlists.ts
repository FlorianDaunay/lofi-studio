import type { Playlist } from "./types";

/** Playlists that ship with the app, built from the built-in songs. Never saved to the config file. */
const definitions: [id: string, name: string, description: string, songIds: string[]][] = [
  [
    "rainy-day",
    "Rainy Day",
    "Stay in, listen to the rain on the window.",
    ["rainy-study", "cozy-blanket", "paper-lanterns", "neon-rain", "storm-diner", "coffee-steam", "night-shift", "train-window"],
  ],
  [
    "deep-work",
    "Deep Work",
    "Steady, quiet grooves that stay out of the way.",
    ["deep-focus", "library-hush", "green-tea", "autumn-letters", "rainy-study", "moonlit-pier"],
  ],
  [
    "late-night",
    "Late Night",
    "Jazz chords, crackle and city lights after midnight.",
    ["midnight-jazz", "late-bus-home", "night-train", "night-shift", "subway-echoes", "neon-rain", "storm-diner", "stargazing"],
  ],
  [
    "wind-down",
    "Wind Down",
    "Slow and soft, for the end of the day.",
    ["snow-globe", "stargazing", "moonlit-pier", "low-tide", "cozy-blanket", "slow-sunrise"],
  ],
  [
    "sunny-side",
    "Sunny Side",
    "Bright keys, open windows, a bit of a bounce.",
    ["rooftop-garden", "sunday-wind", "green-tea", "train-window", "slow-sunrise", "paper-lanterns"],
  ],
  [
    "upbeat",
    "Upbeat",
    "The fastest, busiest grooves in the box.",
    ["arcade-nights", "tape-cafe", "coffee-steam", "subway-echoes", "rooftop-garden", "vinyl-sunday"],
  ],
  [
    "into-the-wild",
    "Into the Wild",
    "Streams, waves, birds and a campfire: lo-fi outdoors.",
    ["forest-creek", "harbor-lights", "campfire-stars", "pond-at-dusk", "sunday-wind", "low-tide"],
  ],
];

export const BUILT_IN_PLAYLISTS: Playlist[] = definitions.map(([id, name, description, songIds]) => ({
  id: `builtin-${id}`,
  name,
  description,
  builtIn: true,
  songIds,
  createdAt: 0,
}));
