/* ============================================================
   ZA STREET RACERS · SIM
   Fisica longitudinale a passo fisso (120 Hz), senza rendering:
   lo stesso file può girare in Node per il server autorevole.
   ============================================================ */
const SIM = (function () {
  const G = 9.81, RHO = 1.2, DT = 1 / 120;

  /* Sette auto. tq = curva di coppia [giri, Nm]; vs = velocità (km/h) a cui
     ogni marcia arriva al centro della zona di cambiata; top = km/h al
     limitatore in sesta. Da vs e top si ricavano i sei rapporti totali. */
  const CARS = [
    { id: 'berlina', name: 'Berlina Turbo', tag: 'Berlina sportiva · turbo · posteriore',
      blurb: 'Parte pulita e continua a spingere nelle marce alte. La scelta di chi vuole una gara senza sorprese.',
      color: '#1f5fd6', m: 1480, redline: 7000, idle: 900, cyl: 4, turbo: true,
      tq: [[900, 225], [2400, 390], [3200, 510], [5600, 510], [6500, 455], [7000, 395]],
      rw: 0.33, eff: 0.90, cda: 0.68, crr: 0.013, mu: 1.25, wf: 0.58,
      vs: [50, 72, 99, 131, 168], top: 228, launchRpm: 4200, revA: 9, revB: 4.6, dmgMul: 1, zoneMul: 1 },
    { id: 'hatch', name: 'Hatch Aspirata', tag: 'Hatchback · aspirata · anteriore',
      blurb: 'Corta e leggera, esce forte dal via. Motore che gira alto: le cambiate arrivano una dietro l’altra.',
      color: '#e8262a', m: 1040, redline: 8000, idle: 950, cyl: 4, turbo: false,
      tq: [[950, 160], [3000, 242], [5600, 297], [7200, 290], [8000, 260]],
      rw: 0.30, eff: 0.91, cda: 0.64, crr: 0.012, mu: 1.32, wf: 0.60,
      vs: [47, 68, 94, 124, 158], top: 214, launchRpm: 5200, revA: 12, revB: 5.2, dmgMul: 1.1, zoneMul: 1 },
    { id: 'coupe', name: 'ZA 19 Evo', tag: 'Berlina anni ’80 · aspirata · posteriore',
      blurb: 'La berlina classica preparata per le corse: tanta coppia e poca aderenza. Se pattina al via, la gara è persa.',
      color: '#f4f4f4', m: 1340, redline: 7200, idle: 800, cyl: 4, turbo: false,
      tq: [[800, 330], [2400, 470], [4200, 520], [6000, 480], [7200, 400]],
      rw: 0.33, eff: 0.89, cda: 0.66, crr: 0.013, mu: 1.17, wf: 0.56,
      vs: [52, 75, 102, 134, 170], top: 238, launchRpm: 3400, revA: 8, revB: 4.3, dmgMul: 0.9, zoneMul: 1 },
    { id: 'rally', name: 'ZA Evo 4x4', tag: 'Hatch da rally · turbo · integrale',
      blurb: 'Nata per i rally, quattro ruote motrici: lo scatto migliore del gruppo. Poi l’aria la frena e gli altri rientrano.',
      color: '#b6ff1f', m: 1390, redline: 7200, idle: 900, cyl: 4, turbo: true,
      tq: [[900, 190], [2800, 392], [3800, 454], [6000, 420], [7200, 336]],
      rw: 0.32, eff: 0.84, cda: 0.78, crr: 0.015, mu: 1.12, wf: 0.96,
      vs: [46, 67, 92, 122, 156], top: 208, launchRpm: 4800, revA: 10, revB: 4.8, dmgMul: 1, zoneMul: 1 },
    { id: 'spider', name: 'Hatch Leggera', tag: 'Hatchback alleggerita · aspirata · posteriore',
      blurb: 'Spogliata di tutto: pesa niente e arriva a 9000 giri. Poca coppia, ogni cambiata sbagliata si paga per tutta la marcia.',
      color: '#ff8f80', m: 815, redline: 9000, idle: 1000, cyl: 4, turbo: false,
      tq: [[1000, 114], [4000, 180], [7000, 211], [8500, 204], [9000, 182]],
      rw: 0.29, eff: 0.91, cda: 0.60, crr: 0.012, mu: 1.26, wf: 0.58,
      vs: [48, 69, 95, 126, 161], top: 216, launchRpm: 5800, revA: 14, revB: 5.6, dmgMul: 1.25, zoneMul: 1 },
    { id: 'pickup', name: 'ZA 55 Q4', tag: 'Berlina · turbo · integrale',
      blurb: 'Berlina da corsa con la trazione integrale: esce dal via senza pattinare e tiene il passo fino in fondo.',
      color: '#c8102e', m: 1420, redline: 7000, idle: 850, cyl: 4, turbo: true,
      tq: [[850, 200], [2600, 380], [3600, 440], [5800, 410], [7000, 330]],
      rw: 0.32, eff: 0.85, cda: 0.70, crr: 0.014, mu: 1.14, wf: 0.95,
      vs: [47, 68, 93, 124, 159], top: 212, launchRpm: 4600, revA: 10, revB: 4.7, dmgMul: 1, zoneMul: 1 },
    { id: 'gt', name: 'ZA 36 Coupé', tag: 'Coupé · aspirata · posteriore',
      blurb: 'La base è quella della Turbo, ma più cattiva: ha la zona verde più stretta di tutte. Se la guidi bene non la prende nessuno.',
      color: '#7db4ff', m: 1340, redline: 8400, idle: 1000, cyl: 6, turbo: false,
      tq: [[1000, 227], [3500, 365], [6000, 422], [7800, 410], [8400, 370]],
      rw: 0.34, eff: 0.90, cda: 0.62, crr: 0.013, mu: 1.24, wf: 0.62,
      vs: [56, 80, 109, 143, 182], top: 250, launchRpm: 5000, revA: 13, revB: 5.4, dmgMul: 1.15, zoneMul: 0.8 },
    { id: 'golf', name: 'ZA TI Hatch', tag: 'Hatchback · turbo · anteriore',
      blurb: 'La compatta turbo di tutti i giorni: facile da guidare, spinge bene in mezzo e perdona gli errori.',
      color: '#d0021b', m: 1320, redline: 6800, idle: 850, cyl: 4, turbo: true,
      tq: [[850, 210], [2000, 360], [3000, 420], [5200, 420], [6800, 330]],
      rw: 0.32, eff: 0.90, cda: 0.66, crr: 0.013, mu: 1.24, wf: 0.61,
      vs: [48, 69, 95, 126, 161], top: 218, launchRpm: 4400, revA: 9, revB: 4.6, dmgMul: 1, zoneMul: 1 },
    { id: 'e30', name: 'ZA 32 Classic', tag: 'Coupé anni ’80 · aspirata · posteriore',
      blurb: 'Leggera e cattiva, motore che ama i giri alti. Senza turbo: ogni cambiata perfetta conta.',
      color: '#1d3f8f', m: 1180, redline: 7600, idle: 900, cyl: 4, turbo: false,
      tq: [[900, 190], [3000, 270], [5000, 305], [6800, 295], [7600, 260]],
      rw: 0.31, eff: 0.91, cda: 0.64, crr: 0.012, mu: 1.27, wf: 0.58,
      vs: [49, 71, 97, 128, 163], top: 220, launchRpm: 5000, revA: 12, revB: 5.1, dmgMul: 1.1, zoneMul: 1 }
  ];

  const ORDER = ['hatch', 'pickup', 'spider', 'berlina', 'e30', 'gt', 'golf', 'rally', 'coupe'];
  CARS.sort((x, y) => ORDER.indexOf(x.id) - ORDER.indexOf(y.id));

  const DEFAULT_CFG = { band: 844, boost: 7, damage: 14, dist: 402, cpu: 92 };

  function shiftCenter(car) { return car.redline - 950; }
  /* zona verde del cambio: a ogni marcia sale un poco verso i giri alti e si stringe */
  const ZONE_UP = 90, ZONE_NARROW = 0.12;
  function shiftZone(car, cfg, gear) {
    const g = Math.max(0, Math.min(4, (gear || 1) - 1));
    const w = cfg.band * car.zoneMul * (1 - ZONE_NARROW * g), c = shiftCenter(car) + ZONE_UP * g;
    return { lo: c - w / 2, hi: c + w / 2, c: c };
  }
  function launchZone(car, cfg) {
    const w = cfg.band * car.zoneMul, c = car.launchRpm;
    return { lo: c - w / 2, hi: c + w / 2, c: c };
  }
  function ratios(car) {
    if (car._r) return car._r;
    /* rapporti calcolati sul limitatore di serie: più giri dal motore = più velocità in ogni marcia;
       4a e 5a un po' più lunghe e una sesta di riposo con margine, che si allunga con la potenza delle elaborazioni */
    const red0 = car.baseRed || car.redline, tm = car.topMul || 1;
    const k = 2 * Math.PI * car.rw / 60, sc = red0 - 950, r = [];
    for (let i = 0; i < 5; i++) r.push(sc * k / (car.vs[i] * (i === 3 ? 1.04 : i === 4 ? 1.11 : 1) * (i >= 3 ? Math.pow(tm, 0.6) : 1) / 3.6));
    r.push(red0 * k / (car.top * 1.2 * tm / 3.6));
    car._r = r; return r;
  }
  function torqueAt(car, rpm) {
    const t = car.tq;
    if (rpm <= t[0][0]) return t[0][1];
    for (let i = 1; i < t.length; i++) {
      if (rpm <= t[i][0]) {
        const a = t[i - 1], b = t[i];
        return a[1] + (b[1] - a[1]) * (rpm - a[0]) / (b[0] - a[0]);
      }
    }
    return t[t.length - 1][1];
  }
  function peakPowerKw(car) {
    let p = 0;
    for (let r = car.idle; r <= car.redline; r += 100) p = Math.max(p, torqueAt(car, r) * r * 2 * Math.PI / 60000);
    return p;
  }
  function redlineEff(r) {
    return r.health < 40 ? r.car.redline - (1 - r.health / 40) * 800 : r.car.redline;
  }
  function healthFactor(h) { return h < 40 ? 0.55 + 0.45 * (h / 40) : 1; }

  function makeRacer(car, opts) {
    opts = opts || {};
    return {
      car: car, name: opts.name || 'TU', isCpu: !!opts.isCpu, lane: opts.lane || 0, paint: opts.paint || car.color,
      x: 0, v: 0, a: 0, rpm: car.idle, rpmVel: 0, gear: 1, health: 100, throttle: false,
      launched: false, clutchRpm: 0, slipping: false, onLimiter: false, limT: 0, spin: 0,
      shiftT: 0, shiftQ: null, boostT: 0, boostMul: 1, penT: 0, penMul: 1, gripT: 0, gripMul: 1,
      powerMul: opts.powerMul || 1, time: 0, finished: false, finishTime: null, trap: 0, vmax: 0,
      shifts: [], launch: null, wheelAng: 0, events: [],
      ai: opts.isCpu ? { err: opts.err || 1, launchTarget: 0, shiftTarget: 0, limDelay: 0.25 } : null
    };
  }

  /* numero casuale gaussiano con generatore iniettabile */
  function gauss(rnd) {
    let u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function aiPrepare(r, cfg, rnd) {
    const z = launchZone(r.car, cfg);
    r.ai.launchTarget = z.c + gauss(rnd) * 330 * r.ai.err;
    aiNextShift(r, cfg, rnd);
  }
  function aiNextShift(r, cfg, rnd) {
    const z = shiftZone(r.car, cfg, r.gear);
    let t = z.c + gauss(rnd) * 300 * r.ai.err;
    t = Math.max(z.lo - 800, Math.min(r.car.redline + 60, t));
    r.ai.shiftTarget = t;
    r.ai.limDelay = 0.12 + rnd() * 0.3;
  }

  /* Fase di semaforo rosso: i giri seguono l'acceleratore con inerzia. */
  function stepPre(r, dt) {
    const car = r.car;
    if (r.ai) r.throttle = r.rpm < r.ai.launchTarget;
    const target = r.throttle ? car.redline + 900 : car.idle - 300;
    r.rpmVel += ((target - r.rpm) * car.revA - r.rpmVel * car.revB) * dt;
    r.rpm += r.rpmVel * dt;
    r.onLimiter = false;
    if (r.rpm >= car.redline) { r.rpm = car.redline - 180; r.rpmVel = -2200; r.onLimiter = true; }
    if (r.rpm <= car.idle) { r.rpm = car.idle; if (r.rpmVel < 0) r.rpmVel = 0; }
  }

  /* Verde: l'esito dipende solo da dove si trova la lancetta. */
  function launch(r, cfg) {
    const z = launchZone(r.car, cfg), rpm = r.rpm;
    let q;
    if (rpm >= z.lo && rpm <= z.hi) q = 'perfetta';
    else if (rpm >= z.lo - 400 && rpm <= z.hi + 400) q = 'buona';
    else if (rpm < z.lo) q = 'lenta';
    else q = 'eccessiva';
    if (q === 'perfetta') { r.boostT = 1.0; r.boostMul = 1 + cfg.boost / 100; r.gripT = 1.5; r.gripMul = 1.08; }
    if (q === 'lenta') { r.penT = 1.2; r.penMul = 0.85; }
    if (q === 'eccessiva') { r.gripT = 1.5; r.gripMul = 0.75; }
    r.launch = { q: q, rpm: Math.round(rpm), delta: Math.round(rpm - z.c) };
    r.clutchRpm = Math.max(rpm, r.car.redline * 0.34);
    r.launched = true; r.throttle = true; r.rpmVel = 0;
    r.events.push({ t: 'launch', q: q });
    return q;
  }

  function tryShift(r, cfg) {
    if (!r.launched || r.finished || r.shiftT > 0 || r.gear >= 6) return null;
    const z = shiftZone(r.car, cfg, r.gear), rpm = r.rpm;
    let q;
    if (r.onLimiter) q = 'fuorigiri';
    else if (rpm > z.hi + 350) q = 'tardiva';
    else if (rpm >= z.lo && rpm <= z.hi) q = 'perfetta';
    else if (rpm >= z.lo - 350) q = 'buona';
    else q = 'anticipata';
    r.shiftQ = q;
    r.shiftT = (q === 'perfetta' ? 0.12 : (q === 'buona' ? 0.22 : 0.26)) * (r.car.shiftMul || 1);
    if (q === 'tardiva' || q === 'fuorigiri') r.health = Math.max(0, r.health - cfg.damage * r.car.dmgMul);
    r.shifts.push({ gear: r.gear, q: q, rpm: Math.round(rpm), delta: Math.round(rpm - z.c), t: r.time });
    r.events.push({ t: 'shift', q: q });
    return q;
  }

  function stepRace(r, dt, cfg, rnd) {
    const car = r.car, rat = ratios(car);
    if (!r.finished) r.time += dt;
    if (r.boostT > 0) { r.boostT -= dt; if (r.boostT <= 0) r.boostMul = 1; }
    if (r.penT > 0) { r.penT -= dt; if (r.penT <= 0) r.penMul = 1; }
    if (r.gripT > 0) { r.gripT -= dt; if (r.gripT <= 0) r.gripMul = 1; }
    const k = 60 / (2 * Math.PI * car.rw);
    let F = 0;
    r.spin = 0;
    if (!r.blown && car.canBlow && r.health < 10 && r.launched && !r.finished) {
      r.blown = true; r.events.push({ t: 'blown' });
    }
    if (r.blown && !r.finished) {
      F = -car.m * 0.9; r.onLimiter = false;
      r.rpm += (car.idle - r.rpm) * Math.min(1, dt * 3);
    } else if (r.finished) {
      /* dopo il traguardo: 2 s col piede alzato (solo aria e freno motore), poi una frenata dolce */
      r.postT = (r.postT || 0) + dt;
      F = r.v <= 0 ? 0 : -car.m * (r.postT < 0.35 ? 0.8 : r.postT < 0.7 ? 4 : 6.5);
      /* scalate realistiche: si scala solo quando il motore è sceso di giri (circa 3000)
         e la marcia sotto non lo manda oltre i 3/4 del limitatore; doppietta breve con il motore che sale
         dolce ai giri giusti, poi frizione attaccata e giri legati alle ruote */
      r.downT = (r.downT || 0) - dt;
      const wr = g => r.v * k * rat[g - 1];
      if (r.postT > 0.8 && r.gear > 2 && r.v > 5 && r.downT <= 0 && wr(r.gear - 1) < car.redline * 0.82) {
        r.gear--; r.downT = 0.65; r.blipT = 0.2;
        r.events.push({ t: 'down' });
      }
      if (r.blipT > 0) {
        r.blipT -= dt;
        r.rpm += (wr(r.gear) * 1.06 - r.rpm) * Math.min(1, dt * 14);
      } else r.rpm += (Math.max(car.idle, wr(r.gear)) - r.rpm) * Math.min(1, dt * 5);
      r.onLimiter = false;
    } else if (r.shiftT > 0) {
      r.shiftT -= dt;
      const next = Math.max(car.idle, r.v * k * rat[r.gear]);
      r.rpm += (next - r.rpm) * Math.min(1, dt * 22);
      r.onLimiter = false;
      if (r.shiftT <= 0) {
        r.gear++;
        const q = r.shiftQ;
        if (q === 'perfetta') { r.boostT = 0.8; r.boostMul = 1 + cfg.boost / 100; }
        else if (q === 'anticipata') { r.penT = 0.6; r.penMul = 0.65; }
        else if (q === 'tardiva' || q === 'fuorigiri') { r.penT = 0.5; r.penMul = 0.75; }
        if (r.ai) aiNextShift(r, cfg, rnd);
      }
    } else {
      const ratio = rat[r.gear - 1];
      const rpmC = r.v * k * ratio;
      let rpm;
      r.slipping = false;
      if (r.gear === 1 && r.clutchRpm > rpmC) {
        r.clutchRpm = Math.max(rpmC, r.clutchRpm - 700 * (car.clutchMul || 1) * dt);
        rpm = r.clutchRpm; r.slipping = rpm > rpmC + 1;
      } else {
        r.clutchRpm = 0;
        rpm = Math.max(rpmC, car.idle + 500);
      }
      const red = redlineEff(r);
      let cut = 1;
      if (rpm >= red) {
        r.onLimiter = true; r.limT += dt;
        rpm = red - (Math.floor(r.time * 28) % 2 ? 160 : 0);
        r.health = Math.max(0, r.health - 2 * dt);
        cut = 0;
      } else { r.onLimiter = false; r.limT = 0; }
      r.rpm = rpm;
      const T = torqueAt(car, rpm) * r.powerMul * healthFactor(r.health);
      F = T * ratio * car.eff / car.rw * cut;
      const limit = car.mu * car.m * G * car.wf * r.gripMul;
      if (F > limit) { r.spin = Math.min(1, F / limit - 1) * (r.gripMul < 1 ? 1 : 0.4); F = limit; }
      F *= r.boostMul * r.penMul * (r.nitroT > 0 ? 1.3 : 1);
      if (cut === 0) F = -car.m * 0.6;
      /* pilota CPU: cambia quando i giri raggiungono il suo bersaglio */
      if (r.ai && r.gear < 6 && !r.slipping) {
        if (r.onLimiter ? r.limT > r.ai.limDelay : rpm >= r.ai.shiftTarget) tryShift(r, cfg);
      }
    }
    if (r.nitroT > 0) r.nitroT -= dt;
    const drag = 0.5 * RHO * car.cda * r.v * r.v + car.crr * car.m * G;
    r.a = (F - drag) / car.m;
    const v0 = r.v;
    r.v = Math.max(0, r.v + r.a * dt);
    const x0 = r.x;
    r.x += (v0 + r.v) * 0.5 * dt;
    r.wheelAng += (r.v * (1 + r.spin * 2.2) / car.rw) * dt;
    if (r.v > r.vmax) r.vmax = r.v;
    if (r.t60 == null && r.x >= 18.29) r.t60 = r.time;
    if (!r.finished && r.x >= cfg.dist) {
      const f = (cfg.dist - x0) / Math.max(1e-6, r.x - x0);
      r.finishTime = r.time - dt * (1 - f);
      r.trap = r.v; r.finished = true;
      r.events.push({ t: 'finish' });
    }
  }

  /* Gara completa di un pilota ideale, per bilanciare auto e CPU. */
  function idealRun(car, cfg, powerMul) {
    const r = makeRacer(car, { powerMul: powerMul || 1 });
    const z = launchZone(car, cfg); r.rpm = z.c; launch(r, cfg);
    let t60 = null, guard = 0;
    while (!r.finished && guard++ < 120 * 60) {
      if (r.gear < 6 && !r.slipping && r.shiftT <= 0 && r.rpm >= shiftZone(car, cfg, r.gear).c) tryShift(r, cfg);
      stepRace(r, DT, cfg, Math.random);
      if (t60 === null && r.x >= 18.3) t60 = r.time;
    }
    return { et: r.finishTime, trap: r.trap * 3.6, t60: t60, gear: r.gear, shifts: r.shifts.length };
  }

  /* Elaborazioni: livelli 0–3 per nove voci, applicate a una copia dell'auto. */
  const MODS = [
    { id: 'centralina', name: 'Centralina', desc: '+3% di coppia per livello' },
    { id: 'aspirazione', name: 'Aspirazione', desc: '+3,5% di coppia agli alti regimi' },
    { id: 'scarico', name: 'Scarico', desc: '+2% di coppia, voce più piena' },
    { id: 'turbo', name: 'Turbo', desc: '+5% di coppia; su un’aspirata +4% e fischio' },
    { id: 'rapporti', name: 'Rapporti corti', desc: 'prime tre marce più corte: più spunto, le alte restano lunghe' },
    { id: 'frizione', name: 'Frizione', desc: 'cambiate più rapide del 12%' },
    { id: 'pneumatici', name: 'Pneumatici', desc: 'più aderenza: meno pattinamento al via' },
    { id: 'peso', name: 'Alleggerimento', desc: '−3,5% di massa per livello' },
    { id: 'nitro', name: 'Nitro', desc: 'bombola più grande: da 0,4 s di serie a 1,0 / 1,7 / 2,5 secondi' },
    { id: 'motore', name: 'Motore', desc: '+250 giri al limitatore. Livello 3, Motore spinta: +4% di coppia, ma sotto il 10% di salute può cedere' }
  ];
  const MOD_COST = [500, 1200, 2500];
  function buildCar(base, mods) {
    mods = mods || {};
    const L = id => Math.max(0, Math.min(3, mods[id] | 0));
    const c = Object.assign({}, base);
    delete c._r;
    c.tq = base.tq.map(p => p.slice());
    c.vs = base.vs.slice();
    const red0 = base.redline;
    if (L('motore')) {
      c.redline = red0 + 250 * L('motore');
      const f = c.redline / red0;
      c.tq.forEach(p => { if (p[0] > red0 * 0.5) p[0] = red0 * 0.5 + (p[0] - red0 * 0.5) * f; });
    }
    let mul = 1 + 0.03 * L('centralina') + 0.02 * L('scarico') + (base.turbo ? 0.05 : 0.04) * L('turbo') + (L('motore') === 3 ? 0.04 : 0);
    c.tq.forEach(p => { p[1] *= mul; if (p[0] > c.redline * 0.6) p[1] *= 1 + 0.035 * L('aspirazione'); });
    if (L('turbo')) c.turbo = true;
    c.nitro = L('nitro');
    c.baseRed = red0;
    c.topMul = Math.pow(mul * (1 + 0.035 * L('aspirazione') * 0.5), 0.33);
    c.vs = c.vs.map((v, i) => v * (1 - (i < 3 ? 0.04 : 0.015) * L('rapporti')));
    c.top = base.top * (1 - 0.01 * L('rapporti'));
    c.shiftMul = 1 - 0.12 * L('frizione');
    c.clutchMul = 1 + 0.25 * L('frizione');
    c.mu = base.mu + 0.045 * L('pneumatici');
    c.m = base.m * (1 - 0.035 * L('peso'));
    c.canBlow = L('motore') === 3;
    c.exhaust = L('scarico');
    return c;
  }

  /* nitro: una volta a gara, dopo la partenza */
  /* ogni auto ha un goccino di nitro (0,4 s); col potenziamento la bombola cresce */
  const NITRO_T = [0.4, 1.0, 1.7, 2.5];
  const NITRO_COST = [5000, 10000, 18000];
  function nitro(r) {
    if (r.nitroUsed || !r.launched || r.finished || r.blown) return false;
    r.nitroUsed = true; r.nitroT = NITRO_T[r.car.nitro | 0]; return true;
  }
  function nitroLeft(r) { return !r.nitroUsed ? 1 : Math.max(0, r.nitroT || 0) / NITRO_T[r.car.nitro | 0]; }
  /* scala dei potenziamenti: somma dei livelli (0-30) e classe, usata anche per il matchmaking online */
  function modScore(mods) { return MODS.reduce((s, m) => s + Math.max(0, Math.min(3, (mods || {})[m.id] | 0)), 0); }
  function modClass(mods) { const s = modScore(mods); return s <= 5 ? 0 : s <= 13 ? 1 : s <= 21 ? 2 : 3; }
  return { modScore, modClass, nitro, nitroLeft, NITRO_COST, NITRO_T, G, DT, CARS, MODS, MOD_COST, buildCar, DEFAULT_CFG, shiftZone, launchZone, ratios, torqueAt, peakPowerKw, redlineEff,
    makeRacer, aiPrepare, stepPre, launch, tryShift, stepRace, idealRun, gauss };
})();
if (typeof module !== 'undefined') module.exports = SIM;
