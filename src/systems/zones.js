import * as THREE from "three";
import { stats, renderStats, setZoneLabel } from "../ui/hud.js";
import { openDossier, closeDossier, setOnClose } from "../ui/dossier.js";
import { squeak, munchSound } from "../audio/sounds.js";
import { spawnHearts } from "./hearts.js";
import { setOnImpact, setOnDogBump, getBodies } from "./physics.js";
import { isStarted } from "../core/input.js";

// zone enter/leave, signpost→dossier proximity, market produce eat/restock,
// ball-nudge fetch stat, toy-counter lemon squeak, signpost lantern breathe —
// all the gameplay glue.

const SIGN_OPEN_R = 1.7;
const SIGN_CLOSE_R = 2.4;
const SIGN_COOLDOWN = 10;
const EAT_R = 1.1;
const RESTOCK_S = 20;
const POP_S = 0.45;

let world = null;
let controller = null;
let tNow = 0;
let currentZone = null;
let activeSign = null;
const signCooldown = {};
const ballCooldown = new Map();
const shownOnce = new Set(); // "once" zones (the landing lawn) label a single time
let lemonCooldown = 0;
let lemonWobbleAt = -10;

function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function handleImpact(body, speed) {
  if (body.kind === "ball" && speed > 2.0) {
    // solid nudge = a fetch, per-ball 1s cooldown
    if (tNow >= (ballCooldown.get(body.id) ?? 0)) {
      ballCooldown.set(body.id, tNow + 1);
      stats.fetches += 1;
      renderStats(true);
    }
  }
}

// bumping the toy-stall counter (where the lemon lives) → squeak + wobble
function handleDogBump(s, speed) {
  if (s.tag === "toys" && speed > 1.2 && tNow >= lemonCooldown) {
    lemonCooldown = tNow + 0.6;
    lemonWobbleAt = tNow;
    squeak();
  }
}

export function init(cfg) {
  world = cfg.world;
  controller = cfg.controller;
  setOnImpact(handleImpact);
  setOnDogBump(handleDogBump);
  // manual close (buttons/Escape) or walking away both start the reopen cooldown
  setOnClose(() => {
    if (activeSign) {
      signCooldown[activeSign] = tNow + SIGN_COOLDOWN;
      activeSign = null;
    }
  });
}

const _v = new THREE.Vector3();

export function update(t, dt) {
  tNow = t;
  const pos = controller.pos;

  // ----- zone label (gated behind the intro so the entry sequence reads) -----
  if (isStarted()) {
    let z = null;
    for (const zn of world.zones) {
      const dx = pos.x - zn.pos.x;
      const dz = pos.z - zn.pos.z;
      if (dx * dx + dz * dz < zn.r * zn.r) {
        z = zn;
        break;
      }
    }
    const zid = z ? z.id : null;
    if (zid !== currentZone) {
      currentZone = zid;
      if (z && z.once) {
        if (!shownOnce.has(zid)) {
          shownOnce.add(zid);
          setZoneLabel(z.label);
        }
      } else {
        setZoneLabel(z ? z.label : null);
      }
    }
  }

  // ----- signposts → dossier -----
  if (activeSign) {
    const sp = world.signposts.find((s) => s.id === activeSign);
    if (sp && pos.distanceTo(sp.pos) > SIGN_CLOSE_R) {
      closeDossier(); // fires onClose → cooldown + activeSign reset
    }
  } else {
    for (const sp of world.signposts) {
      if (pos.distanceTo(sp.pos) < SIGN_OPEN_R && t >= (signCooldown[sp.id] ?? 0)) {
        activeSign = sp.id;
        openDossier(sp.id);
        break;
      }
    }
  }

  // ----- market produce: eat + restock with pop-in -----
  for (const v of world.veggies) {
    if (v.state === "grown") {
      const dx = pos.x - v.pos.x;
      const dz = pos.z - v.pos.z;
      if (!controller.isLocked() && dx * dx + dz * dz < EAT_R * EAT_R) {
        v.state = "eaten";
        v.eatenAt = t;
        v.holder.visible = false;
        controller.lock("munch", 0.8);
        munchSound();
        spawnHearts(_v.copy(v.pos).setY(0.8));
        stats.snacks += 1;
        renderStats(true);
      }
    } else if (t - v.eatenAt > RESTOCK_S) {
      v.state = "grown";
      v.popAt = t;
      v.holder.visible = true;
      v.holder.scale.setScalar(0.01);
    }
    if (v.popAt !== null) {
      const p = (t - v.popAt) / POP_S;
      if (p >= 1) {
        v.holder.scale.setScalar(1);
        v.popAt = null;
      } else {
        v.holder.scale.setScalar(Math.max(easeOutBack(p), 0.01));
      }
    }
  }

  // ----- lemon squash-wobble after a squeak -----
  const age = t - lemonWobbleAt;
  const lm = world.lemon.spin;
  if (age < 0.7) {
    const w = Math.sin(age * 22) * 0.22 * Math.exp(-3.5 * age);
    lm.scale.set(1 + w * 0.6, 1 - w, 1 + w * 0.6);
  } else {
    lm.scale.set(1, 1, 1);
  }

  // ----- signpost lanterns: gentle 4s breathe, warm to full while open -----
  for (const sp of world.signposts) {
    if (!sp.lantern) continue;
    sp.warm += ((activeSign === sp.id ? 1 : 0) - sp.warm) * (1 - Math.exp(-5 * dt));
    const breathe = 0.5 + 0.2 * Math.sin((t * Math.PI * 2) / 4);
    sp.lantern.emissiveIntensity = THREE.MathUtils.lerp(breathe, 1.0, sp.warm);
    sp.lantern.opacity = THREE.MathUtils.lerp(0.85 + 0.07 * Math.sin((t * Math.PI * 2) / 4), 1, sp.warm);
  }

  // ----- idle gaze: nearest interesting prop within 4u -----
  let best = null;
  let bd = 16;
  for (const b of getBodies()) {
    const d = pos.distanceToSquared(b.holder.position);
    if (d < bd) {
      bd = d;
      best = b.holder.position;
    }
  }
  for (const v of world.veggies) {
    if (v.state !== "grown") continue;
    const d = pos.distanceToSquared(v.pos);
    if (d < bd) {
      bd = d;
      best = v.pos;
    }
  }
  controller.setGazeTarget(best);
}

// for window.__miniverse integration tests
export function debugState() {
  return { currentZone, activeSign, signCooldown, veggies: world?.veggies };
}
