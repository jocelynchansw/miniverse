// keyboard + joystick → camera-relative move vector

const keys = new Set();
let started = false; // intro gate: no input until the visitor begins
let barkHandler = null;

// joystick vector: x right, y forward, analog 0..1
const joy = { x: 0, y: 0 };

export function startInput() {
  started = true;
}
export function isStarted() {
  return started;
}
export function setBarkHandler(fn) {
  barkHandler = fn;
}

const KEYMAP = {
  KeyW: "f", ArrowUp: "f",
  KeyS: "b", ArrowDown: "b",
  KeyA: "l", ArrowLeft: "l",
  KeyD: "r", ArrowRight: "r",
};

window.addEventListener("keydown", (e) => {
  const k = KEYMAP[e.code];
  if (k) {
    keys.add(k);
    e.preventDefault();
  }
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.add("run");
  if (e.code === "Space") {
    e.preventDefault();
    if (!e.repeat && started && barkHandler) barkHandler();
  }
});
window.addEventListener("keyup", (e) => {
  const k = KEYMAP[e.code];
  if (k) keys.delete(k);
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.delete("run");
});
window.addEventListener("blur", () => keys.clear());

// Camera-relative move: rotate raw input by the follow-cam yaw so "up" is
// always "away from the camera". out = {x, z, mag, run}; (x,z) already
// carries the analog magnitude.
export function getMove(camYaw, out) {
  let ix = (keys.has("r") ? 1 : 0) - (keys.has("l") ? 1 : 0) + joy.x;
  let iy = (keys.has("f") ? 1 : 0) - (keys.has("b") ? 1 : 0) + joy.y;
  if (!started) {
    ix = 0;
    iy = 0;
  }
  let mag = Math.hypot(ix, iy);
  if (mag > 1) {
    ix /= mag;
    iy /= mag;
    mag = 1;
  }
  // forward = (sin yaw, cos yaw); screen-right = forward × up = (-cos yaw, sin yaw)
  const s = Math.sin(camYaw);
  const c = Math.cos(camYaw);
  out.x = s * iy - c * ix;
  out.z = c * iy + s * ix;
  out.mag = mag;
  out.run = keys.has("run") || Math.hypot(joy.x, joy.y) > 0.75;
  return out;
}

// DOM joystick (bottom-left) + bark button — revealed by CSS on coarse pointers
export function initMobileControls() {
  const base = document.createElement("div");
  base.id = "joystick";
  const nub = document.createElement("div");
  nub.id = "joystick-nub";
  base.appendChild(nub);
  document.body.appendChild(base);

  let pid = null;
  const setFromEvent = (e) => {
    const r = base.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / 48;
    let dy = (e.clientY - (r.top + r.height / 2)) / 48;
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    joy.x = dx;
    joy.y = -dy; // screen-up = forward
    nub.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
    base.classList.toggle("zoomies", m > 0.7); // >70% deflection = chartreuse arc
  };
  base.addEventListener("pointerdown", (e) => {
    pid = e.pointerId;
    base.setPointerCapture(pid);
    base.classList.add("active");
    setFromEvent(e);
    e.preventDefault();
  });
  base.addEventListener("pointermove", (e) => {
    if (e.pointerId === pid) setFromEvent(e);
  });
  const end = (e) => {
    if (e.pointerId !== pid) return;
    pid = null;
    joy.x = 0;
    joy.y = 0;
    nub.style.transform = "";
    base.classList.remove("active", "zoomies");
  };
  base.addEventListener("pointerup", end);
  base.addEventListener("pointercancel", end);

  const bb = document.createElement("div");
  bb.id = "bark-btn";
  // bark/speech glyph — 1.5px ink stroke, no emoji, no text
  bb.innerHTML =
    `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" ` +
    `stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `<rect x="2.5" y="5.5" width="12.5" height="9" rx="3"/>` +
    `<path d="M6.5 14.5 L5.5 18 L9.5 14.5"/>` +
    `<path d="M18 8.75 A4 4 0 0 1 18 14.75"/>` +
    `<path d="M20.5 7 A7.2 7.2 0 0 1 20.5 16.5"/></svg>`;
  bb.setAttribute("role", "button");
  bb.setAttribute("aria-label", "bark");
  document.body.appendChild(bb);
  bb.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    bb.classList.add("pressed");
    if (started && barkHandler) barkHandler();
  });
  const bbUp = () => bb.classList.remove("pressed");
  bb.addEventListener("pointerup", bbUp);
  bb.addEventListener("pointercancel", bbUp);
  bb.addEventListener("pointerleave", bbUp);
}
