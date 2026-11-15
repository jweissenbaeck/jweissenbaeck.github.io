// The end of the way: a wall of concrete in the dark with one tall pointed
// opening cut through it, and behind it nothing but light. The light falls through
// the opening onto the floor and runs out towards you; dust hangs in it. It comes
// up as the footer is uncovered.
// Beyond the threshold, a glimpse only: far off in the glare, faint, the tower.
// There is no way through.
import { THREE, makeRenderer, tracker, pbr, loop, motes, dotSprite } from './kit.js';
import { lancet } from './hero.js';

const VOID = 0x070707;
const OW = 1.2, OSPRING = 2.7;                 // the opening: width, where the arch springs
const T = 0.9;                                  // the wall's thickness
const LIGHT = new THREE.Vector3(0, 4.4, -7.5);  // the sun behind the wall
const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

export function createPortal(canvas, { onReady } = {}) {
  const renderer = makeRenderer(canvas, { exposure: 1.05 });
  if (!renderer) return null;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(VOID);
  scene.fog = new THREE.FogExp2(VOID, 0.045);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);
  const track = tracker(ready);

  // the floor, on our side of the wall only: through the opening there is nothing but light
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), pbr(renderer, 'floor', 10, track, { color: 0x52514d }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 15 + T / 2 - 0.01;
  floor.receiveShadow = true;
  scene.add(floor);

  // the wall, wide and high enough to fill every view, the opening cut through it
  const outline = lancet(OW, OSPRING, 0, 0, 0, 40);
  const shape = new THREE.Shape();
  shape.moveTo(-14, 0); shape.lineTo(14, 0); shape.lineTo(14, 12); shape.lineTo(-14, 12); shape.closePath();
  // the opening reaches the floor; lift its foot a hair so the outline stays inside the wall
  shape.holes.push(new THREE.Path(outline.map((p) => new THREE.Vector2(p.x, Math.max(p.y, 0.001)))));
  const wallGeo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 1 });
  wallGeo.translate(0, 0, -T / 2);
  const wallMat = pbr(renderer, 'wall', 0.2, track, { color: 0x9c9a95 });
  // the boards of the formwork run up the wall; the one pour line in the texture
  // goes high up, into the dark above the arch, not across the middle of the view
  [wallMat.map, wallMat.normalMap, wallMat.aoMap].forEach((t) => { t.offset.set(0.13, 0.45); });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.castShadow = wall.receiveShadow = true;
  scene.add(wall);

  // behind the wall: light, plain and white
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false }));
  sky.position.set(0, 0, -11);
  scene.add(sky);
  // the ground beyond: white too, but it takes a shadow
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(60, 10.5), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0, roughness: 1, fog: false }));
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(0, 0, -T / 2 - 5.25);
  yard.receiveShadow = true;
  scene.add(yard);

  // far off in the glare, faint: the tower
  const towerTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 768;
    const g = c.getContext('2d');
    g.filter = 'blur(5px)';
    g.fillStyle = 'rgba(120,120,118,1)';
    const x0 = 58, x1 = 198, top = 150;
    g.fillRect(x0, top, x1 - x0, 768 - top);
    // the crown: a cornice and battlements
    g.fillRect(x0 - 10, top - 18, x1 - x0 + 20, 22);
    for (let i = 0; i < 6; i++) g.fillRect(x0 - 10 + i * 30, top - 46, 18, 30);
    // one window, lit through from behind
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.moveTo(116, 420); g.lineTo(116, 330); g.quadraticCurveTo(128, 296, 140, 330); g.lineTo(140, 420); g.fill();
    // its foot lost in the haze
    g.filter = 'none';
    const fog = g.createLinearGradient(0, 520, 0, 768);
    fog.addColorStop(0, 'rgba(0,0,0,0)'); fog.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = fog;
    g.fillRect(0, 520, 256, 248);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const tower = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 3.0), new THREE.MeshBasicMaterial({ map: towerTex, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false }));
  tower.position.set(0.45, 1.5, -10.9);   // in the left half of what the door shows
  scene.add(tower);


  // the sun behind the wall, shining through the opening and nowhere else
  // (its reach ends before our feet: the light on the floor dies out towards us)
  const sun = new THREE.SpotLight(0xffffff, 0, 19, 0.32, 0.25, 1);
  sun.position.copy(LIGHT);
  sun.target.position.set(0, 0.6, 4.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  sun.shadow.camera.near = 2; sun.shadow.camera.far = 30;
  scene.add(sun, sun.target);
  const SUN = 42;
  // what the lit floor throws back onto the inside of the opening and the wall
  const bounce = new THREE.PointLight(0xffffff, 0, 9, 1.6);
  bounce.position.set(0, 0.35, 2.2);
  scene.add(bounce);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 0.1));

  // the beam: the outline of the opening drawn out along the light to the floor,
  // brightest at the opening, gone before it reaches us
  const front = T / 2;
  const P = outline.map((p) => new THREE.Vector3(p.x, p.y, front));
  const Q = P.map((p) => {
    const d = p.clone().sub(LIGHT);
    let t = d.y < -1e-4 ? -LIGHT.y / d.y : 50;           // down to the floor
    t = Math.min(t, (6 - LIGHT.z) / d.z);                // but not past where we stand
    return LIGHT.clone().addScaledVector(d, t);
  });
  const n = P.length, pos = [], along = [], idx = [];
  for (let i = 0; i < n; i++) { pos.push(...P[i].toArray(), ...Q[i].toArray()); along.push(0, 1); }
  for (let i = 0; i < n; i++) {
    const a = i * 2, b = ((i + 1) % n) * 2;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  beamGeo.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
  beamGeo.setIndex(idx);
  beamGeo.computeVertexNormals();
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: `
      attribute float along; varying float vA; varying float vZ; varying vec3 vN; varying vec3 vV;
      void main() {
        vA = along;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vZ = wp.z;
        vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uOpacity; varying float vA; varying float vZ; varying vec3 vN; varying vec3 vV;
      void main() {
        float edge = pow(abs(dot(vN, vV)), 1.2);
        // thick at the opening, thinned out a few steps in front of the wall
        float fall = pow(1.0 - vA, 2.2) * smoothstep(4.2, 0.6, vZ);
        gl_FragColor = vec4(vec3(1.0), uOpacity * edge * fall);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.renderOrder = 2;
  scene.add(beam);

  // the glare around the opening
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotSprite(), color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
  // (no depth test: the sprite turns to face us and would dip behind the wall)
  glow.position.set(0, OSPRING * 0.72, front + 0.05);
  glow.scale.set(OW * 4.2, (OSPRING + OW) * 2.3, 1);
  glow.renderOrder = 3;
  scene.add(glow);

  // dust in the light
  const dust = motes(320, new THREE.Box3(new THREE.Vector3(-0.9, 0, front + 0.1), new THREE.Vector3(0.9, 3.4, 5.5)), { size: 4.5, opacity: 0.85, drift: 0.012 });
  dust.renderOrder = 3;
  scene.add(dust);

  const look = new THREE.Vector3();
  let wide = true;
  const L = loop(renderer, scene, camera, canvas, {
    onResize(w, h) {
      wide = w > h * 1.1;
      dust.material.uniforms.uScale.value = h * renderer.getPixelRatio() / 900;
    },
    update(s, t) {
      const p = s.p;
      dust.material.uniforms.uTime.value = t;
      // the light comes up as the page is uncovered
      const k = smooth(0.12, 0.85, p);
      sun.intensity = SUN * k;
      bounce.intensity = 7 * k;
      beamMat.uniforms.uOpacity.value = 0.55 * k;
      glow.material.opacity = 0.32 * k;
      dust.material.uniforms.uOpacity.value = 0.85 * k;
      sky.material.color.setScalar(0.03 + 0.97 * k);
      yard.material.emissiveIntensity = 0.9 * k;
      tower.material.opacity = 0.5 * smooth(0.45, 1, k);
      // standing back from the wall, coming a step closer; the eye drifts with the
      // pointer. On a wide screen we stand a little to the left, so the opening sits
      // right of the middle and the words have the dark wall to themselves
      const z = 14.5 - 1.8 * smooth(0, 1, p);
      const side = wide ? -1.35 : 0;
      camera.position.set(side + s.sx * 0.7, 1.35 + s.sy * 0.25, z);
      look.set(side + s.sx * 0.15, 2.05, 0);
      camera.lookAt(look);
    },
  });

  function ready() {
    renderer.shadowMap.needsUpdate = true;   // nothing in it moves but the eye
    L.renderOnce();
    onReady && onReady();
  }
  track.close();
  return L;
}
