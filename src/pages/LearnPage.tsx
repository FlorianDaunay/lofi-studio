import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LESSON_BODIES } from "@/components/learn/lesson-bodies";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { LESSONS, LEVELS, type LessonId } from "@/learn/curriculum";
import { cn } from "@/lib/utils";
import { useLearning } from "@/state/learning";

/** Four levels of short, interactive lessons: everything inside operates the real studio. */
export function LearnPage() {
  const done = useLearning((s) => s.done);
  const toggle = useLearning((s) => s.toggle);

  // Open on the first lesson that is not done yet.
  const [lessonId, setLessonId] = useState<LessonId>(() => (LESSONS.find((l) => !done.includes(l.id)) ?? LESSONS[0]!).id);

  const index = LESSONS.findIndex((l) => l.id === lessonId);
  const lesson = LESSONS[index]!;
  const level = LEVELS[lesson.levelIndex]!;
  const next = LESSONS[index + 1];
  const Body = LESSON_BODIES[lesson.id];
  const isDone = done.includes(lesson.id);
  const doneCount = LESSONS.filter((l) => done.includes(l.id)).length;

  return (
    <>
      <PageHeader title="Learn" description="Four short levels, from your first loop to sharing your own songs. No music theory needed." />

      <div className="surface flex flex-wrap items-center gap-4 p-4">
        <div className="min-w-48 flex-1">
          <p className="text-sm font-medium">
            {doneCount} of {LESSONS.length} lessons done
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-pill bg-surface-hover" role="progressbar" aria-label="Lessons done" aria-valuemin={0} aria-valuemax={LESSONS.length} aria-valuenow={doneCount}>
            <div className="h-full rounded-pill bg-accent transition-all" style={{ width: `${(doneCount / LESSONS.length) * 100}%` }} />
          </div>
        </div>
        <p className="text-xs text-text-muted">Everything you tweak here is the real studio, so your sound carries over.</p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[16rem_1fr]">
        {/* Phones: the list of lessons would push the lesson off screen, a picker takes one line. */}
        <Select label="Lesson" value={lessonId} onChange={(event) => setLessonId(event.target.value as LessonId)} className="h-11 lg:hidden">
          {LEVELS.map((lv, levelIndex) => (
            <optgroup key={lv.id} label={`Level ${levelIndex + 1} · ${lv.title}`}>
              {lv.lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {done.includes(l.id) ? "✓ " : ""}
                  {l.title}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <nav aria-label="Lessons" className="hidden flex-col gap-4 lg:flex">
          {LEVELS.map((lv, levelIndex) => (
            <section key={lv.id}>
              <h2 className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wider text-text-muted">
                Level {levelIndex + 1} · {lv.title}
              </h2>
              <ul className="flex flex-col gap-1">
                {lv.lessons.map((l) => {
                  const active = l.id === lessonId;
                  const finished = done.includes(l.id);
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        aria-current={active ? "step" : undefined}
                        onClick={() => setLessonId(l.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-control border px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover",
                          active ? "border-accent bg-accent/10" : "border-transparent",
                        )}
                      >
                        <span
                          className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border text-[10px]", finished && "border-success bg-success text-accent-foreground")}
                          aria-hidden
                        >
                          {finished ? <Check className="h-3 w-3" /> : ""}
                        </span>
                        <span className="flex-1">{l.title}</span>
                        <span className="sr-only">{finished ? "(done)" : ""}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>

        <article key={lesson.id} aria-label={lesson.title} className="surface flex min-w-0 flex-col gap-5 p-4 sm:p-6">
          <header>
            <p className="text-xs uppercase tracking-wider text-accent">
              Level {lesson.levelIndex + 1} · {level.title} · Lesson {lesson.indexInLevel + 1} of {level.lessons.length}
            </p>
            <h2 className="text-xl font-semibold tracking-tight">{lesson.title}</h2>
            <p className="text-sm text-text-muted">{lesson.summary}</p>
          </header>

          <Body />

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <Button variant={isDone ? "secondary" : "primary"} onClick={() => toggle(lesson.id)} aria-pressed={isDone}>
              <Check className="h-4 w-4" aria-hidden />
              {isDone ? "Done" : "Mark as done"}
            </Button>
            {next && (
              <Button onClick={() => setLessonId(next.id)}>
                Next: {next.title}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </footer>
        </article>
      </div>
    </>
  );
}
