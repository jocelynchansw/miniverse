import * as THREE from "three";
import { getMove } from "../core/input.js";
import { applyDogBounds } from "../systems/physics.js";

const WALK = 3.2;
const RUN = 6.2;

function angleLerp(a, b, k) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * k;
}
function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function createController(miniRefs) {
  const { group, rig, head, earL, earR, tail, tongue, legs } = miniRefs;
  const pos = group.position; // live ref, y stays 0 (hop lives on the rig)
  const vel = new THREE.Vector3();
  let yaw = 0;
  let yawRateSm = 0;
  let roll = 0;
  let gaitPhase = 0;
  let tCur = 0;

  // reaction locks: short controller freezes that reuse the old animation snippets
  let lockType = null;
  let lockStart = 0;
  let lockUntil = 0;

  const gaze = new THREE.Vector3();
  let gazeActive = false;
  // read the rig's own base scale — never hardcode model-space numbers here
  const tongueBaseY = tongue.scale.y;

  const mv = { x: 0, z: 0, mag: 0, run: false };
  const _d = new THREE.Vector3();

  function lock(type, dur) {
    lockType = type;
    lockStart = tCur;
    lockUntil = tCur + dur;
  }
  function isLocked() {
    return lockType !== null && tCur < lockUntil;
  }
  function setGazeTarget(v) {
    if (v) {
      gaze.copy(v);
      gazeActive = true;
    } else {
      gazeActive = false;
    }
  }

  function update(t, dt, camYaw) {
    tCur = t;
    if (lockType && t >= lockUntil) lockType = null;
    const locked = lockType !== null;

    // ----- move -----
    if (locked) {
      mv.x = 0;
      mv.z = 0;
      mv.mag = 0;
    } else {
      getMove(camYaw, mv);
    }
    const maxS = mv.run ? RUN : WALK;
    _d.set(mv.x * maxS - vel.x, 0, mv.z * maxS - vel.z);
    const dl = _d.length();
    const maxDv = 24 * dt;
    if (dl > maxDv) _d.multiplyScalar(maxDv / dl);
    vel.add(_d);
    if (mv.mag < 0.01) vel.multiplyScalar(Math.exp(-7 * dt));
    if (locked) vel.multiplyScalar(Math.exp(-10 * dt));
    pos.x += vel.x * dt;
    pos.z += vel.z * dt;
    applyDogBounds(pos, vel, dt);
    const speed = Math.hypot(vel.x, vel.z);
    const s = Math.min(speed / RUN, 1);

    // ----- heading + lean -----
    const prevYaw = yaw;
    if (speed > 0.3) {
      yaw = angleLerp(yaw, Math.atan2(vel.x, vel.z), 1 - Math.exp(-10 * dt));
    }
    const yawRate = wrapAngle(yaw - prevYaw) / Math.max(dt, 1e-4);
    yawRateSm += (yawRate - yawRateSm) * (1 - Math.exp(-8 * dt));
    const rollT = THREE.MathUtils.clamp(-yawRateSm * 0.09, -0.25, 0.25) * s;
    roll += (rollT - roll) * (1 - Math.exp(-8 * dt));

    // ----- gait: distance-driven trot (diagonal leg pairs) -----
    gaitPhase += speed * dt * 3.4;
    // the body bounces twice per full stride, much subtler than the old hop
    const hop = s < 0.02 ? 0 : Math.abs(Math.sin(gaitPhase)) * THREE.MathUtils.lerp(0.015, 0.06, s);
    const pitch = Math.sin(gaitPhase * 2) * 0.035 * s;
    const swingAmp = THREE.MathUtils.lerp(0.2, 0.75, s) * Math.min(s * 8, 1);
    const swing = Math.sin(gaitPhase) * swingAmp;
    // FL+BR move together, FR+BL oppose them; ease legs home when idle
    if (s > 0.02) {
      legs.FL.rotation.x = swing;
      legs.BR.rotation.x = swing;
      legs.FR.rotation.x = -swing;
      legs.BL.rotation.x = -swing;
    } else {
      for (const k of ["FL", "FR", "BL", "BR"]) {
        legs[k].rotation.x += (0 - legs[k].rotation.x) * (1 - Math.exp(-10 * dt));
      }
    }

    // ----- reaction lock snippets -----
    let wagMult = 1 + 2.2 * s;
    let lockHop = 0;
    if (locked) {
      const age = t - lockStart;
      if (lockType === "munch") {
        wagMult = 2.5;
        head.rotation.x = Math.sin(age * 22) * 0.08; // nibbling
      } else if (lockType === "wiggle") {
        wagMult = 3.2;
        lockHop = Math.abs(Math.sin(t * 11)) * 0.14;
      } else if (lockType === "bark") {
        wagMult = 2.5;
        const p = Math.min(age / (lockUntil - lockStart), 1);
        lockHop = Math.sin(p * Math.PI) * 0.2;
        head.rotation.x = -0.25 * Math.sin(p * Math.PI);
      }
    }

    // ----- apply to rig -----
    group.rotation.y = yaw;
    rig.rotation.z = roll;
    rig.rotation.x = pitch;
    const breath = Math.sin(t * 1.3) * 0.02 * (1 - 0.6 * s);
    rig.position.y = breath + hop + lockHop;

    // idle body language (reused verbatim from v1, wag scales with speed)
    tail.rotation.z = Math.sin(t * 6 * wagMult) * 0.35;
    earL.rotation.z = 0.35 + Math.sin(t * 2.1 * wagMult) * 0.06;
    earR.rotation.z = -0.35 + Math.cos(t * 2.4 * wagMult) * 0.06;
    tongue.scale.y = tongueBaseY * (1 + Math.sin(t * 3.2) * 0.1);
    head.rotation.z = Math.sin(t * 0.9) * 0.05;

    // head gaze: toward movement dir when running, else toward nearest prop
    if (!locked) {
      let gy = 0;
      let gx = 0;
      if (speed <= 0.5 && gazeActive) {
        _d.copy(gaze).sub(pos);
        gy = THREE.MathUtils.clamp(wrapAngle(Math.atan2(_d.x, _d.z) - yaw), -0.6, 0.6);
        gx = -0.08;
      }
      head.rotation.y += (gy - head.rotation.y) * 0.06;
      head.rotation.x += (gx - head.rotation.x) * 0.06;
    }
  }

  return {
    pos,
    vel,
    get yaw() {
      return yaw;
    },
    get speed() {
      return Math.hypot(vel.x, vel.z);
    },
    update,
    lock,
    isLocked,
    setGazeTarget,
  };
}
