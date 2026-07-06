import { setMuted, getMuted } from "../audio/sounds.js";

// ---------- good dog telemetry (localStorage key must stay "miniverse-stats") ----------
export const stats = { fetches: 0, snacks: 0 };
try {
  Object.assign(stats, JSON.parse(localStorage.getItem("miniverse-stats") || "{}"));
} catch {
  // corrupted storage — start fresh
}
const statFetch = document.getElementById("stat-fetch");
const statSnack = document.getElementById("stat-snack");
const statsEl = document.getElementById("stats");
const toastEl = document.getElementById("toast");

let prevFetches = stats.fetches;
let prevSnacks = stats.snacks;
let toastTimer = null;

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  toastEl.classList.remove("show");
  void toastEl.offsetWidth; // restart the animation
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
    toastEl.classList.remove("show");
  }, 1450);
}

// digit rolls upward on increment
function roll(el) {
  el.classList.remove("roll");
  void el.offsetWidth;
  el.classList.add("roll");
}

export function renderStats(bump) {
  statFetch.textContent = stats.fetches;
  statSnack.textContent = stats.snacks;
  if (bump) {
    if (stats.fetches > prevFetches) {
      roll(statFetch);
      showToast("+1 FETCH · CONTRACT HONORED (THIS TIME)");
    }
    if (stats.snacks > prevSnacks) {
      roll(statSnack);
      showToast("+1 SNACK · RECORDED");
    }
    statsEl.classList.remove("bump");
    void statsEl.offsetWidth;
    statsEl.classList.add("bump");
  }
  prevFetches = stats.fetches;
  prevSnacks = stats.snacks;
  try {
    localStorage.setItem("miniverse-stats", JSON.stringify(stats));
  } catch {
    // fine, just not persisted
  }
}

// ---------- zone label: fade in 300ms, hold 2.5s, fade out ----------
const zoneEl = document.getElementById("zone-label");
let zoneHoldTimer = null;
let zoneHideTimer = null;

function fadeOutZone() {
  zoneEl.classList.remove("show");
  zoneHideTimer = setTimeout(() => {
    zoneEl.hidden = true;
  }, 350);
}

export function setZoneLabel(text) {
  clearTimeout(zoneHoldTimer);
  clearTimeout(zoneHideTimer);
  if (text) {
    zoneEl.textContent = text;
    zoneEl.hidden = false;
    requestAnimationFrame(() => zoneEl.classList.add("show"));
    zoneHoldTimer = setTimeout(fadeOutZone, 2800); // 300ms in + 2.5s hold
  } else {
    fadeOutZone();
  }
}

// ---------- intro gate + hint + mute + manual ----------
const hintEl = document.getElementById("hint");
const introEl = document.getElementById("intro");
const muteEl = document.getElementById("mute");
const manualEl = document.getElementById("manual-btn");

// inline SVG bells (1.5px ink stroke) — no emoji in this universe
const SVG_ATTRS =
  `viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ` +
  `stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
const BELL_PATHS =
  `<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 3.8 1.5 5.3 1.5 5.3H5S6.5 13.8 6.5 10Z"/>` +
  `<path d="M10.2 18.3a1.9 1.9 0 0 0 3.6 0"/>`;
const BELL_ON = `<svg ${SVG_ATTRS}>${BELL_PATHS}</svg>`;
const BELL_OFF = `<svg ${SVG_ATTRS}>${BELL_PATHS}<line x1="4.5" y1="4" x2="19.5" y2="20"/></svg>`;

function renderMute() {
  const m = getMuted();
  muteEl.innerHTML = m ? BELL_OFF : BELL_ON;
  muteEl.classList.toggle("muted", m);
  const label = m ? "unhush the universe" : "hush the universe";
  muteEl.setAttribute("aria-label", label);
  muteEl.title = label;
}

// the move reminder stays up until the FIRST dossier opens (any signpost) —
// finding a sign proves the visitor can steer; then it fades permanently.
// dossier.js calls this.
export function fadeHint() {
  hintEl.classList.add("faded");
}

export function initHud({ onStart }) {
  renderStats(false);

  // HUD hides behind the intro cover (CSS keys off body.intro-open)
  document.body.classList.add("intro-open");

  // intro gate: any key / tap begins (also unlocks the AudioContext).
  // the "?" manual button reopens the cover; the world keeps running behind it.
  let begun = false;
  let introTimer = null;

  const closeIntro = () => {
    if (introEl.hidden || introEl.classList.contains("closing")) return;
    introEl.classList.add("closing"); // sheet lifts, scrim dissolves (CSS)
    document.body.classList.remove("intro-open"); // HUD fades back in
    introTimer = setTimeout(() => {
      introEl.hidden = true;
      introEl.classList.remove("closing");
    }, 620);
    if (!begun) {
      begun = true;
      onStart();
    }
  };
  const openIntro = () => {
    clearTimeout(introTimer);
    introEl.classList.remove("closing");
    introEl.hidden = false;
    document.body.classList.add("intro-open");
  };

  window.addEventListener("keydown", closeIntro);
  introEl.addEventListener("pointerdown", closeIntro);

  // ---------- appendices: the "?" opens the manual's back pages ----------
  const appendixEl = document.getElementById("appendix");
  const openAppendix = () => {
    appendixEl.hidden = false;
  };
  const closeAppendix = () => {
    appendixEl.hidden = true;
  };
  manualEl.addEventListener("click", openAppendix);
  document.getElementById("appendix-close").addEventListener("click", closeAppendix);
  appendixEl.addEventListener("pointerdown", (e) => {
    if (e.target === appendixEl) closeAppendix(); // scrim click
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAppendix();
  });
  // tabs
  const tabs = appendixEl.querySelectorAll(".appendix-tab");
  const panels = appendixEl.querySelectorAll(".appendix-panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.toggle("active", b === tab));
      panels.forEach((p) => {
        p.hidden = p.dataset.panel !== tab.dataset.tab;
      });
      appendixEl.querySelector(".appendix-sheet").scrollTop = 0;
    });
  });

  // mute
  renderMute();
  muteEl.addEventListener("click", () => {
    setMuted(!getMuted());
    renderMute();
  });
}
