import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { C } from "../data/palette.js";
import { furShellMaterial } from "../fur/shells.js";

// ---------- the endless meadow ----------
// A big flat ground disc plus a grass-carpet disc, both snapped to the dog's
// xz every frame. The grass shells hash their strand cells from WORLD-space
// xz (useWorldHash), so the carpet can slide under the dog without a single
// strand swimming. Fog (16 → 42) hides the carpet edge at r 55.

export const CARPET_R = 55;

// scatter decoration budgets — one InstancedMesh per type, recycled ahead of
// the dog once items fall more than RECYCLE_R behind
const TUFTS = 190;
const STONES = 30;
const FLOWERS = 80;
const RECYCLE_R = 48;

function annulusXZ(cx, cz, rMin, rMax, out) {
  const r = Math.sqrt(rMin * rMin + Math.random() * (rMax * rMax - rMin * rMin));
  const a = Math.random() * Math.PI * 2;
  out.x = cx + Math.sin(a) * r;
  out.z = cz + Math.cos(a) * r;
  return out;
}

export function initField(scene, quality) {
  // ---------- ground + grass carpet (dog-following group) ----------
  const group = new THREE.Group();
  scene.add(group);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(120, 48).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: C.ground, roughness: 1 })
  );
  ground.position.y = -0.02;
  group.add(ground);

  const grassGeo = new THREE.CircleGeometry(CARPET_R, 64).rotateX(-Math.PI / 2);
  const n = grassGeo.attributes.position.count;
  grassGeo.setAttribute("aFurScale", new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
  grassGeo.setAttribute("aFurDensity", new THREE.BufferAttribute(new Float32Array(n).fill(6), 1));
  group.add(
    new THREE.Mesh(
      grassGeo,
      new THREE.MeshStandardMaterial({
        // dark soil-shadow under the blades — the meadow's depth comes from
        // bright tips over a dark base, never the reverse
        color: new THREE.Color(C.grass).multiplyScalar(0.42),
        roughness: 1,
      })
    )
  );
  const shells = quality?.grassShells ?? 10;
  // tall enough to brush her paws — walking reads as moving THROUGH meadow.
  // blade mode: thin tapered blades, dense (48 cells/unit), meadow shading
  const grassOpts = {
    length: 0.52,
    droop: 0,
    sway: 0.3,
    useWorldHash: true,
    worldDensity: 48,
    blade: true,
  };
  for (let i = 1; i <= shells; i++) {
    group.add(new THREE.Mesh(grassGeo, furShellMaterial(C.grass, i / shells, grassOpts)));
  }

  // ---------- scatter: blades / tufts / stones / flowers (world-anchored, recycled) ----------
  const scatterItems = []; // { mesh, index, recycleR, respawnMin, respawnMax }

  function makeScatter(geo, mat, count, place, ring = {}) {
    const rMin = ring.rMin ?? 12;
    const rMax = ring.rMax ?? 45;
    const recycleR = ring.recycleR ?? RECYCLE_R;
    const respawnMin = ring.respawnMin ?? 30;
    const respawnMax = ring.respawnMax ?? 46;
    const im = new THREE.InstancedMesh(geo, mat, count);
    im.frustumCulled = false; // instances recycle across the whole field
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      annulusXZ(0, 0, rMin, rMax, p);
      p.y = 0;
      place(p, q, s, i);
      mtx.compose(p, q, s);
      im.setMatrixAt(i, mtx);
      scatterItems.push({ mesh: im, index: i, recycleR, respawnMin, respawnMax });
    }
    scene.add(im);
    return im;
  }

  // ---------- 3D blades everywhere: clumps of three, one draw call ----------
  // each instance is a small clump (×3 blades), recycled around the dog so
  // the whole visible meadow is genuinely made of grass blades
  {
    const BLADES = quality?.bladeClumps ?? 9000;
    const oneBlade = () => new THREE.ConeGeometry(0.016, 1, 4).translate(0, 0.5, 0);
    const bladeGeo = mergeGeometries([
      oneBlade(),
      oneBlade().applyMatrix4(
        new THREE.Matrix4().compose(
          new THREE.Vector3(0.05, 0, 0.02),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.28)),
          new THREE.Vector3(1, 0.85, 1)
        )
      ),
      oneBlade().applyMatrix4(
        new THREE.Matrix4().compose(
          new THREE.Vector3(-0.04, 0, -0.03),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0, -0.24)),
          new THREE.Vector3(1, 0.9, 1)
        )
      ),
    ]);
    const pos = bladeGeo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const cRoot = new THREE.Color(0x4a6b42);
    const cTip = new THREE.Color(0xbadb85);
    const _c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      _c.copy(cRoot).lerp(cTip, pos.getY(i));
      col[i * 3] = _c.r;
      col[i * 3 + 1] = _c.g;
      col[i * 3 + 2] = _c.b;
    }
    bladeGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const _e2 = new THREE.Euler();
    const blades = makeScatter(
      bladeGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, vertexColors: true }),
      BLADES,
      (p, q, s) => {
        q.setFromEuler(
          _e2.set((Math.random() - 0.5) * 0.45, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.45)
        );
        s.set(0.8 + Math.random() * 0.6, 0.22 + Math.random() * 0.34, 0.8 + Math.random() * 0.6);
      },
      { rMin: 0.6, rMax: 26, recycleR: 28, respawnMin: 8, respawnMax: 27 }
    );
    // warm/cool per-clump tint like the shader's patches
    const warm = new THREE.Color(1.12, 1.05, 0.85);
    const cool = new THREE.Color(0.92, 1.05, 0.95);
    for (let i = 0; i < BLADES; i++) blades.setColorAt(i, Math.random() < 0.5 ? warm : cool);
    blades.instanceColor.needsUpdate = true;
  }

  // taller grass tufts: three thin crossed blades, merged
  const blade = () => new THREE.ConeGeometry(0.05, 0.7, 5).translate(0, 0.35, 0);
  const tuftGeo = mergeGeometries([
    blade(),
    blade().applyMatrix4(
      new THREE.Matrix4().makeRotationZ(0.35).setPosition(0.09, 0, 0.03)
    ),
    blade().applyMatrix4(
      new THREE.Matrix4().makeRotationZ(-0.3).setPosition(-0.08, 0, -0.04)
    ),
  ]);
  const _e = new THREE.Euler();
  makeScatter(
    tuftGeo,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(C.grass).multiplyScalar(1.12),
      roughness: 1,
    }),
    TUFTS,
    (p, q, s) => {
      q.setFromEuler(_e.set(0, Math.random() * Math.PI * 2, 0));
      s.setScalar(0.7 + Math.random() * 0.8);
    }
  );

  // small stones: squashed dusk-violet blobs
  makeScatter(
    new THREE.SphereGeometry(0.22, 10, 7),
    new THREE.MeshStandardMaterial({ color: C.stone, roughness: 1, flatShading: true }),
    STONES,
    (p, q, s) => {
      q.setFromEuler(_e.set(0, Math.random() * Math.PI * 2, 0));
      s.set(0.6 + Math.random() * 0.9, 0.4 + Math.random() * 0.4, 0.6 + Math.random() * 0.9);
    }
  );

  // tiny flowers: thin stem + dot head; instanceColor tints the cream/chartreuse
  // head (stem vertex color is dark enough that the tint barely shifts it)
  const stemGeo = new THREE.CylinderGeometry(0.014, 0.018, 0.34, 5).translate(0, 0.17, 0);
  const headGeo = new THREE.SphereGeometry(0.05, 8, 6).translate(0, 0.36, 0);
  const paintVerts = (geo, color) => {
    const c = new THREE.Color(color);
    const count = geo.attributes.position.count;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    return geo;
  };
  const flowerGeo = mergeGeometries([
    paintVerts(stemGeo, 0x3c5a44),
    paintVerts(headGeo, 0xffffff),
  ]);
  const flowers = makeScatter(
    flowerGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, vertexColors: true }),
    FLOWERS,
    (p, q, s) => {
      q.setFromEuler(_e.set((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2));
      s.setScalar(0.8 + Math.random() * 0.6);
    }
  );
  {
    // backyard bouquet: mostly white daisies, some buttercup yellow, a little pink
    const white = new THREE.Color(0xfdfaf0);
    const yellow = new THREE.Color(0xf4df7a);
    const pink = new THREE.Color(0xf2b8c6);
    for (let i = 0; i < FLOWERS; i++) {
      const r = Math.random();
      flowers.setColorAt(i, r < 0.55 ? white : r < 0.85 ? yellow : pink);
    }
    flowers.instanceColor.needsUpdate = true;
  }

  // ---------- backyard treeline: low-poly trees + bushes breathing in the haze ----------
  {
    const placed = (geo, x, y, z, sx, sy, sz) =>
      geo.applyMatrix4(
        new THREE.Matrix4().compose(
          new THREE.Vector3(x, y, z),
          new THREE.Quaternion(),
          new THREE.Vector3(sx, sy ?? sx, sz ?? sx)
        )
      );
    const folMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      vertexColors: true,
    });
    const treeGeo = mergeGeometries([
      paintVerts(placed(new THREE.CylinderGeometry(0.09, 0.16, 1.5, 7), 0, 0.75, 0, 1), C.treeTrunk),
      paintVerts(placed(new THREE.SphereGeometry(1, 10, 8), 0, 1.95, 0, 1.05, 0.9, 1.05), C.treeFoliage),
      paintVerts(placed(new THREE.SphereGeometry(1, 10, 8), 0.55, 1.55, 0.15, 0.7, 0.6, 0.7), C.treeFoliageDark),
      paintVerts(placed(new THREE.SphereGeometry(1, 10, 8), -0.5, 1.65, -0.2, 0.65, 0.55, 0.65), C.treeFoliage),
    ]);
    makeScatter(
      treeGeo,
      folMat,
      26,
      (p, q, s) => {
        q.setFromEuler(_e.set(0, Math.random() * Math.PI * 2, 0));
        s.setScalar(1.6 + Math.random() * 1.4);
      },
      { rMin: 28, rMax: 44, recycleR: 48, respawnMin: 30, respawnMax: 44 }
    );
    const bushGeo = mergeGeometries([
      paintVerts(placed(new THREE.SphereGeometry(1, 9, 7), 0, 0.35, 0, 0.5, 0.4, 0.5), C.treeFoliage),
      paintVerts(placed(new THREE.SphereGeometry(1, 9, 7), 0.35, 0.28, 0.1, 0.38, 0.3, 0.38), C.treeFoliageDark),
      paintVerts(placed(new THREE.SphereGeometry(1, 9, 7), -0.32, 0.3, -0.08, 0.36, 0.3, 0.36), C.treeFoliage),
    ]);
    makeScatter(
      bushGeo,
      folMat,
      34,
      (p, q, s) => {
        q.setFromEuler(_e.set(0, Math.random() * Math.PI * 2, 0));
        s.setScalar(0.9 + Math.random() * 1.4);
      },
      { rMin: 14, rMax: 42, recycleR: 46, respawnMin: 18, respawnMax: 42 }
    );
  }

  // ---------- per-frame follow + recycle ----------
  const _m = new THREE.Matrix4();
  const _p = new THREE.Vector3();
  let tick = 0;
  function update(dogPos) {
    group.position.x = dogPos.x;
    group.position.z = dogPos.z;
    let dirtyTufts = false;
    // with ~10k scatter items, sweep 1/6 of them per frame — full coverage
    // every ~100ms, far faster than anything can walk out of range
    tick = (tick + 1) % 6;
    for (let i = tick; i < scatterItems.length; i += 6) {
      const it = scatterItems[i];
      it.mesh.getMatrixAt(it.index, _m);
      const dx = _m.elements[12] - dogPos.x;
      const dz = _m.elements[14] - dogPos.z;
      if (dx * dx + dz * dz > it.recycleR * it.recycleR) {
        annulusXZ(dogPos.x, dogPos.z, it.respawnMin, it.respawnMax, _p);
        _m.elements[12] = _p.x;
        _m.elements[14] = _p.z;
        it.mesh.setMatrixAt(it.index, _m);
        it.mesh.instanceMatrix.needsUpdate = true;
        dirtyTufts = true;
      }
    }
    return dirtyTufts;
  }

  return { update };
}
