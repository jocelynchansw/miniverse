# the MINIverse

**Live: [jocelynchansw.github.io/miniverse](https://jocelynchansw.github.io/miniverse/)**

A website about one (1) very good dog. **You are now a small cream dog.
Please conduct yourself accordingly.**

v2 is an endless meadow at blue hour: you steer a fluffy three.js
sculpture of Mini across grass that never runs out, toward a little
vegetable market at the center of everything, and the interface is the
parchment field manual that documents her.

Things you can do:

- **Drive Mini** — WASD / arrow keys to walk, `SHIFT` for zoomies,
  `SPACE` to bark. On touch devices you get a joystick and a bark button.
  Walk as far as you like; the meadow keeps up.
- **Raid the market** — an arc of striped-awning booths: the bok choy,
  lettuce, carrot, and cucumber stands display produce by their crates
  (walk into it to eat it — the stalls restock), and the Toy Annex keeps
  the emotional support lemon on its counter. Bump the counter; it squeaks.
- **Honor the fetch agreement** — the fetch court's tennis balls live on
  the open lawn opposite the market, and they never roll far enough to
  be lost.
- **Read the signs** — walk up to a lantern-lit signpost and its specimen
  page opens: dossiers on Mini, the Fetch Agreement, the vegetables, the
  lemon, and the telemetry itself.
- **Good Dog Telemetry** — every fetch and snack is entered into the
  permanent record (localStorage) and survives between visits.

## Run it

```sh
npm install
npm run dev      # local dev server at http://localhost:5173
npm run build    # production build in dist/ — deployable to any static host
```

## Where things live

- `src/main.js` — bootstrap; the real work is in `core/`, `world/`,
  `actors/`, `systems/`, `ui/`, `audio/`, `fur/`, `data/`
- `src/style.css` — all UI chrome: design tokens, field-manual cards,
  glass pills, mobile controls
- `src/ui/dossier.js` — `DOSSIERS`, the specimen-page copy
- `src/ui/hud.js` — telemetry, toasts, zone label, intro gate, mute/manual
- `public/mini.jpg` — the real Mini, shown on her specimen page

## Design

"Field Manual & Night Garden" — the world is blue-hour Mercury; the UI is
printed parchment. Nothing glows.

- **Paper** `#FCFAF3` / `#F4F0E4` · **Ink** `#26232B` / `#5C5751` / `#8A847B`
- **Moss** `#6B7A22` (accent on paper) · **Chartreuse** `#D4E64E`
  (accent on dark only) · **Dusk Void** `#211A34` · **Starlight Cream** `#F6EBD7`
- **Type**: Fraunces Variable (display, soft + wonky for the masthead),
  Instrument Sans Variable (body), Spline Sans Mono Variable
  (labels, keycaps, telemetry digits) — all self-hosted via Fontsource.

## The appendices

The `?` button opens the manual's back pages: **Appendix A — The Making Of**
(how one PM + a fleet of AI agents built this, with incidents and lessons),
**Appendix B — Roadmap** (Now/Next/Later), and **Appendix C — Release Notes**
(all entries real, especially the pancake). Content lives in `index.html`;
tab wiring in `src/ui/hud.js`.
