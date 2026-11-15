// The sound of the way down. Five rooms, each on its own bus; the page sets how
// much of each is heard, continuously, from where the visitor is (setMix), so
// one fades into the next instead of switching. Nothing plays until sound is on.
//   nave    a real peal of church bells, behind the window (a public-domain
//           recording: "Church bells - Leverkusen, 2007", by natalie, from
//           Wikimedia Commons); if the browser cannot decode it, a synthesised
//           peal rings changes instead
//   sky     wind and nothing else; thinner the lower you sink
//   tower   a slow, wide chord moving under the turning tower
//   cave    the hollow of the cave: its weight, its breath, a far groan of stone
//   halo    at the very end, barely there: a high, still shimmer

let ctx = null, master = null, hall = null, cavern = null, enabled = false;
const rooms = {};
const levels = { nave: 1, sky: 0, tower: 0, cave: 0, halo: 0 };

const rand = (a, b) => a + Math.random() * (b - a);

function impulse(seconds, decay, dark = 0) {
  const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      // a darker room loses its highs first
      last = last + (w - last) * (1 - dark * (i / len));
      d[i] = last;
    }
  }
  return buf;
}

function noiseBuffer(seconds, brown = false) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return buf;
}

function loopNoise(brown) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(8, brown);
  src.loop = true;
  src.start();
  return src;
}

// a sound into a room: the dry part is returned for the room's bus, the wet part
// goes to the reverb through the room's own send, so that when a room falls
// silent its echo falls silent with it
function send(r, node, dry, wet, reverb = hall) {
  const d = ctx.createGain(); d.gain.value = dry; node.connect(d);
  const w = ctx.createGain(); w.gain.value = wet; node.connect(w).connect(wetBus(r, reverb));
  return d;
}
function wetBus(r, reverb) {
  let b = r.wets.get(reverb);
  if (!b) {
    b = ctx.createGain();
    b.gain.value = r.level;
    b.connect(reverb);
    r.wets.set(reverb, b);
  }
  return b;
}

// a slow wobble on a parameter
function drift(param, rate, depth) {
  const lfo = ctx.createOscillator(), g = ctx.createGain();
  lfo.frequency.value = rate; g.gain.value = depth;
  lfo.connect(g).connect(param); lfo.start();
}

// a room: a bus with its own level, and a scheduler that only runs while heard
function room(build) {
  const bus = ctx.createGain();
  bus.gain.value = 0;
  bus.connect(master);
  const r = { bus, wets: new Map(), timer: 0, active: false, tick: null, level: 0 };
  build(r);
  return r;
}

function schedule(r, fn, min, max) {
  const go = () => {
    if (!r.active) return;
    fn();
    r.timer = setTimeout(go, rand(min, max) * 1000);
  };
  r.tick = go;
}

// -------------------------------------------------------------------- nave
// the recording, looped with long overlaps so the peal never stops while you stay
function buildNave(r) {
  const out = ctx.createGain();
  out.gain.value = 0.075;
  // the low hum of traffic out of the recording, a little of the church around it
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 110;
  out.connect(hp);
  send(r, hp, 0.9, 0.35).connect(r.bus);
  let buffer = null, failed = false;
  fetch(new URL('../audio/bells.oga', import.meta.url))
    .then((res) => res.arrayBuffer())
    .then((b) => ctx.decodeAudioData(b))
    .then((b) => { buffer = b; if (r.active) { clearTimeout(r.timer); r.tick(); } })
    .catch(() => { failed = true; });
  const FADE = 3;
  let ring = null;   // the synthesised peal, if the recording cannot be had
  let playing = [];
  // leaving the nave: what still rings dies away, so coming back starts afresh
  r.stop = () => {
    const t = ctx.currentTime;
    playing.forEach(({ src, g }) => { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.4); src.stop(t + 2.5); });
    playing = [];
  };
  r.tick = () => {
    if (!r.active) return;
    if (buffer) {
      const t = ctx.currentTime + 0.05, dur = buffer.duration;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buffer;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1, t + FADE);
      g.gain.setValueAtTime(1, t + dur - FADE);
      g.gain.linearRampToValueAtTime(0, t + dur);
      src.connect(g).connect(out);
      src.start(t);
      playing.push({ src, g });
      src.onended = () => { playing = playing.filter((p) => p.src !== src); };
      r.timer = setTimeout(r.tick, (dur - FADE) * 1000);
    } else if (failed) {
      ring = ring || changes(r);
      ring();
    } else {
      r.timer = setTimeout(r.tick, 400);   // still loading
    }
  };
  // the stillness of the nave under it
  const air = loopNoise(true);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
  const g = ctx.createGain(); g.gain.value = 0.025;
  air.connect(lp).connect(g).connect(r.bus);
}

// a cast bell: the partials of a real bell (hum, prime, tierce, quint, nominal,
// and above), each dying at its own rate, struck with a little clang
function bell(dest, t, f, level) {
  const out = ctx.createGain();
  out.gain.value = level;
  out.connect(dest);
  for (const [k, a, d] of [[0.5, 0.5, 7], [1, 0.8, 4.5], [1.2, 0.5, 3.6], [1.5, 0.25, 3], [2, 0.7, 2.6], [2.5, 0.2, 1.8], [3, 0.22, 1.4], [4, 0.12, 1], [5.04, 0.06, 0.7]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = f * k * rand(0.999, 1.001);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + d + 0.05);
  }
}
function changes(r) {
  // six bells ringing rounds and then plain hunt, as change ringers do
  const tones = [659.25, 587.33, 554.37, 493.88, 440, 369.99].map((f) => f / 2);
  const dest = ctx.createGain(); dest.gain.value = 0.18;
  send(r, dest, 0.6, 0.9).connect(r.bus);
  let row = [0, 1, 2, 3, 4, 5], n = 0;
  const swap = (odd) => { for (let i = odd ? 1 : 0; i + 1 < 6; i += 2) [row[i], row[i + 1]] = [row[i + 1], row[i]]; };
  return function ring() {
    if (!r.active) return;
    const t = ctx.currentTime + 0.05, gap = 0.27;
    row.forEach((b, i) => bell(dest, t + i * gap, tones[b], 0.9));
    if (n > 3) swap(n % 2);
    n = (n + 1) % 16;
    if (n === 0) row = [0, 1, 2, 3, 4, 5];
    // the handstroke gap after every second row
    r.timer = setTimeout(ring, (6 * gap + (n % 2 ? gap : 0)) * 1000);
  };
}

// --------------------------------------------------------------------- sky
function buildSky(r) {
  const out = ctx.createGain(); out.gain.value = 0.62;
  out.connect(r.bus);
  // two bands of wind: a low roar and a thin whistle, each breathing on its own
  for (const [freq, q, level, rate, sweep] of [[340, 0.6, 0.055, 0.09, 150], [1500, 2.4, 0.014, 0.05, 600]]) {
    const src = loopNoise(false);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
    const g = ctx.createGain(); g.gain.value = level;
    src.connect(bp).connect(g);
    send(r, g, 0.8, 0.35).connect(out);
    drift(g.gain, rate, level * 0.8);
    drift(bp.frequency, rate * 0.73, sweep);
  }
  // gusts now and then, passing from one side to the other
  schedule(r, () => {
    const t = ctx.currentTime + 0.05, len = rand(3, 5.5);
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(len);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(280, t); bp.frequency.linearRampToValueAtTime(rand(800, 1300), t + len * 0.5); bp.frequency.linearRampToValueAtTime(320, t + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(rand(0.04, 0.07), t + len * 0.45); g.gain.linearRampToValueAtTime(0, t + len);
    const pan = ctx.createStereoPanner(); pan.pan.setValueAtTime(rand(-0.8, 0), t); pan.pan.linearRampToValueAtTime(rand(0, 0.8), t + len);
    src.connect(bp).connect(g).connect(pan);
    send(r, pan, 0.8, 0.45).connect(out);
    src.start(t);
  }, 5, 11);
}

// ------------------------------------------------------------------- tower
// four chords that move slowly round, strings and breath, under the turning tower
function buildTower(r) {
  const out = ctx.createGain(); out.gain.value = 0.05;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.5;
  drift(lp.frequency, 0.05, 260);
  out.connect(lp);
  send(r, lp, 0.6, 1.1).connect(r.bus);
  // D minor, B flat major seventh, F major, C with a suspended fourth
  const CHORDS = [[146.83, 220, 293.66, 349.23, 440], [116.54, 174.61, 293.66, 349.23, 440], [87.31, 174.61, 261.63, 349.23, 440], [130.81, 196, 261.63, 349.23, 392]];
  const VOICES = 5;
  const voices = Array.from({ length: VOICES }, () => {
    const g = ctx.createGain(); g.gain.value = 0;
    g.connect(out);
    // each voice: two slightly detuned saws, so it shimmers like a section
    const osc = [ctx.createOscillator(), ctx.createOscillator()];
    osc.forEach((o, k) => { o.type = 'sawtooth'; o.detune.value = k ? 7 : -7; o.connect(g); o.start(); });
    return { g, osc };
  });
  let i = 0;
  r.tick = () => {
    if (!r.active) return;
    const t = ctx.currentTime + 0.05, chord = CHORDS[i % CHORDS.length];
    voices.forEach((v, k) => {
      v.osc.forEach((o) => o.frequency.setTargetAtTime(chord[k], t, 1.6));
      v.g.gain.setTargetAtTime(k === 0 ? 0.32 : 0.2, t, 0.8);
    });
    i++;
    r.timer = setTimeout(r.tick, 9000);
  };
  // the wind round the walls, low and thin
  const src = loopNoise(false);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 6;
  drift(bp.frequency, 0.04, 140);
  const wg = ctx.createGain(); wg.gain.value = 0.012;
  src.connect(bp).connect(wg);
  send(r, wg, 0.5, 0.8).connect(r.bus);
  // the further down the tower, the lower it all sounds (up to a minor seventh),
  // and back up again on the way up; it glides, it never steps
  const DOWN = 10;
  r.setDepth = (d) => {
    const t = ctx.currentTime, cents = -DOWN * 100 * d;
    voices.forEach((v) => v.osc.forEach((o, k) => o.detune.setTargetAtTime((k ? 7 : -7) + cents, t, 0.3)));
    bp.frequency.setTargetAtTime(520 * Math.pow(2, cents / 1200), t, 0.3);
    lp.frequency.setTargetAtTime(900 * Math.pow(2, cents / 2400), t, 0.3);
  };
}

// -------------------------------------------------------------------- cave
// the cave: the weight of the rock, air moving in its passages, and now and then
// a long low groan of stone somewhere far in. No water.
function buildCave(r) {
  // the weight overhead
  const rumble = loopNoise(true);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 110;
  const g = ctx.createGain(); g.gain.value = 0.1;
  drift(g.gain, 0.03, 0.03);
  rumble.connect(lp).connect(g).connect(r.bus);
  // air in the passages: hollow, resonant, breathing
  for (const [f, q, lv, rate] of [[180, 9, 0.016, 0.035], [410, 12, 0.008, 0.05], [95, 7, 0.02, 0.025]]) {
    const src = loopNoise(false);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const gg = ctx.createGain(); gg.gain.value = lv;
    drift(gg.gain, rate, lv * 0.7);
    drift(bp.frequency, rate * 0.6, f * 0.08);
    src.connect(bp).connect(gg);
    send(r, gg, 0.4, 1.2, cavern).connect(r.bus);
  }
  // a groan of stone, far in
  schedule(r, () => {
    const t = ctx.currentTime + 0.05, len = rand(4, 7);
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), gg = ctx.createGain();
    const f = rand(38, 52);
    o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * rand(0.8, 0.92), t + len);
    o2.type = 'sine'; o2.frequency.setValueAtTime(f * 1.5, t); o2.frequency.linearRampToValueAtTime(f * 1.4, t + len);
    gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(rand(0.05, 0.08), t + len * 0.35); gg.gain.linearRampToValueAtTime(0, t + len);
    const pan = ctx.createStereoPanner(); pan.pan.value = rand(-0.6, 0.6);
    o.connect(gg); o2.connect(gg); gg.connect(pan);
    send(r, pan, 0.3, 1.4, cavern).connect(r.bus);
    o.start(t); o2.start(t); o.stop(t + len + 0.1); o2.stop(t + len + 0.1);
  }, 14, 26);
}

// -------------------------------------------------------------------- halo
// high, still, holy: a choir far above, and a few glints of light
function buildHalo(r) {
  const out = ctx.createGain(); out.gain.value = 0.011;
  send(r, out, 0.35, 1.6).connect(r.bus);
  // A major, high, each voice two sines a breath apart, swelling slowly
  for (const f of [440, 554.37, 659.25, 880, 1108.73]) {
    const g = ctx.createGain(); g.gain.value = 0.5;
    drift(g.gain, rand(0.05, 0.11), 0.35);
    for (const det of [-3, 3]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = det;
      drift(o.frequency, rand(4.5, 5.5), f * 0.0025);   // a singer's vibrato
      o.connect(g); o.start();
    }
    g.connect(out);
  }
  // glints
  schedule(r, () => {
    const t = ctx.currentTime + 0.05;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = [1760, 2217.46, 2637.02, 3520][Math.floor(Math.random() * 4)];
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.004, t + 0.02); g.gain.exponentialRampToValueAtTime(0.00001, t + 3);
    const pan = ctx.createStereoPanner(); pan.pan.value = rand(-0.7, 0.7);
    o.connect(g).connect(pan);
    send(r, pan, 0.2, 1.6).connect(r.bus);
    o.start(t); o.stop(t + 3.1);
  }, 1.5, 4);
}

// ---------------------------------------------------------------------------
function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  hall = ctx.createConvolver();
  hall.buffer = impulse(4.2, 2.6);
  const wet = ctx.createGain(); wet.gain.value = 0.5;
  hall.connect(wet).connect(master);
  // the cave answers longer and darker than the church
  cavern = ctx.createConvolver();
  cavern.buffer = impulse(7, 2.2, 0.9);
  const wetC = ctx.createGain(); wetC.gain.value = 0.55;
  cavern.connect(wetC).connect(master);
  rooms.nave = room(buildNave);
  rooms.sky = room(buildSky);
  rooms.tower = room(buildTower);
  rooms.cave = room(buildCave);
  rooms.halo = room(buildHalo);
  return true;
}

function mix() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const [name, r] of Object.entries(rooms)) {
    const target = enabled ? levels[name] : 0;
    if (Math.abs(target - r.level) > 0.008 || (target === 0 && r.level !== 0)) {
      r.level = target;
      for (const g of [r.bus, ...r.wets.values()]) {
        g.gain.cancelScheduledValues(t);
        g.gain.setTargetAtTime(target, t, 0.7);
      }
    }
    const on = target > 0.004;
    if (on && !r.active) { r.active = true; r.tick && setTimeout(r.tick, 200); }
    if (!on && r.active) { r.active = false; clearTimeout(r.timer); r.stop && r.stop(); }
  }
}

export function setEnabled(on) {
  enabled = on;
  if (on) {
    if (!ensure()) return;
    ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(1, ctx.currentTime, 0.3);
  } else if (ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  }
  mix();
}

// how much of each room is heard, 0..1, from where the visitor is
export function setMix(next) {
  const { towerDepth, ...rest } = next;
  Object.assign(levels, rest);
  if (towerDepth !== undefined && rooms.tower) rooms.tower.setDepth(towerDepth);
  mix();
}

export const isEnabled = () => enabled;
