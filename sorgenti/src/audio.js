/* ============================================================
   ZA STREET RACERS · AUDIO
   Motore sintetizzato in Web Audio: fondamentale legato ai giri,
   armoniche del carico, aspirazione, pulsazioni di scarico, più
   limitatore, pattinamento, turbo, cambiate e motore danneggiato.
   ============================================================ */
const AUDIO = (function () {
  let ctx = null, master = null, enabled = true, volume = 0.7, ready = false;
  let eng = null, noiseBuf = null;

  function makeNoise() {
    const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function shaperCurve(k) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return c;
  }
  function noiseSrc() {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(); return s;
  }

  function init() {
    if (ready) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { ctx = null; return; }
    noiseBuf = makeNoise();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = enabled ? volume : 0;
    master.connect(comp); comp.connect(ctx.destination);

    eng = {};
    /* strato 1: fondamentale (dente di sega) + sub (scarico) + armonica (carico) */
    eng.o1 = ctx.createOscillator(); eng.o1.type = 'sawtooth';
    eng.o2 = ctx.createOscillator(); eng.o2.type = 'square';
    eng.o3 = ctx.createOscillator(); eng.o3.type = 'triangle';
    eng.g1 = ctx.createGain(); eng.g2 = ctx.createGain(); eng.g3 = ctx.createGain();
    eng.g1.gain.value = 0.32; eng.g2.gain.value = 0.22; eng.g3.gain.value = 0.1;
    eng.shaper = ctx.createWaveShaper(); eng.shaper.curve = shaperCurve(6);
    eng.lp = ctx.createBiquadFilter(); eng.lp.type = 'lowpass'; eng.lp.Q.value = 3;
    eng.bus = ctx.createGain(); eng.bus.gain.value = 0;
    eng.o1.connect(eng.g1); eng.o2.connect(eng.g2); eng.o3.connect(eng.g3);
    [eng.g1, eng.g2, eng.g3].forEach(g => g.connect(eng.shaper));
    eng.shaper.connect(eng.lp); eng.lp.connect(eng.bus); eng.bus.connect(master);
    /* tremolo per le pulsazioni di scarico */
    eng.lfo = ctx.createOscillator(); eng.lfo.type = 'sine'; eng.lfoG = ctx.createGain(); eng.lfoG.gain.value = 0.25;
    eng.lfo.connect(eng.lfoG); eng.lfoG.connect(eng.g2.gain);
    /* strato 2: aspirazione */
    eng.intake = ctx.createBiquadFilter(); eng.intake.type = 'bandpass'; eng.intake.Q.value = 1.2;
    eng.intakeG = ctx.createGain(); eng.intakeG.gain.value = 0;
    noiseSrc().connect(eng.intake); eng.intake.connect(eng.intakeG); eng.intakeG.connect(master);
    /* pattinamento */
    eng.sq = ctx.createBiquadFilter(); eng.sq.type = 'bandpass'; eng.sq.frequency.value = 2600; eng.sq.Q.value = 7;
    eng.sqG = ctx.createGain(); eng.sqG.gain.value = 0;
    noiseSrc().connect(eng.sq); eng.sq.connect(eng.sqG); eng.sqG.connect(master);
    /* turbo */
    eng.tb = ctx.createOscillator(); eng.tb.type = 'sine'; eng.tbG = ctx.createGain(); eng.tbG.gain.value = 0;
    eng.tb.connect(eng.tbG); eng.tbG.connect(master);
    /* avversari: un solo strato basso che segue le CPU */
    eng.cpu = ctx.createOscillator(); eng.cpu.type = 'sawtooth';
    eng.cpuLp = ctx.createBiquadFilter(); eng.cpuLp.type = 'lowpass'; eng.cpuLp.frequency.value = 700;
    eng.cpuG = ctx.createGain(); eng.cpuG.gain.value = 0;
    eng.cpu.connect(eng.cpuLp); eng.cpuLp.connect(eng.cpuG); eng.cpuG.connect(master);
    /* vento */
    eng.wind = ctx.createBiquadFilter(); eng.wind.type = 'lowpass'; eng.wind.frequency.value = 500;
    eng.windG = ctx.createGain(); eng.windG.gain.value = 0;
    noiseSrc().connect(eng.wind); eng.wind.connect(eng.windG); eng.windG.connect(master);

    [eng.o1, eng.o2, eng.o3, eng.lfo, eng.tb, eng.cpu].forEach(o => o.start());
    ready = true;
  }

  const T = 0.02;
  function set(p, v, t) { p.setTargetAtTime(v, ctx.currentTime, t || T); }

  /* s: { rpm, cyl, throttle, load, limiter, spin, turbo, health, speed, cpuRpm, cpuCyl, exhaust, active } */
  function update(s) {
    if (!ready || !eng) return;
    if (!s.active) {
      set(eng.bus.gain, 0, 0.08); set(eng.intakeG.gain, 0, 0.08); set(eng.sqG.gain, 0, 0.05);
      set(eng.tbG.gain, 0, 0.05); set(eng.cpuG.gain, 0, 0.1); set(eng.windG.gain, 0, 0.1);
      return;
    }
    const f0 = Math.max(18, s.rpm / 60 * s.cyl / 2);
    set(eng.o1.frequency, f0); set(eng.o2.frequency, f0 * 0.5); set(eng.o3.frequency, f0 * 2);
    set(eng.lfo.frequency, Math.max(4, f0 / 4));
    const load = s.load;
    let g = 0.16 + load * 0.2 + s.exhaust * 0.025;
    if (s.limiter && Math.random() < 0.5) g *= 0.25;
    if (s.health < 40 && Math.random() < (40 - s.health) / 260) g *= 0.15; /* singhiozzo */
    set(eng.bus.gain, g, 0.012);
    set(eng.g3.gain, 0.05 + load * 0.16);
    set(eng.lp.frequency, 260 + s.rpm * 0.22 + load * 1300);
    set(eng.intake.frequency, 500 + s.rpm * 0.35);
    set(eng.intakeG.gain, 0.02 + load * 0.07 * Math.min(1, s.rpm / 5000));
    set(eng.sqG.gain, Math.min(0.32, s.spin * 0.5), 0.03);
    set(eng.tb.frequency, 1800 + s.rpm * 0.9);
    set(eng.tbG.gain, s.turbo ? load * Math.min(1, s.rpm / 6000) * 0.035 : 0, 0.08);
    set(eng.cpu.frequency, Math.max(18, s.cpuRpm / 60 * s.cpuCyl / 2));
    set(eng.cpuG.gain, 0.045, 0.2);
    set(eng.windG.gain, Math.min(0.12, s.speed / 80 * 0.12), 0.2);
  }

  function env(node, peak, a, d) {
    const t = ctx.currentTime;
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(freq, type, peak, dur, delay) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(master);
    const t = ctx.currentTime + (delay || 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function burst(type, freq, q, peak, dur) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(master);
    env(g, peak, 0.005, dur); s.start(); s.stop(ctx.currentTime + dur + 0.1);
  }

  /* ---------- folla: brusio filtrato, applausi e grida "uuh" a caso ---------- */
  let cr = null, crLast = 0;
  function crowdInit() {
    cr = {};
    cr.bus = ctx.createGain(); cr.bus.gain.value = 0; cr.bus.connect(master);
    const n1 = noiseSrc(), f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 850; f1.Q.value = 0.7;
    const n2 = noiseSrc(), f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2300; f2.Q.value = 1.4;
    const g1 = ctx.createGain(); g1.gain.value = 0.5; const g2 = ctx.createGain(); g2.gain.value = 0.18;
    /* ondeggiamento lento del brusio */
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.7; const lg = ctx.createGain(); lg.gain.value = 0.15;
    lfo.connect(lg); lg.connect(g1.gain); lfo.start();
    n1.connect(f1); f1.connect(g1); g1.connect(cr.bus);
    n2.connect(f2); f2.connect(g2); g2.connect(cr.bus);
    cr.level = 0;
  }
  function crowdVoice(lv) {
    const t = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    const base = 180 + Math.random() * 220, whistle = Math.random() < 0.3;
    o.type = whistle ? 'sine' : 'sawtooth';
    f.type = 'bandpass'; f.frequency.value = whistle ? 2000 : 700 + Math.random() * 500; f.Q.value = whistle ? 1 : 3;
    const f0 = whistle ? 1200 + Math.random() * 400 : base, dur = 0.35 + Math.random() * 0.4;
    o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (whistle ? 1.45 : 1.25), t + dur * 0.4); o.frequency.linearRampToValueAtTime(f0 * (whistle ? 1.1 : 0.9), t + dur);
    o.connect(f); f.connect(g); g.connect(master);
    const pk = (whistle ? 0.02 : 0.05) * lv;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pk), t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function clap(lv) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400 + Math.random() * 1200; f.Q.value = 1.2;
    const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(master);
    env(g, 0.06 * lv, 0.002, 0.05); s.start(ctx.currentTime, Math.random()); s.stop(ctx.currentTime + 0.1);
  }
  /* livello 0..1, chiamata a ogni fotogramma */
  function crowd(level) {
    if (!ready || !enabled) return;
    if (!cr) crowdInit();
    const now = ctx.currentTime, dt = Math.min(0.1, now - crLast); crLast = now;
    cr.level = level;
    set(cr.bus.gain, level * 0.22, 0.25);
    if (level < 0.05) return;
    if (Math.random() < dt * level * level * 7) crowdVoice(level);
    if (level > 0.3 && Math.random() < dt * level * 26) clap(level);
  }

  function fx(name) {
    if (!ready || !enabled) return;
    switch (name) {
      case 'red': tone(520, 'square', 0.12, 0.14); break;
      case 'green': tone(880, 'square', 0.14, 0.35); tone(1320, 'sine', 0.08, 0.35); break;
      case 'perfetta': tone(1568, 'sine', 0.18, 0.22); tone(2093, 'sine', 0.12, 0.26, 0.05); burst('lowpass', 900, 1, 0.25, 0.07); break;
      case 'shift': burst('lowpass', 700, 1, 0.3, 0.08); break;
      case 'bad': burst('lowpass', 500, 1, 0.35, 0.1); tone(140, 'sawtooth', 0.1, 0.18); break;
      case 'backfire': burst('bandpass', 380, 2, 0.6, 0.12); break;
      case 'blowoff': burst('highpass', 3200, 0.8, 0.12, 0.3); break;
      case 'blown': burst('lowpass', 300, 1, 0.8, 0.6); tone(70, 'sawtooth', 0.2, 0.8); break;
      case 'finish': tone(660, 'triangle', 0.12, 0.2); tone(990, 'triangle', 0.12, 0.3, 0.12); break;
      case 'cheer': if (cr) { for (let i = 0; i < 5; i++) setTimeout(() => crowdVoice(1), i * 90 + Math.random() * 120); } break;
      case 'click': tone(1200, 'sine', 0.05, 0.05); break;
      case 'buy': tone(990, 'sine', 0.1, 0.12); tone(1480, 'sine', 0.1, 0.2, 0.08); break;
    }
  }

  function setEnabled(on) {
    enabled = on;
    if (master) master.gain.setTargetAtTime(on ? volume : 0, ctx.currentTime, 0.05);
  }
  function setVolume(v) {
    volume = v;
    if (master && enabled) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
  }
  return { init, update, fx, crowd, setEnabled, setVolume, get enabled() { return enabled; }, get volume() { return volume; } };
})();
