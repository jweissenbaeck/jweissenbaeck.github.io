// 3d-karte forsthofgut: echtes gelaende, gezeichneter boden im stil des lageplans,
// prozedurale gebaeude, wald und weltgrenze. keine cesium-ion- oder google-daten noetig.
import {
  ORIGIN, CLEARING, FOREST, CAMERA, LIGHT, WINGS, LAKES, POOLS, ROADS, PARKING, DOCKS,
  COURTS, GARAGE, CURVED_WALL, GATE, PLAYGROUND, PARASOLS, PASTURE_FENCE,
} from './forsthofgut/layout.js';
import { loadTerrain, createTerrainProvider, toLocal, toLonLat } from './forsthofgut/terrain.js';
import { buildBuildings } from './forsthofgut/buildings.js';
import { buildAmenities } from './forsthofgut/amenities.js';
import { buildForest, wobbleClearing, outerBoundary } from './forsthofgut/trees.js';
import { loadMasks } from './forsthofgut/masks.js';
import { createGroundLayer } from './forsthofgut/ground-layer.js';

const BASE = 'forsthofgut/';
const loader = document.getElementById('loader');

(async function () {
  const [terrain, masks] = await Promise.all([loadTerrain(BASE), loadMasks(BASE)]);

  // wasserspiegel knapp unter dem tiefsten uferpunkt, dann gebaeude (stehen auf dem
  // unveraenderten gelaende) und zuletzt see, teich und pools aus dem gelaende ausheben
  const lakes = LAKES.map(lake => {
    let level = Infinity;
    lake.pts.forEach((p, i) => {
      const q = lake.pts[(i + 1) % lake.pts.length];
      level = Math.min(level, terrain.baseHeight(p[0], p[1]), terrain.baseHeight((p[0] + q[0]) / 2, (p[1] + q[1]) / 2));
    });
    return { id: lake.id, pts: lake.pts, level: level - 0.3 };
  });
  let amenities;
  const buildings = buildBuildings(WINGS, POOLS, lakes, DOCKS, terrain.baseHeight, mb => {
    amenities = buildAmenities(mb, {
      H: terrain.baseHeight, courts: COURTS, garage: GARAGE, curvedWall: CURVED_WALL, gate: GATE,
      playground: PLAYGROUND, parasols: PARASOLS, fenceLine: PASTURE_FENCE,
      parking: [{ pts: PARKING[1], axis: -23.2, occupancy: 0.55 }], // nr. 37
    });
  });
  for (const f of amenities.flattens) terrain.flatten(f.pts, f.level);
  for (const c of amenities.carves) terrain.carve(c.pts, c.top, c.bottom, c.slope);
  for (const l of lakes) terrain.carve(l.pts, l.level - 0.4, l.level - 2.5, 5);
  const water = [...buildings.pools, ...lakes];
  for (const c of buildings.carves) terrain.carve(c.pts, c.top, c.bottom, c.slope);

  const clearing = wobbleClearing(CLEARING);
  const outer = outerBoundary(FOREST.center, FOREST.outerRadius);

  const viewer = new Cesium.Viewer('map', {
    terrainProvider: createTerrainProvider(terrain.height),
    baseLayer: new Cesium.ImageryLayer(new Cesium.UrlTemplateImageryProvider({
      url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg',
      tilingScheme: new Cesium.WebMercatorTilingScheme(),
      maximumLevel: 14,
      credit: new Cesium.Credit('Sentinel-2 cloudless by EOX IT Services GmbH (CC BY 4.0, enthält modifizierte Copernicus-Sentinel-Daten 2016)'),
    })),
    baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
    navigationHelpButton: false, timeline: false, animation: false, fullscreenButton: false,
    infoBox: false, selectionIndicator: false,
    shadows: true,
    terrainShadows: Cesium.ShadowMode.RECEIVE_ONLY,
  });
  const scene = viewer.scene;

  viewer.imageryLayers.add(new Cesium.ImageryLayer(new Cesium.UrlTemplateImageryProvider({
    url: 'https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg',
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
    rectangle: Cesium.Rectangle.fromDegrees(9.4, 46.3, 17.2, 49.1),
    minimumLevel: 6,
    maximumLevel: 19,
    credit: new Cesium.Credit('Orthofoto: basemap.at (CC BY 4.0)'),
  })));
  viewer.imageryLayers.add(await createGroundLayer({
    base: BASE, clearing, outer, masks: masks.masks, height: terrain.height, sun: LIGHT.sun,
    roads: ROADS, parking: PARKING, courts: COURTS, lines: amenities.lines, lakes,
  }));
  viewer.creditDisplay.addStaticCredit(new Cesium.Credit('Grundrisse © OpenStreetMap-Mitwirkende · Texturen: Poly Haven (CC0)'));

  // licht: warmer sommermorgen, tief stehende sonne aus osten beleuchtet die schauseiten
  viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(LIGHT.time);
  scene.light = new Cesium.SunLight({ color: new Cesium.Color(1.0, 0.93, 0.82), intensity: 2.3 });
  viewer.clock.shouldAnimate = false;
  scene.globe.depthTestAgainstTerrain = true;
  scene.globe.enableLighting = false;
  scene.highDynamicRange = true;
  if (Cesium.Tonemapper) scene.postProcessStages.tonemapper = Cesium.Tonemapper.PBR_NEUTRAL;
  scene.postProcessStages.fxaa.enabled = true;
  const shadowMap = scene.shadowMap;
  shadowMap.size = 4096;
  shadowMap.softShadows = true;
  shadowMap.darkness = 0.25;
  shadowMap.maximumDistance = 1200;
  scene.fog.density = 2.8e-4;

  // bildlook wie im lageplan-rendering: waermer, satter, vignette und weiche raender
  scene.postProcessStages.add(new Cesium.PostProcessStage({
    fragmentShader: `
      uniform sampler2D colorTexture;
      in vec2 v_textureCoordinates;
      void main() {
        vec2 uv = v_textureCoordinates;
        float edge = smoothstep(0.3, 0.5, abs(uv.y - 0.52)) + 0.5 * smoothstep(0.38, 0.5, abs(uv.x - 0.5));
        vec2 r = edge * 2.5 / czm_viewport.zw;
        vec3 c = texture(colorTexture, uv).rgb * 0.28;
        c += (texture(colorTexture, uv + vec2(r.x, 0.0)).rgb + texture(colorTexture, uv - vec2(r.x, 0.0)).rgb
            + texture(colorTexture, uv + vec2(0.0, r.y)).rgb + texture(colorTexture, uv - vec2(0.0, r.y)).rgb) * 0.12;
        c += (texture(colorTexture, uv + r).rgb + texture(colorTexture, uv - r).rgb
            + texture(colorTexture, uv + vec2(r.x, -r.y)).rgb + texture(colorTexture, uv + vec2(-r.x, r.y)).rgb) * 0.06;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, 1.06) * vec3(1.03, 1.0, 0.94);
        vec2 d = (uv - 0.5) * vec2(1.0, 1.25);
        c *= mix(0.68, 1.0, smoothstep(0.78, 0.32, length(d)));
        out_FragColor = vec4(c, 1.0);
      }`,
  }));

  // modelle
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(ORIGIN[0], ORIGIN[1], 0));
  const basePath = new URL(BASE, location.href).href;
  const forest = await buildForest({
    height: terrain.height, clearing, outer, wings: WINGS, water: water.map(w => w.pts),
    masks, roads: ROADS, parking: PARKING, keepClear: amenities.clear,
  });
  const [buildingModel, forestModel] = await Promise.all([
    Cesium.Model.fromGltfAsync({ gltf: buildings.glb, basePath, modelMatrix: enu, forwardAxis: Cesium.Axis.X, shadows: Cesium.ShadowMode.ENABLED }),
    // eigener basePath, sonst liefert cesiums gltf-cache das gebaeudemodell erneut aus
    Cesium.Model.fromGltfAsync({ gltf: forest.glb, basePath: basePath + 'trees/', modelMatrix: enu, forwardAxis: Cesium.Axis.X, shadows: Cesium.ShadowMode.ENABLED }),
  ]);
  // himmelslicht als aufhellung der schattenseiten (cesiums umgebungslicht allein ist zu dunkel)
  const fill = k => new Cesium.CustomShader({
    fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
      material.emissive += material.diffuse * ${k.toFixed(2)};
    }`,
  });
  buildingModel.customShader = fill(0.6);
  forestModel.customShader = fill(0.22);
  scene.primitives.add(buildingModel);
  scene.primitives.add(forestModel);

  // kamera und weltgrenze
  const centerGround = terrain.height(...CAMERA.center);
  const st = CAMERA.start;
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(...toLonLat(...st.position), terrain.height(...st.position) + st.height),
    orientation: { heading: Cesium.Math.toRadians(st.heading), pitch: Cesium.Math.toRadians(st.pitch), roll: 0 },
  });
  const ctrl = scene.screenSpaceCameraController;
  ctrl.minimumZoomDistance = 60;
  ctrl.maximumZoomDistance = 1400;

  const maxPitch = Cesium.Math.toRadians(-6);
  scene.preRender.addEventListener(() => {
    const cam = viewer.camera, c = cam.positionCartographic;
    let [x, y] = toLocal(Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude));
    let h = c.height, changed = false;
    const dx = x - CAMERA.center[0], dy = y - CAMERA.center[1], r = Math.hypot(dx, dy);
    if (r > CAMERA.radius) {
      x = CAMERA.center[0] + dx / r * CAMERA.radius;
      y = CAMERA.center[1] + dy / r * CAMERA.radius;
      changed = true;
    }
    const hMax = centerGround + CAMERA.maxAltitude, hMin = terrain.height(x, y) + CAMERA.minClearance;
    if (h > hMax) { h = hMax; changed = true; }
    if (h < hMin) { h = hMin; changed = true; }
    const pitch = Math.min(cam.pitch, maxPitch);
    if (pitch !== cam.pitch) changed = true;
    if (changed) {
      cam.setView({
        destination: Cesium.Cartesian3.fromDegrees(...toLonLat(x, y), h),
        orientation: { heading: cam.heading, pitch, roll: 0 },
      });
    }
  });

  // ladeanzeige ausblenden, sobald das gelaende um die kamera geladen ist
  const done = () => {
    loader.classList.add('hidden');
    window.forsthofgutReady = true;
  };
  const off = scene.globe.tileLoadProgressEvent.addEventListener(n => {
    if (n === 0 && scene.globe.tilesLoaded) { off(); setTimeout(done, 300); }
  });
  console.log(`forsthofgut: ${WINGS.length} gebaeudefluegel, ${forest.count} baeume (${forest.inner} im hotelgelaende)`);
  window.forsthofgut = { viewer, terrain, toLocal, toLonLat };
})().catch(err => {
  console.error(err);
  loader.textContent = 'Die 3D-Karte konnte nicht geladen werden.';
});
