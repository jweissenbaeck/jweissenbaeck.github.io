// lageplan des forsthofguts in lokalen metern (x ost, y nord) relativ zu ORIGIN.
// positionen aus OpenStreetMap-grundrissen und dem basemap.at-orthofoto (2024),
// gebaeudetypen nach dem illustrierten lageplan des hotels.

export const ORIGIN = [12.7144, 47.4393];

// vom kunden markierter ausschnitt (aus den geklickten koordinaten)
export const AREA = [
  [12.717022, 47.440581],
  [12.715273, 47.440745],
  [12.714724, 47.440401],
  [12.713434, 47.440736],
  [12.711765, 47.439183],
  [12.716328, 47.437782],
];

// lichtung = ausschnitt plus die hallen im nordwesten. alles ausserhalb wird wald.
export const CLEARING = [
  [197, 142], [66, 150], [24, 116], [-30, 150], [-73, 160], [-150, 140], [-198, -13], [145, -169],
];

export const FOREST = { outerRadius: 680, center: [0, -5] };

export const CAMERA = {
  center: [40, 20],
  radius: 620,
  maxAltitude: 750, // ueber dem gelaende in der mitte
  minClearance: 35, // naeher ran wird das orthofoto unscharf
  start: { position: [265, 225], height: 200, heading: 228, pitch: -30 },
};

// sommermorgen; sun = richtung zur sonne in ENU (ost, nord, oben) zu diesem zeitpunkt
export const LIGHT = { time: '2024-07-10T06:30:00Z', sun: [0.868, 0.021, 0.496] };

// stil:   chalet  = putz-erdgeschoss, laerchenholz darueber, umlaufende balkone, gauben
//         house   = wie chalet, schlichter
//         modern  = senkrechte laerchenschalung, grosse verglasung
//         spa     = holzbau mit glasbaendern und dachpool
//         flat    = flachdach-verbindungsbau
//         hall    = halle mit holzschalung
//         hut     = kleine holzhuette
// axis = richtung der laengsachse in grad (0 = ost, gegen den uhrzeigersinn)
// gables = positionen (m entlang der achse) von zwerchgiebeln, die quer durch den fluegel laufen
export const WINGS = [
  // haupthaus mit quergiebel
  { id: 'haupthaus', c: [99, 45], len: 44, wid: 17, axis: -19.6, floors: 4, style: 'chalet', roofColor: 'grey', gables: [-15, 15] },
  { id: 'haupthaus-quer', c: [98, 41], len: 27, wid: 14, axis: 70.4, floors: 4, style: 'chalet', roofColor: 'grey' },
  { id: 'trakt-266', c: [77.9, 26.5], len: 18, wid: 16, axis: -24, floors: 4, style: 'chalet', roofColor: 'grey' },
  { id: 'trakt-586', c: [73.3, 38.6], len: 43, wid: 13, axis: 66.6, floors: 3, style: 'chalet', roofColor: 'grey', gables: [-12, 8] },
  { id: 'trakt-160', c: [53.4, 16.9], len: 32, wid: 14.3, axis: -26, floors: 4, style: 'chalet', roofColor: 'grey', solar: true, gables: [-8] },
  { id: 'trakt-142-west', c: [83.4, 1.4], len: 26.7, wid: 19, axis: -23.9, floors: 4, style: 'chalet', roofColor: 'grey', gables: [-4] },
  { id: 'trakt-142-ost', c: [107.8, -9.4], len: 26.7, wid: 19, axis: -23.9, floors: 4, style: 'chalet', roofColor: 'grey', gables: [4] },
  { id: 'verbindung-29', c: [90.5, 21.7], len: 9.4, wid: 6.8, axis: -25, floors: 2, style: 'flat', roof: 'flat' },
  { id: 'trakt-584', c: [120.7, 37.4], len: 25, wid: 14.6, axis: 80.7, floors: 3, style: 'chalet', roofColor: 'grey' },
  { id: 'spa', c: [25.5, 25], len: 26, wid: 12, axis: 84, floors: 4, style: 'spa', roof: 'flat', rooftopPool: true },
  { id: 'haus-148', c: [142, -14.9], len: 24.8, wid: 21.7, axis: -17, floors: 3, style: 'chalet', roof: 'hip', roofColor: 'grey', solar: true },
  { id: 'haus-88', c: [140.6, 20.9], len: 17, wid: 9.1, axis: -32, floors: 3, style: 'house', roofColor: 'grey' },
  { id: 'haus-86', c: [156.7, 21.8], len: 13.3, wid: 6.6, axis: 68.4, floors: 2, style: 'house', roofColor: 'dark' },
  { id: 'haus-87', c: [165.2, 17.1], len: 21.1, wid: 12.7, axis: 68.4, floors: 3, style: 'house', roofColor: 'dark', solar: true },
  { id: 'haus-254', c: [117.3, -35.1], len: 13.1, wid: 8.7, axis: -26, floors: 2, style: 'house', roofColor: 'grey' },
  { id: 'haus-94', c: [170.4, 85.3], len: 23.1, wid: 13.2, axis: 68.2, floors: 3, style: 'house', roofColor: 'grey' },

  // neubau nr. 30 am see
  { id: 'neubau-30-a', c: [98.5, 79.6], len: 26, wid: 17, axis: -23.2, floors: 4, style: 'chalet', roof: 'hip', roofColor: 'grey' },
  { id: 'neubau-30-b', c: [98.5, 79.6], len: 24, wid: 13, axis: 66.8, floors: 4, style: 'chalet', roofColor: 'grey' },
  { id: 'anbau-585', c: [85.2, 84.6], len: 15, wid: 4.4, axis: 65.5, floors: 1, style: 'flat', roof: 'flat' },

  // see-chalets (nr. 24–27)
  { id: 'see-chalet-1', c: [35, 96], len: 28, wid: 9, axis: -18, floors: 2, style: 'house', roofColor: 'grey' },
  { id: 'see-chalet-2', c: [30, 71], len: 22, wid: 11, axis: -31, floors: 2, style: 'house', roofColor: 'grey' },
  { id: 'see-chalet-3', c: [40, 84], len: 12, wid: 10, axis: -24, floors: 2, style: 'house', roofColor: 'grey' },
  { id: 'see-chalet-27', c: [59.9, 100.4], len: 8.7, wid: 7.1, axis: 64.2, floors: 2, style: 'house', roofColor: 'grey' },
  { id: 'huette-474', c: [77.9, 106.9], len: 10.7, wid: 4.7, axis: -23.4, floors: 1, style: 'hut', roofColor: 'dark' },

  // villa im sueden
  { id: 'villa-472', c: [28.7, -58.9], len: 10.9, wid: 7.8, axis: 68.5, floors: 2, style: 'house', roofColor: 'grey' },
  { id: 'villa-471', c: [41, -57.6], len: 14.2, wid: 5.4, axis: -20.7, floors: 1, style: 'flat', roof: 'flat' },
  { id: 'villa-97', c: [54.8, -56.4], len: 11.9, wid: 11, axis: 70.6, floors: 2, style: 'house', roofColor: 'grey' },
  { id: 'villa-96', c: [63.8, -65.9], len: 12.6, wid: 10.2, axis: -20.5, floors: 1, style: 'flat', roof: 'flat' },

  // nordwesten: reiterhof mit reithalle (nr. 20) und stall (nr. 22), kinderbereich
  { id: 'halle-22', c: [-114, 109], len: 47, wid: 18, axis: 74, floors: 1, floorHeight: 4.5, style: 'hall', roofColor: 'grey', stable: true },
  { id: 'halle-22-anbau', c: [-102.5, 105.7], len: 40, wid: 6, axis: 74, floors: 1, floorHeight: 4, style: 'flat', roof: 'flat' },
  { id: 'halle-20', c: [-96.6, 65.6], len: 46, wid: 27, axis: 4, floors: 1, floorHeight: 8, style: 'hall', roofColor: 'light' },
  { id: 'haus-18', c: [-77, 113], len: 13, wid: 11, axis: -25, floors: 1, style: 'hut', roofColor: 'grey' },
  { id: 'huette-240', c: [-43.6, 54], len: 14, wid: 7.2, axis: -8.4, floors: 1, style: 'hut', roofColor: 'grey' },
  { id: 'huette-40', c: [-47.4, 75.6], len: 9, wid: 5.3, axis: -11.7, floors: 1, style: 'hut', roofColor: 'dark' },
  { id: 'huette-41', c: [-30.9, 65], len: 5, wid: 5, axis: 0, floors: 1, style: 'hut', roofColor: 'dark' },
  { id: 'huette-38', c: [-27.6, 78.7], len: 6, wid: 4.8, axis: -24.4, floors: 1, style: 'hut', roofColor: 'dark' },
  { id: 'huette-39', c: [-43.8, 88.7], len: 6, wid: 3.7, axis: 79.8, floors: 1, style: 'hut', roofColor: 'dark' },
  { id: 'huette-37', c: [-61.7, 84.3], len: 6.4, wid: 3.2, axis: 74.8, floors: 1, style: 'hut', roofColor: 'dark' },
  { id: 'huette-a', c: [-70, 90], len: 5, wid: 5, axis: 0, floors: 1, style: 'hut', roofColor: 'dark' },
  { id: 'huette-b', c: [-66, 76], len: 5, wid: 4, axis: 0, floors: 1, style: 'hut', roofColor: 'dark' },

  // sauna-huette am waldrand (nr. 16)
  { id: 'sauna-16', c: [-36.8, -27.5], len: 5.3, wid: 5.1, axis: 70.6, floors: 1, style: 'hut', roofColor: 'dark' },
];

// gewaesser: level 'auto' = knapp unter dem tiefsten uferpunkt
export const LAKES = [
  {
    id: 'badesee',
    pts: [[44, 64], [52, 60], [64, 61], [74, 65], [79.5, 72], [79, 88], [76, 100], [70, 108], [60, 111.5], [52.5, 108],
      [50.5, 99], [49, 90], [48, 80], [44.5, 72]],
  },
  {
    id: 'teich-19',
    pts: [[-33.9, 87.2], [-26.9, 92.3], [-16.8, 93.3], [-10.7, 89.2], [-10.7, 80.2], [-18.8, 74.1], [-27.9, 75.1], [-32.9, 80.2]],
  },
];

// pools: ref = gebaeude, an dessen erdgeschoss sich die wasserhoehe orientiert
export const POOLS = [
  { id: 'infinity-pool', pts: [[-7.3, 28.7], [-7.4, 21.8], [18, 21.4], [18.1, 28.3]], ref: 'spa', offset: -0.3 },
  { id: 'see-pool', pts: [[45.2, 75.1], [54.7, 71.6], [57.7, 79.9], [48.8, 83.9]], ref: 'see-chalet-2', offset: -0.4 },
  { id: 'villa-pool', pts: [[37.2, -37.8], [40.8, -37.0], [42.2, -46.6], [38.6, -47.4]], ref: 'villa-471', offset: -0.3 },
];

// strassen und parkplaetze aus OpenStreetMap
export const ROADS = [
  { width: 6, pts: [[348.7, 3.5], [336.1, 11.4], [330.6, 14], [319.3, 19.5], [307.7, 26.4], [301.2, 33.4], [296.4, 38], [294, 40.3], [282.9, 52.6], [271.2, 65.6], [257.6, 79.4], [245.2, 89.1], [232.5, 97.6], [215.7, 106.1], [203.2, 110.7], [191.4, 113]] },
  { width: 6, pts: [[195.1, 134.9], [192.8, 120.7]] },
  { width: 6, pts: [[199.9, 159.8], [197.4, 145.9], [195.1, 134.9]] },
  { width: 5.5, pts: [[191.4, 113], [172.7, 113.3], [166.9, 112.6], [161, 113], [148.8, 115], [137.3, 116.3], [119.7, 121], [104.9, 127.8], [86, 136.9], [69.7, 146.4], [64.1, 154], [56.2, 166.6], [51.3, 172.3], [44.9, 179.7], [34, 192.2], [29.8, 196.9], [17.9, 207.8], [4.1, 214.7], [-8.3, 218.1], [-18.8, 220.8], [-49.5, 227.5], [-70.9, 229.1], [-91.2, 230.6], [-125.7, 231.6], [-138.7, 231.8], [-151.8, 231], [-154.9, 230.4], [-165.3, 228.4], [-176.9, 227.4], [-179.3, 227.2], [-198.3, 227.8], [-206.7, 228.7], [-217.9, 230.7], [-224.9, 233], [-235.9, 237.3], [-237.2, 237.5], [-241.7, 237.9], [-251.2, 237.5], [-263.2, 235.3], [-271.3, 233.3], [-282.9, 228.4], [-284.1, 227.9], [-295, 221.8]] },
  { width: 6, pts: [[192.8, 120.7], [191.4, 113], [184.7, 80.5], [177.5, 58.7], [175.1, 52], [177, 44.3], [180.2, 31.1], [177.8, 15.7], [175.7, 8.2], [170.8, -0.7], [165.8, -4.8], [163.5, -8.8]] },
  { width: 4.5, pts: [[161, 113], [149.2, 95.6], [142.8, 86.2], [139.4, 75.7], [136.9, 60.8], [136.4, 45.8], [133.7, 34.4], [127.8, 22.5], [117.4, 9.4]] },
  { width: 3.5, pts: [[135.7, -24.1], [135.2, -26], [135, -28.1], [137.1, -31.5], [140.3, -33.5], [144.1, -34.6], [146.9, -34.8], [149, -34.7], [152.3, -33.6], [156, -30.5], [159.1, -25.8], [160.5, -22], [163, -15.3], [163.3, -11.1], [163.5, -8.8]] },
  { width: 4.5, pts: [[68.2, -62.1], [69.1, -59.9], [70.3, -57.4], [73.5, -55.4], [75.4, -55.1], [80.8, -56.4], [84.6, -57.9], [99.6, -63.2], [109.8, -66.1], [117.4, -67.6], [121, -67.1], [125, -66.1], [128, -64.1], [132, -58.3], [133.1, -54.7], [132.8, -48], [132.4, -39.8], [131, -34.9], [129, -31.3], [127.4, -28], [125.1, -23.8], [124.6, -17.7], [125.6, -8.7], [125.6, -2.4], [124.9, 2], [117.4, 9.4]] },
];

export const PARKING = [
  [[188.9, 138.9], [136.1, 146.5], [92.9, 169.8], [75.5, 182.4], [78.7, 196], [152.3, 162.9], [190.9, 153], [190, 146.6], [188.9, 138.9]],
  [[148.3, 105.2], [140.4, 90.2], [134.9, 92.1], [131.5, 80.6], [82.7, 101.5], [85.4, 107.6], [75, 112.4], [85.4, 133.9], [109.9, 121.6], [120.1, 116.7], [145.3, 110.8], [148.3, 105.2]],
  [[-61.6, 224.2], [-25.8, 219.2], [-9.7, 213.9], [-0.5, 211], [-25.5, 146], [-74.1, 165.9], [-67.3, 191.6], [-70, 192], [-65.9, 222.5], [-61.6, 224.2]],
];

// holzstege ueber den badesee
export const DOCKS = [
  { lake: 'badesee', width: 2.2, pts: [[46, 85], [58, 86]] },
  { lake: 'badesee', width: 2.2, pts: [[58, 79], [79, 79]] },
  { lake: 'badesee', width: 2.0, pts: [[64, 61], [61, 96]] },
  { lake: 'badesee', width: 2.0, pts: [[64.5, 101], [77.5, 97]] },
  { lake: 'badesee', width: 2.0, pts: [[50, 99], [55.5, 100]] },
];

// sportplaetze (aus dem orthofoto vermessen): c = mitte, len entlang axis
export const COURTS = [
  { id: 'tennis', type: 'tennis', c: [-27.2, 110.2], len: 36.3, wid: 17.1, axis: -23.2 }, // nr. 23
  { id: 'kleinfeld', type: 'soccer', c: [-20.25, 126.1], len: 26.2, wid: 12.7, axis: -22.7 },
  { id: 'reitplatz', type: 'arena', c: [-61.05, 135.9], len: 40, wid: 21.5, axis: -23 }, // nr. 21
];

// tiefgarageneinfahrt (nr. 33): rampe am ende der geschwungenen zufahrt, tor im sockel des hauses
export const GARAGE = { c: [136.4, -33.5], len: 14, wid: 6.5, axis: -95, depth: 3.2 };
// geschwungene holzverkleidete stuetzmauer (nr. 39) entlang der zufahrt um haus 4
export const CURVED_WALL = { around: [142, -15], offset: 4.5, pts: [[135.7, -24.1], [135, -28.1], [137.1, -31.5], [140.3, -33.5],
  [144.1, -34.6], [149, -34.7], [152.3, -33.6], [156, -30.5], [159.1, -25.8], [160.5, -22]] };

// einfahrtstor (nr. 38) ueber der zufahrt zum parkplatz
export const GATE = { c: [155, 104.2], axis: 145.9, span: 7.5 };

// spielplatz beim teich (nr. 19)
export const PLAYGROUND = { swing: { c: [-60, 99], axis: -24 }, tower: { c: [-51, 95], axis: -24 }, sandbox: { c: [-55, 89], axis: -24 } };

// sonnenschirme mit liegen bzw. tischen
export const PARASOLS = [
  ...[-4, 2, 8, 14].map(x => ({ c: [x, 32.6], loungers: 2 })), // infinity-pool
  ...[0, 1, 2].flatMap(i => [0, 1, 2, 3].map(j => ({ c: [40 + j * 5, 37 + i * 5], table: true }))), // terrasse
];

// weidezaun am hang oberhalb (wie im lageplan)
export const PASTURE_FENCE = [[-58, -42], [-20, -70], [20, -92], [70, -112], [110, -128]];
