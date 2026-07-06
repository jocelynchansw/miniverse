import * as THREE from "three";

// The sim advances only via stepSim(dt): the rAF loop feeds it real
// (clamped) deltas, and tests/hidden tabs can drive it manually through
// window.__miniverse.step without rAF ever firing.
const clock = new THREE.Clock();
let simT = 0;
let frameFn = null;

export function stepSim(dt) {
  simT += dt;
  if (frameFn) frameFn(simT, dt);
}

function animate() {
  requestAnimationFrame(animate);
  // delta-time clamp: a hidden tab pauses the sim instead of
  // fast-forwarding it when the visitor comes back
  stepSim(Math.min(clock.getDelta(), 0.05));
}

export function startLoop(fn) {
  frameFn = fn;
  animate();
}
