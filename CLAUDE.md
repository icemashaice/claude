# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

**Locally:** Open `index.html` (or `Calendar.html`) directly in a browser — no build step, no server required. The page loads React 18, ReactDOM, and Babel (all via CDN with SRI hashes), then transpiles `tweaks-panel.jsx` and `app.jsx` in-browser at runtime.

For quick local serving (avoids CORS issues with some browsers):
```
python3 -m http.server 8080
# then open http://localhost:8080 (root) or http://localhost:8080/Calendar.html
```

**Deployed:** GitHub Pages serves from the root URL via `index.html` with the Static HTML workflow (`.github/workflows/static.yml`). The app is live at `https://icemashaice.github.io/claude/`.

## Architecture

The app is a single-page booking calendar for a small homestead ("Холм / Hill") with three cabins. There is no backend — all state lives in `localStorage` under the key `hill_v7`.

**File roles:**
- `index.html` — entry point for GitHub Pages and local serving at root. Copy of `Calendar.html` to enable serving from root URL.
- `Calendar.html` — legacy entry point (kept for compatibility); same content as `index.html`.
- `tweaks-panel.jsx` — reusable UI system, loaded first. Exports `useTweaks`, `TweaksPanel`, and a set of form controls (`TweakSlider`, `TweakToggle`, `TweakRadio`, `TweakColor`, etc.) onto `window`. Also owns the edit-mode host protocol (`__activate_edit_mode` / `__deactivate_edit_mode` postMessages).
- `app.jsx` — all application logic and rendering. Depends on globals set by `tweaks-panel.jsx`.

**State model in `app.jsx`:**
- `bk` — booking map: `{ [roomId]: Array<{id, name, s, e, col}> }` where `s`/`e` are date keys (`"YYYY-MM-DD"`).
- `sel` — first-click anchor `{rid, d}` for the two-click range selection flow.
- `modal` — controls which modal is open (`{t: "add"|"view", ...}`).
- `startOffset` — integer days relative to today; controls the visible window start.

**Rendering approach:**  
`CalendarGrid` renders a fixed-width scrollable div. Booking pills are an absolutely-positioned overlay layer (`pointerEvents:"none"` on the container, `"auto"` on each pill) so they sit above the clickable day cells without blocking them.

**Tweaks / settings:**  
`TWEAK_DEFAULTS` in `app.jsx` is wrapped in `/*EDITMODE-BEGIN*/` … `/*EDITMODE-END*/` comments. The host environment (Claude Artifact viewer) can rewrite this block via the `__edit_mode_set_keys` postMessage; `useTweaks` from `tweaks-panel.jsx` posts that message on every `setTweak` call.

**Adding a new cabin:** add an entry to `ROOMS` (`id`, `name`, `glyph`, `icon`, `size`, `beds`, `color`) and place the matching icon PNG in `icons/`.

**Bumping storage schema:** increment the `STORAGE` constant (`"hill_v7"` → `"hill_v8"`) so stale cached data doesn't bleed into a changed shape.
