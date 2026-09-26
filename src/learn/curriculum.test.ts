import { describe, expect, it } from "vitest";
import { sanitizeLearned } from "@/state/learning";
import { LESSON_IDS, LESSONS, LEVELS } from "./curriculum";

describe("curriculum", () => {
  it("has unique lesson ids across four levels", () => {
    expect(LEVELS).toHaveLength(4);
    expect(new Set(LESSON_IDS).size).toBe(LESSONS.length);
  });

  it("keeps only known lessons, once each, when reading saved progress", () => {
    expect(sanitizeLearned(["groove", "groove", "nope", 3, "adsr"])).toEqual(["groove", "adsr"]);
    expect(sanitizeLearned("groove")).toEqual([]);
    expect(sanitizeLearned(undefined)).toEqual([]);
  });
});
