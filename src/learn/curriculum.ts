/**
 * The tutorial's table of contents: pure data, so the saved progress can be validated without
 * loading any UI. The lesson bodies live in `components/learn` and are keyed by these ids.
 */

export const LEVELS = [
  {
    id: "first-steps",
    title: "First steps",
    blurb: "Press play, pick a mood, add some weather.",
    lessons: [
      { id: "first-loop", title: "Your first loop", summary: "What you hear, and where it comes from." },
      { id: "pick-a-mood", title: "Pick a mood", summary: "Songs, and the four pinned on the Studio." },
      { id: "atmosphere", title: "Add atmosphere", summary: "Rain, vinyl crackle and wind, made from noise." },
    ],
  },
  {
    id: "make-it-yours",
    title: "Make it yours",
    blurb: "Tempo, rhythm and chords: the parts of a song.",
    lessons: [
      { id: "tempo-swing", title: "Tempo and swing", summary: "Why lo-fi feels lazy." },
      { id: "groove", title: "Draw a groove", summary: "The step sequencer, one bar at a time." },
      { id: "chords", title: "Chords and progressions", summary: "The notes that carry the mood." },
      { id: "randomize", title: "Let luck help", summary: "Reshuffle part of a song, then undo." },
    ],
  },
  {
    id: "sound-design",
    title: "Sound design",
    blurb: "Choose the instruments, shape them, dirty them up.",
    lessons: [
      { id: "instruments", title: "Pick your band", summary: "Five instruments, each with a choice of voices." },
      { id: "adsr", title: "Shape a note", summary: "Attack, decay, sustain, release." },
      { id: "filter-lfo", title: "Filter and wobble", summary: "A knob that turns by itself." },
      { id: "lofi-fx", title: "The lo-fi recipe", summary: "Muffle, wobble, warmth and room." },
    ],
  },
  {
    id: "your-library",
    title: "Your library",
    blurb: "Keep your songs, share them, dress the app.",
    lessons: [
      { id: "save", title: "Save and organise", summary: "From a tweak to a pinned song." },
      { id: "share", title: "Share a song", summary: "What is inside a share code." },
      { id: "look", title: "Make it look yours", summary: "Themes." },
    ],
  },
] as const;

export type Level = (typeof LEVELS)[number];
export type LessonId = Level["lessons"][number]["id"];

export const LESSONS = LEVELS.flatMap((level, levelIndex) =>
  level.lessons.map((lesson, indexInLevel) => ({ ...lesson, levelIndex, indexInLevel })),
);

export const LESSON_IDS: readonly LessonId[] = LESSONS.map((lesson) => lesson.id);
export const isLessonId = (value: unknown): value is LessonId => LESSON_IDS.includes(value as LessonId);
