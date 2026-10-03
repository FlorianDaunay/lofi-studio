import type { AmbienceLayerId } from "../types";
import type { AmbienceLayer } from "./layer";
import { Birds, Crickets, Frogs, Leaves } from "./nature";
import { City, Clock, Fire, Train, Vinyl } from "./places";
import { Chimes, Rain, Stream, Thunder, Waves, Wind } from "./weather";

export type { AmbienceLayer } from "./layer";

const LAYERS: Record<AmbienceLayerId, new (lowPower: boolean) => AmbienceLayer> = {
  rain: Rain,
  wind: Wind,
  thunder: Thunder,
  waves: Waves,
  stream: Stream,
  chimes: Chimes,
  birds: Birds,
  crickets: Crickets,
  frogs: Frogs,
  leaves: Leaves,
  vinyl: Vinyl,
  fire: Fire,
  clock: Clock,
  city: City,
  train: Train,
};

/** One instance of every layer. They stay silent and hold no sources until their level is raised. */
export function createAmbience(lowPower: boolean): Record<AmbienceLayerId, AmbienceLayer> {
  return Object.fromEntries(Object.entries(LAYERS).map(([id, Layer]) => [id, new Layer(lowPower)])) as Record<AmbienceLayerId, AmbienceLayer>;
}
