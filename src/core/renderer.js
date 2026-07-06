import * as THREE from "three";
import { C } from "../data/palette.js";

// coarse pointer = touch device → quality tier down (pixel ratio, shell counts)
export const isCoarse =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

export const canvas = document.getElementById("scene");
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarse ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(C.skyZenith);
// fog far stays ≥10u inside the grass-carpet radius (55) so the meadow's
// edge can never be seen from the follow cam
scene.fog = new THREE.Fog(C.skyHorizon, 21, 48);

// fall back to square aspect if the page loads in a hidden/zero-size tab
export const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth && window.innerHeight ? window.innerWidth / window.innerHeight : 1,
  0.1,
  120
);
camera.position.set(0, 3.2, -6.5);
camera.lookAt(0, 0.8, 0);

const _size = new THREE.Vector2();
export function fitRenderer() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!w || !h) return;
  renderer.getSize(_size);
  if (_size.x !== w || _size.y !== h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
}
window.addEventListener("resize", fitRenderer);
