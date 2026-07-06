import * as THREE from "three";
import { C } from "../data/palette.js";

// ---------- hearts ----------
const heartShape = new THREE.Shape();
heartShape.moveTo(2.5, 2.5);
heartShape.bezierCurveTo(2.5, 2.5, 2.0, 0, 0, 0);
heartShape.bezierCurveTo(-3.0, 0, -3.0, 3.5, -3.0, 3.5);
heartShape.bezierCurveTo(-3.0, 5.5, -1.0, 7.7, 2.5, 9.5);
heartShape.bezierCurveTo(6.0, 7.7, 8.0, 5.5, 8.0, 3.5);
heartShape.bezierCurveTo(8.0, 3.5, 8.0, 0, 5.0, 0);
heartShape.bezierCurveTo(3.5, 0, 2.5, 2.5, 2.5, 2.5);
const heartGeo = new THREE.ShapeGeometry(heartShape);
heartGeo.center();
heartGeo.rotateZ(Math.PI);
heartGeo.scale(0.05, 0.05, 0.05);

let sceneRef = null;
let tNow = 0;
const heartsLive = [];

export function initHearts(scene) {
  sceneRef = scene;
}

export function spawnHearts(pos) {
  if (!sceneRef) return;
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(
      heartGeo,
      new THREE.MeshBasicMaterial({
        color: C.tongue,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    m.position.copy(pos);
    m.position.x += (Math.random() - 0.5) * 0.9;
    m.position.y += Math.random() * 0.2;
    m.position.z += (Math.random() - 0.5) * 0.9;
    m.scale.setScalar(0.6 + Math.random() * 0.6);
    sceneRef.add(m);
    heartsLive.push({ m, born: tNow, drift: 0.6 + Math.random() * 0.5 });
  }
}

export function updateHearts(t, dt, camera) {
  tNow = t;
  for (let i = heartsLive.length - 1; i >= 0; i--) {
    const h = heartsLive[i];
    const hAge = t - h.born;
    h.m.position.y += h.drift * dt;
    h.m.quaternion.copy(camera.quaternion);
    h.m.material.opacity = Math.max(1 - hAge / 1.3, 0);
    if (hAge > 1.3) {
      sceneRef.remove(h.m);
      h.m.material.dispose();
      heartsLive.splice(i, 1);
    }
  }
}
