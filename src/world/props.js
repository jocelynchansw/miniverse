import * as THREE from "three";
import { C } from "../data/palette.js";
import { setGrassTrims } from "../fur/shells.js";

// ---------- shared primitive vocabulary ----------
export const sphere = new THREE.SphereGeometry(1, 32, 24);
export const inkMat = new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.35 });
export const furLightMat = new THREE.MeshStandardMaterial({ color: C.creamLight, roughness: 1 });
export const tongueMat = new THREE.MeshStandardMaterial({ color: C.tongue, roughness: 0.6 });

export function blob(mat, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(sphere, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy ?? sx, sz ?? sx);
  return m;
}

// ---------- builders ----------
function tennisBallTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const g = cv.getContext("2d");
  g.fillStyle = "#d4e64e";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#f6ebd7";
  g.lineWidth = 14;
  g.beginPath();
  g.moveTo(64, -10);
  g.quadraticCurveTo(128, 128, 64, 266);
  g.stroke();
  g.beginPath();
  g.moveTo(192, -10);
  g.quadraticCurveTo(128, 128, 192, 266);
  g.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildTennisBall() {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 32, 24),
    new THREE.MeshStandardMaterial({
      map: tennisBallTexture(),
      roughness: 0.9,
      emissive: C.ball, // brightest object on the island
      emissiveIntensity: 0.18,
    })
  );
  g.add(ball);
  return g;
}

export function buildBokChoy() {
  const g = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: C.bokchoyStem, roughness: 0.8 });
  // stalk bases
  g.add(blob(stemMat, 0, -0.18, 0, 0.3, 0.34, 0.3));
  g.add(blob(stemMat, -0.14, -0.05, 0.08, 0.16, 0.3, 0.16));
  g.add(blob(stemMat, 0.14, -0.05, -0.06, 0.16, 0.3, 0.16));
  // leaves
  const leafMat = new THREE.MeshStandardMaterial({ color: C.bokchoyLeaf, roughness: 0.9 });
  const leafDark = new THREE.MeshStandardMaterial({ color: C.bokchoyDark, roughness: 0.9 });
  const leaves = [
    [0, 0.3, 0, 0, leafMat],
    [0.16, 0.26, -0.05, -0.45, leafDark],
    [-0.16, 0.26, 0.05, 0.45, leafMat],
    [0.02, 0.28, 0.14, 0.3, leafDark],
    [-0.05, 0.28, -0.14, -0.3, leafMat],
  ];
  for (const [x, y, z, tilt, mat] of leaves) {
    const leaf = blob(mat, x, y, z, 0.17, 0.32, 0.1);
    leaf.rotation.z = tilt;
    leaf.rotation.x = (Math.random() - 0.5) * 0.3;
    g.add(leaf);
  }
  return g;
}

export function buildCarrot() {
  const g = new THREE.Group();
  const carrotMat = new THREE.MeshStandardMaterial({ color: C.carrot, roughness: 0.85 });
  const leafMat = new THREE.MeshStandardMaterial({ color: C.bokchoyLeaf, roughness: 0.9 });
  // tapered root half-poking out of the soil
  g.add(blob(carrotMat, 0, 0.16, 0, 0.2, 0.3, 0.2));
  g.add(blob(carrotMat, 0, -0.08, 0, 0.13, 0.22, 0.13));
  // feathery top
  for (const [x, z, tilt] of [[-0.08, 0.02, 0.5], [0.09, -0.03, -0.4], [0, 0.08, 0.1]]) {
    const frond = blob(leafMat, x, 0.5, z, 0.06, 0.18, 0.06);
    frond.rotation.z = tilt;
    g.add(frond);
  }
  return g;
}

export function buildCucumber() {
  const g = new THREE.Group();
  const cucMat = new THREE.MeshStandardMaterial({ color: C.cucumber, roughness: 0.85 });
  const body = blob(cucMat, 0, 0.13, 0, 0.42, 0.14, 0.14);
  body.rotation.y = 0.6;
  g.add(body);
  // pale speckles + stem nub
  const speckMat = new THREE.MeshStandardMaterial({ color: C.bokchoyStem, roughness: 0.9 });
  g.add(blob(speckMat, 0.12, 0.21, 0.06, 0.035));
  g.add(blob(speckMat, -0.14, 0.2, -0.05, 0.03));
  g.add(blob(new THREE.MeshStandardMaterial({ color: C.bokchoyDark, roughness: 0.9 }), 0.36, 0.15, -0.22, 0.05, 0.05, 0.08));
  return g;
}

export function buildLettuce() {
  // a loose ball of overlapping leaf blobs, two greens, ~0.5u
  const g = new THREE.Group();
  const leafA = new THREE.MeshStandardMaterial({ color: C.lettuce, roughness: 0.9 });
  const leafB = new THREE.MeshStandardMaterial({ color: C.bokchoyLeaf, roughness: 0.9 });
  g.add(blob(leafA, 0, 0.2, 0, 0.2, 0.18, 0.2)); // heart
  const leaves = [
    [0.13, 0.18, 0.05, -0.55, leafB],
    [-0.13, 0.18, -0.02, 0.55, leafA],
    [0.02, 0.19, 0.14, 0.1, leafA],
    [-0.03, 0.19, -0.15, -0.15, leafB],
    [0.15, 0.15, -0.12, -0.4, leafA],
    [-0.16, 0.14, 0.1, 0.45, leafB],
  ];
  for (const [x, y, z, tilt, mat] of leaves) {
    const leaf = blob(mat, x, y, z, 0.14, 0.19, 0.1);
    leaf.rotation.z = tilt;
    leaf.rotation.y = Math.atan2(x, z || 0.01);
    leaf.rotation.x = (Math.random() - 0.5) * 0.4;
    g.add(leaf);
  }
  return g;
}

export function buildLemon() {
  const g = new THREE.Group();
  const body = blob(
    new THREE.MeshStandardMaterial({ color: C.lemon, roughness: 0.85 }),
    0, 0, 0, 0.44, 0.34, 0.34
  );
  g.add(body);
  // little face, like the plushie
  g.add(blob(inkMat, -0.14, 0.05, 0.31, 0.035));
  g.add(blob(inkMat, 0.14, 0.05, 0.31, 0.035));
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.018, 8, 24, Math.PI),
    inkMat
  );
  smile.position.set(0, -0.02, 0.33);
  smile.rotation.z = Math.PI;
  g.add(smile);
  // leaf on top
  const leaf = blob(
    new THREE.MeshStandardMaterial({ color: C.bokchoyLeaf, roughness: 0.9 }),
    0.05, 0.36, 0, 0.1, 0.05, 0.16
  );
  leaf.rotation.z = -0.4;
  g.add(leaf);
  return g;
}

export function buildSignpost(markerColor) {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: C.signWood, roughness: 0.9 });
  const plinthMat = new THREE.MeshStandardMaterial({ color: C.path, roughness: 1 });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.16, 20), plinthMat);
  plinth.position.y = 0.05;
  g.add(plinth);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.25, 10), woodMat);
  post.position.y = 0.68;
  g.add(post);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.38, 0.06), woodMat);
  plank.position.set(0, 1.12, 0.05);
  plank.rotation.z = 0.04;
  g.add(plank);
  // a little colored marker blob so each post hints at its subject
  const marker = blob(
    new THREE.MeshStandardMaterial({ color: markerColor, roughness: 0.7 }),
    0, 1.12, 0.1, 0.09, 0.09, 0.05
  );
  g.add(marker);
  // chartreuse lantern hanging under the plank — the one allowed glow.
  // Breathes on a 4s cycle; warms to full while its dossier is open (zones.js)
  const lanternMat = new THREE.MeshStandardMaterial({
    color: C.chartreuse,
    emissive: C.chartreuse,
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0.92,
    roughness: 0.6,
  });
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6), woodMat);
  string.position.set(0, 0.88, 0.05);
  g.add(string);
  g.add(blob(lanternMat, 0, 0.78, 0.05, 0.055));
  g.userData.lanternMat = lanternMat;
  return g;
}

// ---------- market stall ----------
const boothMatCache = new Map();
function matteMat(hex) {
  if (!boothMatCache.has(hex)) {
    boothMatCache.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 1 }));
  }
  return boothMatCache.get(hex);
}

// A little produce booth grown from the low-poly vocabulary: 4 corner posts,
// a counter/crate box at the front (local +z faces the plaza), a sloped
// awning of alternating slats, a small hanging plank sign, and a worn-earth
// disc underneath. Everything matte — nothing at the market is glossy.
export function makeBooth({ stripeA, stripeB = C.cream }) {
  const g = new THREE.Group();
  const wood = matteMat(C.signWood);

  // worn earth underfoot
  const earth = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 36).rotateX(-Math.PI / 2),
    matteMat(C.path)
  );
  earth.position.y = 0.02;
  g.add(earth);

  // 4 corner posts
  const postGeo = new THREE.BoxGeometry(0.1, 1.7, 0.1);
  for (const [px, pz] of [[-0.85, -0.55], [0.85, -0.55], [-0.85, 0.55], [0.85, 0.55]]) {
    const post = new THREE.Mesh(postGeo, wood);
    post.position.set(px, 0.85, pz);
    g.add(post);
  }

  // counter/crate box at the front, with a slightly overhanging top plank
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 0.65), wood);
  counter.position.set(0, 0.275, 0.6);
  g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.75), matteMat(C.path));
  top.position.set(0, 0.58, 0.6);
  g.add(top);

  // gently sloped awning: alternating box slats, veggie color + cream
  const awning = new THREE.Group();
  awning.position.set(0, 1.72, 0.1);
  awning.rotation.x = 0.26; // front edge dips toward the plaza
  const slatGeo = new THREE.BoxGeometry(0.37, 0.05, 1.5);
  for (let i = 0; i < 5; i++) {
    const slat = new THREE.Mesh(slatGeo, matteMat(i % 2 === 0 ? stripeA : stripeB));
    slat.position.set(-0.74 + i * 0.37, 0, 0.25);
    awning.add(slat);
  }
  g.add(awning);

  // small hanging plank sign (booths are named by their zone label instead)
  for (const sx of [-0.16, 0.16]) {
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.28, 6), wood);
    string.position.set(sx, 1.42, 0.82);
    g.add(string);
  }
  const plank = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.26, 0.05), wood);
  plank.position.set(0, 1.18, 0.82);
  plank.rotation.z = 0.03;
  g.add(plank);
  const badge = blob(matteMat(stripeA), 0, 1.18, 0.86, 0.07, 0.07, 0.04);
  g.add(badge);

  return g;
}

// ---------- placement (bearing° from +Z, radius from center) ----------
function bearingXZ(deg, r) {
  const a = (deg * Math.PI) / 180;
  return new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r);
}

// the market: an arc of booths around the spawn plaza, radius 8, facing
// origin, ~40° apart. The fetch lawn sits open on the opposite side (deg 0).
const BOOTHS = [
  { id: "bokchoy", label: "the bok choy stand", deg: 100, stripe: C.bokchoyLeaf, build: buildBokChoy, oy: 0.42 },
  { id: "lettuce", label: "the lettuce stand", deg: 140, stripe: C.lettuce, build: buildLettuce, oy: 0.0 },
  { id: "carrot", label: "the carrot stand", deg: 180, stripe: C.carrot, build: buildCarrot, oy: -0.05 },
  { id: "cucumber", label: "the cucumber stand", deg: 220, stripe: C.cucumber, build: buildCucumber, oy: -0.05 },
  { id: "toys", label: "the toy annex", deg: 260, stripe: C.lemon, build: null, oy: 0 },
];

const SIGNPOSTS = [
  { id: "mini", deg: 40, r: 4.2, marker: C.apricot }, // near spawn
  { id: "telemetry", deg: 320, r: 4.5, marker: C.cream }, // spawn edge
  { id: "ball", deg: 20, r: 8.5, marker: C.ball }, // fetch lawn
  { id: "bokchoy", deg: 120, r: 10.8, marker: C.bokchoyLeaf }, // veggie stands
  { id: "lemon", deg: 282, r: 9.4, marker: C.lemon }, // toy stall
];

export function placeProps(scene) {
  const world = { balls: [], veggies: [], signposts: [], zones: [], counters: [] };

  // spawn plaza + fetch lawn zones
  world.zones.push({
    id: "landing",
    label: "the landing lawn",
    pos: new THREE.Vector3(0, 0, 0),
    r: 3,
    once: true, // entry-sequence label: shows only on start
  });
  const fetchC = bearingXZ(0, 6.5);
  world.zones.push({ id: "fetch", label: "the fetch court", pos: fetchC, r: 3 });

  // fetch lawn: 3 tennis balls, open grass, no booth
  for (const [ox, oz] of [[0, 0], [0.95, 0.55], [-0.8, 0.9]]) {
    const holder = new THREE.Group();
    const ball = buildTennisBall();
    holder.add(ball);
    holder.position.set(fetchC.x + ox, 0.26 - 0.05, fetchC.z + oz);
    scene.add(holder);
    world.balls.push({ holder, spin: ball });
  }

  // market booths (grass shortens under each one via the world-hash trims)
  setGrassTrims(BOOTHS.map((b) => {
    const p = bearingXZ(b.deg, 8);
    return { x: p.x, z: p.z, r: 2.0 };
  }));
  const _local = new THREE.Vector3();
  for (const b of BOOTHS) {
    const pos = bearingXZ(b.deg, 8);
    const booth = makeBooth({ stripeA: b.stripe });
    booth.position.copy(pos);
    booth.rotation.y = (b.deg * Math.PI) / 180 + Math.PI; // counter faces the plaza
    scene.add(booth);
    booth.updateMatrixWorld(true);

    world.zones.push({ id: b.id, label: b.label, pos, r: 2.6 });

    // counter static circle (blocks the dog + bodies; toy counter squeaks)
    booth.localToWorld(_local.set(0, 0, 0.6));
    world.counters.push({ tag: b.id, x: _local.x, z: _local.z, r: 0.75 });

    if (b.build) {
      // 3 produce items on the worn earth by the front crate
      for (const [ox, oz] of [[-0.62, 1.38], [0.02, 1.5], [0.62, 1.38]]) {
        const holder = new THREE.Group();
        holder.add(b.build());
        booth.localToWorld(_local.set(ox, 0, oz));
        holder.position.set(_local.x, b.oy, _local.z);
        scene.add(holder);
        world.veggies.push({
          kind: b.id,
          holder,
          pos: holder.position,
          state: "grown",
          eatenAt: 0,
          popAt: null,
        });
      }
    } else {
      // toy stall: the squeaky lemon lives on the counter
      const holder = new THREE.Group();
      const lemon = buildLemon();
      holder.add(lemon);
      booth.localToWorld(_local.set(0, 0, 0.62));
      holder.position.set(_local.x, 0.61 + 0.3, _local.z);
      holder.rotation.y = booth.rotation.y; // little face toward the plaza
      scene.add(holder);
      world.lemon = { holder, spin: lemon };
    }
  }

  // signposts, planks facing the plaza
  for (const sp of SIGNPOSTS) {
    const pos = bearingXZ(sp.deg, sp.r);
    const post = buildSignpost(sp.marker);
    post.position.copy(pos);
    post.rotation.y = (sp.deg * Math.PI) / 180 + Math.PI;
    scene.add(post);
    world.signposts.push({ id: sp.id, pos, mesh: post, lantern: post.userData.lanternMat, warm: 0 });
  }

  return world;
}
