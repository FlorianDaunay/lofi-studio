# Lofi Studio: working notes for Claude

Lo-Fi mini-studio for desktop and Android. Tauri 2 (Rust) shell, React 19 + TypeScript front end, Tone.js audio, Zustand state, Tailwind 3 + Radix primitives. **All sound is synthesized live: never add audio samples or load audio files.**

## Commands

| Task | Command |
| --- | --- |
| Desktop app (dev) | `npm run tauri dev` |
| Browser only (dev) | `npm run dev` (config falls back to `localStorage`, file dialogs to download/`<input>`) |
| Typecheck | `npm run typecheck` |
| Unit tests | `npm test` (Vitest, pure logic in `src/songs`) and `cargo test` in `src-tauri/` |
| Production build | `npm run build`, `npm run tauri build` |
| Android APK | `npm run tauri android build -- --apk` (needs `NDK_HOME`); CI: `.github/workflows/android.yml` |

Before saying a change is done: `npm run typecheck && npm test`; if Rust changed, also `cargo test` in `src-tauri/`. For UI changes, actually drive the app (Playwright against `vite preview` works; see "Verifying UI").

## Architecture (dependencies flow downward only)

```
src/components, src/pages   UI. Reads stores, calls actions. No audio, no persistence code.
src/state                   Zustand stores + actions + persistence wiring.
src/songs                   Song domain: types, defaults, built-ins, chords, sanitizers, share format. Pure TS.
src/learn                   Tutorial curriculum (levels + lesson ids). Pure data.
src/audio                   AudioEngine. No React, no Zustand, no import from src/state or src/songs.
src/lib                     Thin adapters: Tauri invoke, files, runtime detection.
src/themes                  Design-token theme system (user-owned, keep its conventions).
src-tauri                   Rust: window, CSP, config persistence, file dialogs.
```

- **`src/audio`**: `AudioEngine` receives an immutable `EngineParams` via `update()` and diffs by reference. Nothing is created until the first `play()` (user gesture). `stop()` fades, halts transport + noise sources, then suspends the context. `dispose()` releases everything. Do not import Tone at module scope anywhere except `src/audio`.
- **`src/songs`**: a `Song` = `{ id, name, description, createdAt, builtIn, params }`. `params` is `EngineParams` minus `volume` (volume belongs to the listener). Built-ins live in `builtin.ts` and are never persisted. Import value types from `@/audio/types` (not the `@/audio` index) so this folder stays free of Tone and testable in Node.
- **Instruments**: keys, bass, drums, pad, lead (melody). Each has a `voice` (`KEYS_VOICES`, `BASS_VOICES`, `DRUM_KITS`, `PAD_VOICES`, `LEAD_VOICES` in `audio/types.ts`); the engine swaps the synth, the params stay the same. Pad and lead default to level 0 so songs saved before them sound unchanged. The lead plays chord tones on the `lead` pattern row (`leadMidi` in `audio/music.ts`). Voice labels live in `components/studio/instrument-labels.ts`.
- **Chords** (`songs/chords.ts`): a progression is 1 to 8 `Chord`s (`pc` 0 to 11 + `quality`), one per bar. Write static progressions as text (`parseProgression("Dm9 G13 Cmaj7 A7")`). Every chord quality needs a voicing in `audio/music.ts` and an entry in `QUALITY_INFO`.
- **Built-in songs** (`songs/builtin.ts`): 24 songs from a compact `Definition`; the first four are the default pinned ones. Tests check they are valid, 60 to 96 BPM, have some ambience, use every voice, and that every pair differs in at least 5 of 10 audible traits (voices, kit, tempo band, chords, swing feel, dominant ambience...). A new song must pass that. Keep names and id slugs unique (ids are referenced by pins, playlists and shares).
- **Built-in playlists** (`songs/builtin-playlists.ts`): ids `builtin-*`, never persisted, read-only (the UI offers a copy). `findPlaylist` / `allPlaylists` in `state/library.ts` cover both kinds.
- **Randomization** (`songs/randomize.ts`) draws only from curated lists and soft ranges, takes an injectable RNG, and must never change volume or instrument levels. Its tests assert that every result survives `sanitizeParams` unchanged: keep new random ranges inside `RANGES`.
- **Untrusted input** (config file, imported songs) must go through `songs/sanitize.ts` / `state/config.ts`. They rebuild every field and clamp to `songs/ranges.ts`. If you add a param: add it to `EngineParams`, `DEFAULT_PARAMS`, `sanitizeParams`, `RANGES` (if numeric), the engine, the UI, and a test.
- **Layout**: `md` and up shows the sidebar (`layout/Sidebar.tsx`); below it, phones get `layout/MobileNav.tsx` (player bar + tab bar, fixed at the bottom). Both read `layout/nav-items.ts`. Pages must not overflow horizontally at 360 px: wide widgets scroll inside themselves (see `StepGrid`). Navigation pushes history entries (`startHistorySync`) so the Android back button goes back a page. Touch sizes grow under `[@media(pointer:coarse)]`.
- **Stores**: `useStudio` (live sound, current song, dirty flag, playback state), `useLibrary` (user songs, playlists, 4 pinned slot ids), `usePlayer` (source, shuffle, repeat), `useNavigation` (current page, not persisted). Stores never import each other; cross-store operations live in `state/actions.ts`. Components select the smallest slice they need.
- **Playlists and player**: `songs/playlists.ts` (pure edits + sanitizer; `MAX_PLAYLISTS` / `MAX_PLAYLIST_SONGS` keep `config.json` under the Rust 1 MB cap) and `songs/playback.ts` (queue, next / previous, repeat, `loopsFor`). `state/playback.ts` applies them: it loads the next song and calls `engine.restartLoop()`; `startPlayback()` auto-advances after `loopsFor` loops and never while the sound is dirty or unsaved. Deleting a song prunes it from playlists.
- **Cover art** (`songs/cover.ts`, `components/library/cover/`): a scene is a pure, continuous function of `SongParams` (no hashing, no randomness), so close params give close covers; `sceneDistance` and its tests guard that. The only discrete part is the `world` (argmax of `worldScores`, driven by ambience and voices); a test checks every world is used by at least two built-ins. `cover/paint.ts` is the one place colors are computed (derived from the song, not the theme). Adding a param that should show on covers means adding it to `coverScene`.
- **Persistence**: `state/persist.ts` restores before first render and autosaves (debounced) to `config.json` through the Rust `load_config` / `save_config`. Theme preference is the exception: `src/themes/store.ts` keeps it in `localStorage`.
- **Sharing**: `songs/share.ts`: `{format:"lofi-studio", version, songs, playlists?}` JSON. Version 1 = songs only (still written when there are no playlists, for older apps); version 2 adds playlists whose items are `{song: index}` or `{builtIn: id}`. Codes are `lofi2:` + base64url(deflate-raw) (`lofi1:` plain base64 still read); both are async. Importing goes through `songs/import-plan.ts` (pure: which songs to add, which identical ones to reuse) and `state/actions.ts` `importShare`. Files go through Rust dialogs (`files.rs`); the frontend never chooses a path.

## Tutorial ("Learn" page)

- `src/learn/curriculum.ts` lists levels and lessons (ids are the source of truth); `components/learn/lesson-bodies.tsx` maps every id to its body (a `Record<LessonId, ...>`: the compiler flags a missing one); bodies live in `components/learn/lessons/levelN.tsx`; diagrams in `components/learn/*.tsx`.
- **To add a lesson**: add it to the curriculum, write its body, add it to `lesson-bodies.tsx`. Progress (`useLearning.done`) is persisted and filtered to known ids, so renaming an id resets that lesson only.
- Every lesson must contain a `<Try>` block that operates the *real* studio (no fake demos) and must not repeat another lesson's widget. Text is short, plain English, no unexplained jargon; a term is bold the first time it appears in a lesson.
- Diagrams that depend on params read them from `useStudio`, so they stay live. Respect `prefers-reduced-motion` in animations.

## Conventions

- Strict TypeScript. No `any`, no non-null `!` on user data. Path alias `@/` = `src/`.
- Style with theme tokens only: `bg-surface`, `text-text-muted`, `border` (color/width come from the theme), `rounded-card`, `shadow-control`, `.surface` for panels. **Never hard-code colors or radii.** To add a token, follow the header comment in `src/themes/tokens.ts`.
- Themes: drop a file in `src/themes/definitions/` that default-exports `defineTheme(...)` (or an array). It is registered automatically. Do not edit `registry.ts` for that.
- UI primitives (`components/ui`) are shadcn-style wrappers over Radix; every dialog needs a title and description; icon-only buttons need `aria-label`.
- Components with hot per-item updates (e.g. step grid cells) select a boolean, not the whole state, to avoid re-rendering everything each step.
- Comments explain *why*, not what. English in code and UI.
- One responsibility per file; a component file exports one main component.
- New features get: types in `songs`/`state`, logic covered by a Vitest test when it parses or transforms data, and the README updated.

## Rust / Tauri rules

- `run()` is the mobile entry point too (`#[cfg_attr(mobile, tauri::mobile_entry_point)]`); window size/title/drag-drop options are `#[cfg(desktop)]`.
- `src-tauri/gen/android` is committed (regenerate with `tauri android init` only if needed, then re-apply: `MainActivity.kt` window insets, the `keystore.properties` signing block in `app/build.gradle.kts`, launcher icons from `tauri icon`). `gen/schemas` is ignored.
- `tauri-plugin-fs` is used from Rust only (`files.rs`, to open Android `content://` URIs); never grant fs permissions to the webview.

- The window is built in `src-tauri/src/lib.rs` (not in `tauri.conf.json`) so `on_navigation` can block external URLs. Keep it that way.
- Capabilities stay minimal (`capabilities/default.json`). Do not enable fs/shell/http plugins for JS. New file access = a purpose-built Rust command that opens the dialog itself.
- Any command that takes data from the webview validates size and shape (`config.rs` shows the pattern: size cap, JSON check, atomic write).
- Release profile is tuned for size (`opt-level="s"`, LTO, `panic="abort"`, `strip`). Keep dependencies minimal.
- Keep the CSP in `tauri.conf.json` strict: Tone.js needs `worker-src blob:`; nothing else should be loosened.

## Pitfalls

- TypeScript 7 is installed: `baseUrl` is not allowed; use `paths` with `./`.
- `src/themes` was written without `noUncheckedIndexedAccess`; do not turn it on.
- Shell heredocs containing apostrophes can break in the Bash tool; use the Write tool for source files.
- StrictMode mounts effects twice: anything started in an effect (`startBridge`, `startAutosave`) must return a working cleanup.
- Hot reload: `bridge.ts` disposes the engine via `import.meta.hot.dispose`, otherwise AudioContexts leak.

## Verifying UI

Build, serve, and drive with `playwright-core` + the installed Edge (`executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"`, launch arg `--autoplay-policy=no-user-gesture-required`). Screenshots for the README live in `docs/screenshots/`; regenerate them when the UI changes noticeably.

## Repo hygiene

Commit only when asked. Do not commit `dist/`, `node_modules/`, `src-tauri/target/`. Commit messages end with the co-author trailer the harness requests.
