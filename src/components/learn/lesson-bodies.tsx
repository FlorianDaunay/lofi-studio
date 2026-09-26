import type { ComponentType } from "react";
import type { LessonId } from "@/learn/curriculum";
import { Atmosphere, FirstLoop, PickAMood } from "./lessons/level1";
import { Chords, Groove, Randomize, TempoSwing } from "./lessons/level2";
import { Adsr, FilterLfo, LofiFx } from "./lessons/level3";
import { Look, Save, Share } from "./lessons/level4";

/** The lesson bodies, keyed by the ids of `learn/curriculum.ts` (the compiler flags a missing one). */
export const LESSON_BODIES: Record<LessonId, ComponentType> = {
  "first-loop": FirstLoop,
  "pick-a-mood": PickAMood,
  atmosphere: Atmosphere,
  "tempo-swing": TempoSwing,
  groove: Groove,
  chords: Chords,
  randomize: Randomize,
  adsr: Adsr,
  "filter-lfo": FilterLfo,
  "lofi-fx": LofiFx,
  save: Save,
  share: Share,
  look: Look,
};
