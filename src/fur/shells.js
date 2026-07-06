import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// ---------- shell fur ----------
// Classic shell-fur: the base mesh is re-rendered `shells` times, each layer
// pushed outward along its normals. A hash-noise fragment shader keeps only
// thin tapering "strands" of each layer, so the silhouette reads as soft fur
// instead of hard geometry. Roots are darker, tips lighter, with a slight
// downward droop like combed fur.
//
// Parameterized so the same system grows Mini's coat (short, droopy, still)
// and the island grass (longer, upright, swaying in the wind).

export const DEFAULT_SHELLS = 18;

// single shared time uniform for every swaying shell material
const TIME = { value: 0 };
export function updateFurTime(t) {
  TIME.value = t;
}

// world-hash grass only: up to 8 worn patches (x, z, radius) where strands
// shorten to ~25% — booths trim the grass under themselves
const TRIMS = { value: Array.from({ length: 8 }, () => new THREE.Vector3(0, 0, 0)) };
export function setGrassTrims(list) {
  for (let i = 0; i < 8; i++) {
    const t = list[i];
    if (t) TRIMS.value[i].set(t.x, t.z, t.r);
    else TRIMS.value[i].set(0, 0, 0);
  }
}

const furShellCache = new Map();
export function furShellMaterial(hex, t, opts = {}) {
  const length = opts.length ?? 0.42;
  const droop = opts.droop ?? 0.6;
  const sway = opts.sway ?? 0;
  // useWorldHash: strand cells come from world-space xz instead of vUv, so a
  // mesh that follows the dog keeps its strands pinned to the ground plane
  const worldHash = !!opts.useWorldHash;
  const worldDensity = opts.worldDensity ?? 30;
  // blade mode (grass): thin tapered blades with a rich root→tip gradient and
  // large patchy hue variation, instead of round fur strands
  const blade = !!opts.blade;
  const rootR = blade ? 0.38 : 0.47;
  const tipR = blade ? 0.05 : 0.1;
  const key = `${hex}@${t.toFixed(4)}@${length}@${droop}@${sway}@${worldHash}@${worldDensity}@${blade}`;
  if (furShellCache.has(key)) return furShellCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 1 });
  m.defines = { USE_UV: "" };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = TIME;
    if (worldHash) shader.uniforms.uTrims = TRIMS;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime;\nattribute float aFurScale;\nattribute float aFurDensity;\nvarying float vFurDensity;" +
          (worldHash ? "\nvarying vec3 vWorldPos;" : "")
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vFurDensity = aFurDensity;
        float furOff = ${length.toFixed(3)} * ${t.toFixed(4)} * aFurScale;
        transformed += normal * furOff;
        // gravity droop, damped on small parts so their fluff still sticks out
        transformed.y -= furOff * ${t.toFixed(4)} * ${droop.toFixed(3)} * clamp(aFurScale, 0.25, 1.0);
        // time-uniform wind sway, strongest at the tips
        transformed.xz += vec2(sin(uTime * 1.3), cos(uTime * 1.7)) * ${(sway * t * t).toFixed(4)};` +
          (worldHash
            ? "\n        vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;"
            : "")
      );
    const cellSetup = worldHash
      ? `vec2 wp = vWorldPos.xz * ${worldDensity.toFixed(2)};
          vec2 cell = floor(wp);
          vec2 f = fract(wp) - 0.5;`
      : `vec2 density = vec2(110.0, 55.0) * vFurDensity;
          vec2 cell = floor(vUv * density);
          vec2 f = fract(vUv * density) - 0.5;`;
    const clumpExpr = worldHash
      ? "furHash(floor(vWorldPos.xz * 0.7))"
      : "furHash(floor(vUv * vec2(14.0, 7.0)))";
    const trimBlock = worldHash
      ? `for (int i = 0; i < 8; i++) {
            vec3 trim = uTrims[i];
            if (trim.z > 0.001) {
              float td = distance(vWorldPos.xz, trim.xy);
              len *= mix(0.25, 1.0, smoothstep(trim.z * 0.6, trim.z, td));
            }
          }`
      : "";
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vFurDensity;
        ${worldHash ? "varying vec3 vWorldPos;\nuniform vec3 uTrims[8];" : ""}
        float furHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        {
          // strand size adapts to part size so paws/tail/ears keep visible fluff
          ${cellSetup}
          float rnd = furHash(cell);
          // jitter each strand off the grid so the coat doesn't read as a waffle
          vec2 root = (vec2(furHash(cell + 3.0), furHash(cell + 5.0)) - 0.5) * 0.7;
          // low-frequency clumps: patches of longer and shorter fur, scruffy not uniform
          float clump = 0.75 + 0.55 * ${clumpExpr};
          float len = min((0.5 + 0.5 * rnd) * clump, 1.0);
          ${trimBlock}
          float prog = ${t.toFixed(4)} / len;
          if (prog > 1.0) discard;
          vec2 sway = (vec2(furHash(cell + 7.0), furHash(cell + 13.0)) - 0.5) * prog * 1.2;
          float r = mix(${rootR.toFixed(3)}, ${tipR.toFixed(3)}, prog);
          if (length(f - root - sway) > r) discard;
          ${
            blade
              ? `// meadow shading: dark rich roots -> sunlit yellow-green tips,
          // with large warm/cool patches so the field never reads as uniform
          diffuseColor.rgb *= mix(vec3(0.38, 0.46, 0.36), vec3(1.5, 1.55, 1.0), prog);
          float hueP = furHash(floor(vWorldPos.xz * 0.35) + 31.0);
          diffuseColor.rgb *= vec3(0.9 + 0.25 * hueP, 1.0, 0.85 + 0.2 * (1.0 - hueP));
          diffuseColor.rgb *= 0.88 + 0.24 * furHash(cell + 21.0);`
              : `// deep shadowed roots -> warm sunlit tips, per-strand tint variation
          diffuseColor.rgb *= mix(vec3(0.6), vec3(1.32, 1.22, 1.04), prog);
          diffuseColor.rgb *= 0.88 + 0.24 * furHash(cell + 21.0);`
          }
          // fresnel rim so grazing-angle fur glows like backlit fluff
          float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.5);
          diffuseColor.rgb += fres * ${blade ? "0.12" : "0.22"};
        }`
      );
  };
  furShellCache.set(key, m);
  return m;
}

// Merge all blobs of one color into a single geometry, then stack fur shells
// on top of it. aFurScale keeps fur length proportional to each blob's size
// so paws don't get body-length shag.
export function furryGroup(blobs, opts = {}) {
  const shells = opts.shells ?? DEFAULT_SHELLS;
  const byColor = new Map();
  for (const b of blobs) {
    const g = new THREE.SphereGeometry(1, 28, 20);
    const sy = b.sy ?? b.sx;
    const sz = b.sz ?? b.sx;
    const mtx = new THREE.Matrix4().compose(
      new THREE.Vector3(b.x, b.y, b.z),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(b.rx ?? 0, 0, b.rz ?? 0)
      ),
      new THREE.Vector3(b.sx, sy, sz)
    );
    g.applyMatrix4(mtx);
    const size = Math.min((b.sx + sy + sz) / 3, 1);
    const furScale = size * (b.fur ?? 1);
    // fur length follows part size (and any fur boost); strand density
    // follows raw size only, so boosted parts get longer fur, not finer fur
    const densityScale = Math.min(Math.max(size * 1.1, 0.25), 1);
    const count = g.attributes.position.count;
    g.setAttribute(
      "aFurScale",
      new THREE.BufferAttribute(new Float32Array(count).fill(furScale), 1)
    );
    g.setAttribute(
      "aFurDensity",
      new THREE.BufferAttribute(new Float32Array(count).fill(densityScale), 1)
    );
    if (!byColor.has(b.color)) byColor.set(b.color, []);
    byColor.get(b.color).push(g);
  }
  const group = new THREE.Group();
  for (const [color, geos] of byColor) {
    const merged = mergeGeometries(geos);
    // base coat matches the strand-root shade so roots don't read as
    // dark spots against a brighter skin
    const baseColor = new THREE.Color(color).multiplyScalar(0.6);
    group.add(
      new THREE.Mesh(
        merged,
        new THREE.MeshStandardMaterial({ color: baseColor, roughness: 1 })
      )
    );
    for (let i = 1; i <= shells; i++) {
      group.add(new THREE.Mesh(merged, furShellMaterial(color, i / shells, opts)));
    }
  }
  return group;
}
