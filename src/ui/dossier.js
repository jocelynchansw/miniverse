import { fadeHint } from "./hud.js";

// specimen pages of the field manual.
// IDs are the contract: mini, ball, bokchoy, lemon, telemetry.
export const DOSSIERS = {
  mini: {
    tag: "Specimen 000 — The Subject",
    title: "Mini, Herself",
    body: "Small. Fluffy. Cream, shading to apricot in direct sunlight and in the opinion of everyone who meets her. This entire universe was constructed around her, which she regards as the obvious minimum.",
    foot: "fig. 0 — the subject, at rest",
    photo: true,
  },
  ball: {
    tag: "Specimen 001 — Contract Law",
    title: "The Fetch Agreement",
    body: "Fetch is governed by a contract Mini renegotiates mid-sprint. Current terms: you throw the ball, she considers it. Retrieval is offered on a goodwill basis and may be substituted, without notice, for standing very still in the grass.",
    foot: "fig. 1 — terms subject to zoomies",
  },
  bokchoy: {
    tag: "Specimen 002 — Flora",
    title: "On the Matter of Vegetables",
    body: "Mini loves vegetables with a devotion most dogs reserve for meat, mail carriers, or the void. Her plush bok choy is the most beloved object in this or any universe. Investigators have raised the possibility that she is part rabbit. The investigation is ongoing. The evidence is munching.",
    foot: "fig. 2 — do not taunt",
  },
  lemon: {
    tag: "Specimen 003 — Citrus",
    title: "Emotional Support Lemon",
    body: "The squeaky lemon is not a toy. It is an emotional support citrus, and it is on call. Its duties commence at 6:00 a.m. sharp, when it is squeaked with the urgency of a small yellow air-raid siren. It has never once been late.",
    foot: "fig. 3 — on call",
  },
  telemetry: {
    tag: "Specimen 005 — Instrumentation",
    title: "Good Dog Telemetry",
    body: "The counters in the corner are real, cumulative, and legally binding. Every fetch and every snack is entered into the permanent record. The record has only ever said one thing: good dog. We keep checking. It keeps saying it.",
    foot: "fig. 5 — verified",
  },
};

const dossierEl = document.getElementById("dossier");
const dossierTag = document.getElementById("dossier-tag");
const dossierTitle = document.getElementById("dossier-title");
const dossierBody = document.getElementById("dossier-body");
const dossierImg = document.getElementById("dossier-img");
const dossierFoot = document.getElementById("dossier-foot");

let onClose = null;
export function setOnClose(fn) {
  onClose = fn;
}

let open = false;
let exitTimer = null;
let tiltB = false; // pages alternate ±0.35deg

export function isDossierOpen() {
  return open;
}

export function openDossier(id) {
  const d = DOSSIERS[id];
  if (!d) return;
  fadeHint(); // first page found → the move reminder has done its job
  clearTimeout(exitTimer);
  dossierTag.textContent = d.tag;
  dossierTitle.textContent = d.title;
  dossierBody.textContent = d.body;
  dossierFoot.textContent = d.foot || "";
  dossierImg.hidden = !d.photo;
  dossierEl.classList.remove("closing");
  tiltB = !tiltB;
  dossierEl.classList.toggle("tilt-b", tiltB);
  dossierEl.hidden = false;
  open = true;
}

export function closeDossier() {
  if (!open) return;
  open = false;
  dossierEl.classList.add("closing");
  exitTimer = setTimeout(() => {
    dossierEl.hidden = true;
    dossierEl.classList.remove("closing");
  }, 250);
  if (onClose) onClose();
}

document.getElementById("dossier-close").addEventListener("click", closeDossier);
document.getElementById("dossier-back").addEventListener("click", closeDossier);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDossier();
});
