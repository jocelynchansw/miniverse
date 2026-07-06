// the MINIverse v2 — a drivable dog in an endless meadow with a little
// vegetable market. Bootstrap only; the real work lives in core/, world/,
// actors/, systems/, ui/, audio/, fur/, data/.
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/spline-sans-mono";
import { renderer, scene, camera, fitRenderer, isCoarse } from "./core/renderer.js";
import { startLoop, stepSim } from "./core/loop.js";
import { startInput, setBarkHandler, initMobileControls } from "./core/input.js";
import { updateFurTime } from "./fur/shells.js";
import { initSpace } from "./world/space.js";
import { initField } from "./world/field.js";
import { placeProps } from "./world/props.js";
import { buildMini } from "./actors/mini.js";
import { createController } from "./actors/controller.js";
import * as physics from "./systems/physics.js";
import { createFollowCam } from "./systems/followCam.js";
import { initHearts, updateHearts } from "./systems/hearts.js";
import * as zones from "./systems/zones.js";
import { stats, initHud } from "./ui/hud.js";
import "./ui/dossier.js";
import { resumeAudio, bark } from "./audio/sounds.js";

// quality tier: coarse pointers get fewer fur shells + capped pixel ratio
const quality = { dogShells: isCoarse ? 12 : 18, grassShells: isCoarse ? 7 : 12 };

const space = initSpace(scene);
const field = initField(scene, quality);
initHearts(scene);
const world = placeProps(scene);
const mini = buildMini(quality);
scene.add(mini.group);

physics.initFromWorld(world);
const controller = createController(mini);
const followCam = createFollowCam(camera);
zones.init({ world, controller });

initHud({ onStart: () => { startInput(); resumeAudio(); } });
initMobileControls();
setBarkHandler(() => {
  if (!controller.isLocked()) {
    bark();
    controller.lock("bark", 0.4);
  }
});

// OrbitControls survive only behind ?debug (loaded lazily, off the hot path)
let debugControls = null;
if (new URLSearchParams(location.search).has("debug")) {
  import("three/addons/controls/OrbitControls.js").then(({ OrbitControls }) => {
    debugControls = new OrbitControls(camera, renderer.domElement);
    debugControls.target.set(0, 0.6, 0);
    debugControls.enableDamping = true;
  });
}

function renderFrame(t, dt) {
  fitRenderer(); // self-heal if the page loaded in a hidden/zero-size tab
  // camera-relative input yaw: follow-cam bearing, or derived when orbiting in debug
  const camYaw = debugControls
    ? Math.atan2(controller.pos.x - camera.position.x, controller.pos.z - camera.position.z)
    : followCam.yaw;
  controller.update(t, dt, camYaw);
  physics.update(dt, controller);
  zones.update(t, dt);
  if (debugControls) debugControls.update();
  else followCam.update(dt, controller);
  // endless field: carpet/ground snap to the dog, sky + stars ride along,
  // far-out scatter recycles ahead of her
  field.update(controller.pos);
  space.follow(controller.pos, camera, t);
  updateHearts(t, dt, camera);
  updateFurTime(t);
  renderer.render(scene, camera);
}
startLoop(renderFrame);

// debug/testing handle — step(dt) drives the whole sim without rAF
window.__miniverse = {
  step: stepSim,
  stats,
  mini: mini.group,
  camera,
  controller,
  physics,
  zones,
  world,
};
