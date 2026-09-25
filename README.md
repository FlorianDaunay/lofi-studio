# Lofi Studio

A modular Lo-Fi mini-studio, 100% procedural: every sound (jazzy keys, bass, drums, rain, vinyl crackle, wind) is synthesized live with Tone.js / Web Audio. No samples.

Tauri 2 (Rust) · React 19 · TypeScript · Zustand · Tone.js · Tailwind 3 + Radix primitives.

## Run

```bash
npm install
npm run tauri dev      # desktop app
npm run dev            # browser only (config falls back to localStorage)
npm run tauri build    # release bundle
```

Requires Node 20+ and a Rust toolchain (plus WebView2 on Windows).

## Layout

| Path | Role |
| --- | --- |
| `src/audio/` | `AudioEngine` and its parts (instruments, ambience, procedural noise, music helpers). No React, no store: it receives an immutable `EngineParams` snapshot. |
| `src/state/` | Zustand store, presets, pattern generator, config sanitizer, and `bridge.ts` (store → engine, store → disk). |
| `src/components/ui/` | shadcn-style primitives on Radix (button, slider, switch, segmented, panel). |
| `src/components/studio/` | Screens built from the primitives. |
| `src/themes/` | Design-token theme system (`defineTheme`, CSS variables, generated Tailwind classes). Drop a file in `definitions/` to add a theme. |
| `src-tauri/` | Rust shell: locked-down window and CSP, `load_config` / `save_config` (atomic JSON file in the app-config dir). |

## Notes

- The AudioContext is created on the first Play click (user gesture). Stopping fades out, halts the transport and noise sources, then suspends the context, so an idle studio costs no CPU.
- Ambience layers only hold audio sources while audible.
- Configuration is saved (debounced) by the Rust side to `config.json` in the OS app-config directory; every field is re-validated on load.
