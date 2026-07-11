import * as THREE from "three";
import { C } from "../data/palette.js";

// daylight sky + drifting clouds (fog lives on the scene, set in renderer.js)
// Returns { follow(dogPos, camera, t) } — the sky group snaps to the dog's xz
// so the meadow can be endless, clouds drift slowly overhead, and a soft warm
// fill rides with the camera so Mini's cream fur reads sunlit from any angle.
export function initSpace(scene) {
  // ---------- lights: bright, soft, heavenly ----------
  scene.add(new THREE.HemisphereLight(0xeaf1ff, 0x8f8468, 1.25));
  const sun = new THREE.DirectionalLight(0xfff3da, 2.6);
  sun.position.set(5, 9, 4);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xf2e6d4, 0.6);
  fill.position.set(-4, 5, -4);
  scene.add(fill);
  // camera-side warm fill: follows the follow-cam so the side of Mini facing
  // the visitor always catches a little sunlight
  const camFill = new THREE.DirectionalLight(0xffe9c8, 0.35);
  scene.add(camFill);
  scene.add(camFill.target);

  const skyGroup = new THREE.Group();
  scene.add(skyGroup);

  // ---------- sky dome: zenith → glowing horizon gradient ----------
  {
    const geo = new THREE.SphereGeometry(58, 32, 15);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        cZenith: { value: new THREE.Color(C.skyZenith) },
        cHorizon: { value: new THREE.Color(C.skyHorizon) },
      },
      vertexShader: `
        varying vec3 vPos;
        void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform vec3 cZenith; uniform vec3 cHorizon; varying vec3 vPos;
        void main(){
          vec3 dir = normalize(vPos);
          float h = dir.y;
          vec3 col = mix(cHorizon, cZenith, smoothstep(0.02, 0.5, h));
          // the sun: a bright disc + a broad warm halo, aligned with the key light
          vec3 sunDir = normalize(vec3(5.0, 9.0, 4.0));
          float s = max(dot(dir, sunDir), 0.0);
          col += vec3(1.0, 0.96, 0.82) * (pow(s, 350.0) * 0.85 + pow(s, 8.0) * 0.14);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    skyGroup.add(new THREE.Mesh(geo, mat));
  }

  // ---------- drifting clouds ----------
  const clouds = new THREE.Group();
  skyGroup.add(clouds);
  {
    const puffGeo = new THREE.SphereGeometry(1, 18, 12);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      emissive: 0xfff6e8,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.94,
      fog: false,
    });
    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Group();
      const puffs = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < puffs; j++) {
        const m = new THREE.Mesh(puffGeo, cloudMat);
        const s = 1.5 + Math.random() * 2.1;
        m.position.set(
          j * 1.7 - puffs * 0.85 + (Math.random() - 0.5),
          Math.random() * 0.8,
          (Math.random() - 0.5) * 1.6
        );
        m.scale.set(s, s * 0.52, s * 0.78);
        cloud.add(m);
      }
      cloud.position.set(
        (Math.random() - 0.5) * 80,
        13 + Math.random() * 12,
        (Math.random() - 0.5) * 80
      );
      cloud.userData.baseX = cloud.position.x;
      cloud.userData.speed = 0.25 + Math.random() * 0.3;
      clouds.add(cloud);
    }
  }

  function follow(dogPos, camera, t = 0) {
    skyGroup.position.set(dogPos.x, 0, dogPos.z);
    camFill.position.copy(camera.position);
    camFill.target.position.set(dogPos.x, 0.8, dogPos.z);
    // clouds drift gently and wrap around the sky
    for (const cloud of clouds.children) {
      cloud.position.x = ((cloud.userData.baseX + t * cloud.userData.speed + 48) % 96) - 48;
    }
  }
  return { follow };
}
