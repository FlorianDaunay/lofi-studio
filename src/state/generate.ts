import type { Pattern } from "@/audio";
import { STEPS } from "@/audio";
import { emptyPattern } from "./defaults";

const chance = (p: number) => Math.random() < p;
const pick = (steps: number[], p: number, into: boolean[]) => {
  for (const s of steps) if (chance(p)) into[s] = true;
};

/** A fresh boom-bap groove: fixed backbone (kick on 1, snare on 2 and 4), random ghost notes. */
export function generatePattern(): Pattern {
  const p = emptyPattern();

  p.kick[0] = true;
  pick([7, 10], 0.65, p.kick);
  pick([3, 14], 0.2, p.kick);

  p.snare[4] = true;
  p.snare[12] = true;
  pick([15], 0.2, p.snare);

  for (let i = 0; i < STEPS; i++) p.hat[i] = i % 2 === 0 ? chance(0.9) : chance(0.25);

  p.bass[0] = true;
  pick([3, 6, 7, 10, 11, 14], 0.3, p.bass);

  p.keys[0] = true;
  pick([6, 7, 10], 0.4, p.keys);
  return p;
}
