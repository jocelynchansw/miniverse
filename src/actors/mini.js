import * as THREE from "three";
import { C } from "../data/palette.js";
import { furryGroup } from "../fur/shells.js";
import { blob, inkMat, furLightMat, tongueMat } from "../world/props.js";

// ---------- Mini, the sculpture ----------
// v3: real dog proportions — horizontal torso, neck, defined muzzle, four
// articulated legs (trot gait lives in the controller), plume tail curled
// over the back. Cream/apricot coat with white-tipped paws, like the real
// Mini. Root sits at ground level (y=0), dog faces +z.
// Returns { group, rig, head, earL, earR, tail, tongue, legs }.
export function buildMini(quality = {}) {
  const shells = quality.dogShells ?? 18;
  const legShells = Math.max(6, Math.round(shells * 0.45)); // 4 legs × 2 colors — keep draw calls sane
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);

  // ----- torso: ribcage → waist → hips, cream chest bib, neck -----
  rig.add(
    furryGroup(
      [
        // ONE continuous ellipsoid torso — no sphere seams possible
        { color: C.apricot, x: 0, y: 0.62, z: -0.05, sx: 0.29, sy: 0.315, sz: 0.62 },
        // cream chest bib (an intentional color patch, mostly embedded)
        { color: C.creamLight, x: 0, y: 0.5, z: 0.44, sx: 0.16, sy: 0.19, sz: 0.14 },
        // neck rising to the head, buried deep in the shoulders
        { color: C.apricot, x: 0, y: 0.85, z: 0.4, sx: 0.16, sy: 0.2, sz: 0.17, rx: -0.5 },
      ],
      { shells }
    )
  );

  // ----- head -----
  const head = new THREE.Group();
  head.position.set(0, 1.04, 0.6);
  rig.add(head);
  head.add(
    furryGroup(
      [
        { color: C.apricot, x: 0, y: 0, z: 0, sx: 0.25, sy: 0.24, sz: 0.22 },
        // crown floof
        { color: C.creamLight, x: -0.06, y: 0.17, z: 0.02, sx: 0.1 },
        { color: C.apricot, x: 0.07, y: 0.18, z: -0.01, sx: 0.09 },
        // cheeks — tucked against the skull, not jowls
        { color: C.creamLight, x: -0.11, y: -0.08, z: 0.06, sx: 0.09 },
        { color: C.creamLight, x: 0.11, y: -0.08, z: 0.06, sx: 0.09 },
        // muzzle
        { color: C.creamLight, x: 0, y: -0.03, z: 0.24, sx: 0.11, sy: 0.095, sz: 0.14 },
      ],
      { shells }
    )
  );
  // nose
  head.add(blob(inkMat, 0, -0.01, 0.37, 0.05, 0.042, 0.04));
  // eyes + glints
  head.add(blob(inkMat, -0.1, 0.06, 0.17, 0.04));
  head.add(blob(inkMat, 0.1, 0.06, 0.17, 0.04));
  head.add(blob(furLightMat, -0.088, 0.075, 0.2, 0.012));
  head.add(blob(furLightMat, 0.112, 0.075, 0.2, 0.012));
  // tongue: a small blep tucked against the muzzle, draped slightly down
  const tongueGroup = new THREE.Group();
  tongueGroup.position.set(0, -0.115, 0.27);
  tongueGroup.rotation.x = 0.55;
  head.add(tongueGroup);
  const tongue = blob(tongueMat, 0, -0.035, 0.01, 0.04, 0.062, 0.028);
  tongueGroup.add(tongue);
  // floppy ears framing the face
  const earL = furryGroup(
    [{ color: C.apricotDeep, x: 0, y: -0.11, z: 0, sx: 0.08, sy: 0.18, sz: 0.11, fur: 2.0 }],
    { shells: legShells }
  );
  earL.position.set(-0.21, 0.08, -0.02);
  earL.rotation.z = 0.62;
  const earR = furryGroup(
    [{ color: C.apricotDeep, x: 0, y: -0.11, z: 0, sx: 0.08, sy: 0.18, sz: 0.11, fur: 2.0 }],
    { shells: legShells }
  );
  earR.position.set(0.21, 0.08, -0.02);
  earR.rotation.z = -0.62;
  head.add(earL, earR);

  // ----- legs: four articulated columns, white-tipped paws -----
  // pivot at the hip/shoulder so the controller can swing them (trot)
  function makeLeg(x, z) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.66, z);
    leg.add(
      furryGroup(
        [
          { color: C.apricot, x: 0, y: -0.17, z: 0, sx: 0.09, sy: 0.21, sz: 0.1 },
          { color: C.apricot, x: 0, y: -0.44, z: 0.01, sx: 0.062, sy: 0.18, sz: 0.07 },
          // white-tipped paw
          { color: C.creamLight, x: 0, y: -0.61, z: 0.035, sx: 0.078, sy: 0.055, sz: 0.11 },
        ],
        { shells: legShells }
      )
    );
    return leg;
  }
  const legFL = makeLeg(-0.17, 0.34);
  const legFR = makeLeg(0.17, 0.34);
  const legBL = makeLeg(-0.18, -0.44);
  const legBR = makeLeg(0.18, -0.44);
  rig.add(legFL, legFR, legBL, legBR);

  // ----- tail: plume curled up over the back, cream tip (like her photo) -----
  const tail = new THREE.Group();
  tail.position.set(0, 0.78, -0.68);
  rig.add(tail);
  tail.add(
    furryGroup(
      [
        { color: C.apricot, x: 0, y: 0.13, z: -0.04, sx: 0.09, sy: 0.22, sz: 0.11, rx: 0.75, fur: 2.6 },
        { color: C.creamLight, x: 0, y: 0.27, z: 0.09, sx: 0.085, fur: 2.8 },
      ],
      { shells }
    )
  );

  return {
    group,
    rig,
    head,
    earL,
    earR,
    tail,
    tongue,
    legs: { FL: legFL, FR: legFR, BL: legBL, BR: legBR },
  };
}
