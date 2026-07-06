# the MINIverse — project notes for Claude

Vite 5 + three.js site about Mini the dog. `npm run dev` (port 5173);
`window.__miniverse.step(dt)` drives the sim deterministically when the
preview tab is hidden (rAF paused). Design system: "Field Manual & Night
Garden" — see README.md and src/style.css tokens.

## Task Observer activation

At the start of any task-oriented session — any interaction where you will
use tools and produce deliverables — invoke the task-observer skill before
beginning work. This ensures skill improvement opportunities are captured
throughout the session.

When loading any skill, check the observation log for OPEN observations
tagged to that skill. Apply their insights to the current work, even if
the skill file hasn't been updated yet. This enables immediate application
of observations before they're permanently integrated during the weekly
review.
