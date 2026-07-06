import * as THREE from "three";

// lazy-yaw follow camera: eases its bearing toward the dog's heading,
// hangs back and up, looks slightly ahead of her.
// camera.up stays +Y (zero roll), FOV stays 45.
// Aspect-aware: portrait viewports pull the camera back (and slightly up)
// so Mini and the market still fit in a narrow frame.
// Drag-to-orbit: dragging the canvas swings the camera around her (full
// circle — you can look her in the face). The offset eases back behind her
// once she's moving and the drag has ended.

function angleLerp(a, b, k) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * k;
}

// tuned for the v3 realistic-proportioned Mini (~1.35u tall)
const DIST = 5.6;
const HEIGHT = 2.6;

export function createFollowCam(camera) {
  let camYaw = 0;
  const camPos = new THREE.Vector3(0, HEIGHT, -DIST);
  const lookCur = new THREE.Vector3(0, 0.62, 0);
  const _f = new THREE.Vector3();
  const _goal = new THREE.Vector3();
  const _lookGoal = new THREE.Vector3();

  camera.position.copy(camPos);
  camera.lookAt(lookCur);

  // ----- drag to orbit -----
  let orbitYaw = 0;
  let orbitPitch = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const canvas = document.getElementById("scene");
  if (canvas) {
    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // synthetic events have no active pointer to capture — drag still works
      }
      canvas.classList.add("grabbing");
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      orbitYaw -= (e.clientX - lastX) * 0.006;
      orbitPitch = THREE.MathUtils.clamp(orbitPitch + (e.clientY - lastY) * 0.004, -0.45, 0.9);
      lastX = e.clientX;
      lastY = e.clientY;
    });
    const end = () => {
      dragging = false;
      canvas.classList.remove("grabbing");
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  function update(dt, ctl) {
    // read aspect every update — it changes on resize/rotate
    const aspect = camera.aspect || 1;
    const stretch = aspect < 1 ? 1 + (1 - aspect) * 0.9 : 1;
    const dist = DIST * stretch;
    const height = (HEIGHT + orbitPitch * 2.6) * (1 + (stretch - 1) * 0.5);
    camYaw = angleLerp(camYaw, ctl.yaw, 1 - Math.exp(-2 * dt));
    // once she's running and the pointer is up, drift back behind her
    if (!dragging && ctl.speed > 1.2) {
      const k = Math.exp(-2.2 * dt);
      orbitYaw *= k;
      orbitPitch *= k;
    }
    const yawEff = camYaw + orbitYaw;
    _f.set(Math.sin(yawEff), 0, Math.cos(yawEff));
    _goal.copy(ctl.pos).addScaledVector(_f, -dist);
    _goal.y += Math.max(height, 0.9);
    camPos.lerp(_goal, 1 - Math.exp(-4 * dt));
    if (camPos.y < 0.6) camPos.y = 0.6; // never dip below the meadow
    _lookGoal.set(ctl.pos.x + ctl.vel.x * 0.25, 0.62, ctl.pos.z + ctl.vel.z * 0.25);
    lookCur.lerp(_lookGoal, 1 - Math.exp(-6 * dt));
    camera.up.set(0, 1, 0);
    camera.position.copy(camPos);
    camera.lookAt(lookCur);
  }

  return {
    update,
    get yaw() {
      // input stays camera-relative even while orbited
      return camYaw + orbitYaw;
    },
  };
}
