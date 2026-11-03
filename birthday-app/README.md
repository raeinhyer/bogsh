# Birthday Mission

A Spider-Man-inspired birthday adventure, built with plain HTML, CSS and JavaScript.
Later it will be packaged as an Android app with Capacitor.

## Current progress

- [x] Step 1 — Project foundation + Screen 1 (Opening)
- [x] Screen 2 — Mission briefing
- [x] Screen 3 — Web hunt
- [ ] Screen 4 — Mini-game
- [ ] Screen 5 — Purple transition
- [ ] Screen 6 — Memory room
- [ ] Screen 7 — Birthday letter
- [ ] Screen 8 — Final celebration
- [ ] Capacitor / Android APK

## Run it locally

The project has no build step and no dependencies.

**Easiest:** double-click `index.html` to open it in Chrome.

**Recommended (closer to how the app will behave):** run a tiny local server from this folder.

- VS Code: install the "Live Server" extension, right-click `index.html` → *Open with Live Server*.
- Or, with Python installed: `python -m http.server 8000`, then open http://localhost:8000

### Test it like a phone

In Chrome press `F12`, then the device toolbar icon (or `Ctrl+Shift+M`), and pick a phone such as
*Pixel 7* or *Galaxy S20*. Try portrait and a few sizes.

### Jump straight to a screen (for testing)

Add the screen name to the address: `index.html#briefing`, `index.html#hunt`, `index.html#minigame`.
The screen names are the `data-screen="..."` values in `index.html`.

## Project structure

```
birthday-app/
├── index.html   Screens (all text lives here)
├── style.css    Colors, layout, animations
├── script.js    Screen switching + decoration builders
└── assets/
    ├── images/
    ├── sounds/
    └── fonts/   Put PressStart2P-Regular.ttf here for the pixel look
```

## How screens work

Every screen is a `<section class="screen" data-screen="name">` in `index.html`.
A button with `data-goto="name"` moves to that screen with a wipe animation.
Per-screen start/stop code can be added in `screenHooks` in `script.js`.

## Editing things

- **Text:** edit it directly in `index.html`.
- **Heart messages (web hunt):** `HEART_MESSAGES` at the top of `script.js`.
- **Web hunt objects:** the `HUNT_ITEMS` list in `script.js`. Each has an `x`/`y` position in % and
  a `msg` (the funny line for fakes). `real: true` marks the 6 you must find.
- **Colors:** the `:root` block at the top of `style.css`.
- **The city:** the `CITY_BACK` / `CITY_FRONT` lists in `script.js`.

## Fonts / credits

The pixel font is optional. Press Start 2P (SIL Open Font License) is a good free choice:
download `PressStart2P-Regular.ttf` and place it in `assets/fonts/`.
Without it the app falls back to a monospace font.
