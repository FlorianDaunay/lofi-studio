# Lofi Studio

A modular Lo-Fi mini-studio for the desktop (Windows, macOS) and Android. **Every sound is synthesized live** (jazzy keys, bass, drums and hand percussion, pads, melodies, and fifteen ambience layers from rain to a crackling fireplace) with Tone.js and the Web Audio API. No samples, no audio files.

Tauri 2 (Rust) · React 19 · TypeScript · Zustand · Tone.js · Tailwind 3 + Radix.

![Studio](docs/screenshots/studio.png)

## Features

- **One-click moods.** 30 built-in songs (60–96 BPM), each with its own band, groove, chords and weather; a test makes sure no two sound alike. Four of them are pinned on the Studio page. Choose which four.
- **A small band, each player with its own voices.** Keys (electric piano, felt piano, organ, nylon guitar, vibraphone, Wurlitzer, kalimba), bass (sub, upright, synth, fretless with glide), drums (boom bap, brushes, deep 808, dusty) plus hand percussion on its own sequencer row (shaker, rim, congas, claps), a pad that swells under the chords (warm, strings, air) and a melody on its own row (flute, music box, square, muted trumpet, whistle) that always picks notes from the current chord.
- **Procedural sound.** Keys through a low-pass + LFO wobble and chorus, a filter-enveloped bass, synthesized drums, and fifteen ambience layers, picked from chips and mixed with one slider each: rain, wind, thunder, ocean waves, a stream, wind chimes (in tune with the chords, ringing more with the wind), birds, crickets, frogs, leaves, vinyl, a fireplace, a clock and a train (both on the beat), and a city at night. They are noise buffers and short synthesized events, and a layer holds no audio nodes until it is turned up.
- **Two levels of control.** Minimal by default; expandable panels for the 16-step sequencer (tempo, swing, humanize), a **chord editor** (one chord per bar, up to eight bars, ready-made progressions), instruments (one tab each: voice, level, waveform, ADSR envelope, filter, LFO, pad fade-in, melody echo) and lo-fi effects (tape wobble, warmth, reverb, master low-pass, bit crush, sidechain pump). Transpose moves a whole song to another key.
- **Randomize menu.** New groove, new chords, new sound or "Surprise me", each drawn from musically safe choices (curated jazzy progressions, soft ranges), never touching volume or levels. Up to five undos.
- **Library.** Every song as a card with its length, tempo, loops and chords: *Play* starts it, *Open in Studio* edits it, and the ⋯ menu pins, adds to a playlist, copies, renames, exports or deletes. Save any sound as a song. In the Studio, *Save* updates your song (on a built-in song it makes your own copy, the original never changes) and *Save as…* makes a new one.
- **Playlists.** Each song shows its length and the total adds them up. Six built-in playlists (Rainy Day, Deep Work, Late Night...) plus your own: group any songs, reorder them, play them from the Playlists page or the Studio. Built-in playlists can be copied to edit.
- **Player.** Previous / next, shuffle, repeat (off, all, this song) and a source picker (whole library or one playlist). Each song sets its own **length** as a number of loops (so it always ends on its last chord), shown as the resulting time; new songs start at about two minutes. When a song has played its loops the next one starts; auto-advance never replaces a sound with unsaved edits.
- **Generated covers.** Every song gets its own cover, drawn from its params, so songs that sound alike look alike. The sound picks a world (city, sea, mountains, forest, desert, fields) with one landmark per chord; the key sets the colors, a dark tone brings the night and a moon, the pad adds clouds, the melody birds, the ambience rain and wind, and the pattern shows as a strip at the bottom. A playlist cover is a strip of slices cut from its songs' covers. Nothing is stored: covers are recomputed.
- **Backup.** Share > Backup saves everything (songs, playlists, pins, player, tutorial, stats, theme) to one file and restores it, after showing what is inside. On Android, the system's automatic backup also keeps `config.json` and the theme across a reinstall (when Google backup is on).
- **Share.** Send songs *and playlists* as a `.lofi.json` file or as a short compressed code you can paste in a chat. Pick what to send from cover tiles; when receiving, drop a file or paste a code to see what is inside before adding it. Songs you already have are not duplicated.
- **Plays in the background.** On Android the music goes on with the screen off or another app open, with a media notification (also on the lock screen and headset buttons) for previous / play-pause / next; it pauses for calls and when headphones are unplugged. On the desktop, closing the window while music plays hides it in the tray (next to the clock), whose menu plays, skips, reopens or quits. With nothing playing, the app keeps no background task: Android may reclaim it, and closing the desktop window quits.
- **Mini player (desktop).** Shrink the window to a small always-on-top player (sidebar or tray menu): cover, title, previous / play / next, elapsed / total time with a progress line through the whole song, back to the full app, or hide to the tray.
- **Sleep timer.** Next to shuffle and repeat: stop in 15 minutes to 1.5 hours, or at the end of the song, with a slow fade. It keeps time on the audio clock too, so it works in the background.
- **Media keys.** The keyboard's play / pause, next and previous keys and headphone buttons (wired or Bluetooth) control the app, even when it is not focused or hidden in the tray, and the Windows media flyout and macOS Now Playing show the song (Windows, macOS and Android; in a browser, only while the page has the focus). On Android the notification and lock-screen player show the song's cover, a progress bar with its length, and the theme's accent.
- **Stats.** A dashboard of how you use the app, for the last 7 days, 30 days, 90 days or 12 months: listening and studio time with their trend vs the previous period, songs started, your streak, an activity chart, top songs (pick one for its all-time numbers: plays, how often it is heard to the end, time spent editing it), when you listen (weekday × hour), where you play from, the average of your sound (a radar of swing, looseness, warmth, wobble, reverb, tone; tempo spread; favorite instruments; ambience) and your time in the studio. **Made for you** generates a new song from that profile (your favorite voices, tempo, texture and ambience), to play, reroll or save. Only totals are stored, locally, in `config.json`.
- **Android.** A phone layout (bottom tab bar and player, touch-sized controls, back button support) and a GitHub Actions workflow that builds an installable APK.
- **Interactive tutorial.** Fourteen short lessons in four levels, from the first loop to sharing songs. Every lesson embeds the real controls plus a live diagram (signal path, swing, piano keys of the current chord, filter wobble), and progress is remembered.
- **59 themes** with live previews, searchable, light/dark, optional "match system".

| Library | Share |
| --- | --- |
| ![Library](docs/screenshots/library.png) | ![Share](docs/screenshots/share.png) |

| Playlists | Playlist |
| --- | --- |
| ![Playlists](docs/screenshots/playlists.png) | ![One playlist](docs/screenshots/playlist-detail.png) |

| Instruments | On a phone |
| --- | --- |
| ![Instruments panel](docs/screenshots/instruments.png) | ![Phone layout](docs/screenshots/phone.png) |

| Appearance | Another theme |
| --- | --- |
| ![Appearance](docs/screenshots/appearance.png) | ![Studio in a dark theme](docs/screenshots/studio-dark.png) |

| Chord editor | Tutorial |
| --- | --- |
| ![Chord editor](docs/screenshots/chords.png) | ![Tutorial lesson on the filter wobble](docs/screenshots/learn-lfo.png) |

## Using it

1. **Studio**: press play, click a pinned song, add rain or vinyl. Open *Advanced* to edit the groove, the chords and the instruments. Once you changed something, *Save* updates your song, *Save as…* stores a new one.
2. **Library**: all your songs and the built-in ones. The pin button assigns a song to one of the four Studio slots.
3. **Playlists**: create one here or with the playlist button on any song, add and reorder songs, then press *Play*. The Studio has previous / next, shuffle, repeat and the source picker.
4. **Share**: under *Send*, tick songs or playlists, then *Copy code* or *Save file…*. Under *Receive*, drop or open a file, or paste a code, untick what you do not want and add the rest. Nothing is ever overwritten.
5. **Stats**: pick a period at the top; hover (or tab through) the charts for the exact numbers, click a song in *Top songs* for its details.
6. **Learn**: start at level 1 if music is new to you; each lesson is hands-on.
7. **Appearance** (bottom of the sidebar, *Theme* on a phone): pick a theme.
8. **In the background**: on a phone, press Home or turn the screen off; the notification controls the music. On the desktop, close the window while playing (or use *Mini player* in the sidebar); left-click the tray icon to bring it back, right-click for the menu. Quit from the tray menu.

## Run

```bash
npm install
npm run tauri dev      # desktop app
npm run dev            # browser only (config falls back to localStorage)
npm run tauri build    # release bundle
```

Requires Node 20+ and a Rust toolchain (plus WebView2 on Windows).

```bash
npm run typecheck && npm test      # front end
cd src-tauri && cargo test         # Rust
```

## Android

The APK is built by [`.github/workflows/android.yml`](.github/workflows/android.yml): push a `v*` tag and the APK is attached to that tag's draft release, or run the workflow by hand and download it from the run's artifacts.

To sign it with your own key (so each new APK installs over the previous one), create a keystore once and add three repository secrets:

```bash
keytool -genkeypair -keystore release.jks -alias lofi-studio -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.jks   # -> ANDROID_KEYSTORE_BASE64
```

`ANDROID_KEYSTORE_PASSWORD` is the password you chose and `ANDROID_KEY_ALIAS` is `lofi-studio`. Without these secrets the workflow signs with a throwaway key: the APK installs, but updating means uninstalling first.

Locally (Android SDK, NDK and the Rust Android targets installed, `NDK_HOME` set):

```bash
npm run tauri android build -- --apk            # release, all ABIs
npm run tauri android build -- --apk --debug --target aarch64
```

## macOS

[`.github/workflows/macos.yml`](.github/workflows/macos.yml) builds one universal app (Apple silicon and Intel) in a `.dmg`: push a `v*` tag and it is attached to the draft release, or run the workflow by hand and download it from the run's artifacts. It is the same app as on Windows: menu-bar icon and menu, mini player, playing on with the window closed (the Dock icon brings it back), media keys and Now Playing.

Signing is optional: set `APPLE_CERTIFICATE` (base64 of a Developer ID Application `.p12`), `APPLE_CERTIFICATE_PASSWORD` and `APPLE_SIGNING_IDENTITY` to sign, plus `APPLE_ID`, `APPLE_PASSWORD` (app-specific) and `APPLE_TEAM_ID` to notarize. Without them the app is ad-hoc signed and macOS asks to confirm its first launch: System Settings > Privacy & Security > Open Anyway.

## Project layout

| Path | Role |
| --- | --- |
| `src/audio/` | `AudioEngine` and its parts (instruments, ambience, procedural noise, music helpers). No React, no store: it receives an immutable `EngineParams` snapshot. |
| `src/songs/` | The song domain: types, defaults, built-in songs and playlists, play queue and song timing, cover art scenes, usage stats and their insights, sanitizers for untrusted input, share format and import planning. Pure TypeScript, unit-tested. |
| `src/state/` | Zustand stores (studio, library, player, stats, navigation, window mode), the queue / auto-advance logic (`playback.ts`), usage tracking (`activity.ts`), cross-store actions, persistence, audio wiring and the sync with the system's media controls (`media.ts`). |
| `src/learn/` | The tutorial curriculum (levels and lesson ids). The lesson bodies live in `src/components/learn/`. |
| `src/pages/`, `src/components/` | Pages (Studio, Library, Playlists, Stats, Share, Learn) and their components; `ui/` holds the shadcn-style primitives on Radix. |
| `src/themes/` | Design-token theme system: add a file in `definitions/` to add a theme. |
| `src-tauri/` | Rust shell: locked-down window and CSP, atomic config persistence, native file dialogs (also on Android), the tray icon and mini player (desktop), Windows and macOS media keys (`smtc.rs`, `now_playing_mac.rs`), now-playing relay (`media.rs`). `gen/android` is the generated Android project, kept in git with its signing hook, edge-to-edge insets and the background playback service (`PlaybackService.kt`, `MediaPlugin.kt`). |
| `.github/workflows/` | CI (typecheck, tests, build, `cargo test`), the Android APK and the macOS app builds. |

More detail for contributors is in [`CLAUDE.md`](CLAUDE.md).

## Notes

- Songs advance on the audio clock, not on screen frames, so a playlist keeps going in the background. While the page is hidden, the step display is not updated at all.
- The AudioContext is created on the first Play click (user gesture). Stopping fades out, halts the transport and noise sources, then suspends the context: an idle studio uses no CPU. Ambience layers only hold audio sources while audible.
- Your library and settings are saved (debounced) by the Rust side to `config.json` in the OS app-config directory; every field is re-validated on load and on import.
- File dialogs run in Rust: the web view never gets to name a path, and only the app's own pages can load in the window.
