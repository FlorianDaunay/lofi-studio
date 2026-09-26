import { create } from "zustand";
import { isLessonId, type LessonId } from "@/learn/curriculum";

interface LearningState {
  /** Lessons the user marked as done. */
  done: LessonId[];
  toggle: (id: LessonId) => void;
  hydrate: (done: unknown) => void;
}

export const useLearning = create<LearningState>()((set) => ({
  done: [],
  toggle: (id) => set((s) => ({ done: s.done.includes(id) ? s.done.filter((d) => d !== id) : [...s.done, id] })),
  hydrate: (done) => set({ done: sanitizeLearned(done) }),
}));

/** Only known lesson ids survive, without duplicates (the curriculum may change between versions). */
export const sanitizeLearned = (raw: unknown): LessonId[] =>
  Array.isArray(raw) ? [...new Set(raw.filter(isLessonId))] : [];
