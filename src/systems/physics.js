import * as THREE from "three";

// hand-rolled 2D circle physics on the y=0 plane.
// Dog = kinematic pusher (r 0.75), UNBOUNDED — the meadow is endless.
// Balls = dynamic circles kept near the market by a soft circular bound.
// Signpost plinths + booth counters = static circles (block bodies AND
// gently push the dog out, see applyDogBounds).

export const DOG_R = 0.75;
const STOP_BELOW = 0.15;
// invisible soft bound for dynamic bodies, centered on the market (origin):
// beyond it a gentle inward push brings strays home — nothing gets lost
const BODY_BOUND_R = 22;

const bodies = [];
const statics = [];

let onImpact = null; // (body, impactSpeed) — dog-contact nudges only
export function setOnImpact(fn) {
  onImpact = fn;
}
let onDogBump = null; // (static, approachSpeed) — dog walks into a counter
export function setOnDogBump(fn) {
  onDogBump = fn;
}
export function getBodies() {
  return bodies;
}

export function initFromWorld(world) {
  world.balls.forEach((b, i) => {
    bodies.push({
      id: "ball" + i,
      kind: "ball",
      holder: b.holder,
      spin: b.spin,
      r: 0.26,
      restitution: 0.6,
      damping: 1.6,
      vel: new THREE.Vector3(),
    });
  });
  for (const sp of world.signposts) statics.push({ tag: "sign", x: sp.pos.x, z: sp.pos.z, r: 0.3 });
  for (const c of world.counters) statics.push({ tag: c.tag, x: c.x, z: c.z, r: c.r });
}

const _axis = new THREE.Vector3();
const _q = new THREE.Quaternion();

export function update(dt, dog) {
  // integrate + collide each dynamic body
  for (const b of bodies) {
    const p = b.holder.position;
    p.x += b.vel.x * dt;
    p.z += b.vel.z * dt;
    // rolling friction — but never let a body come to rest outside the bound
    const rr = Math.hypot(p.x, p.z);
    b.vel.multiplyScalar(Math.exp(-b.damping * dt));
    if (b.vel.lengthSq() < STOP_BELOW * STOP_BELOW && rr <= BODY_BOUND_R) b.vel.set(0, 0, 0);

    // static props (signpost plinths)
    for (const s of statics) {
      const dx = p.x - s.x;
      const dz = p.z - s.z;
      const d = Math.hypot(dx, dz);
      const min = b.r + s.r;
      if (d < min && d > 1e-6) {
        const nx = dx / d;
        const nz = dz / d;
        p.x = s.x + nx * min;
        p.z = s.z + nz * min;
        const vn = b.vel.x * nx + b.vel.z * nz;
        if (vn < 0) {
          b.vel.x -= nx * vn * (1 + b.restitution);
          b.vel.z -= nz * vn * (1 + b.restitution);
        }
      }
    }

    // soft market bound: gentle inward push, strength grows with overshoot
    if (rr > BODY_BOUND_R && rr > 1e-6) {
      const nx = p.x / rr;
      const nz = p.z / rr;
      const k = Math.min((rr - BODY_BOUND_R) * 3, 12);
      b.vel.x -= nx * k * dt;
      b.vel.z -= nz * k * dt;
    }

    // dog pushes the body
    {
      let dx = p.x - dog.pos.x;
      let dz = p.z - dog.pos.z;
      let d = Math.hypot(dx, dz);
      const min = b.r + DOG_R;
      if (d < min) {
        let nx, nz;
        if (d < 1e-4) {
          nx = 1;
          nz = 0;
          d = 1e-4;
        } else {
          nx = dx / d;
          nz = dz / d;
        }
        p.x = dog.pos.x + nx * min;
        p.z = dog.pos.z + nz * min;
        const rel = (dog.vel.x - b.vel.x) * nx + (dog.vel.z - b.vel.z) * nz;
        if (rel > 0) {
          const imp = rel * (1 + b.restitution) * 0.65;
          b.vel.x += nx * imp;
          b.vel.z += nz * imp;
          if (b.vel.length() > 10) b.vel.setLength(10);
          if (onImpact) onImpact(b, rel);
        }
      }
    }
  }

  // body ↔ body
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const pa = a.holder.position;
      const pb = b.holder.position;
      const dx = pb.x - pa.x;
      const dz = pb.z - pa.z;
      const d = Math.hypot(dx, dz);
      const min = a.r + b.r;
      if (d < min && d > 1e-6) {
        const nx = dx / d;
        const nz = dz / d;
        const push = (min - d) / 2;
        pa.x -= nx * push;
        pa.z -= nz * push;
        pb.x += nx * push;
        pb.z += nz * push;
        const rel = (a.vel.x - b.vel.x) * nx + (a.vel.z - b.vel.z) * nz;
        if (rel > 0) {
          const e = Math.min(a.restitution, b.restitution);
          const imp = (rel * (1 + e)) / 2;
          a.vel.x -= nx * imp;
          a.vel.z -= nz * imp;
          b.vel.x += nx * imp;
          b.vel.z += nz * imp;
        }
      }
    }
  }

  // rolling visual: quaternion premultiply from velocity
  for (const b of bodies) {
    const sp = Math.hypot(b.vel.x, b.vel.z);
    if (sp > 0.001 && b.spin) {
      _axis.set(b.vel.z / sp, 0, -b.vel.x / sp); // up × v̂
      _q.setFromAxisAngle(_axis, (sp * dt) / b.r);
      b.spin.quaternion.premultiply(_q);
    }
  }
}

// the dog is unbounded now — this only keeps her out of the static props
// (signposts, booth counters), with normal velocity killed on contact.
// Slightly slimmer dog radius here so her nose can hang over a counter.
const DOG_STATIC_R = 0.55;
export function applyDogBounds(pos, vel) {
  for (const s of statics) {
    const dx = pos.x - s.x;
    const dz = pos.z - s.z;
    const d = Math.hypot(dx, dz);
    const min = s.r + DOG_STATIC_R;
    if (d < min && d > 1e-6) {
      const nx = dx / d;
      const nz = dz / d;
      pos.x = s.x + nx * min;
      pos.z = s.z + nz * min;
      const vn = vel.x * nx + vel.z * nz;
      if (vn < 0) {
        if (onDogBump) onDogBump(s, -vn);
        vel.x -= nx * vn;
        vel.z -= nz * vn;
      }
    }
  }
}
