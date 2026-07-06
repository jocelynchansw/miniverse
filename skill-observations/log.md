# Skill Observation Log

Observations captured during task-oriented work. Each entry identifies a
potential skill improvement or new skill opportunity.

**Status key:** OPEN = not yet actioned | ACTIONED = skill updated/created |
DECLINED = user decided not to pursue

---

## 2026-07-05 — Miniverse v2 build session

### Observation 1: Hidden preview tabs pause rAF — WebGL apps need a deterministic step() for verification

**Status:** OPEN
**Date:** 2026-07-05
**Session context:** Building/testing a three.js game in the Claude Code preview panel
**Skill:** New skill candidate: webgl-preview-verification
**Type:** open-source
**Phase/Area:** Automated verification of canvas/WebGL apps

**Issue:** The preview browser tab frequently reports `visibilityState: hidden`, which pauses requestAnimationFrame and can leave `window.innerWidth` at 0 on load. Game state silently froze during eval-driven tests, producing false failures (a fetch minigame "never completed"), and screenshots captured black frames. The working pattern that emerged: (1) take a screenshot FIRST to force visibility, (2) expose a `step(dt)` function on a debug handle so evals can drive the simulation deterministically without rAF, (3) make the renderer self-heal zero-size viewports by checking size every frame, (4) accumulate sim time from clamped deltas so hidden-tab pauses don't fast-forward the world.

**Suggested improvement:** Capture as a reusable verification recipe for canvas/WebGL apps: the four-part pattern above, plus "batch sim steps coarsely (0.05s) — per-frame stepping × full renders blows eval timeouts."

**Principle:** Real-time apps under headless/hidden-tab verification need an explicit, deterministic time-stepping seam. If the app only advances via rAF, it is untestable exactly when you need to test it.

### Observation 2: User-moved project folders break absolute paths in configs

**Status:** OPEN
**Date:** 2026-07-05
**Session context:** The project folder was moved twice mid-session (Interior Design → Desktop → Claude Stuff)
**Skill:** Internal working practice (project setup)
**Type:** internal
**Phase/Area:** Launch/dev-server configuration

**Issue:** Launch configs written with absolute paths (`cwd`, `--prefix`) broke each time the user reorganized folders, requiring server restarts and config repair. Configs written relative to the project root survived both moves.

**Suggested improvement:** Always write project-relative launch configuration; verify the session working directory at the start of each turn when files fail to resolve (the harness cwd follows the moved folder).

**Principle:** Personal projects get reorganized; any absolute path in project config is a time bomb. Prefer relative paths and re-derive location at use time.

### Observation 3: Behavior/presentation agent split with explicit file-boundary contracts

**Status:** OPEN
**Date:** 2026-07-05
**Session context:** Multi-agent rewrite of a three.js site (world/gameplay agent, then UI/design agent)
**Skill:** New skill candidate: multi-agent-web-build
**Type:** open-source
**Phase/Area:** Orchestration / task decomposition

**Issue:** Splitting a large rewrite into a design-spec agent + architecture-plan agent (parallel, read-only), then a behavior agent followed by a presentation agent (sequential, write), worked cleanly. The load-bearing details: each write-agent got an explicit do-not-touch file list, a "hard constraints" section naming DOM ids/localStorage keys/debug handles that must survive, and a required self-verification step. One string-rename landed in a file nominally owned by the other layer (zone names lived in world data, not UI) — caught because the agent was told to report deviations.

**Suggested improvement:** Formalize as an orchestration recipe: spec/plan agents run parallel + read-only; implementation agents run sequential with file-boundary contracts, survival contracts (ids, keys, handles), and mandatory deviation reporting.

**Principle:** Parallel agents need disjoint read/write sets; sequential agents need explicit interface contracts. "Report deviations" converts inevitable boundary violations from silent breakage into reviewable decisions.

### Observation 4: Stalled background agents resume cleanly with a state-anchored continuation message

**Status:** OPEN
**Date:** 2026-07-05
**Session context:** A long-running build agent hit a 600s stall watchdog mid-milestone
**Skill:** New skill candidate: multi-agent-web-build (same candidate as Observation 3)
**Type:** open-source
**Phase/Area:** Orchestration / failure recovery

**Issue:** A background implementation agent stalled and was marked failed, but its transcript survived. Sending a resume message that (a) named exactly where it stopped (from its own last progress note), (b) re-listed the remaining checklist items, and (c) restated the verification and reporting requirements, restarted it from its transcript without losing prior work.

**Suggested improvement:** In the orchestration recipe: on agent stall/failure, don't relaunch fresh by default — resume with a message anchored to the agent's last reported state plus the remaining scope. Fresh relaunches redo (and can conflict with) completed work.

**Principle:** For resumable agents, the cheapest recovery is a continuation prompt that reconstructs "you are here"; a restart is the expensive fallback, not the default.

### Observation 5: Automation windows throttle rAF — benchmark rendering with synchronous GPU timing instead

**Status:** OPEN
**Date:** 2026-07-05
**Session context:** Measuring fps of a three.js scene inside the preview/automation browser window
**Skill:** New skill candidate: webgl-preview-verification (same candidate as Observation 1)
**Type:** open-source
**Phase/Area:** Performance verification

**Issue:** requestAnimationFrame-based fps measurement returned 0.5-40fps in the automation window regardless of scene content — even with the heaviest geometry hidden, and even while visibilityState reported "visible". rAF throttling made the standard fps probe meaningless. The working alternative: time N synchronous renders with gl.finish() to force GPU completion, and compare against an empty-scene baseline to confirm the benchmark measures real work (full scene 0.64ms/frame vs 0.09ms empty = >20x headroom over a 60fps budget).

**Suggested improvement:** Add to the webgl-preview-verification recipe: never trust rAF-derived fps in automation contexts; benchmark with synchronous render timing + gl.finish(), always with an empty-scene baseline to validate the measurement itself.

**Principle:** In throttled or headless environments, measure the work, not the scheduler. A benchmark needs a baseline that proves it is measuring what you think it is.

### Observation 6: Animation code hardcoding model-space constants breaks silently when the rig changes

**Status:** OPEN
**Date:** 2026-07-05
**Session context:** Rebuilding the dog model from chibi proportions to realistic proportions
**Skill:** Internal working practice (3D character rigs)
**Type:** internal
**Phase/Area:** Actor rig / animation coupling

**Issue:** The controller animated the tongue with an absolute scale value (0.22) that belonged to the OLD model's geometry. When the model was rebuilt with a smaller tongue, the stale constant stretched it into a giant pancake — no error, just visually wrong output found only by close-up inspection.

**Suggested improvement:** Animation code should express deformations relative to the rig's base values (read base scale/position from the mesh at setup, or store them in userData), never as absolute model-space numbers. When changing a model, grep the animator for every reference to the changed parts.

**Principle:** A rig and its animator form one contract; constants that describe the model belong on the model. Absolute magic numbers in the animator are invisible coupling that fails silently on redesign.
