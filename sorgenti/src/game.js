/* ============================================================
   ZA STREET RACERS · GAME
   Stati, input, salvataggi, menu, garage, carriera, risultati.
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  /* canvas alla risoluzione vera dello schermo (fino a 2x): grafica nitida anche sui telefoni */
  /* qualità automatica: si parte dalla risoluzione dello schermo (iPhone al massimo 1,5x) e, se il telefono non
     regge 50 fotogrammi al secondo, si scende a passi fino a 1x. La scelta resta salvata per le volte dopo. */
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let CK2 = 1, QMAX = 2;
  try { const q = parseFloat(localStorage.getItem('zsr_q')); if (q >= 1 && q <= 2) QMAX = q; } catch (e) { }
  if (IOS) QMAX = Math.min(QMAX, 1.5);
  function fitCanvas() {
    const r = cv.getBoundingClientRect(), k = Math.max(1, Math.min(QMAX, (r.width * (devicePixelRatio || 1)) / 1280));
    if (Math.abs(k - CK2) < 0.05 && cv.width === Math.round(1280 * k)) return;
    CK2 = k; cv.width = Math.round(1280 * k); cv.height = Math.round(720 * k); RENDER.setRS(k);
  }
  const perf = { n: 0, sum: 0, cool: 0 };
  function perfFrame(dt) {
    if (perf.cool > 0) { perf.cool -= dt; return; }
    if (dt > 0.25 || document.hidden) return;
    perf.n++; perf.sum += dt;
    if (perf.n >= 90) {
      const avg = perf.sum / perf.n; perf.n = 0; perf.sum = 0;
      if (avg > 1 / 50 && CK2 > 1.01) {
        QMAX = Math.max(1, Math.round((CK2 - 0.25) * 4) / 4);
        try { localStorage.setItem('zsr_q', String(QMAX)); } catch (e) { }
        fitCanvas(); perf.cool = 2;
      }
    }
  }
  addEventListener('resize', () => setTimeout(fitCanvas, 60));
  const CAR = id => SIM.CARS.find(c => c.id === id) || SIM.CARS[0];

  /* ---------- salvataggio locale (facoltativo: il gioco funziona anche senza) ---------- */
  const KEY = 'zsr-save-v2', OLD_KEY = 'zsr-save-v1';
  /* versioni disponibili per le auto che ne hanno più di una */
  const VERSION_NAMES = { pickup: ['Giallo Racing', 'Bianco'], rally: ['Blu, cerchi lime', 'Bianco, cerchi rosa'] };
  const defCosm = c => ({ version: 0, paint: 'orig', livery: 'orig', accent: '#14111c', num: 7, rim: 'orig', inch: 18, rimStyle: 'serie', stickers: [], ride: 0 });
  /* auto in gioco: per ora solo quelle nello stile nuovo; le altre tornano quando avranno i disegni nuovi */
  const ROSTER = ['hatch', 'pickup', 'spider', 'berlina', 'e30', 'gt', 'golf', 'rally', 'coupe'];
  const CARS_ON = () => SIM.CARS.filter(c => ROSTER.includes(c.id));
  const PRESETS = {
    debutto: { band: 1100, boost: 9, damage: 8, dist: 402, cpu: 84 },
    standard: { band: 844, boost: 7, damage: 14, dist: 402, cpu: 92 },
    notte: { band: 600, boost: 5, damage: 22, dist: 402, cpu: 100 }
  };
  function freshSave() {
    const cars = {};
    SIM.CARS.forEach(c => cars[c.id] = { mods: {}, cosm: defCosm(c) });
    return { credits: 300, car: 'berlina', cars: cars, cfg: Object.assign({}, PRESETS.standard), light: 'tramonto', audio: { on: true, vol: 0.7 }, career: { unlocked: 1, won: {}, best: {} }, best: {}, rims: ['serie'], pilot: 0, pilotNames: PILOTS.map(() => ''), lang: guessLang() };
  }
  let save = freshSave();
  try {
    const raw = localStorage.getItem(KEY), old = raw ? null : localStorage.getItem(OLD_KEY);
    if (raw) { const s = JSON.parse(raw); save = Object.assign(freshSave(), s); }
    else if (old) { /* dalla versione precedente tengo crediti, elaborazioni, carriera e record; l'aspetto riparte da quello nuovo */
      const s = JSON.parse(old), f = freshSave();
      save = Object.assign(f, { credits: s.credits, car: s.car || 'berlina', cfg: s.cfg || f.cfg, audio: s.audio || f.audio, career: s.career || f.career, best: s.best || {} });
      if (s.cars) SIM.CARS.forEach(c => { if (s.cars[c.id] && s.cars[c.id].mods) save.cars[c.id].mods = s.cars[c.id].mods; });
    }
    SIM.CARS.forEach(c => { if (!save.cars[c.id]) save.cars[c.id] = { mods: {}, cosm: defCosm(c) }; save.cars[c.id].cosm = Object.assign(defCosm(c), save.cars[c.id].cosm); });
    if (!PAL_OK(save.light)) save.light = 'tramonto';
    if (save.track !== 'garda') save.track = 'citta';
    if (!ROSTER.includes(save.car)) save.car = ROSTER[0];
    if (!Array.isArray(save.rims)) save.rims = ['serie'];
    /* cerchi vecchi tolti: si torna a quello di serie */
    const RIMIDS = CAR_RIMS.map(r => r.id); save.rims = save.rims.filter(r => r === 'serie' || RIMIDS.includes(r));
    Object.values(save.cars || {}).forEach(c => { if (c.cosm && c.cosm.rimStyle !== 'serie' && !RIMIDS.includes(c.cosm.rimStyle)) c.cosm.rimStyle = 'serie'; });
    if (!Array.isArray(save.pilotNames)) save.pilotNames = [];
    PILOTS.forEach((_, i) => { if (!save.pilotNames[i] || /^Pilota \d+$/.test(save.pilotNames[i])) save.pilotNames[i] = ''; });
    if (!save.lang) save.lang = guessLang();
    /* arrivano i piloti animati: si sposta l'elenco una volta e si parte con il primo */
    if ((save.pilotAnim | 0) < PILOT_ANIM.length) { const n = PILOT_ANIM.length - (save.pilotAnim | 0); for (let k = 0; k < n; k++) save.pilotNames.unshift(''); save.pilotNames.length = PILOTS.length; save.pilot = (save.pilot | 0) + n; save.pilotAnim = PILOT_ANIM.length; }
    if (!save.pilotsV2) { save.pilotNames.length = PILOTS.length; if (save.pilot >= PILOTS.length) save.pilot = 0; save.pilotsV2 = 1; }
    if (!(save.pilot >= 0 && save.pilot < PILOTS.length)) save.pilot = 0;
  } catch (e) { }
  if (!save.lang) save.lang = guessLang();
  setLang(save.lang);
  function PAL_OK(l) { return l === 'tramonto' || l === 'giorno' || l === 'notte'; }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { } }

  /* ---------- carriera ---------- */
  const TAPPE = [
    { name: 'Via del Cemento', dist: 402 },
    { name: 'Lungolago di Limone', dist: 402, track: 'garda' },
    { name: 'Corso Industria · sprint', dist: 201 },
    { name: 'Viale del Porto', dist: 402 },
    { name: 'Gardesana · mezzo miglio', dist: 804, track: 'garda' },
    { name: 'Finale notturna', dist: 402, night: true }
  ];
  function careerCfg(t) {
    const b = save.cfg, k = t - 1;
    return { band: Math.max(400, b.band - 60 * k), boost: b.boost, damage: Math.round(b.damage * (1 + 0.1 * k)), dist: TAPPE[k].dist, cpu: b.cpu + 3 * k };
  }

  /* ---------- input ---------- */
  const input = { gas: false, shiftQ: 0 };
  function isRacing() { return ['stage', 'red', 'race', 'finish'].includes(G.phase); }
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); if (isRacing()) press(e.repeat); else if (G.phase === 'results') rematch(); }
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); if (!e.repeat && isRacing()) input.shiftQ++; }
    else if (e.code === 'Escape' || e.code === 'KeyP') { if (isRacing()) togglePause(); }
    else if (e.code === 'Enter' && G.phase === 'results') rematch();
  });
  addEventListener('keyup', e => { if (e.code === 'Space') input.gas = false; });
  addEventListener('blur', () => { input.gas = false; if (isRacing() && !G.paused) togglePause(); });
  const bG = $('btnGas'), bS = $('btnShift');
  /* un solo comando: prima del verde si tiene premuto per dare gas, in gara ogni pressione cambia marcia */
  const SHIFT_LOCK = 0.45;
  function press(repeat) {
    /* subito dopo il verde c'è una piccola pausa: una pressione troppo veloce non cambia marcia */
    if (G.phase === 'race' || G.phase === 'finish') { if (!repeat && !(G.phase === 'race' && G.phaseT < SHIFT_LOCK)) input.shiftQ++; }
    else input.gas = true;
  }
  const gasOn = e => { e.preventDefault(); if (isRacing()) press(false); bG.classList.add('down'); };
  const gasOff = () => { input.gas = false; bG.classList.remove('down'); };
  bG.addEventListener('pointerdown', gasOn); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => bG.addEventListener(t, gasOff));
  bS.addEventListener('pointerdown', e => { e.preventDefault(); if (isRacing()) input.shiftQ++; bS.classList.add('down'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => bS.addEventListener(t, () => bS.classList.remove('down')));
  /* clic o tocco sulla pista: metà sinistra acceleratore, metà destra cambio */
  cv.addEventListener('pointerdown', e => {
    if (!isRacing() || G.paused) return;
    const r = cv.getBoundingClientRect();
    press(false);
  });
  cv.addEventListener('pointerup', () => { input.gas = false; });
  const coarse = matchMedia('(pointer: coarse)').matches;
  let touchSeen = coarse;
  addEventListener('touchstart', () => { touchSeen = true; if (isRacing()) $('touch').classList.add('on'); }, { passive: true });

  function setOneBtn(shift) {
    $('imgGas').src = ASSETS[shift ? 'shift' : 'gas'];
    const sp = bG.querySelector('span'); sp.dataset.i18n = shift ? 'btn.shift' : 'btn.gas'; sp.textContent = T(sp.dataset.i18n);
  }
  /* ---------- stato di gioco ---------- */
  const G = { phase: 'menu', paused: false, racers: [], player: null, camX: -16, dist: 402, cfg: null, mode: 'quick', tappa: 1,
    phaseT: 0, redDur: 3, redLit: false, msg: null, pos: 1, hud: false, lz: null, sz: null, setup: null, finishT: 0, leadGap: '' };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };

  function cosmFor(id) { return save.cars[id].cosm; }
  function pilotName(i) { return save.pilotNames[i] || (PILOT_ANIM[i] ? PILOT_ANIM[i].name : T('p.default', i + 1)); }
  const carName = c => T('car.' + c.id + '.name') === 'car.' + c.id + '.name' ? c.name : T('car.' + c.id + '.name');
  const carTag = c => I18N['car.' + c.id + '.tag'] ? T('car.' + c.id + '.tag') : c.tag;
  const QL = q => T('q.' + q);
  function makeSetup() {
    /* le CPU usano le auto in gioco, anche uguali alla tua, ognuna con un aspetto a caso */
    const pool = shuffle(ROSTER.filter(id => id !== save.car)).concat(shuffle(ROSTER.slice()), ROSTER, ROSTER, ROSTER);
    const others = pool.slice(0, 3);
    /* i rivali sono gli altri piloti */
    const pil = shuffle(PILOTS.map((_, i) => i).filter(i => i !== save.pilot)).slice(0, 3);
    const lanes = shuffle([0, 1, 2]);
    return { cpus: others.map((id, i) => ({ id: id, pilot: pil[i], name: pilotName(pil[i]), lane: lanes[i], version: (Math.random() * RENDER.versions(id)) | 0, cosm: randomLook() })) };
  }

  const etCache = {};
  function idealEt(id, cfg) { const k = id + '|' + cfg.dist + '|' + cfg.band; if (!etCache[k]) etCache[k] = SIM.idealRun(CAR(id), cfg).et; return etCache[k]; }
  function buildRacers(cfg, setup) {
    const pc = SIM.buildCar(CAR(save.car), save.cars[save.car].mods);
    const cos = cosmFor(save.car);
    const p = SIM.makeRacer(pc, { name: pilotName(save.pilot), lane: 3, paint: cos.paint && cos.paint !== 'orig' ? cos.paint : pc.color });
    p.cosm = Object.assign({ glow: '#ffd23f' }, cos); p.flameT = 0; p.puffT = 0; p.pilot = save.pilot;
    const err = Math.max(0.3, Math.min(1.6, 1 - (cfg.cpu - 92) / 30));
    const list = [p];
    setup.cpus.forEach(c => {
      const base = CAR(c.id);
      /* le CPU si adeguano all'auto di serie del giocatore: un'auto più veloce non è un vantaggio regalato */
      const etP = idealEt(save.car, cfg), etC = idealEt(c.id, cfg), bal = Math.max(0.75, Math.min(1.15, Math.pow(etC / etP, 4.2)));
      const r = SIM.makeRacer(base, { name: c.name, lane: c.lane, isCpu: true, err: err, powerMul: cfg.cpu / 100 * bal, paint: base.color });
      r.cosm = Object.assign({ version: c.version || 0, glow: ['#19c3d1', '#ff2e7e', '#8a3cf0'][c.lane % 3] }, c.cosm || {});
      if (c.cosm && c.cosm.paint) r.paint = c.cosm.paint;
      r.flameT = 0; r.puffT = 0; r.pilot = c.pilot;
      list.push(r);
    });
    return { list, p };
  }

  /* schermo intero e blocco in orizzontale, dove il telefono lo permette */
  function goFull() {
    const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!rq || document.fullscreenElement || document.webkitFullscreenElement) return;
    try {
      const pr = rq.call(el);
      const lock = () => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } };
      if (pr && pr.then) pr.then(lock).catch(() => { }); else lock();
    } catch (e) { }
  }
  /* schermo intero sempre a portata di mano, in tutte le schermate: entra ed esce */
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const canFs = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  $('btnFull').hidden = !canFs;
  $('btnFull').addEventListener('click', () => {
    if (fsEl()) { const ex = document.exitFullscreen || document.webkitExitFullscreen; try { ex && ex.call(document); } catch (e) { } }
    else goFull();
  });
  $('trackSeg').addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    save.track = b.dataset.t; persist(); AUDIO.init(); AUDIO.fx('click');
    scene(save.track, save.light); attract = null;
    document.querySelectorAll('#trackSeg button').forEach(x => x.classList.toggle('on', x.dataset.t === save.track));
  });
  try { matchMedia('(orientation: portrait) and (pointer: coarse)').addEventListener('change', e => { if (e.matches && isRacing() && !G.paused) togglePause(); }); } catch (e) { }

  function startRace(mode, tappa, reuse) {
    if (touchSeen) goFull();
    AUDIO.init(); AUDIO.setEnabled(save.audio.on); AUDIO.setVolume(save.audio.vol);
    G.mode = mode; G.tappa = tappa || 1;
    const od = mode === 'online' ? reuse : null;
    G.cfg = od ? Object.assign({}, od.cfg) : mode === 'career' ? careerCfg(G.tappa) : Object.assign({}, save.cfg);
    const wantLight = od ? od.light : mode === 'career' && TAPPE[G.tappa - 1].night ? 'notte' : save.light;
    const wantTrack = od ? od.track : mode === 'career' ? (TAPPE[G.tappa - 1].track || 'citta') : save.track;
    scene(wantTrack, wantLight);
    if (!od) G.setup = reuse && G.setup ? G.setup : makeSetup();
    const b = od ? buildOnlineRacers(G.cfg, od) : buildRacers(G.cfg, G.setup);
    G.racers = b.list; G.player = b.p; G.dist = G.cfg.dist;
    G.racers.forEach(r => { if (r.ai) SIM.aiPrepare(r, G.cfg, Math.random); });
    G.lz = SIM.launchZone(G.player.car, G.cfg); G.sz = SIM.shiftZone(G.player.car, G.cfg);
    G.phase = 'stage'; G.phaseT = 0; G.redDur = od ? od.redDur : 2 + Math.random() * 3; G.sendT = 0; G.raceT = 0; G.redLit = false; G.msg = null;
    cheer.a = 0.3; cheer.b = 0.15; cheer.done = false; G.camX = -camOff(); look = 0; acc = 0; G.hud = true; G.paused = false; G.finishT = 0; G.pos = 1;
    input.gas = false; input.shiftQ = 0;
    RENDER.clearParts();
    showScreen(null);
    $('touch').classList.toggle('on', touchSeen); setOneBtn(false);
    $('corner').classList.add('on');
    setMsg(T('race.ready'), '#f0c35a', T('race.readyHint', T(touchSeen ? 'btn.gas' : 'key.space')), 1.4);
  }
  function rematch() { if (G.mode === 'online') { onBackToRoom(); return; } startRace(G.mode, G.tappa, true); }

  function setMsg(text, color, sub, d) { d = d || 0.9; G.msg = { text, color, sub, t: d, d: d }; }

  function togglePause() {
    G.paused = !G.paused; input.gas = false;
    $('scrPause').classList.toggle('on', G.paused);
  }

  /* ---------- passo di simulazione a 120 Hz ---------- */
  function step(dt) {
    const p = G.player;
    G.phaseT += dt;
    if (G.msg) G.msg.t -= dt;
    if (G.phase === 'stage' || G.phase === 'red') {
      p.throttle = input.gas;
      G.racers.forEach(r => { if (r.remote) remotePre(r); else SIM.stepPre(r, dt); });
      if (G.phase === 'stage' && G.phaseT > 1.5) { G.phase = 'red'; G.phaseT = 0; G.redLit = true; AUDIO.fx('red'); }
      else if (G.phase === 'red' && G.phaseT >= G.redDur) {
        G.racers.forEach(r => { if (r.remote) r.launched = true; else SIM.launch(r, G.cfg); });
        G.phase = 'race'; G.phaseT = 0; AUDIO.fx('green'); cheer.a = 1; AUDIO.fx('cheer');
        input.gas = false; setOneBtn(true);
        const l = p.launch;
        setMsg(T('race.launch', QL(l.q)), RENDER.Q_COLOR[l.q], T('race.launchHint', (l.delta >= 0 ? '+' : '') + l.delta), 1.1);
      }
      input.shiftQ = 0;
      return;
    }
    if (G.phase === 'race' || G.phase === 'finish') {
      G.raceT = (G.raceT || 0) + dt;
      G.sz = SIM.shiftZone(p.car, G.cfg, p.gear);
      if (G.phase === 'race' && G.phaseT < SHIFT_LOCK) input.shiftQ = 0;
      while (input.shiftQ > 0) {
        input.shiftQ--;
        const q = SIM.tryShift(p, G.cfg);
        if (q) {
          const last = p.shifts[p.shifts.length - 1];
          setMsg(QL(q), RENDER.Q_COLOR[q], T('race.shiftHint', (last.delta >= 0 ? '+' : '') + last.delta, last.gear, last.gear + 1), 0.8);
          if (q === 'perfetta') { AUDIO.fx('perfetta'); p.flameT = 0.4; }
          else if (q === 'tardiva' || q === 'fuorigiri') { AUDIO.fx('bad'); AUDIO.fx('backfire'); p.flameT = 0.4; }
          else AUDIO.fx('shift');
          if (p.car.turbo) AUDIO.fx('blowoff');
        }
      }
      if (G.mode === 'online') onSendState(dt);
      G.racers.forEach(r => {
        const g0 = r.gear;
        if (r.remote) remoteStep(r, dt); else SIM.stepRace(r, dt, G.cfg, Math.random);
        if (r !== p && !r.remote && r.gear !== g0 && Math.random() < 0.35) r.flameT = 0.4;
        if (r.flameT > 0) r.flameT -= dt;
        r.puffT -= dt;
        if ((r.spin > 0.12 || (r.gripMul < 1 && r.v < 14)) && r.puffT <= 0) {
          r.puffT = r.gripMul < 1 ? 0.16 : 0.24;
          const S = RENDER.SHAPES[r.car.id];
          RENDER.puff(r.x - (S.L - S.wr) * RENDER.CK * RENDER.laneS(r.lane), RENDER.laneY(r.lane) - 6, RENDER.laneS(r.lane) * 1.4);
        }
        r.events.forEach(ev => {
          if (r === p && ev.t === 'blown') { AUDIO.fx('blown'); setMsg(T('race.blown'), '#ff4b33', T('race.blownHint'), 2); }
          if (r === p && ev.t === 'finish') AUDIO.fx('finish');
          if (ev.t === 'finish' && !cheer.done) { cheer.done = true; cheer.b = 1; AUDIO.fx('cheer'); }
        });
        r.events.length = 0;
      });
      RENDER.stepParts(dt);
      /* posizione */
      const rank = G.racers.slice().sort((a, b) => {
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        return b.x - a.x;
      });
      G.pos = rank.indexOf(p) + 1;
      const lead = rank[0];
      G.leadGap = lead === p ? (rank[1] ? T('race.ahead', Math.max(0, p.x - rank[1].x).toFixed(1)) : '') : T('race.leader', Math.max(0, lead.x - p.x).toFixed(1));
      if (G.phase === 'race' && (p.finished || (p.blown && p.v < 0.5))) { G.phase = 'finish'; G.finishT = 0; }
      if (G.phase === 'finish') {
        G.finishT += dt;
        const all = G.racers.every(r => r.finished || r.blown || r.gone);
        if (G.mode === 'online') onSendState(dt);
        if ((all && G.finishT > 2.6) || G.finishT > 25) showResults();
      }
    }
  }

  /* ---------- telecamera ---------- */
  /* con i pulsanti touch l'auto sta più a destra, così ACCELERA non la copre */
  /* l'auto del giocatore sta al centro dello schermo (il muso è avanti di mezza auto) */
  const camOff = () => 640 / RENDER.PPM + 3.4;
  /* La telecamera è agganciata alla posizione interpolata dell'auto: nessun ritardo che fa ballare l'immagine.
     Solo lo sguardo in avanti verso chi è in testa si sposta piano. */
  let look = 0;
  const RX = r => r.rx !== undefined ? r.rx : r.x;
  function camera(dt) {
    const p = G.player;
    if (!p) return;
    /* sempre agganciata al giocatore: gli avversari non spostano l'inquadratura */
    G.camX = RX(p) - camOff();
  }
  /* posizioni da disegnare: a metà strada tra gli ultimi due passi di fisica */
  function savePrev() { G.racers.forEach(r => { r.px = r.x; r.pang = r.wheelAng; }); }
  function interp(a) {
    G.racers.forEach(r => {
      const px = r.px !== undefined ? r.px : r.x, pa = r.pang !== undefined ? r.pang : r.wheelAng;
      r.rx = px + (r.x - px) * a; r.rang = pa + (r.wheelAng - pa) * a;
    });
  }

  /* ---------- audio per fotogramma ---------- */
  function audioFrame() {
    const p = G.player;
    const active = isRacing() && !G.paused && p;
    if (!active) { AUDIO.update({ active: false }); return; }
    let near = null, nd = 1e9;
    G.racers.forEach(r => { if (r !== p && Math.abs(r.x - p.x) < nd) { nd = Math.abs(r.x - p.x); near = r; } });
    const load = G.phase === 'red' || G.phase === 'stage' ? (input.gas ? 1 : 0.15) : (p.finished || p.blown || p.shiftT > 0 ? 0.1 : 1);
    AUDIO.update({ active: true, rpm: p.rpm, cyl: p.car.cyl, load: load, limiter: p.onLimiter, spin: p.spin + (p.slipping && p.launch && p.launch.q === 'eccessiva' ? 0.5 : 0),
      turbo: p.car.turbo, health: p.health, speed: p.v, cpuRpm: near ? near.rpm : 900, cpuCyl: near ? near.car.cyl : 4, exhaust: p.car.exhaust || 0 });
  }

  /* ---------- scena del menu: le auto ferme sulla linea ---------- */
  let attract = null;
  function buildAttract() {
    const setup = makeSetup(), b = buildRacers(PRESETS.standard, setup);
    attract = b.list;
  }
  G.light = null;
  function scene(track, light) { const k = track + '|' + light; if (G.light !== k) { G.light = k; RENDER.setScene(track, light); } }

  /* ---------- folla: entusiasmo al via (a) e al traguardo (b) ---------- */
  const cheer = { a: 0.15, b: 0.15, done: false, t: 0 };
  function cheerFrame(dt, camX, dist, menu) {
    cheer.t += dt;
    let ta = 0.15, tb = 0.15;
    if (!menu && G.racers) {
      const lead = G.racers.reduce((m, r) => Math.max(m, RX(r)), 0);
      ta = G.phase === 'stage' || G.phase === 'red' ? 0.32 : 0.4;
      tb = cheer.done ? 0.85 : lead > dist - 160 ? 0.55 : 0.2;
    }
    /* sale in fretta, scende piano */
    const k = (v, t) => v + (t - v) * Math.min(1, dt * (t > v ? 3 : 0.35));
    cheer.a = k(cheer.a, ta); cheer.b = k(cheer.b, tb);
    /* il volume dipende da quanto la telecamera è vicina a una delle due tribune */
    const cx = camX + 640 / RENDER.PPM;
    const near = z => Math.max(0, Math.min(1, 1 - (Math.abs(cx - z) - 12) / 110));
    AUDIO.crowd(menu ? 0.12 : Math.max(cheer.a * near(0), cheer.b * near(dist + 5)));
    return { a: cheer.a, b: cheer.b, t: cheer.t };
  }

  /* ---------- loop ---------- */
  let last = performance.now(), acc = 0, sway = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    perfFrame(dt);
    if (isRacing()) {
      if (!G.paused) {
        acc += dt;
        while (acc >= SIM.DT) { savePrev(); step(SIM.DT); acc -= SIM.DT; }
        interp(acc / SIM.DT);
        camera(dt);
      }
      audioFrame();
      ctx.setTransform(CK2, 0, 0, CK2, 0, 0);
      RENDER.frame(ctx, { crowd: cheerFrame(dt, G.camX, G.dist, false), camX: G.camX, phase: G.phase, redLit: G.redLit, racers: G.racers, player: G.player, dist: G.dist, hud: true, lz: G.lz, sz: G.sz, msg: G.msg, pos: G.pos, leadGap: G.leadGap });
    } else if (G.phase === 'results') {
      acc += dt;
      while (acc >= SIM.DT) { savePrev(); G.racers.forEach(r => { if (r.remote) remoteStep(r, SIM.DT); else SIM.stepRace(r, SIM.DT, G.cfg, Math.random); }); acc -= SIM.DT; }
      interp(acc / SIM.DT);
      RENDER.stepParts(dt); camera(dt);
      ctx.setTransform(CK2, 0, 0, CK2, 0, 0);
      RENDER.frame(ctx, { crowd: cheerFrame(dt, G.camX, G.dist, false), camX: G.camX, phase: 'finish', racers: G.racers, player: G.player, dist: G.dist, hud: false });
      audioFrame();
    } else {
      sway += dt;
      if (!attract) buildAttract();
      const mc = -26 + Math.sin(sway * 0.15) * 2;
      ctx.setTransform(CK2, 0, 0, CK2, 0, 0);
      RENDER.frame(ctx, { crowd: cheerFrame(dt, mc, 402, true), camX: mc, phase: 'off', racers: attract, player: attract[0], dist: 402, hud: false });
      audioFrame();
    }
    requestAnimationFrame(loop);
  }


  /* ---------- multiplayer online (2-4 piloti, stanze a codice e partita veloce) ---------- */
  const ON = { net: null, quick: null, qT: null, code: null, peers: [], joinedAt: 0, inRace: false, expect: 0, openedAt: 0, autoDone: false, states: {}, joinCheck: false };
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const newCode = () => Array.from({ length: 5 }, () => LETTERS[(Math.random() * LETTERS.length) | 0]).join('');
  const onMe = () => ({ id: NET.myId, name: pilotName(save.pilot).slice(0, 14), pilot: save.pilot, car: save.car, cosm: cosmFor(save.car), at: ON.joinedAt, inRace: ON.inRace });
  const onSorted = () => ON.peers.slice().sort((a, b) => (a.at - b.at) || (a.id < b.id ? -1 : 1));
  const onIsHost = () => { const s = onSorted(); return !!s.length && s[0].id === NET.myId; };
  function onMsg(t) { $('onMsg').textContent = t || ''; }
  function onView(room) { $('onHome').hidden = !!room; $('onRoom').hidden = !room; }
  function onTrack() { if (ON.net) ON.net.track(onMe()); }
  function onOpenScreen() { onView(!!ON.net); onMsg(''); $('onCode').placeholder = T('on.codePh'); renderOnline(); showScreen('scrOnline'); }
  function renderOnline() {
    if (!ON.net) return;
    $('onCodeShow').textContent = ON.code;
    const s = onSorted(), host = s[0];
    let h = '';
    for (let i = 0; i < 4; i++) {
      const p = s[i];
      if (!p) { h += '<div class="onslot empty"><b>' + T('on.free') + '</b></div>'; continue; }
      const c = CAR(p.car) || CAR(ROSTER[0]);
      h += '<div class="onslot' + (p.id === NET.myId ? ' me' : '') + '"><img alt="" src="' + (PILOTS[p.pilot] || PILOTS[0]) + '"><b></b><small>' + carName(c) + (i === 0 ? ' · ' + T('on.host') : '') + '</small></div>';
    }
    $('onSlots').innerHTML = h;
    $('onSlots').querySelectorAll('.onslot:not(.empty) b').forEach((el, i) => { el.textContent = s[i].name; });
    const iAmHost = onIsHost();
    $('onGo').hidden = !iAmHost; $('onGo').disabled = s.length < 2;
    if (!ON.inRace) onMsg(s.length < 2 ? T('on.needTwo') : iAmHost ? '' : T('on.waitHost', host ? host.name : ''));
  }
  function onPeersChanged() {
    const ids = ON.peers.map(p => p.id);
    /* entrata: stanza piena o gara in corso */
    if (ON.joinCheck && Date.now() - ON.openedAt > 1500) {
      ON.joinCheck = false;
      const others = ON.peers.filter(p => p.id !== NET.myId);
      if (others.length >= 4) { onLeaveRoom(); onView(false); onMsg(T('on.full')); return; }
      if (others.some(p => p.inRace)) { onLeaveRoom(); onView(false); onMsg(T('on.busy')); return; }
    }
    /* chi esce durante la gara si ferma */
    if (G.mode === 'online' && isRacing()) G.racers.forEach(r => { if (r.remote && !ids.includes(r.remote) && !r.gone) { r.gone = true; setMsg(r.name, '#ff9a55', T('on.left'), 1.4); } });
    if (!isRacing() && G.phase !== 'results') renderOnline();
    /* partita veloce: il primo parte da solo quando sono arrivati tutti */
    if (ON.expect && !ON.autoDone && onIsHost() && !ON.inRace) {
      const n = ON.peers.length;
      if (n >= ON.expect || (n >= 2 && Date.now() - ON.openedAt > 9000)) { ON.autoDone = true; setTimeout(onHostStart, 1500); }
    }
  }
  async function onOpenRoom(code, expect, joining) {
    onLeaveRoom(); onView(false); onMsg(T('on.connecting'));
    let net;
    try { net = await NET.channel('room-' + code); } catch (e) { onMsg(T('on.fail')); return; }
    Object.assign(ON, { net: net, code: code, joinedAt: Date.now(), openedAt: Date.now(), peers: [onMe()], expect: expect || 0, autoDone: false, inRace: false, states: {}, joinCheck: !!joining });
    ON.peers[0].at = ON.joinedAt;
    net.onPeers(list => { ON.peers = list.filter(x => x && x.id); if (!ON.peers.some(x => x.id === NET.myId)) ON.peers.push(onMe()); onPeersChanged(); });
    net.on('start', onNetStart);
    net.on('st', d => {
      if (!d || !d.id) return;
      const b = ON.states[d.id] || (ON.states[d.id] = { buf: [] });
      Object.assign(b, d); if (d.t != null) { b.buf.push({ t: d.t, x: d.x, v: d.v }); if (b.buf.length > 900) b.buf.shift(); }
    });
    onTrack(); onView(true); renderOnline();
    if (expect) setTimeout(onPeersChanged, 9500);
    try { history.replaceState(null, '', location.pathname + '?room=' + code + (NET.LOCAL ? '&net=local' : '')); } catch (e) { }
  }
  function onLeaveRoom() {
    if (ON.quick) { try { ON.quick.close(); } catch (e) { } ON.quick = null; clearInterval(ON.qT); }
    if (ON.net) { try { ON.net.close(); } catch (e) { } ON.net = null; }
    ON.code = null; ON.peers = []; ON.inRace = false;
    try { history.replaceState(null, '', location.pathname + (NET.LOCAL ? '?net=local' : '')); } catch (e) { }
  }
  async function onQuick(N) {
    onLeaveRoom(); onView(false); onMsg(T('on.searching'));
    let q;
    try { q = await NET.channel('quick' + N); } catch (e) { onMsg(T('on.fail')); return; }
    ON.quick = q;
    const me = { id: NET.myId, at: Date.now() }; let list = [];
    q.on('match', d => { if (d && d.ids && d.ids.includes(NET.myId) && ON.quick === q) { onLeaveRoom(); onOpenRoom(d.code, d.ids.length); } });
    q.onPeers(l => { list = l.filter(x => x && x.id); });
    q.track(me);
    ON.qT = setInterval(() => {
      if (ON.quick !== q) { clearInterval(ON.qT); return; }
      const s = list.slice().sort((a, b) => a.at - b.at);
      onMsg(T('on.searchN', N) + ' · ' + s.length + '/' + N);
      if (s.length && s[0].id === NET.myId && s.length >= N) {
        const ids = s.slice(0, N).map(x => x.id), code = newCode();
        q.send('match', { code: code, ids: ids });
        setTimeout(() => { onLeaveRoom(); onOpenRoom(code, ids.length); }, 300);
        clearInterval(ON.qT);
      }
    }, 1000);
  }
  function onInvite() {
    const url = location.origin + location.pathname + '?room=' + ON.code;
    const txt = 'ZA STREET RACERS · ' + T('on.room') + ' ' + ON.code;
    if (navigator.share && touchSeen) navigator.share({ title: 'ZA Street Racers', text: txt, url: url }).catch(() => { });
    else { try { navigator.clipboard.writeText(url); } catch (e) { } onMsg(T('on.copied')); }
  }
  function onHostStart() {
    if (!ON.net || !onIsHost() || ON.peers.length < 2 || ON.inRace) return;
    const d = { order: onSorted().map(p => p.id), peers: onSorted(), cfg: Object.assign({}, save.cfg), track: save.track, light: save.light, redDur: 2 + Math.random() * 2.5 };
    ON.net.send('start', d);
    onNetStart(d);
  }
  function onNetStart(d) {
    if (!d || !d.order || !d.order.includes(NET.myId) || ON.inRace) return;
    ON.inRace = true; ON.states = {}; onTrack();
    startRace('online', 1, d);
  }
  function buildOnlineRacers(cfg, d) {
    const pc = SIM.buildCar(CAR(save.car), save.cars[save.car].mods), cos = cosmFor(save.car);
    const p = SIM.makeRacer(pc, { name: pilotName(save.pilot), lane: 3, paint: cos.paint && cos.paint !== 'orig' ? cos.paint : pc.color });
    p.cosm = Object.assign({ glow: '#ffd23f' }, cos); p.flameT = 0; p.puffT = 0; p.pilot = save.pilot;
    /* corsie uguali su tutti i telefoni, in ordine di stanza (il primo in basso); in due le corsie centrali */
    const all = d.peers.slice(0, 4), LN = all.length === 2 ? [2, 1] : all.length === 3 ? [3, 2, 1] : [3, 2, 1, 0];
    const laneOf = id => LN[Math.max(0, all.findIndex(x => x.id === id))];
    p.lane = laneOf(NET.myId);
    const list = [p];
    all.filter(pe => pe.id !== NET.myId).forEach(pe => {
      const lane = laneOf(pe.id);
      const base = CAR(pe.car) || CAR(ROSTER[0]), cz = pe.cosm || {};
      const r = SIM.makeRacer(SIM.buildCar(base, {}), { name: pe.name, lane: lane, paint: cz.paint && cz.paint !== 'orig' ? cz.paint : base.color });
      r.cosm = Object.assign({ glow: ['#19c3d1', '#ff2e7e', '#8a3cf0'][lane % 3] }, cz); r.flameT = 0; r.puffT = 0; r.pilot = pe.pilot || 0;
      r.remote = pe.id; r.nShift = 0;
      list.push(r);
    });
    return { list, p };
  }
  /* gli avversari online non vengono simulati: si seguono le posizioni che mandano (15 volte al secondo) */
  function remotePre(r) { const s = ON.states[r.remote]; if (s) r.rpm = s.rpm; }
  /* l'avversario si disegna dove si trovava allo STESSO tempo di gara del giocatore (ognuno parte dal suo verde):
     così chi è davanti sullo schermo è chi è davanti nei tempi, anche con il ritardo della rete */
  function remoteAt(b, t) {
    const B = b.buf; if (!B.length) return null;
    if (t <= B[0].t) return { x: B[0].x, v: B[0].v };
    for (let i = B.length - 1; i > 0; i--) if (B[i - 1].t <= t && t <= B[i].t) { const a = B[i - 1], c = B[i], f = (t - a.t) / Math.max(1e-3, c.t - a.t); return { x: a.x + (c.x - a.x) * f, v: a.v + (c.v - a.v) * f }; }
    const L = B[B.length - 1], dt = Math.min(0.8, t - L.t);
    return { x: L.x + L.v * dt, v: L.v };
  }
  function remoteStep(r, dt) {
    const b = ON.states[r.remote], t = G.raceT || 0;
    if (b && b.buf && b.buf.length) {
      if (b.ft && t >= b.ft && !r.finished) { r.finished = true; r.finishTime = b.ft; r.trap = b.tr || 0; r.events.push({ t: 'finish' }); }
      const q = remoteAt(b, t);
      if (q) { r.x += (q.x - r.x) * Math.min(1, dt * 14); r.v = q.v; }
      r.rpm = b.rpm; r.gear = b.g; r.spin = b.sp || 0;
      if (b.n > r.nShift) { r.nShift = b.n; r.flameT = 0.4; }
      if (b.bl && !r.blown) r.blown = true;
      r.time = t;
    }
    if (r.gone) { r.v = Math.max(0, r.v - 6 * dt); r.x += r.v * dt; }
    r.wheelAng += (r.v * (1 + (r.spin || 0) * 2.2) / r.car.rw) * dt;
  }
  function onSendState(dt) {
    G.sendT -= dt;
    if (G.sendT > 0 || !ON.net) return;
    G.sendT = 1 / 20;
    const p = G.player;
    ON.net.send('st', { id: NET.myId, ph: 'race', t: +(G.raceT || 0).toFixed(3), x: +p.x.toFixed(2), v: +p.v.toFixed(2), rpm: Math.round(p.rpm), g: p.gear, sp: +(p.spin || 0).toFixed(2), n: p.shifts.length, ft: p.finished ? p.finishTime : 0, tr: p.trap || 0, bl: !!p.blown });
  }
  function onBackToRoom() { G.phase = 'menu'; G.mode = 'quick'; ON.inRace = false; onTrack(); goMenu(); onOpenScreen(); }

  /* ---------- schermate ---------- */
  const SCREENS = ['scrOnline', 'scrMenu', 'scrGarage', 'scrRules', 'scrCareer', 'scrPilots', 'scrResults', 'scrPause'];
  function showScreen(id) {
    SCREENS.forEach(s => $(s).classList.toggle('on', s === id));
    if (id) { $('touch').classList.remove('on'); $('corner').classList.remove('on'); }
  }
  function goMenu() {
    G.phase = 'menu'; G.paused = false; G.hud = false;
    scene(save.track, save.light);
    document.querySelectorAll('#trackSeg button').forEach(b => b.classList.toggle('on', b.dataset.t === save.track));
    attract = null;
    $('menuCar').textContent = carName(CAR(save.car));
    $('menuPilot').textContent = pilotName(save.pilot);
    $('menuAv').style.backgroundImage = 'url(' + PILOTS[save.pilot] + ')';
    $('menuCredits').textContent = save.credits.toLocaleString('it-IT');
    document.querySelector('.keys').innerHTML = '<span><kbd>' + T(touchSeen ? 'key.tap' : 'key.space') + '</kbd> ' + T('key.one') + '</span>';
    showScreen('scrMenu');
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    AUDIO.init(); AUDIO.setEnabled(save.audio.on); AUDIO.fx('click');
    const a = b.dataset.act;
    if (a === 'quick') startRace('quick', 1);
    else if (a === 'career') { G.phase = 'menu'; renderCareer(); showScreen('scrCareer'); }
    else if (a === 'garage') { G.phase = 'menu'; renderGarage(true); showScreen('scrGarage'); }
    else if (a === 'rules') { renderRules(); showScreen('scrRules'); }
    else if (a === 'pilots') { renderPilots(); showScreen('scrPilots'); }
    else if (a === 'menu') { if (G.mode === 'online') onLeaveRoom(); goMenu(); }
    else if (a === 'online') { G.phase = 'menu'; onOpenScreen(); }
    else if (a === 'onExit') { onLeaveRoom(); goMenu(); }
    else if (a === 'onQuick') onQuick(+b.dataset.n || 2);
    else if (a === 'onCreate') onOpenRoom(newCode(), 0);
    else if (a === 'onJoin') { const c = $('onCode').value.trim().toUpperCase(); if (!/^[A-Z]{5}$/.test(c)) onMsg(T('on.badCode')); else onOpenRoom(c, 0, true); }
    else if (a === 'onLeave') { onLeaveRoom(); onView(false); onMsg(''); }
    else if (a === 'onGo') onHostStart();
    else if (a === 'onInvite') onInvite();
    else if (a === 'onBack') onBackToRoom();
    else if (a === 'resume') togglePause();
    else if (a === 'restart') { G.paused = false; if (G.mode !== 'online') rematch(); else togglePause(); }
    else if (a === 'rematch') rematch();
    else if (a === 'next') startRace('career', G.tappa + 1);
    else if (a === 'tappa') startRace('career', +b.dataset.t);
  });
  $('btnPause').addEventListener('click', () => { if (isRacing()) togglePause(); });
  $('btnSound').addEventListener('click', () => {
    save.audio.on = !save.audio.on; AUDIO.init(); AUDIO.setEnabled(save.audio.on); persist(); syncSoundBtn();
  });
  function syncSoundBtn() { $('btnSound').textContent = T(save.audio.on ? 'audio.on' : 'audio.off'); }

  /* ---------- garage ---------- */
  let gTab = 'mods';
  document.querySelectorAll('.gtab').forEach(t => t.addEventListener('click', () => { gTab = t.dataset.tab; AUDIO.fx('click'); renderGarage(true); }));
  document.querySelectorAll('.gscroll').forEach(b => b.addEventListener('click', () => { const d = (b.classList.contains('l') ? -1 : 1); [$('gItems')].concat(Array.from(document.querySelectorAll('#gItems .grow'))).forEach(el => { el.scrollLeft += d * el.clientWidth * 0.8; }); }));
  const kw2cv = kw => Math.round(kw * 1.36);
  function maxTq(c) { return Math.max.apply(null, c.tq.map(p => p[1])); }
  /* Tutto in una schermata: linguette a sinistra, auto al centro, prestazioni a destra, scelte in basso */
  function renderGarage(resetScroll) {
    const id = save.car, base = CAR(id), slot = save.cars[id], built = SIM.buildCar(base, slot.mods);
    $('gCredits').textContent = save.credits.toLocaleString('it-IT');
    $('gPilot').textContent = pilotName(save.pilot);
    $('gAv').style.backgroundImage = 'url(' + PILOTS[save.pilot] + ')';
    $('gName').textContent = carName(base); $('gTag').textContent = carTag(base);
    $('gStatName').textContent = T('g.stats');
    const cfg = Object.assign({}, save.cfg);
    const et1 = SIM.idealRun(built, cfg).et;
    const rows = [
      [T('g.power'), kw2cv(SIM.peakPowerKw(base)), kw2cv(SIM.peakPowerKw(built)), 560, ' CV'],
      [T('g.torque'), Math.round(maxTq(base)), Math.round(maxTq(built)), 800, ' Nm'],
      [T('g.light'), 2200 - Math.round(base.m), 2200 - Math.round(built.m), 1500, '', Math.round(built.m) + ' kg'],
      [T('g.grip'), +(base.mu * base.wf * 100).toFixed(0), +(built.mu * built.wf * 100).toFixed(0), 100, ''],
      [T('g.redline'), base.redline, built.redline, 9500, '', T('g.rpm', built.redline)]
    ];
    let h = rows.map(r => {
      const w0 = Math.min(100, r[1] / r[3] * 100), w1 = Math.min(100, r[2] / r[3] * 100);
      return '<div><div class="gst"><span>' + r[0] + '</span><em>' + (r[5] || r[2] + r[4]) + '</em></div><div class="gbar"><i style="width:' + w1 + '%"></i><i class="base" style="width:' + w0 + '%"></i></div></div>';
    }).join('');
    const best = save.best[id + '_' + cfg.dist];
    h += '<div class="et">' + T('g.ideal', et1.toFixed(2)) + (best ? ' · ' + T('g.record', best.toFixed(2)) : '') + '</div>';
    $('gStats').innerHTML = h;
    drawPreview(built, slot.cosm);
    document.querySelectorAll('.gtab').forEach(t => t.classList.toggle('on', t.dataset.tab === gTab));
    const keep = $('gItems').scrollLeft;
    $('gItems').classList.remove('two'); $('gHint').hidden = true;
    if (gTab === 'mods') renderMods(id); else renderLook(id, gTab);
    $('gItems').scrollLeft = resetScroll ? 0 : keep;
  }
  function renderMods(id) {
    const slot = save.cars[id];
    $('gItems').innerHTML = SIM.MODS.map(m => {
      const l = slot.mods[m.id] | 0, cost = SIM.MOD_COST[l], max = l >= 3;
      const pips = [0, 1, 2].map(i => '<i class="' + (i < l ? 'on' : '') + '"></i>').join('');
      return '<button type="button" class="gi' + (!max && save.credits < cost ? ' poor' : '') + '" data-mod="' + m.id + '"><b>' + T('mod.' + m.id) + '</b><div class="pips">' + pips + '</div><span class="sub">' + T('mod.' + m.id + '.d') + '</span>' +
        (max ? '<small>' + T('g.max') + '</small>' : '<small class="cost">' + cost + '</small>') + '</button>';
    }).join('');
    $('gItems').querySelectorAll('[data-mod]').forEach(b => b.addEventListener('click', () => {
      const mid = b.dataset.mod, l = slot.mods[mid] | 0, cost = SIM.MOD_COST[l];
      if (save.credits < cost || l >= 3) return;
      save.credits -= cost; slot.mods[mid] = l + 1; persist(); AUDIO.fx('buy'); renderGarage();
    }));
  }
  const PAINTS = ['#1f5fd6', '#e8262a', '#ffd21f', '#f4f4f4', '#14111c', '#ff2e7e', '#19c3d1', '#ff8a1f', '#2fbf71', '#8a3cf0', '#7a8494', '#b6ff1f', '#6a1f2a', '#d9c39a'];
  const ACCENTS = ['#ffffff', '#14111c', '#ffd23f', '#ff2e7e', '#19c3d1', '#3cf07a', '#ff6a1f', '#8a3cf0', '#e8262a', '#1f5fd6'];
  const RIMC = ['#c9ccd3', '#2a2830', '#d9a441', '#ffffff', '#ff2e7e', '#b6ff1f', '#1f6fff', '#ff8a1f', '#e8262a', '#8a3cf0'];
  const LIVERIES = [['orig', 'Originale'], ['nessuna', 'Nessuna'], ['strisce', 'Strisce'], ['graffi', 'Graffi'], ['scacchi', 'Scacchi'], ['duetoni', 'Due toni'], ['fiamme', 'Fiamme'], ['numero', 'Numero'], ['za', 'ZA Racing']];
  const SKINS = ['nessuna', 'strisce', 'graffi', 'scacchi', 'duetoni', 'fiamme', 'mimetica'].map(k => [k]);
  const STICKERS = ['numero', 'za', 'zaracing', 'sponsor', 'tricolore', 'scacchi'].map(k => [k]);
  const pick = a => a[(Math.random() * a.length) | 0];
  function randomLook() {
    const st = STICKERS.filter(() => Math.random() < 0.3).map(s => s[0]);
    return { paint: pick(PAINTS), livery: Math.random() < 0.35 ? 'nessuna' : pick(SKINS)[0], accent: pick(ACCENTS), num: pick([3, 11, 21, 44, 77, 88]),
      stickers: st, rimStyle: Math.random() < 0.3 ? 'serie' : pick(CAR_RIMS).id, ride: (Math.random() * 3) | 0 };
  }
  function renderLook(id, tab) {
    const c = save.cars[id].cosm;
    if (!Array.isArray(c.stickers)) c.stickers = [];
    if (c.livery === 'orig') c.livery = 'nessuna';
    const it = (attrs, inner, on, extra) => '<button type="button" class="gi' + (extra ? ' ' + extra : '') + (on ? ' on' : '') + '" ' + attrs + '>' + inner + '</button>';
    const dot = col => '<i class="dot" style="background:' + col + '"></i>';
    const grp = t => '<div class="ggroup">' + t + '</div>';
    let h = '';
    if (tab === 'paint') {
      /* due righe di colori, così si vedono tutti senza scorrere */
      const all = [it('data-k="paint" data-v="orig"', dot('#f4f4f4'), c.paint === 'orig', 'sw')].concat(PAINTS.map(p => it('data-k="paint" data-v="' + p + '"', dot(p), c.paint === p, 'sw')));
      const half = Math.ceil(all.length / 2);
      h = '<div class="grow">' + all.slice(0, half).join('') + '</div><div class="grow">' + all.slice(half).join('') + '</div>';
    } else if (tab === 'skin') {
      /* due righe: sopra la skin, sotto il suo colore, sempre visibili */
      h = '<div class="grow"><button type="button" class="gi narrow clean" data-clean="skin"><b>🧽 ' + T('g.clean') + '</b></button>' + SKINS.filter(o => o[0] !== 'nessuna').map(o => it('data-k="livery" data-v="' + o[0] + '"', '<b>' + T('skin.' + o[0]) + '</b>', c.livery === o[0], 'narrow')).join('') +
        '</div>' +
        '<div class="grow">' + '<div class="glabel">' + T('g.rotate') + '</div>' + [['-10', '⟲'], ['10', '⟳']].map(r => '<button type="button" class="gi sw' + (c.livery === 'nessuna' ? ' off' : '') + '" data-skr="' + r[0] + '"><b style="font-size:1.5em">' + r[1] + '</b></button>').join('') +
        '<button type="button" class="gi narrow' + (c.livery === 'nessuna' ? ' off' : '') + '" data-skr="0"><b>' + T('g.straight') + '</b><small>' + (c.skinRot || 0) + '°</small></button>' +
        '<div class="glabel">' + T('g.skinColor') + '</div>' + ACCENTS.map(p => it('data-k="accent" data-v="' + p + '"', dot(p), c.accent === p, 'sw' + (c.livery === 'nessuna' ? ' off' : ''))).join('') + '</div>';
    } else if (tab === 'decal') {
      if (stSel && !c.stickers.includes(stSel)) stSel = null;
      if (!stSel && c.stickers.length) stSel = c.stickers[c.stickers.length - 1];
      const sk = stSel ? ((c.stScale && c.stScale[stSel]) || 1) : 1;
      h = '<div class="grow"><button type="button" class="gi narrow clean" data-clean="decal"' + (c.stickers.length ? '' : ' disabled') + '><b>🧽 ' + T('g.cleanAll') + '</b></button>' + STICKERS.map(o => it('data-st="' + o[0] + '"', '<b>' + T('st.' + o[0]) + '</b><small>' + T(c.stickers.includes(o[0]) ? 'g.on' : 'g.put') + '</small>', c.stickers.includes(o[0]), 'narrow')).join('') + '</div>' +
        '<div class="grow">' +
        '<div class="glabel">' + T('g.size') + '</div>' +
        '<button type="button" class="gi sw' + (stSel ? '' : ' off') + '" data-sz="-1"><b style="font-size:1.6em">−</b></button>' +
        '<button type="button" class="gi sw' + (stSel ? '' : ' off') + '" data-sz="1"><b style="font-size:1.6em">+</b></button>' +
        '<button type="button" class="gi sw' + (stSel ? '' : ' off') + '" data-rt="-15"><b style="font-size:1.5em">⟲</b></button>' +
        '<button type="button" class="gi sw' + (stSel ? '' : ' off') + '" data-rt="15"><b style="font-size:1.5em">⟳</b></button>' +
        '<button type="button" class="gi narrow' + (stSel ? '' : ' off') + '" data-sz="0"><b>' + (stSel ? T('st.' + stSel) : '–') + '</b><small>' + Math.round(sk * 100) + '% · ' + ((c.stRot && c.stRot[stSel]) || 0) + '°</small></button>' +
        '<button type="button" class="gi narrow reset" data-reset="1"><b>' + T('g.resetPos') + '</b></button>' +
        '<div class="glabel">' + T('g.number') + '</div>' + [1, 7, 13, 27, 60, 99].map(n => it('data-k="num" data-v="' + n + '"', '<b style="font-size:1.4em">' + n + '</b>', c.num === n, 'sw' + (c.stickers.includes('numero') ? '' : ' off'))).join('') + '</div>';
    } else if (tab === 'rims') {
      const rims = [{ id: 'serie', name: T('rim.serie'), inch: 0, price: 0, img: RENDER.RIMS_SERIE(id) }].concat(CAR_RIMS);
      h = rims.map(r => {
        const own = r.id === 'serie' || save.rims.includes(r.id), on = (c.rimStyle || 'serie') === r.id;
        return it('data-rim="' + r.id + '"', '<img alt="" src="' + r.img + '"><b>' + (r.id === 'serie' ? r.name : T('rim.' + r.id)) + (r.inch ? ' · ' + r.inch + '"' : '') + '</b>' +
          (on ? '<small>' + T('g.fitted') + '</small>' : own ? '<small>' + T('g.owned') + '</small>' : '<small class="cost">' + r.price + '</small>'), on, !own && save.credits < r.price ? 'poor' : '');
      }).join('');
    } else if (tab === 'ride') {
      h = [[0, T('g.stock'), T('g.ride0')], [1, T('g.ride1n'), T('g.ride1')], [2, T('g.ride2n'), T('g.ride2')]].map(o =>
        it('data-k="ride" data-v="' + o[0] + '"', '<b style="font-size:1.25em">' + o[1] + '</b><span class="sub">' + o[2] + '</span>', (c.ride | 0) === o[0])).join('');
    }
    $('gItems').innerHTML = h;
    $('gItems').classList.toggle('two', tab === 'skin' || tab === 'decal' || tab === 'paint');
    $('gHint').hidden = tab !== 'decal' || !c.stickers.length;
    $('gItems').querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', () => { c.stPos = {}; c.stScale = {}; c.stRot = {}; persist(); AUDIO.fx('click'); renderGarage(); }));
    $('gItems').querySelectorAll('[data-clean]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.clean === 'skin') { c.livery = 'nessuna'; c.skinRot = 0; } else { c.stickers = []; c.stPos = {}; c.stScale = {}; c.stRot = {}; stSel = null; }
      persist(); AUDIO.fx('click'); renderGarage();
    }));
    $('gItems').querySelectorAll('[data-rt]').forEach(b => b.addEventListener('click', () => {
      if (!stSel) return; c.stRot = c.stRot || {};
      let r = (c.stRot[stSel] || 0) + +b.dataset.rt; r = ((r + 540) % 360) - 180; c.stRot[stSel] = r;
      persist(); AUDIO.fx('click'); renderGarage();
    }));
    $('gItems').querySelectorAll('[data-skr]').forEach(b => b.addEventListener('click', () => {
      const d = +b.dataset.skr; c.skinRot = d === 0 ? 0 : Math.max(-45, Math.min(45, (c.skinRot || 0) + d));
      persist(); AUDIO.fx('click'); renderGarage();
    }));
    $('gItems').querySelectorAll('[data-sz]').forEach(b => b.addEventListener('click', () => {
      if (!stSel) return; c.stScale = c.stScale || {};
      const d = +b.dataset.sz, k = c.stScale[stSel] || 1;
      c.stScale[stSel] = d === 0 ? 1 : Math.max(SCALE_MIN, Math.min(SCALE_MAX, +(k + d * 0.1).toFixed(2)));
      if (d === 0 && c.stRot) c.stRot[stSel] = 0;
      persist(); AUDIO.fx('click'); renderGarage();
    }));
    $('gItems').querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k; let v = b.dataset.v;
      if (k === 'num' || k === 'ride') v = +v;
      c[k] = v; persist(); AUDIO.fx('click'); renderGarage();
    }));
    $('gItems').querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => {
      const s = b.dataset.st, i = c.stickers.indexOf(s);
      if (i >= 0) { c.stickers.splice(i, 1); if (stSel === s) stSel = null; if (c.stPos) delete c.stPos[s]; if (c.stScale) delete c.stScale[s]; if (c.stRot) delete c.stRot[s]; } else { c.stickers.push(s); stSel = s; }
      persist(); AUDIO.fx('click'); renderGarage();
    }));
    $('gItems').querySelectorAll('[data-rim]').forEach(b => b.addEventListener('click', () => {
      const r = b.dataset.rim, rim = CAR_RIMS.find(x => x.id === r);
      if (rim && !save.rims.includes(r)) {
        if (save.credits < rim.price) return;
        save.credits -= rim.price; save.rims.push(r); AUDIO.fx('buy');
      } else AUDIO.fx('click');
      c.rimStyle = r; persist(); renderGarage();
    }));
  }
  const pv = $('prev'), pctx = pv.getContext('2d');
  let pvSpin = 0;
  function drawPreview(car, cos) {
    const w = pv.width, h = pv.height, I = RENDER.INK, rr = RENDER.rrect, ink = RENDER.inked, c = pctx;
    c.save(); c.lineJoin = 'round';
    /* officina scura: muro, luci, scaffale di gomme, pannello attrezzi, ponte sollevatore */
    const fy = h * 0.72;
    let g = c.createLinearGradient(0, 0, 0, fy); g.addColorStop(0, '#3a4462'); g.addColorStop(1, '#283050'); c.fillStyle = g; c.fillRect(0, 0, w, fy);
    c.strokeStyle = 'rgba(13,10,18,0.45)'; c.lineWidth = 3; [fy * 0.38, fy * 0.7].forEach(y => { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); });
    [0.18, 0.5, 0.82].forEach(f => { rr(c, w * f - 90, 14, 180, 13, 6); ink(c, '#dff1ff', 3.5); });
    const lg = c.createRadialGradient(w / 2, fy * 0.6, 20, w / 2, fy * 0.6, w * 0.55); lg.addColorStop(0, 'rgba(190,220,255,0.28)'); lg.addColorStop(1, 'rgba(190,220,255,0)'); c.fillStyle = lg; c.fillRect(0, 0, w, h);
    /* scaffale con gomme a sinistra */
    c.fillStyle = '#7a8090'; c.fillRect(24, 50, 9, fy - 50); c.fillRect(214, 50, 9, fy - 50);
    [fy * 0.36, fy * 0.68].forEach(y => { c.fillStyle = '#9aa0b0'; c.fillRect(24, y, 199, 9); c.strokeStyle = I; c.lineWidth = 3; c.strokeRect(24, y, 199, 9); });
    [[50, fy * 0.36], [50, fy * 0.68], [50, fy]].forEach(([y0, y1]) => { for (let k = 0; k < 4; k++) { rr(c, 38 + k * 44, y0 + 6, 38, y1 - y0 - 8, 11); ink(c, '#23232b', 3); } });
    /* pannello attrezzi a destra */
    rr(c, w - 230, 60, 200, 120, 6); ink(c, '#5a6078', 3.5);
    c.strokeStyle = '#c9ced8'; c.lineWidth = 6; c.lineCap = 'round'; [[w - 200, 84, 150], [w - 165, 80, 160], [w - 130, 88, 140]].forEach(([x, y0, y1]) => { c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); });
    c.beginPath(); c.arc(w - 80, 112, 16, 0, Math.PI * 2); c.stroke();
    rr(c, w - 210, fy - 70, 170, 70, 5); ink(c, '#c8323c', 3.5); c.fillStyle = I; c.fillRect(w - 210, fy - 46, 170, 3); c.fillRect(w - 210, fy - 22, 170, 3);
    /* pavimento e ponte */
    g = c.createLinearGradient(0, fy, 0, h); g.addColorStop(0, '#3b4258'); g.addColorStop(1, '#1c2030'); c.fillStyle = g; c.fillRect(0, fy, w, h - fy); c.fillStyle = I; c.fillRect(0, fy, w, 4);
    const lift = h * 0.9;
    c.beginPath(); c.moveTo(w * 0.12, lift + 26); c.lineTo(w * 0.88, lift + 26); c.lineTo(w * 0.84, lift - 4); c.lineTo(w * 0.16, lift - 4); c.closePath(); ink(c, '#8a90a0', 4);
    c.beginPath(); c.rect(w * 0.12, lift + 26, w * 0.76, 12); ink(c, '#5a6070', 4);
    c.restore();
    RENDER.wash(c, w, h, 0.35);
    const S = RENDER.SHAPES[car.id], sc = Math.min((w * 0.74) / S.L, (h * 0.62) / S.top);
    pvO = { x: w / 2 + S.L * sc / 2, y: lift - 2, sc: sc, version: cos.version, look: cos, wheelAng: 0, blur: 0 }; pvCar = car;
    RENDER.drawCar(pctx, car.id, pvO);
    /* nella linguetta Adesivi un contorno tratteggiato mostra cosa si può trascinare */
    if (gTab === 'decal') {
      const f = RENDER.carFrame(car.id, pvO);
      RENDER.stickerBoxes(car.id, cos.version, cos).forEach(bx => {
        const sel = bx.id === stSel, Wd = bx.w * f.k + 8, Hd = bx.h * f.k + 8, cx = f.x0 + (bx.x + bx.w / 2) * f.k, cy = f.y0 + (bx.y + bx.h / 2) * f.k;
        c.save(); c.translate(cx, cy); c.rotate(bx.rot * Math.PI / 180);
        c.setLineDash([6, 5]); c.lineWidth = sel ? 3.5 : 2.5; c.strokeStyle = sel ? '#ffd84a' : 'rgba(255,255,255,0.75)';
        c.strokeRect(-Wd / 2, -Hd / 2, Wd, Hd); c.setLineDash([]);
        if (sel) {
          /* angolo giallo: grandezza · cerchio azzurro: rotazione */
          c.beginPath(); c.arc(Wd / 2, Hd / 2, 13, 0, Math.PI * 2); c.fillStyle = '#ffd84a'; c.fill(); c.lineWidth = 3; c.strokeStyle = RENDER.INK; c.stroke();
          c.beginPath(); c.moveTo(Wd / 2 - 6, Hd / 2 - 6); c.lineTo(Wd / 2 + 6, Hd / 2 + 6); c.stroke();
          c.beginPath(); c.arc(Wd / 2, -Hd / 2, 13, 0, Math.PI * 2); c.fillStyle = '#5ac8ff'; c.fill(); c.stroke();
          c.beginPath(); c.arc(Wd / 2, -Hd / 2, 6, -2.4, 1.6); c.stroke();
        }
        c.restore();
      });
    }
  }
  /* trascinamento degli adesivi sull'anteprima */
  let pvO = null, pvCar = null, drag = null, stSel = null;
  const SCALE_MIN = 0.5, SCALE_MAX = 2.2;
  function pvPoint(e) { const r = pv.getBoundingClientRect(); return [(e.clientX - r.left) * pv.width / r.width, (e.clientY - r.top) * pv.height / r.height]; }
  pv.addEventListener('pointerdown', e => {
    if (!pvO || !pvCar) return;
    const cos = save.cars[pvCar.id].cosm, f = RENDER.carFrame(pvCar.id, pvO), [px, py] = pvPoint(e);
    const sx = (px - f.x0) / f.k, sy = (py - f.y0) / f.k, pad = 12 / f.k;
    const boxes = RENDER.stickerBoxes(pvCar.id, cos.version, cos);
    cos.stPos = cos.stPos || {}; cos.stScale = cos.stScale || {};
    /* prima la maniglia dell'adesivo scelto: trascinandola cambia la grandezza */
    cos.stRot = cos.stRot || {};
    const sb = gTab === 'decal' && boxes.find(b => b.id === stSel);
    if (sb) {
      const cx = sb.x + sb.w / 2, cy = sb.y + sb.h / 2, a = sb.rot * Math.PI / 180, hw = sb.w / 2 + 4 / f.k, hh = sb.h / 2 + 4 / f.k;
      const corner = (dx, dy) => [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
      const [sxh, syh] = corner(hw, hh), [rxh, ryh] = corner(hw, -hh), near = 22 / f.k;
      if (Math.hypot(sx - sxh, sy - syh) < near) {
        drag = { id: sb.id, scale: true, cx: cx, cy: cy, d0: Math.max(4, Math.hypot(sx - cx, sy - cy)), k0: cos.stScale[sb.id] || 1 };
        pv.setPointerCapture(e.pointerId); e.preventDefault(); return;
      }
      if (Math.hypot(sx - rxh, sy - ryh) < near) {
        drag = { id: sb.id, rotate: true, cx: cx, cy: cy, a0: Math.atan2(sy - cy, sx - cx), r0: cos.stRot[sb.id] || 0 };
        pv.setPointerCapture(e.pointerId); e.preventDefault(); return;
      }
    }
    const hit = boxes.reverse().find(b => sx >= b.x - pad && sx <= b.x + b.w + pad && sy >= b.y - pad && sy <= b.y + b.h + pad);
    if (!hit) { if (stSel) { stSel = null; renderGarage(); } return; }
    stSel = hit.id;
    if (gTab !== 'decal') gTab = 'decal';
    renderGarage();
    const o = cos.stPos[hit.id] || [0, 0];
    drag = { id: hit.id, sx: sx, sy: sy, ox: o[0], oy: o[1], k: f.k };
    pv.setPointerCapture(e.pointerId); e.preventDefault();
    drawPreview(pvCar, cos);
  });
  pv.addEventListener('pointermove', e => {
    if (!drag) return;
    const cos = save.cars[pvCar.id].cosm, f = RENDER.carFrame(pvCar.id, pvO), [px, py] = pvPoint(e);
    const sx = (px - f.x0) / f.k, sy = (py - f.y0) / f.k;
    if (drag.rotate) { let r = drag.r0 + (Math.atan2(sy - drag.cy, sx - drag.cx) - drag.a0) * 180 / Math.PI; r = ((r + 540) % 360) - 180; if (Math.abs(r) < 4) r = 0; cos.stRot[drag.id] = Math.round(r); }
    else if (drag.scale) cos.stScale[drag.id] = Math.max(SCALE_MIN, Math.min(SCALE_MAX, +(drag.k0 * Math.hypot(sx - drag.cx, sy - drag.cy) / drag.d0).toFixed(2)));
    else cos.stPos[drag.id] = [Math.round(drag.ox + sx - drag.sx), Math.round(drag.oy + sy - drag.sy)];
    drawPreview(pvCar, cos);
  });
  const endDrag = () => { if (!drag) return; drag = null; persist(); renderGarage(); };
  pv.addEventListener('wheel', e => {
    if (gTab !== 'decal' || !stSel || !pvCar) return; e.preventDefault();
    const cos = save.cars[pvCar.id].cosm; cos.stScale = cos.stScale || {};
    cos.stScale[stSel] = Math.max(SCALE_MIN, Math.min(SCALE_MAX, +((cos.stScale[stSel] || 1) * (e.deltaY < 0 ? 1.08 : 0.926)).toFixed(2)));
    persist(); drawPreview(pvCar, cos);
  }, { passive: false });
  pv.addEventListener('pointerup', endDrag); pv.addEventListener('pointercancel', endDrag);
  function stepCar(d) {
    const L = CARS_ON(), i = L.findIndex(c => c.id === save.car), n = L.length;
    save.car = L[(i + d + n) % n].id; persist(); AUDIO.init(); AUDIO.fx('click'); renderGarage();
  }
  $('carPrev').addEventListener('click', () => stepCar(-1));
  $('carNext').addEventListener('click', () => stepCar(1));

  /* ---------- regole ---------- */
  const SLIDERS = [
    ['band', 'r.band', 'r.band.d', 400, 1400, 20, 'rpm'],
    ['boost', 'r.boost', 'r.boost.d', 0, 15, 1, ' %'],
    ['damage', 'r.damage', 'r.damage.d', 0, 40, 1, ' %'],
    ['cpu', 'r.cpu', 'r.cpu.d', 70, 115, 1, ' %']
  ];
  function unit(s, v) { return s[6] === 'rpm' ? T('g.rpm', v) : v + s[6]; }
  function renderRules() {
    const c = save.cfg;
    $('rules').innerHTML = SLIDERS.map(s => '<div class="slider"><label for="s_' + s[0] + '">' + T(s[1]) + '</label><output id="o_' + s[0] + '">' + unit(s, c[s[0]]) + '</output><input id="s_' + s[0] + '" type="range" min="' + s[3] + '" max="' + s[4] + '" step="' + s[5] + '" value="' + c[s[0]] + '"><small>' + T(s[2]) + '</small></div>').join('') +
      '<div class="slider"><label>' + T('r.dist') + '</label><output>' + c.dist + ' m</output><div class="seg" style="grid-column:1/-1;justify-self:start" id="distSeg">' + [[201, T('r.d201')], [402, T('r.d402')], [804, T('r.d804')]].map(d => '<button type="button" data-d="' + d[0] + '" class="' + (c.dist === d[0] ? 'on' : '') + '">' + d[1] + '</button>').join('') + '</div><small>' + T('r.dist.d') + '</small></div>';
    SLIDERS.forEach(s => $('s_' + s[0]).addEventListener('input', e => { c[s[0]] = +e.target.value; $('o_' + s[0]).textContent = unit(s, c[s[0]]); persist(); markPreset(); }));
    $('distSeg').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { c.dist = +b.dataset.d; persist(); renderRules(); }));
    markPreset();
    $('light').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.l === save.light));
    $('audioOn').querySelectorAll('button').forEach(b => b.classList.toggle('on', (b.dataset.a === '1') === save.audio.on));
    $('vol').value = Math.round(save.audio.vol * 100);
  }
  function markPreset() {
    const c = save.cfg;
    $('presets').querySelectorAll('button').forEach(b => { const p = PRESETS[b.dataset.p]; b.classList.toggle('on', ['band', 'boost', 'damage', 'cpu'].every(k => p[k] === c[k])); });
  }
  $('presets').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; const d = save.cfg.dist; save.cfg = Object.assign({}, PRESETS[b.dataset.p], { dist: d }); persist(); renderRules(); });
  $('light').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (!b) return; save.light = b.dataset.l; scene(save.track, save.light); persist(); renderRules(); });
  $('audioOn').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; save.audio.on = b.dataset.a === '1'; AUDIO.init(); AUDIO.setEnabled(save.audio.on); persist(); syncSoundBtn(); renderRules(); });
  $('vol').addEventListener('input', e => { save.audio.vol = e.target.value / 100; AUDIO.init(); AUDIO.setVolume(save.audio.vol); persist(); });

  /* ---------- carriera ---------- */
  function renderCareer() {
    $('cCredits').textContent = T('menu.credits', save.credits);
    $('tappe').innerHTML = TAPPE.map((t, i) => {
      const n = i + 1, c = careerCfg(n), open = n <= save.career.unlocked, won = save.career.won[n], best = save.career.best[n];
      return '<button class="tappa" type="button" data-act="tappa" data-t="' + n + '" ' + (open ? '' : 'disabled') + '>' +
        '<span class="st">' + (won ? '<span class="chip win">' + T('c.won') + '</span>' : open ? '<span class="chip">' + T('c.open') + '</span>' : '<span class="chip">' + T('c.locked') + '</span>') + '</span>' +
        '<span class="n">' + n + '</span><span class="t">' + t.name + '</span>' +
        '<span class="d">' + T('c.info', c.dist, c.band, c.damage, c.cpu) + (t.night ? T('c.night') : '') + (t.track === 'garda' ? ' · ' + T('track.garda') : '') + '</span>' +
        '<span class="d">' + (best ? T('c.best', best.toFixed(3)) : T('c.prize', reward(1, n))) + '</span></button>';
    }).join('');
  }
  function reward(pos, tappa) { return Math.round([400, 250, 150, 80][pos - 1] * (1 + 0.15 * ((tappa || 1) - 1))); }


  /* ---------- piloti ---------- */
  let pPage = null;
  $('pPrev').addEventListener('click', () => { pPage--; AUDIO.fx('click'); renderPilots(); });
  $('pNext').addEventListener('click', () => { pPage++; AUDIO.fx('click'); renderPilots(); });
  function renderPilots() {
    /* 12 piloti per pagina (due righe), si cambia pagina con i pulsanti: niente scorrimento */
    const PER = 12, pages = Math.ceil(PILOTS.length / PER);
    if (pPage == null) pPage = Math.floor(save.pilot / PER);
    pPage = Math.max(0, Math.min(pages - 1, pPage));
    $('pPager').hidden = pages < 2; $('pPage').textContent = (pPage + 1) + ' / ' + pages;
    $('pGrid').innerHTML = PILOTS.map((src, i) => i < pPage * PER || i >= (pPage + 1) * PER ? '' : '<button class="pc' + (i === save.pilot ? ' on' : '') + '" data-p="' + i + '" type="button"><img alt="" src="' + src + '"' + (PILOT_ANIM[i] ? ' data-anim="' + i + '"' : '') + '><b></b></button>').join('');
    $('pGrid').querySelectorAll('.pc').forEach(el => { el.querySelector('b').textContent = pilotName(+el.dataset.p); });
    $('pBig').src = PILOTS[save.pilot];
    if (PILOT_ANIM[save.pilot]) $('pBig').dataset.anim = save.pilot; else delete $('pBig').dataset.anim;
    $('pName').value = pilotName(save.pilot);
  }
  $('pGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    save.pilot = +b.dataset.p; persist(); AUDIO.fx('click'); renderPilots();
    if (PILOT_ANIM[save.pilot]) pilotPlay = { i: save.pilot, t0: performance.now() };
  });
  $('pName').addEventListener('input', () => {
    const v = $('pName').value.replace(/\s+/g, ' ').slice(0, 14);
    save.pilotNames[save.pilot] = v.trim(); persist();
    const el = $('pGrid').querySelector('.pc.on b'); if (el) el.textContent = pilotName(save.pilot);
  });
  $('pName').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('pName').blur(); });

  /* animazione dei piloti animati in tutte le immagini che la chiedono */
  /* il pilota animato sta fermo sull'ultimo fotogramma e si muove una volta sola quando lo selezioni */
  let pilotPlay = null; const PILOT_MS = 230;
  setInterval(() => {
    if (!pilotPlay) return;
    const p = PILOT_ANIM[pilotPlay.i], f = Math.floor((performance.now() - pilotPlay.t0) / PILOT_MS);
    const done = f >= p.frames.length - 1, src = p.frames[Math.min(f, p.frames.length - 1)];
    document.querySelectorAll('img[data-anim="' + pilotPlay.i + '"]').forEach(im => { if (im.getAttribute('src') !== src) im.src = src; });
    if (done) pilotPlay = null;
  }, 50);

  /* ---------- risultati ---------- */
  function showResults() {
    G.phase = 'results';
    const p = G.player;
    const fin = G.racers.filter(r => r.finished).sort((a, b) => a.finishTime - b.finishTime), dnf = G.racers.filter(r => !r.finished);
    const order = fin.concat(dnf), pos = p.finished ? order.indexOf(p) + 1 : 0;
    const perf = p.shifts.filter(s => s.q === 'perfetta').length;
    const earn = pos ? reward(pos, G.mode === 'career' ? G.tappa : 1) + perf * 20 : 0;
    if (G.mode === 'online') { ON.inRace = false; onTrack(); }
    save.credits += earn;
    let record = false;
    if (p.finished) {
      const k = save.car + '_' + G.dist;
      if (!save.best[k] || p.finishTime < save.best[k]) { save.best[k] = p.finishTime; record = true; }
      if (G.mode === 'career') {
        const b = save.career.best[G.tappa];
        if (!b || p.finishTime < b) save.career.best[G.tappa] = p.finishTime;
        if (pos === 1) { save.career.won[G.tappa] = true; save.career.unlocked = Math.max(save.career.unlocked, Math.min(6, G.tappa + 1)); }
      }
    }
    persist();
    $('rKicker').textContent = G.mode === 'online' ? T('on.res', G.dist) : G.mode === 'career' ? T('res.career', G.tappa, T('tappa.' + G.tappa)) : T('res.single', save.track === 'garda' ? T('track.garda') + ' · ' : '', G.dist);
    $('rAv').src = PILOTS[save.pilot];
    if (PILOT_ANIM[save.pilot]) $('rAv').dataset.anim = save.pilot; else delete $('rAv').dataset.anim;
    $('rTitle').textContent = !pos ? T('res.blown') : T('res.pos', pos, LANG === 'fr' ? (pos === 1 ? 're' : 'e') : ['st', 'nd', 'rd', 'th'][Math.min(3, pos - 1)]);
    $('rTitle').style.color = pos === 1 ? 'var(--go)' : !pos ? 'var(--stop)' : 'var(--paper)';
    const winT = fin.length ? fin[0].finishTime : 0;
    $('rSub').textContent = !pos ? T('res.blownSub') :
      pos === 1 ? (fin[1] ? T('res.ahead', (fin[1].finishTime - p.finishTime).toFixed(3)) : '') + (record ? T('res.record') : '') :
        T('res.behind', (p.finishTime - winT).toFixed(3)) + (record ? T('res.record') : '');
    $('rTable').innerHTML = order.map((r, i) => '<tr class="' + (r === p ? 'me' : '') + '"><td class="p">' + (r.finished ? i + 1 : '–') + '</td><td><i class="av" style="--ring:' + r.paint + ';background-image:url(' + PILOTS[r.pilot] + ')"></i>' + r.name + '</td><td class="muted">' + carName(r.car) + '</td><td class="r">' + (r.finished ? r.finishTime.toFixed(3) + ' s' : T('res.dnf')) + '</td><td class="r">' + (r.finished ? Math.round(r.trap * 3.6) + ' km/h' : '') + '</td></tr>').join('');
    const best = p.shifts.slice().sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
    const QD = { perfetta: '#6fe08a', buona: '#f2d36b', anticipata: '#7fc4f0', tardiva: '#ffa25a', fuorigiri: '#ff6a55', lenta: '#7fc4f0', eccessiva: '#ffa25a' };
    const chips = p.shifts.map(s => '<span class="chip" style="color:' + QD[s.q] + '">' + s.gear + '→' + (s.gear + 1) + ' ' + QL(s.q).toLowerCase() + '</span>').join('');
    $('rStats').innerHTML =
      '<dt>' + T('res.launch') + '</dt><dd><span style="font-weight:700;color:' + QD[p.launch.q] + '">' + QL(p.launch.q).toLowerCase() + '</span> · ' + T('res.launchV', p.launch.rpm, (p.launch.delta >= 0 ? '+' : '') + p.launch.delta) + '</dd>' +
      '<dt>' + T('res.60ft') + '</dt><dd>' + (p.t60 ? p.t60.toFixed(3) + ' s' : '–') + ' <span class="muted">· ' + T('res.60ftD') + '</span></dd>' +
      '<dt>' + T('res.shifts') + '</dt><dd><div class="shiftlist">' + (chips || '<span class="muted">' + T('res.none') + '</span>') + '</div></dd>' +
      '<dt>' + T('res.best') + '</dt><dd>' + (best ? T('res.bestV', best.gear, best.gear + 1, (best.delta >= 0 ? '+' : '') + best.delta) : '–') + '</dd>' +
      '<dt>' + T('res.engine') + '</dt><dd>' + T('res.health', Math.round(p.health)) + '</dd>' +
      '<dt>' + T('res.credits') + '</dt><dd><span class="credits">+' + earn + '</span> <span class="muted">' + (perf ? T('res.perf', perf) : '') + T('res.total', save.credits) + '</span></dd>';
    let act = G.mode === 'online' ? '<button class="btn primary" data-act="onBack" type="button">' + T('on.back') + '</button>' : '<button class="btn primary" data-act="rematch" type="button">' + T('res.rematch') + '</button>';
    if (G.mode === 'career' && pos === 1 && G.tappa < 6) act = '<button class="btn primary" data-act="next" type="button">' + T('res.next', G.tappa + 1) + '</button><button class="btn" data-act="rematch" type="button">' + T('res.rematch2') + '</button>';
    if (G.mode === 'career' && pos === 1 && G.tappa === 6) $('rSub').textContent += T('res.done');
    if (G.mode !== 'online') act += '<button class="btn" data-act="garage" type="button">' + T('menu.garage') + '</button>' + (G.mode === 'career' ? '<button class="btn" data-act="career" type="button">' + T('res.rounds') + '</button>' : '') + '<button class="btn ghost" data-act="menu" type="button">' + T('common.menu') + '</button>';
    $('rActions').innerHTML = act;
    showScreen('scrResults');
  }

  /* ---------- lingua ---------- */
  const FLAG = {
    it: '<rect width="20" height="40" fill="#009246"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ce2b37"/>',
    en: '<rect width="60" height="40" fill="#012169"/><path d="M0,0L60,40M60,0L0,40" stroke="#fff" stroke-width="8"/><path d="M0,0L60,40M60,0L0,40" stroke="#c8102e" stroke-width="3"/><path d="M30,0V40M0,20H60" stroke="#fff" stroke-width="12"/><path d="M30,0V40M0,20H60" stroke="#c8102e" stroke-width="7"/>',
    de: '<rect width="60" height="14" fill="#111"/><rect y="13" width="60" height="14" fill="#dd0000"/><rect y="26.5" width="60" height="13.5" fill="#ffce00"/>',
    es: '<rect width="60" height="40" fill="#aa151b"/><rect y="10" width="60" height="20" fill="#f1bf00"/>',
    fr: '<rect width="20" height="40" fill="#002395"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ed2939"/>'
  };
  const flag = c => '<svg class="flag" viewBox="0 0 60 40" aria-hidden="true">' + FLAG[c] + '</svg>';
  function renderLangSeg() {
    const cur = LANGS.find(l => l[0] === LANG) || LANGS[0];
    $('langSeg').innerHTML = '<button type="button" class="lcur" aria-haspopup="listbox" title="' + cur[1] + '">' + flag(cur[0]) + '<b>' + cur[0].toUpperCase() + '</b><i>▾</i></button>' +
      '<div class="llist" role="listbox">' + LANGS.map(l => '<button type="button" role="option" data-lang="' + l[0] + '" class="' + (l[0] === LANG ? 'on' : '') + '">' + flag(l[0]) + '<span>' + l[1] + '</span></button>').join('') + '</div>';
  }
  $('langSeg').addEventListener('click', e => {
    if (e.target.closest('.lcur')) { $('langSeg').classList.toggle('open'); AUDIO.fx('click'); return; }
    const b = e.target.closest('[data-lang]'); if (!b) return;
    $('langSeg').classList.remove('open');
    save.lang = b.dataset.lang; setLang(save.lang); persist(); AUDIO.fx('click');
    applyLangDom(); renderLangSeg(); syncSoundBtn(); goMenu();
  });
  document.addEventListener('pointerdown', e => { if (!e.target.closest('#langSeg')) $('langSeg').classList.remove('open'); });
  applyLangDom(); renderLangSeg();

  /* ---------- immagini dei pulsanti ---------- */
  $('zaLogo').src = ZA_LOGO;
  [['imgGas', 'gas'], ['imgShift', 'shift'], ['imgPause', 'pause']].forEach(([el, k]) => { $(el).src = ASSETS[k]; });

  /* ---------- avvio ---------- */
  function paperTex() {
    try { document.documentElement.style.setProperty('--tex', 'url(' + RENDER.noiseTex().toDataURL('image/png') + ')'); } catch (e) { }
  }
  function boot() {
    paperTex(); fitCanvas();
    scene(save.track, save.light);
    syncSoundBtn(); goMenu();
    const rm = (location.search.match(/[?&]room=([A-Za-z]{5})/) || [])[1];
    if (rm) { onOpenScreen(); onOpenRoom(rm.toUpperCase(), 0, true); }
    requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
  }
  let booted = false;
  const bootOnce = () => { if (booted) return; booted = true; RENDER.ready.then(boot); };
  if (document.fonts && document.fonts.load) {
    Promise.all(['italic 900', 'italic 800', '900', '800', '700'].map(w => document.fonts.load(w + ' 16px "Barlow Condensed"'))).catch(() => { }).then(bootOnce);
    setTimeout(bootOnce, 2500);
  } else bootOnce();
  window.__ZSR = { G, SIM, save };
})();
