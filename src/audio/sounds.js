// ---------- sounds (synthesized, no audio files) ----------
// Everything routes through a master GainNode so mute is one knob,
// persisted as localStorage "miniverse-muted".

let audioCtx = null;
let master = null;
let muted = false;
try {
  muted = localStorage.getItem("miniverse-muted") === "1";
} catch {
  // storage unavailable — default to sound on
}

function audio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    master = audioCtx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// called from the intro gate's user gesture so the context is allowed to start
export function resumeAudio() {
  try {
    audio();
  } catch {
    // no WebAudio — stay silent
  }
}

export function setMuted(m) {
  muted = m;
  try {
    localStorage.setItem("miniverse-muted", m ? "1" : "0");
  } catch {
    // fine, just not persisted
  }
  if (master) master.gain.value = m ? 0 : 1;
}
export function getMuted() {
  return muted;
}

export function squeak() {
  let ctx;
  try {
    ctx = audio();
  } catch {
    return;
  }
  const now = ctx.currentTime;
  for (const [f0, f1, at, dur] of [[1500, 950, 0, 0.09], [1350, 800, 0.13, 0.11]]) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(f0, now + at);
    o.frequency.exponentialRampToValueAtTime(f1, now + at + dur);
    g.gain.setValueAtTime(0.0001, now + at);
    g.gain.exponentialRampToValueAtTime(0.09, now + at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
    o.connect(g).connect(master);
    o.start(now + at);
    o.stop(now + at + dur + 0.05);
  }
}

export function munchSound() {
  let ctx;
  try {
    ctx = audio();
  } catch {
    return;
  }
  const now = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const len = 2000;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / len) ** 2;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 750;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(now + i * 0.18);
  }
}

// two short square-ish yips, ~150ms total — cute, not harsh
export function bark() {
  let ctx;
  try {
    ctx = audio();
  } catch {
    return;
  }
  const now = ctx.currentTime;
  for (const [f0, f1, at, dur] of [[660, 330, 0, 0.08], [740, 370, 0.11, 0.09]]) {
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(f0, now + at);
    o.frequency.exponentialRampToValueAtTime(f1, now + at + dur);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now + at);
    g.gain.exponentialRampToValueAtTime(0.14, now + at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
    o.connect(f).connect(g).connect(master);
    o.start(now + at);
    o.stop(now + at + dur + 0.05);
  }
}
