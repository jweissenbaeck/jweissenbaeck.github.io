// A small chamber in the rock. Daylight falls through a crack in the ceiling,
// everything else is darkness and stone.
import { THREE, makeRenderer, tracker, pbr, parts, scatter, motes, loop, fbm, dotSprite } from './kit.js';

// the rock is wrapped onto the shell from three sides, so it has no seams
function triplanar(mat, scale) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTri = { value: scale };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWP; varying vec3 vWN; uniform float uTri;
        vec3 triW() { vec3 w = pow(abs(normalize(vWN)), vec3(4.0)); return w / (w.x + w.y + w.z); }
        vec4 tri(sampler2D t) {
          vec3 w = triW(); vec3 p = vWP * uTri;
          return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z;
        }`)
      .replace('#include <map_fragment>', 'diffuseColor *= tri(map);')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * tri(roughnessMap).g;')
      .replace('#include <aomap_fragment>', '')
      .replace('#include <normal_fragment_maps>', `{
          vec3 n = normalize(vWN); vec3 w = triW(); vec3 p = vWP * uTri;
          vec3 tx = texture2D(normalMap, p.zy).xyz * 2.0 - 1.0;
          vec3 ty = texture2D(normalMap, p.xz).xyz * 2.0 - 1.0;
          vec3 tz = texture2D(normalMap, p.xy).xyz * 2.0 - 1.0;
          tx.xy *= normalScale; ty.xy *= normalScale; tz.xy *= normalScale;
          // whiteout blend, one tangent frame per projection
          vec3 nx = normalize(vec3(tx.xy + n.zy, abs(tx.z) * n.x)).zyx;
          vec3 ny = normalize(vec3(ty.xy + n.xz, abs(ty.z) * n.y)).xzy;
          vec3 nz = normalize(vec3(tz.xy + n.xy, abs(tz.z) * n.z));
          vec3 wn = normalize(nx * w.x + ny * w.y + nz * w.z);
          normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
          // the shell is seen from inside
          normal *= faceDirection;
        }`);
  };
  mat.customProgramCacheKey = () => 'triplanar' + scale;
}

const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

export function createCave(canvas, { onReady } = {}) {
  const renderer = makeRenderer(canvas, { exposure: 1.05 });
  if (!renderer) return null;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030303);
  scene.fog = new THREE.FogExp2(0x030303, 0.035);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 60);

  const track = tracker(ready);

  // the chamber: a sphere pushed in and out by noise, low and wide, flat underfoot
  const FLOOR = -1.5;
  const geo = new THREE.SphereGeometry(1, 220, 140);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = 1 + 0.26 * fbm(v.x * 1.4 + 3, v.y * 1.4, v.z * 1.4, 4) + 0.06 * fbm(v.x * 7, v.y * 7, v.z * 7, 3);
    v.multiplyScalar(r);
    v.set(v.x * 6, v.y * 3.6, v.z * 5.4);
    if (v.y < FLOOR) v.y = FLOOR + (v.y - FLOOR) * 0.04;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const rock = pbr(renderer, 'rock', 1, track, { color: 0xa09e99, side: THREE.BackSide, normalScale: new THREE.Vector2(1.6, 1.6) });
  triplanar(rock, 0.32);
  const shell = new THREE.Mesh(geo, rock);
  shell.receiveShadow = shell.castShadow = true;
  scene.add(shell);

  const floorMat = pbr(renderer, 'cavefloor', 3, track, { color: 0x77756f });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR + 0.02;
  floor.receiveShadow = true;
  scene.add(floor);

  // boulders and a rock face for something close to the eye
  const add = (name, t, tint, after) => {
    const done = track.add();
    parts(name).then((list) => {
      const n = scene.children.length;
      scatter(scene, list, t, { tint });
      after && after(scene.children.slice(n));
      done();
    }).catch(done);
  };
  // what stands in front of the name: drawn after it, so it covers it
  const inFront = (o) => {
    o.renderOrder = 2;
    const m = o.material;
    if (m) { m.transparent = true; m.opacity = 1; }
  };
  // seeded, so the rocks lie the same way on every visit
  let seed = 9;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const range = (a, b) => a + rnd() * (b - a);
  // a heap: big stones at the back against the wall, smaller ones rolled forward
  const heap = (cx, cz, n, size, towards) => Array.from({ length: n }, (_, k) => {
    const f = k / Math.max(1, n - 1);
    return {
      x: cx + range(-0.9, 0.9) + towards[0] * f * 1.4,
      z: cz + range(-0.6, 0.6) + towards[1] * f * 1.4,
      y: FLOOR - range(0.05, 0.22),
      s: size * (1.25 - f * 0.65) * range(0.85, 1.1),
      ry: rnd() * Math.PI * 2,
    };
  });

  add('rockface', [
    { x: -4.6, y: FLOOR - 0.3, z: -1.6, s: 0.95, ry: 1.3 },
    { x: 4.1, y: FLOOR - 0.3, z: -3.9, s: 0.9, ry: -2.2 },
  ], 0x6a6864);
  // one boulder stands in the light, the rest keep to the walls
  add('boulder', [{ x: 0.35, y: FLOOR - 0.22, z: -2.15, s: 0.62, ry: 2.4 }], 0x8a8884, (list) => list.forEach(inFront));
  add('rocks', [...heap(-3.4, -2.6, 5, 0.85, [0.6, 0.5]), ...heap(2.9, -4.4, 4, 0.8, [-0.4, 0.6])], 0x7a7874);
  add('rocks2', [...heap(-1.2, -4.6, 4, 0.75, [0.2, 0.7]), ...heap(3.9, -0.6, 4, 0.7, [-0.7, 0.4]), ...heap(-3.9, 1.2, 3, 0.6, [0.6, -0.2])], 0x76746f);

  // light through the crack: a hard shaft onto the floor, a little bounce, nothing else
  const crack = new THREE.Vector3(-0.8, 3.6, -2.4);
  const spot = new THREE.Vector3(0.6, FLOOR, -1.6);
  const shaft = new THREE.SpotLight(0xffffff, 90, 0, 0.26, 0.5, 1.5);
  shaft.position.copy(crack);
  shaft.target.position.copy(spot);
  shaft.castShadow = true;
  shaft.shadow.mapSize.set(1024, 1024);
  shaft.shadow.bias = -0.0005;
  shaft.shadow.normalBias = 0.03;
  scene.add(shaft, shaft.target);
  const bounce = new THREE.PointLight(0xffffff, 26, 16, 1.2);
  bounce.position.copy(spot).add(new THREE.Vector3(0, 0.9, 0.4));
  scene.add(bounce);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x333333, 0.9));

  // the visible shaft: an open cone, brightest at the crack
  const len = crack.distanceTo(spot);
  const cone = new THREE.CylinderGeometry(0.16, len * Math.tan(0.24), len, 48, 1, true);
  cone.translate(0, -len / 2, 0);
  const along = new Float32Array(cone.attributes.position.count);
  for (let i = 0; i < along.length; i++) along[i] = -cone.attributes.position.getY(i) / len;
  cone.setAttribute('along', new THREE.BufferAttribute(along, 1));
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0.16 } },
    vertexShader: `
      attribute float along; varying float vA; varying vec3 vN; varying vec3 vV;
      void main() {
        vA = along;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uOpacity; varying float vA; varying vec3 vN; varying vec3 vV;
      void main() {
        float edge = pow(abs(dot(vN, vV)), 1.5);
        gl_FragColor = vec4(vec3(1.0), uOpacity * edge * (1.0 - vA * 0.75) * smoothstep(0.0, 0.08, vA));
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(cone, beamMat);
  beam.position.copy(crack);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), spot.clone().sub(crack).normalize());
  scene.add(beam);

  // the crack itself glows
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotSprite(), color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.copy(crack).add(new THREE.Vector3(0, 0.15, 0));
  glow.scale.set(1.4, 0.9, 1);
  scene.add(glow);

  const dust = motes(220, new THREE.Box3(new THREE.Vector3(-1.4, FLOOR, -3.4), new THREE.Vector3(1.6, 3.2, -0.6)), { size: 4, opacity: 0.8, drift: 0.015 });
  scene.add(dust);
  // the light and the dust in it pass in front of the name
  beam.renderOrder = glow.renderOrder = dust.renderOrder = 3;

  // what I do, in two columns standing in the dark behind the figure. They hang
  // in the room, so they move against the figure as the eye moves; the figure,
  // its stone and the light are in front of them, the walls behind. The columns
  // are not a table: the left one leans in towards the figure, the right one
  // starts half a line lower, and every line sits a little off the one before.
  const COLUMNS = [
    { items: ['UI / UX Design', 'Product Design', 'Graphic Design', 'Web Design'], indent: [0, 1.6, 0.5, 2.3] },
    { items: ['Videography', 'Video Editing', 'Photography', 'Motion Design'], indent: [0.9, 0, 1.9, 0.4] },
  ];
  const nameMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  const name = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), nameMat);
  name.renderOrder = 1;
  name.visible = false;
  scene.add(name);
  let nameAspect = 0;
  const nameDone = track.add();
  const px = 130;
  const font = `500 ${px}px "Plex Mono", ui-monospace, monospace`;
  (document.fonts ? document.fonts.load(font) : Promise.resolve()).catch(() => {}).then(() => {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.font = font;
    const tracking = -0.03 * px, lead = 1.34 * px, gap = 0.8 * px;   // narrow: the figure sits across it
    const lineW = (l) => [...l].reduce((a, ch) => a + ctx.measureText(ch).width, 0) + tracking * (l.length - 1);
    const colW = COLUMNS.map((col) => Math.max(...col.items.map((it, k) => lineW(it.toUpperCase()) + col.indent[k] * px)));
    const asc = ctx.measureText('H').actualBoundingBoxAscent;
    const pad = Math.round(px * 0.2);
    const rows = Math.max(...COLUMNS.map((col) => col.items.length));
    c.width = Math.ceil(colW[0] + gap + colW[1] + pad * 2);
    c.height = Math.ceil(asc + lead * (rows - 0.5) + px * 0.25 + pad * 2);
    ctx.font = font;   // (sizing the canvas resets it)
    const mid = pad + colW[0];
    const at = (col, k) => {
      const t = COLUMNS[col].items[k].toUpperCase();
      const x = col ? mid + gap + COLUMNS[1].indent[k] * px : mid - lineW(t) - COLUMNS[0].indent[k] * px;
      return { t, x, y: pad + asc + lead * (k + col * 0.5) };
    };
    const write = (t, x, y) => { for (const ch of t) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + tracking; } };
    const paintList = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.font = font;
      COLUMNS.forEach((col, ci) => col.items.forEach((_, k) => {
        const { t, x, y } = at(ci, k);
        // lit from above: full at the top, sinking into the dark towards the floor
        const lit = 1 - 0.68 * ((y - pad) / (c.height - pad * 2));
        ctx.fillStyle = `rgba(238,237,233,${lit.toFixed(3)})`;
        write(t, x, y);
      }));
      if (nameMat.map) nameMat.map.needsUpdate = true;
    };
    paintList();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    nameMat.map = tex;
    nameMat.needsUpdate = true;
    nameAspect = c.height / c.width;
    name.visible = true;
    placeName();
    nameDone();
  });

  // someone sits on the boulder in the light, their back to us -------------------
  // A jointed figure, like an artist's wooden model: capsules for the limbs, balls
  // for the joints, all of it built here, so nothing of anyone else's is used.
  // It faces +z; every limb hangs along -y from its joint, the trunk rises along +y.
  const skin = new THREE.MeshStandardMaterial({ color: 0x0d0d0c, roughness: 0.9, metalness: 0 });
  const knuckle = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.85, metalness: 0 });
  const part = (parent, { len = 0, r = 0, at = [0, 0, 0], rx = 0, ry = 0, rz = 0, sx = 1, sz = 1, ball = 0, up = false }) => {
    const g = new THREE.Group();
    g.position.set(...at);
    g.rotation.set(rx, ry, rz);
    parent.add(g);
    if (len) {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 6, 16), skin);
      m.position.y = up ? len / 2 : -len / 2;
      m.scale.set(sx, 1, sz);
      g.add(m);
    }
    if (ball) g.add(new THREE.Mesh(new THREE.SphereGeometry(ball, 18, 12), knuckle));
    return g;
  };
  // a trunk turned like a wooden model's: a profile spun round, then flattened
  const trunk = (profile, sx, sz) => {
    const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32), skin);
    m.scale.set(sx, 1, sz);
    return m;
  };
  const hips = new THREE.Group();
  hips.position.set(0, 0.11, 0.06);
  // pelvis into the waist
  hips.add(trunk([[0, -0.1], [0.09, -0.095], [0.14, -0.06], [0.155, 0], [0.14, 0.07], [0.115, 0.14], [0.104, 0.19], [0, 0.2]], 1.18, 0.86));
  // the trunk, bent a little forward, the head lifted towards the light
  const chest = part(hips, { at: [0, 0.17, -0.01], rx: 0.26 });
  // ribs, chest and the round of the shoulders
  chest.add(trunk([[0, -0.02], [0.105, 0], [0.125, 0.06], [0.15, 0.14], [0.158, 0.22], [0.148, 0.28], [0.12, 0.33], [0.065, 0.36], [0, 0.37]], 1.32, 0.76));
  const neck = part(chest, { len: 0.1, r: 0.044, at: [0, 0.34, 0], rx: -0.12, up: true });
  const head = part(neck, { at: [0, 0.08, 0], rx: -0.18, ry: -0.14 });
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.104, 28, 20), skin);
  skull.scale.set(0.9, 1.16, 1.0);
  skull.position.set(0, 0.1, 0.01);
  head.add(skull);
  // arms down and forward, the hands resting on the knees
  for (const side of [-1, 1]) {
    const upper = part(chest, { len: 0.27, r: 0.046, at: [side * 0.21, 0.29, 0], rx: -0.8, rz: side * 0.12, ball: 0.056 });
    const fore = part(upper, { len: 0.25, r: 0.04, at: [0, -0.27, 0], rx: -0.95, rz: -side * 0.08, ball: 0.046 });
    part(fore, { len: 0.1, r: 0.036, at: [0, -0.25, 0], rx: -0.15, ball: 0.036 });
    // legs: thighs forward along the stone, shins down, feet on the ground
    const thigh = part(hips, { len: 0.42, r: 0.075, at: [side * 0.1, 0, 0], rx: -1.5, ry: side * 0.1, ball: 0.072 });
    const shin = part(thigh, { len: 0.42, r: 0.055, at: [0, -0.42, 0], rx: 1.55, ball: 0.062 });
    part(shin, { len: 0.2, r: 0.045, at: [0, -0.42, 0], rx: -1.4, ball: 0.046 });
  }
  hips.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    inFront(o);
  });
  const person = new THREE.Group();
  person.add(hips);
  person.position.copy(new THREE.Vector3(0.36, FLOOR - 0.22 + 0.86, -2.2));   // in the middle of the stone
  scene.add(person);
  person.userData = { spine: chest, head, rest: [chest.quaternion.clone(), head.quaternion.clone()] };
  const breath = new THREE.Quaternion(), bx = new THREE.Vector3(1, 0, 0), by = new THREE.Vector3(0, 1, 0);

  // camera: standing near the entrance, the eye drifts as you read
  const look = new THREE.Vector3();
  // a little above the stone, so we see the figure sitting on it; closer as we read.
  // We come in from above, through the rock, and settle at the figure's height
  const eyeAt = (p, sx, sy, pos, at) => {
    const drop = 1 - smooth(0.04, 0.34, p);
    pos.set(THREE.MathUtils.lerp(2.3, 1.1, p) + sx * 0.3, 0.3 + sy * 0.12 + drop * 2.6, THREE.MathUtils.lerp(4.2, 2.6, p));
    at.set(-0.2 + sx * 0.6, 0.05 + sy * 0.25 - p * 0.3 - drop * 1.6, -3.5);
  };
  // the name is set for the eye at the moment the about is read in full (its
  // progress when the section's end reaches the bottom of the screen)
  const READ = 0.7, NAME_DIST = 6.2;
  const probe = new THREE.PerspectiveCamera();
  const pv = new THREE.Vector3(), lv = new THREE.Vector3(), up = new THREE.Vector3();
  function placeName() {
    if (!nameAspect) return;
    eyeAt(READ, 0, 0, pv, lv);
    probe.position.copy(pv);
    probe.lookAt(lv);
    const hgt = 2 * NAME_DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const wid = hgt * camera.aspect;
    const w = Math.min(wid * 0.92, (hgt * 0.4) / nameAspect);
    name.scale.set(w, w * nameAspect, 1);
    // straight ahead, a little above the middle: the figure's head sits in the letters
    // (on a tall screen higher up, in the dark above the figure, clear of the words below)
    up.set(0, 1, 0).applyQuaternion(probe.quaternion);
    name.position.copy(pv).addScaledVector(lv.sub(pv).normalize(), NAME_DIST).addScaledVector(up, hgt * (camera.aspect < 1 ? 0.19 : 0.035));
    name.quaternion.copy(probe.quaternion);
  }
  const L = loop(renderer, scene, camera, canvas, {
    onResize(w, h) {
      camera.fov = w < h ? 66 : 48;
      dust.material.uniforms.uScale.value = h * renderer.getPixelRatio() / 900;
      placeName();
    },
    update(s, t) {
      dust.material.uniforms.uTime.value = t;
      if (person) {
        // facing away from us, into the cave
        const dir = Math.atan2(look.x - camera.position.x, look.z - camera.position.z);
        person.rotation.y = dir;
        const u = person.userData;
        // breathing, and now and then a slow turn of the head
        u.spine.quaternion.copy(u.rest[0]).multiply(breath.setFromAxisAngle(bx, Math.sin(t * 1.3) * 0.012));
        u.head.quaternion.copy(u.rest[1]).multiply(breath.setFromAxisAngle(by, Math.sin(t * 0.21) * 0.18));
      }
      const p = s.p;
      eyeAt(p, s.sx, s.sy, camera.position, look);
      camera.lookAt(look);
      // the name comes out of the dark as we settle
      nameMat.opacity = 0.94 * smooth(0.3, 0.62, p);
    },
  });

  function ready() {
    renderer.shadowMap.needsUpdate = true;
    L.renderOnce();
    onReady && onReady();
  }
  track.close();
  return L;
}
