# Lumen — a light-bending puzzle adventure

Guide beams of light through **40 puzzles across 5 worlds** — Dawn Temple, Crystal Caves, Neon City, Deep Ocean and The Void — by rotating mirrors, splitting white light with prisms, sieving it with filters, copying it with splitters, teleporting it through portals, bending it with lenses and sliding blockers out of the way. Light every crystal with *exactly* its own colour and each one sings a note of the chord.

**Play:** https://kumarnikhildeveloperaccount.github.io/lumen/

100% free and client-side: no backend, no sign-up, no API keys, no trackers, no external libraries or CDNs. Progress is stored in `localStorage` and can be exported/imported as a code.

## Features

- **Real ray tracing on canvas**: 8-direction beams, reflection, splitting, prism dispersion (R/G/B), additive colour mixing (yellow = R+G, cyan = G+B, magenta = R+B), filters, portals and lenses. Beams are drawn with layered additive glow, flowing photons, impact halos and a “reveal” sweep when a level starts.
- **40 levels, every one solvable.** Each level is grown from its own solution (see `js/generator.js`), checked with the game's real tracer, then scrambled into an unsolved start. The stored solution powers the hint system and the par/star thresholds. All 40 recipes, plus 365 daily puzzles, were verified with a line-by-line port of the generator and tracer: all build without fallback, start unsolved, and are lit by their stored solution.
- **3 stars per level** (moves vs. par, and time; using a hint caps a run at 2★), **undo/redo**, **reset**, and a **two-step hint** (first highlights the next step, second press does it for you).
- **Animated world map** with unlock progression, a glowing trail and star totals, plus **story snippets** before and after each world and a finale.
- **Daily Prism**: a fresh puzzle generated from the date seed. It is the same for everyone on the same day, with a shareable result.
- **Level Workshop**: build puzzles with every piece type, live beam preview, test-play, and **share codes / links** (URL-safe base64, `#play=CODE`). Import codes or links too.
- **Generative ambient soundtrack + synthesized SFX** (Web Audio): world-specific chord progressions, plucks, pads and bells. Each lit crystal plays a chord tone, so finishing a level plays a harmony. Sound stays **muted until you turn it on**, and audio is unlocked on the first gesture (iOS).
- **Controls**: mouse (click, right-click, wheel, drag to spin, Ctrl+wheel zoom), touch (tap, long-press, drag, pinch-to-zoom, double-tap to reset zoom), keyboard (arrows, Enter, Q/E, T, H, Z/Y, R, M, Esc, +/−/0) and gamepad (D-pad/stick, A, B, X, Y, RB, Start).
- **Settings**: sound on/off, music and effects volume, colour-blind shapes (▲ red, ■ green, ● blue, ★ white), reduced motion (auto/on/off), visual quality (auto/high/battery).
- **All-device**: `100dvh` with a `100vh` fallback, safe-area insets, pointer events, 44 px+ touch targets, no horizontal scroll at 360 px, DPR capped at 2 (1.5 on low-power devices), a frame-time watchdog that lowers effects on slow devices, `prefers-reduced-motion` support, and system font stacks.
- **Easter egg**: try the Konami code, type `disco`, or tap the logo five times quickly.

## Files

```
index.html            app shell (title, map, game, workshop, modal)
404.html              friendly not-found page linking home
favicon.svg           icon
manifest.webmanifest  PWA metadata
css/base.css          tokens, buttons, modal, toast, transitions
css/screens.css       title, map, HUD, board, tray, workshop, responsive rules
js/util.js            helpers, seeded RNG, storage, device detection
js/engine.js          piece states, ray tracer, snapshots, share codes
js/generator.js       solvable-by-construction level builder
js/levels.js          worlds, 40 recipes, daily puzzle, story and narrator lines
js/audio.js           Web Audio music and SFX
js/bg.js              animated backdrops for each world
js/pieces.js          procedural vector art for each piece
js/render.js          board renderer (glow, particles, zoom)
js/input.js           pointer, pinch, wheel, gamepad, spatial focus
js/game.js            play state, moves, undo/redo, hints, stars
js/ui.js              screens, map, HUD, tray, modals, settings
js/editor.js          Level Workshop
js/main.js            boot, main loop, keyboard routing, easter egg
```

## Deploy

Copy the folder to a GitHub Pages repository named `lumen`. All paths are relative. There is no build step.

## Honest limitations

- Levels are designed as hand-tuned *recipes* (size, pieces, mechanics, difficulty) that a deterministic generator turns into concrete layouts. They are not drawn tile-by-tile. Every device gets the same layouts, and every one is verified solvable.
- Par is the number of moves the stored solution needs from the scrambled start. A cleverer alternative route may beat it.
- Sliding blockers are not available in the Workshop or in share codes.
- The 2D canvas renderer avoids WebGL on purpose for compatibility. On very old devices the glow layers are reduced automatically.
- Progress is saved per browser. Use Settings → Export progress to move it to another device.

## Credits

Designed & built by **Kumar Nikhil** · [Portfolio](https://kumarnikhildeveloperaccount.github.io/) · [LinkedIn](https://www.linkedin.com/in/kumar-nikhil-1000a9192/) · [Email](mailto:nkashyapnikhilnk@gmail.com) · [More projects by Kumar Nikhil →](https://kumarnikhildeveloperaccount.github.io/)

With gratitude to God — Om Namah Paarvati Pateh, Har Har Mahadev. May God bless you and everyone.
