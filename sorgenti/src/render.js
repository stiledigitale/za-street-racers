/* ============================================================
   ZA STREET RACERS · RENDER (stile cartoon)
   Contorni neri spessi, colori piatti, auto "chibi" widebody con
   ruote grandi e separate. Vista laterale su strati: cielo, skyline
   al 18%, case al 35%, strada al 100%.
   ============================================================ */
const RENDER = (function () {
  const W = 1280, H = 720, PPM = 34;
  const BASE = 404, ROAD_TOP = 440;
  /* corsie in prospettiva: più strette lontano, più larghe vicino */
  /* telecamera bassa: strada più schiacciata, corsie che crescono molto verso chi guarda */
  const LH = [31, 38, 46, 55], LB = [ROAD_TOP];
  LH.forEach((h, i) => LB.push(LB[i] + h));
  const ROAD_BOT = LB[4];
  const laneY = i => LB[i] + LH[i] * 0.66;
  const laneS = i => 0.72 + 0.1 * i;
  const CK = 1.5; /* le auto si disegnano più grandi della scala della pista, come nei drag arcade */
  const FD = '"Barlow Condensed", "Arial Narrow", sans-serif';
  const INK = '#14111c', TRIM = '#25232c';
  const fd = (w, px) => 'italic ' + w + ' ' + Math.round(px) + 'px ' + FD;
  const TAU = Math.PI * 2;

  /* toni da acquerello, come le auto: terracotta, ocra, crema, verde salvia, rosa antico */
  const BLD = ['#d9825b', '#e8c27a', '#efe2c8', '#7fb3b0', '#d99aa0', '#b8574a', '#a3bd8e', '#c4a3c9', '#e3cf9e', '#8fa9c9'];
  const AWN = ['#c8323c', '#2b8f9a', '#e0a020', '#5b4aa8', '#3c8f50', '#d9562f'];
  const PAL = {
    tramonto: {
      sky: ['#ffd15c', '#ff944a', '#ff5a7a', '#e23f7e'], sun: true, sunC: ['#fff7c8', '#ffd04f'], sunX: 880, sunY: 300, sunR: 150,
      clouds: 'streak', cloud: '#ffb56e', cloudDark: '#ff7d6a', far: ['#c8306e', '#b8295f', '#d23d7a'], farWin: null, farPalm: '#8a1c50',
      haze: 'rgba(255,110,140,0.32)', bldShade: 0, glass: '#3a74d6', glassLit: null, frame: '#fff6e8',
      walk: '#e9c9b0', barrier: ['#ece5d6', '#cf4a5e'], road: '#4a4352', speck: '#5a5262', lane: '#fff3e4', edge: '#ffd23f',
      pole: '#2b2040', tint: 'rgba(255,120,60,0.07)', night: false, shadow: 'rgba(40,10,60,0.42)',
      leaf: '#2fbf71', leafDark: '#1b8a4f', trunk: '#b5713e', trunk2: '#9a5c30'
    },
    giorno: {
      sky: ['#2fa6ea', '#5fc2f3', '#a3e1fb', '#dcf6ff'], sun: false, plainSun: true, sunC: ['#ffffff', '#fff2a8'], sunX: 1050, sunY: 92, sunR: 46,
      clouds: 'puffy', cloud: '#ffffff', cloudDark: '#cde8f7', far: ['#86c3e6', '#93cdec', '#7ab8de'], farWin: null, farPalm: '#5f9fc6',
      haze: 'rgba(230,248,255,0.45)', bldShade: 0, glass: '#3a78dc', glassLit: null, frame: '#fff6e8',
      walk: '#e4d8c2', barrier: ['#ece5d6', '#cf4a5e'], road: '#5a5c66', speck: '#686a74', lane: '#ffffff', edge: '#ffd23f',
      pole: '#2b2a35', tint: null, night: false, shadow: 'rgba(20,20,40,0.38)',
      leaf: '#2fbf71', leafDark: '#1b8a4f', trunk: '#b5713e', trunk2: '#9a5c30'
    },
    notte: {
      sky: ['#0c0a2a', '#1d1450', '#3b1e6e', '#6a2a7e'], sun: false, moon: true, sunX: 1010, sunY: 92, sunR: 30,
      clouds: 'streak', cloud: '#3a2570', cloudDark: '#2a1a58', far: ['#21174a', '#281c58', '#1a1240'], farWin: '#ffd36b', farPalm: '#140d33',
      haze: 'rgba(120,40,160,0.28)', bldShade: -0.52, glass: '#1c2a5c', glassLit: '#ffd36b', frame: '#5a5068',
      walk: '#3d3550', barrier: ['#c9c3d9', '#b0306a'], road: '#231d38', speck: '#2e2747', lane: '#d8d2e8', edge: '#e0b030',
      pole: '#120e22', tint: null, night: true, shadow: 'rgba(0,0,0,0.5)', neon: true,
      leaf: '#1f5a52', leafDark: '#123b37', trunk: '#4a3456', trunk2: '#3d2b48'
    }
  };
  let P = PAL.tramonto, T = null;

  const RX = r => r.rx !== undefined ? r.rx : r.x;
  function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function shade(hex, f) {
    if (hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  function luma(hex) { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255; }
  function rrect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  /* inchiostro: nello sfondo il tratto si sdoppia appena, come una linea tirata a mano */
  let SKETCH = false;
  function inkStroke(c, lw) {
    c.strokeStyle = INK; c.lineWidth = lw || 3;
    if (SKETCH) { c.save(); c.shadowColor = 'rgba(20,17,28,0.45)'; c.shadowOffsetX = 1.4; c.shadowOffsetY = 1.1; c.shadowBlur = 0.6; c.stroke(); c.restore(); }
    else c.stroke();
  }
  function inked(c, fill, lw) { c.fillStyle = fill; c.fill(); inkStroke(c, lw); }
  /* grana d'acquerello: macchie di pigmento chiare e scure, puntinatura, colpi di pennello */
  let NOISE = null, PAPER = null;
  function noiseTex() {
    if (NOISE) return NOISE;
    const n = mk(512, 512), c = n.getContext('2d'), r = rng(77);
    for (let i = 0; i < 260; i++) {
      const x = r() * 512, y = r() * 512, rad = 10 + r() * 70, dark = r() < 0.55, a = 0.03 + r() * 0.09;
      for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
        const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        g.addColorStop(0, dark ? 'rgba(50,25,15,' + a + ')' : 'rgba(255,248,235,' + a + ')');
        g.addColorStop(0.7, dark ? 'rgba(50,25,15,' + a * 0.6 + ')' : 'rgba(255,248,235,' + a * 0.5 + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
    for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(40,20,10,' + (0.02 + r() * 0.04) + ')'; c.fillRect(r() * 512, r() * 512, 20 + r() * 90, 1 + r() * 2); }
    for (let i = 0; i < 5000; i++) { c.fillStyle = r() < 0.6 ? 'rgba(30,15,10,0.09)' : 'rgba(255,255,255,0.08)'; c.fillRect(r() * 512, r() * 512, 1 + r() * 1.5, 1 + r() * 1.5); }
    NOISE = n; return n;
  }
  function wash(c, w, h, k) {
    c.save(); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = k == null ? 1 : k;
    c.fillStyle = c.createPattern(noiseTex(), 'repeat'); c.fillRect(0, 0, w, h); c.restore();
  }

  /* ================= SFONDO ================= */
  function palm(c, x, base, h, r, col) {
    const lean = (r() - 0.5) * 46, segs = 9;
    c.lineJoin = 'round';
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      const x0 = x + lean * t0 * t0, x1 = x + lean * t1 * t1, y0 = base - h * t0, y1 = base - h * t1;
      const w0 = 10 - 5 * t0, w1 = 10 - 5 * t1;
      c.beginPath(); c.moveTo(x0 - w0, y0); c.lineTo(x1 - w1 + 2, y1); c.lineTo(x1 + w1 + 2, y1); c.lineTo(x0 + w0, y0); c.closePath();
      if (col) { c.fillStyle = col; c.fill(); } else inked(c, i % 2 ? P.trunk : P.trunk2, 2);
    }
    const tx = x + lean + 2, ty = base - h;
    [-2.8, -2.3, -1.75, -1.2, -0.6, -0.1, 0.35, 2.75].forEach((a, k) => {
      const len = 58 + r() * 26;
      const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.5 + 30;
      const mx = tx + Math.cos(a) * len * 0.55, my = ty + Math.sin(a) * len * 0.55 - 14;
      c.beginPath(); c.moveTo(tx, ty);
      c.quadraticCurveTo(mx, my - 9, ex, ey);
      c.quadraticCurveTo(mx, my + 9, tx, ty + 5);
      c.closePath();
      if (col) { c.fillStyle = col; c.fill(); }
      else {
        inked(c, k % 2 ? P.leaf : shade(P.leaf, -0.08), 2.5);
        c.beginPath(); c.moveTo(tx, ty + 2); c.quadraticCurveTo(mx, my, ex, ey); c.strokeStyle = P.leafDark; c.lineWidth = 2; c.stroke();
      }
    });
    if (!col) for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(tx - 6 + i * 6, ty + 8 + (i % 2) * 3, 5, 0, TAU); inked(c, '#7a4a22', 1.5); }
  }

  const SKYI = typeof SKY_IMG !== 'undefined' ? { sun: (() => { const i = new Image(); i.src = SKY_IMG.sun; return i; })(), clouds: SKY_IMG.clouds.map(u => { const i = new Image(); i.src = u; return i; }) } : null;
  const BGL = typeof BG_LAYERS !== 'undefined' ? Object.fromEntries(Object.entries(BG_LAYERS).filter(([k]) => k !== 'k').map(([k, u]) => { const i = new Image(); i.src = u; return [k, i]; })) : null;
  const BGX = typeof BG_EXTRA !== 'undefined' ? BG_EXTRA.map(u => { const i = new Image(); i.src = u; return i; }) : [];
  const GIMG = typeof GARDA_IMG !== 'undefined' ? Object.fromEntries(Object.entries(GARDA_IMG).filter(([k]) => k !== 'k').map(([k, u]) => { const i = new Image(); i.src = u; return [k, i]; })) : null;
  /* lago di Garda con la grafica di Christian: montagne, lago, lungolago di Riva, villa, castello, rocce e boschi su tre livelli */
  function buildGardaImg() {
    if (!GIMG || !Object.values(GIMG).every(i => i.complete && i.width)) return false;
    const k = GARDA_IMG.k, tint = (c, w, h) => {
      c.globalCompositeOperation = 'source-atop';
      if (P.night) { c.fillStyle = 'rgba(25,15,60,0.55)'; c.fillRect(0, 0, w, h); }
      else if (LIGHT === 'tramonto') { c.fillStyle = 'rgba(255,130,70,0.08)'; c.fillRect(0, 0, w, h); }
      c.globalCompositeOperation = 'source-over';
    };
    const row = (list, bottom, gap, scale) => {
      const tw = list.reduce((a, i) => a + i.width / k * (scale || 1) + gap, 0), cv = mkHi(tw, 420), c = cv.getContext('2d');
      let x = gap / 2; list.forEach(i => { const w = i.width / k * (scale || 1), h = i.height / k * (scale || 1); c.drawImage(i, x, bottom - h, w, h); x += w + gap; });
      tint(c, tw, 420); return cv;
    };
    const HZ = BASE - 80;
    /* montagne coerenti: in fondo la catena alta (innevata di giorno, accesa al tramonto), davanti il Monte Baldo
       e i boschi verdi sulla sponda; poi il lago e, sulla riva vicina, paese, villa e castello alla stessa scala */
    const far = LIGHT === 'tramonto' ? GIMG.sunset : GIMG.alps;
    T.hl = row([far, far], HZ - 6, -40, 0.82);
    T.hl2 = row([GIMG.baldo, GIMG.forest, GIMG.baldo, GIMG.forest], HZ + 4, -60, 0.78);
    const lw = GIMG.lakeK1.width, lk = mkHi(lw, 420), lc = lk.getContext('2d');
    lc.drawImage(GIMG.lakeK1, 0, HZ, lw, 420 - HZ); tint(lc, lw, 420); T.fa = lk;
    T.bd = row([GIMG.riva, GIMG.villa, GIMG.castle, GIMG.cliff], BASE + 8, 70, 0.88);
    T.gok = true;
    return true;
  }
  function buildTiles() {
    const r = rng(1960);
    T = {};
    const skyOk = SKYI && [SKYI.sun].concat(SKYI.clouds).every(i => i.complete && i.width);
    /* sole a strisce */
    if (P.sun && skyOk) {
      /* sole disegnato da Christian */
      const R = P.sunR, s = mk(R * 2 + 4, R * 2 + 4), g = s.getContext('2d');
      g.drawImage(SKYI.sun, 2, 2, R * 2, R * 2); T.sun = s;
    } else if (P.sun) {
      const R = P.sunR, s = mk(R * 2 + 4, R * 2 + 4), g = s.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, R * 2); gr.addColorStop(0, P.sunC[0]); gr.addColorStop(1, P.sunC[1]);
      g.fillStyle = gr; g.beginPath(); g.arc(R + 2, R + 2, R, 0, TAU); g.fill();
      g.globalCompositeOperation = 'destination-out';
      let y = R + 2 + R * 0.12, h = 3, gap = 17;
      while (y < R * 2 + 4) { g.fillRect(0, y, R * 2 + 4, h); y += gap; h += 2.4; gap = Math.max(9, gap - 1.4); }
      T.sun = s;
    }
    /* nuvole */
    const cl = mk(2400, 260), c = cl.getContext('2d');
    if (skyOk) {
      /* nuvole di Christian, colorate secondo la luce */
      const tint = P.moon ? 'rgba(40,25,90,0.62)' : P.sun ? 'rgba(255,140,90,0.38)' : null;
      let x = 30;
      while (x < 2250) {
        const im = SKYI.clouds[r() < 0.55 ? 0 : 1], k = 0.55 + r() * 0.5, w = im.width * k, h = im.height * k;
        if (x + w > 2390) break;
        const cv = mk(Math.ceil(w), Math.ceil(h)), g = cv.getContext('2d'); g.drawImage(im, 0, 0, w, h);
        if (tint) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(0, 0, w, h); }
        c.drawImage(cv, Math.round(x), Math.round(20 + r() * (P.sun ? 120 : 170)));
        x += w + 80 + r() * 260;
      }
    }
    else for (let i = 0; i < 14; i++) {
      const x = r() * 2300, y = 30 + r() * 200;
      if (P.clouds === 'puffy') {
        const n = 3 + ((r() * 3) | 0), base = y + 30;
        c.fillStyle = P.cloudDark; rrect(c, x - 10, base - 12, n * 34 + 20, 18, 9); c.fill();
        for (let k = 0; k < n; k++) { c.fillStyle = P.cloud; c.beginPath(); c.arc(x + k * 34 + 10, base - 14 - (k % 2) * 10, 24 + r() * 8, 0, TAU); c.fill(); }
        c.fillStyle = P.cloud; rrect(c, x - 8, base - 26, n * 34 + 16, 22, 11); c.fill();
      } else {
        const w = 160 + r() * 300, h = 12 + r() * 14;
        c.globalAlpha = 0.85;
        c.fillStyle = P.cloudDark; rrect(c, x + 14, y + h * 0.55, w * 0.9, h * 0.8, h); c.fill();
        c.fillStyle = P.cloud; rrect(c, x, y, w, h, h); c.fill();
        c.globalAlpha = 1;
      }
    }
    
    T.cl = cl;
    /* skyline lontano (18%) */
    const fa = mk(2400, 420), f = fa.getContext('2d');
    let x = 0;
    while (x < 2400) {
      const w = 36 + r() * 100, h = 60 + r() * 230, col = P.far[(r() * 3) | 0];
      f.fillStyle = col; f.fillRect(x, BASE - h, w + 1, h);
      if (r() < 0.35) f.fillRect(x + w * 0.2, BASE - h - 18, w * 0.6, 18);
      if (r() < 0.25) f.fillRect(x + w * 0.48, BASE - h - 50, 3, 50);
      if (P.farWin) { f.fillStyle = P.farWin; for (let yy = BASE - h + 10; yy < BASE - 8; yy += 12) for (let xx = x + 6; xx < x + w - 6; xx += 10) if (r() < 0.28) f.fillRect(xx, yy, 4, 5); }
      if (r() < 0.12) palm(f, x + w + 6, BASE, 110 + r() * 60, r, P.farPalm);
      x += w + (r() < 0.15 ? 18 : 0);
    }
    
    T.fa = fa;
    /* case (35%) */
    const bd = mk(2400, 420), b = bd.getContext('2d'); SKETCH = true;
    b.lineJoin = 'round';
    const SIGNS = ['FERRAMENTA', 'BAR SPORT', 'GOMMISTA', 'TABACCHI', 'OFFICINA', 'PIZZERIA', 'RICAMBI', 'LAVANDERIA', 'CARROZZERIA', 'GELATI', 'AUTORICAMBI', 'ZA SRL · DAL 1960'];
    const tops = [];
    x = 0; let si = 0, last = -1;
    while (x < 2400) {
      if (x > 40 && x < 2280 && r() < 0.2) { palm(b, x + 36, BASE, 150 + r() * 70, r); x += 72; continue; }
      let w = 140 + r() * 130; if (2400 - x < 210) w = 2400 - x;
      const h = 150 + r() * 160, top = BASE - h;
      let ci; do { ci = (r() * BLD.length) | 0; } while (ci === last); last = ci;
      const col = P.bldShade ? shade(BLD[ci], P.bldShade) : BLD[ci];
      tops.push([x + w / 2, top]);
      b.fillStyle = col; b.fillRect(x, top, w, h);
      /* luce dall'alto, ombra in basso e sul fianco tratteggiato */
      const lg = b.createLinearGradient(0, top, 0, BASE); lg.addColorStop(0, 'rgba(255,244,225,0.22)'); lg.addColorStop(0.55, 'rgba(255,244,225,0)'); lg.addColorStop(1, 'rgba(60,25,20,0.22)');
      b.fillStyle = lg; b.fillRect(x, top, w, h);
      b.fillStyle = shade(col, -0.16); b.fillRect(x + w - 14, top, 14, h);
      b.save(); b.beginPath(); b.rect(x + w - 14, top, 14, h); b.clip(); b.strokeStyle = 'rgba(20,17,28,0.22)'; b.lineWidth = 1.2;
      for (let yy = top - 14; yy < BASE; yy += 7) { b.beginPath(); b.moveTo(x + w - 14, yy + 14); b.lineTo(x + w, yy); b.stroke(); } b.restore();
      b.beginPath(); b.rect(x + 1.5, top, w - 3, h); SKETCH = true; inkStroke(b, 3);
      /* tetto */
      if (r() < 0.4) {
        const tx = x + 20 + r() * (w - 70);
        b.fillStyle = INK; b.fillRect(tx + 4, top - 22, 3, 22); b.fillRect(tx + 30, top - 22, 3, 22);
        rrect(b, tx, top - 52, 38, 32, 6); inked(b, P.bldShade ? '#4a4258' : '#c9b79a', 2.5);
        b.fillStyle = 'rgba(0,0,0,0.15)'; b.fillRect(tx + 26, top - 50, 10, 28);
      } else if (r() < 0.5) {
        const tx = x + 16 + r() * (w - 60);
        rrect(b, tx, top - 26, 34, 24, 3); inked(b, P.bldShade ? '#55505f' : '#e2e2e6', 2.5);
        b.beginPath(); b.arc(tx + 17, top - 14, 7, 0, TAU); b.strokeStyle = INK; b.lineWidth = 2; b.stroke();
      }
      if (r() < 0.3) { b.strokeStyle = INK; b.lineWidth = 2; b.beginPath(); const ax = x + w * 0.7; b.moveTo(ax, top - 12); b.lineTo(ax, top - 46); b.moveTo(ax - 10, top - 36); b.lineTo(ax + 10, top - 36); b.stroke(); }
      rrect(b, x - 5, top - 12, w + 10, 14, 3); inked(b, shade(col, -0.28), 3);
      b.fillStyle = 'rgba(0,0,0,0.16)'; b.fillRect(x + 3, top + 2, w - 6, 6);
      /* finestre */
      const cols = Math.max(2, Math.floor((w - 20) / 58)), gap = (w - 20) / cols;
      for (let wy = top + 26; wy < BASE - 150; wy += 56) {
        for (let k = 0; k < cols; k++) {
          const ww = gap * 0.56, wh = 32, wx = x + 10 + k * gap + (gap - ww) / 2;
          rrect(b, wx - 4, wy - 4, ww + 8, wh + 8, 3); inked(b, P.frame, 2.5);
          const lit = P.glassLit && r() < 0.4;
          b.fillStyle = lit ? P.glassLit : P.glass; b.fillRect(wx, wy, ww, wh);
          if (!lit) {
            b.save(); b.beginPath(); b.rect(wx, wy, ww, wh); b.clip();
            b.fillStyle = 'rgba(255,255,255,0.45)';
            b.beginPath(); b.moveTo(wx + ww * 0.15, wy + wh); b.lineTo(wx + ww * 0.45, wy); b.lineTo(wx + ww * 0.62, wy); b.lineTo(wx + ww * 0.32, wy + wh); b.fill();
            b.restore();
          }
          const v = r();
          if (v < 0.22) { b.fillStyle = AWN[(r() * AWN.length) | 0]; b.fillRect(wx, wy, ww, wh * 0.45); b.strokeStyle = INK; b.lineWidth = 1.5; b.strokeRect(wx, wy, ww, wh * 0.45); }
          b.strokeStyle = INK; b.lineWidth = 2; b.beginPath(); b.moveTo(wx + ww / 2, wy); b.lineTo(wx + ww / 2, wy + wh); b.stroke();
          rrect(b, wx - 7, wy + wh + 3, ww + 14, 6, 2); inked(b, shade(col, -0.3), 1.5);
          if (v > 0.8) for (let p = 0; p < 3; p++) { b.beginPath(); b.arc(wx + 6 + p * (ww - 12) / 2, wy + wh - 1, 7, Math.PI, 0); inked(b, '#3fbf62', 1.5); }
        }
      }
      /* segni del tempo: colature sotto i davanzali, crepe, mattoni scoperti, sporco alla base */
      for (let k = 0; k < 3; k++) {
        const dx = x + 12 + r() * (w - 30), dy = top + 60 + r() * (h - 170), dl = 18 + r() * 36;
        const dg = b.createLinearGradient(0, dy, 0, dy + dl); dg.addColorStop(0, 'rgba(70,35,25,0.22)'); dg.addColorStop(1, 'rgba(70,35,25,0)');
        b.fillStyle = dg; b.fillRect(dx, dy, 5 + r() * 8, dl);
      }
      if (r() < 0.7) {
        let cx = x + 10 + r() * (w - 20), cy = top + 20 + r() * (h - 140);
        b.strokeStyle = 'rgba(20,17,28,0.55)'; b.lineWidth = 1.2; b.beginPath(); b.moveTo(cx, cy);
        for (let k = 0; k < 5; k++) { cx += (r() - 0.5) * 12; cy += 5 + r() * 9; b.lineTo(cx, cy); }
        b.stroke();
      }
      if (r() < 0.55) {
        const bx = r() < 0.5 ? x + 8 : x + w - 50, by = top + 30 + r() * (h - 160);
        for (let k = 0; k < 5; k++) { const ox = (k % 3) * 13 + (((k / 3) | 0) % 2) * 6, oy = ((k / 3) | 0) * 8; b.fillStyle = shade(col, -0.25); b.fillRect(bx + ox, by + oy, 12, 6); b.strokeStyle = 'rgba(20,17,28,0.5)'; b.lineWidth = 1; b.strokeRect(bx + ox, by + oy, 12, 6); }
      }
      const gg = b.createLinearGradient(0, BASE - 110, 0, BASE); gg.addColorStop(0, 'rgba(50,30,25,0)'); gg.addColorStop(1, 'rgba(50,30,25,0.18)');
      b.fillStyle = gg; b.fillRect(x, BASE - 110, w, 110);
      /* negozio al piano terra */
      const sx = x + 10, sw = w - 22;
      const sc = AWN[(r() * AWN.length) | 0];
      if (P.neon) { b.save(); b.shadowColor = sc; b.shadowBlur = 22; }
      rrect(b, sx, BASE - 102, sw, 26, 4); inked(b, sc, 3);
      if (P.neon) b.restore();
      b.font = fd(800, 17); b.textAlign = 'center'; b.textBaseline = 'middle'; b.lineJoin = 'round';
      b.strokeStyle = INK; b.lineWidth = 4; b.strokeText(SIGNS[si % SIGNS.length], sx + sw / 2, BASE - 88, sw - 14);
      b.fillStyle = '#fff6e8'; b.fillText(SIGNS[si++ % SIGNS.length], sx + sw / 2, BASE - 88, sw - 14);
      const ay = BASE - 70, ah = 18, ac = AWN[(r() * AWN.length) | 0];
      for (let k = 0; k * 16 < sw; k++) { b.fillStyle = k % 2 ? '#fff6e8' : ac; b.fillRect(sx + k * 16, ay, Math.min(16, sw - k * 16), ah); }
      for (let k = 0; k * 16 < sw; k++) { b.beginPath(); b.arc(sx + k * 16 + 8, ay + ah, 8, 0, Math.PI); inked(b, k % 2 ? '#fff6e8' : ac, 2); }
      b.strokeStyle = INK; b.lineWidth = 3; b.strokeRect(sx, ay, sw, ah);
      if (r() < 0.5) {
        b.fillStyle = P.bldShade ? '#4b4656' : '#b9b6c2'; b.fillRect(sx + 4, BASE - 44, sw - 8, 44);
        b.strokeStyle = 'rgba(20,17,28,0.45)'; b.lineWidth = 1.5;
        for (let yy = BASE - 40; yy < BASE; yy += 5) { b.beginPath(); b.moveTo(sx + 4, yy); b.lineTo(sx + sw - 4, yy); b.stroke(); }
        b.strokeStyle = INK; b.lineWidth = 2.5; b.strokeRect(sx + 4, BASE - 44, sw - 8, 44);
      } else {
        const dw = 30;
        b.fillStyle = P.glassLit ? '#5a4a30' : P.glass; b.fillRect(sx + 4, BASE - 44, sw - dw - 14, 44);
        if (!P.glassLit) { b.fillStyle = 'rgba(255,255,255,0.4)'; b.beginPath(); b.moveTo(sx + 20, BASE); b.lineTo(sx + 44, BASE - 44); b.lineTo(sx + 58, BASE - 44); b.lineTo(sx + 34, BASE); b.fill(); }
        b.strokeStyle = INK; b.lineWidth = 2.5; b.strokeRect(sx + 4, BASE - 44, sw - dw - 14, 44);
        rrect(b, sx + sw - dw - 4, BASE - 46, dw, 46, 2); inked(b, shade(AWN[(r() * AWN.length) | 0], -0.2), 2.5);
        b.fillStyle = INK; b.fillRect(sx + sw - 14, BASE - 26, 4, 8);
      }
      x += w;
    }
    /* festoni di bandierine tra i tetti */
    for (let i = 0; i + 1 < tops.length; i += 2) {
      const a = tops[i], c2 = tops[i + 1];
      if (c2[0] - a[0] > 360) continue;
      const y0 = a[1] + 30, y1 = c2[1] + 30, sag = 36;
      b.strokeStyle = INK; b.lineWidth = 1.5; b.beginPath(); b.moveTo(a[0], y0); b.quadraticCurveTo((a[0] + c2[0]) / 2, Math.max(y0, y1) + sag, c2[0], y1); b.stroke();
      const n = Math.floor((c2[0] - a[0]) / 22);
      for (let k = 1; k < n; k++) {
        const t = k / n, xx = (1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * (a[0] + c2[0]) / 2 + t * t * c2[0];
        const yy = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * (Math.max(y0, y1) + sag) + t * t * y1;
        b.beginPath(); b.moveTo(xx - 7, yy); b.lineTo(xx + 7, yy); b.lineTo(xx, yy + 14); b.closePath(); inked(b, AWN[k % AWN.length], 1.5);
      }
    }
    SKETCH = false;
    
    T.bd = bd;
    /* fila di mezzo: gli edifici industriali in fila, ognuno alla sua altezza vera */
    const shadeLight = (c2, w, h) => {
      c2.globalCompositeOperation = 'source-atop';
      if (P.night) { c2.fillStyle = 'rgba(25,15,60,0.55)'; c2.fillRect(0, 0, w, h); }
      else if (LIGHT === 'tramonto') { c2.fillStyle = 'rgba(255,130,70,0.07)'; c2.fillRect(0, 0, w, h); }
      c2.globalCompositeOperation = 'source-over';
    };
    if (IND.length && IND.every(b => b.im.complete && b.im.width)) {
      const PXM = 13, GAP = 18, gy = BASE + 6;
      const pieces = IND.map(b => { const h = Math.round(b.m * PXM); return { im: b.im, h: h, w: Math.round(b.im.width * h / b.im.height) }; });
      const TWc = pieces.reduce((s2, p) => s2 + p.w + GAP, 0), cb = mk(TWc, 420), c2 = cb.getContext('2d');
      c2.imageSmoothingQuality = 'high';
      let x = 0; pieces.forEach(p => { c2.drawImage(p.im, x, gy - p.h, p.w, p.h); x += p.w + GAP; });
      shadeLight(c2, TWc, 420);
      T.bd = cb;
    }
    /* sfondo lontano: skyline di fabbriche */
    if (SKYL && SKYL.complete && SKYL.width) {
      /* tile specchiato: i bordi combaciano sempre, niente tagli netti nel parallasse */
      /* l'immagine era due skyline incollate con un taglio netto: si usa solo la parte col paese e le colline */
      const sx0 = Math.round(SKYL.width * 811 / 1787), sw = SKYL.width - sx0;
      const h = 180, w = Math.round(sw * h / SKYL.height), cv = mk(w * 2, 420), c2 = cv.getContext('2d');
      c2.drawImage(SKYL, sx0, 0, sw, SKYL.height, 0, BASE - 30 - h, w, h);
      c2.save(); c2.translate(w * 2, 0); c2.scale(-1, 1); c2.drawImage(SKYL, sx0, 0, sw, SKYL.height, 0, BASE - 30 - h, w, h); c2.restore();
      shadeLight(c2, w * 2, 420);
      T.fa = cv;
    }
    /* zona industriale nuova: colline, paese e fabbriche su tre livelli separati (parallasse) */
    T.hl = null; T.hl2 = null;
    if (ENV === 'citta' && BGL && [BGL.hills, BGL.village, BGL.factories].every(i => i.complete && i.width)) {
      const mirror = (im, bottom) => {
        /* si tolgono 6 px per lato: i bordi del disegno lasciavano una riga sottile nella giunta */
        const kk = BG_LAYERS.k || 1, cut = 6, sw = im.width - cut * 2, w = sw / kk, h = im.height / kk, cv = mkHi(w * 2, 420), c2 = cv.getContext('2d');
        c2.drawImage(im, cut, 0, sw, im.height, 0, bottom - h, w, h); c2.save(); c2.translate(w * 2, 0); c2.scale(-1, 1); c2.drawImage(im, cut, 0, sw, im.height, 0, bottom - h, w, h); c2.restore();
        shadeLight(c2, w * 2, 420); return cv;
      };
      T.hl = mirror(BGL.hills, BASE - 18);
      T.fa = mirror(BGL.village, BASE - 2);
      /* fila delle fabbriche: il complesso grande e gli altri edifici di Christian, alternati con un po' di spazio */
      const kk = BG_LAYERS.k || 1, row = [BGL.factories, BGX[0], BGX[4], BGX[2], BGX[3], BGX[1]].filter(i => i && i.complete && i.width);
      const gap = 60, tw = row.reduce((a, i) => a + i.width / kk + gap, 0), cv = mkHi(tw, 420), c2 = cv.getContext('2d');
      let xx = gap / 2; row.forEach(i => { const fw = i.width / kk, fh = i.height / kk; c2.drawImage(i, xx, BASE + 6 - fh, fw, fh); xx += fw + gap; });
      shadeLight(c2, tw, 420); T.bd = cv;
    }
    /* recinzione al posto delle new jersey */
    if (FENCE && FENCE.complete && FENCE.width) {
      const h = 86, w = Math.round(FENCE.width * h / FENCE.height), cv = mkHi(w, h), c2 = cv.getContext('2d');
      c2.imageSmoothingQuality = 'high'; c2.drawImage(FENCE, 0, 0, w, h); shadeLight(c2, w, h);
      T.fence = cv;
    }
    /* asfalto: più chiaro e velato lontano, più scuro e grosso vicino */
    const RH = ROAD_BOT - ROAD_TOP;
    const as = mk(512, RH), a = as.getContext('2d');
    const rg = a.createLinearGradient(0, 0, 0, RH);
    rg.addColorStop(0, shade(P.road, 0.18)); rg.addColorStop(0.35, P.road); rg.addColorStop(1, shade(P.road, -0.22));
    a.fillStyle = rg; a.fillRect(0, 0, 512, RH);
    /* pennellate orizzontali */
    for (let i = 0; i < 520; i++) {
      const y = r() * RH, t = y / RH, len = 20 + r() * 180, hh = 0.8 + t * 2.4 * r();
      a.fillStyle = r() < 0.55 ? 'rgba(20,15,25,' + (0.05 + r() * 0.09) + ')' : 'rgba(255,245,230,' + (0.03 + r() * 0.06) + ')';
      const x0 = r() * 512; a.fillRect(x0, y, len, hh); if (x0 + len > 512) a.fillRect(x0 - 512, y, len, hh);
    }
    /* ghiaino */
    for (let i = 0; i < 2600; i++) { const y = r() * RH, t = y / RH, sz = 0.8 + t * 2.2 * r(); a.fillStyle = r() < 0.55 ? 'rgba(15,10,20,0.28)' : 'rgba(235,225,215,0.18)'; a.fillRect(r() * 512, y, sz, sz * 0.7); }
    /* solchi di gomma sulle traiettorie delle ruote */
    for (let i = 0; i < 4; i++) { const y = laneY(i) - ROAD_TOP - 2, g = a.createLinearGradient(0, y - 5, 0, y + 5); g.addColorStop(0, 'rgba(10,8,15,0)'); g.addColorStop(0.5, 'rgba(10,8,15,0.16)'); g.addColorStop(1, 'rgba(10,8,15,0)'); a.fillStyle = g; a.fillRect(0, y - 5, 512, 10); }
    /* rattoppi e crepe a inchiostro */
    for (let i = 0; i < 3; i++) {
      const px = r() * 420, py = 20 + r() * (RH - 60), pw = 40 + r() * 70, ph = 8 + (py / RH) * 18;
      a.beginPath(); a.moveTo(px, py); a.lineTo(px + pw, py + 1); a.lineTo(px + pw + 4, py + ph); a.lineTo(px - 3, py + ph - 1); a.closePath();
      a.fillStyle = 'rgba(15,12,20,0.18)'; a.fill(); a.strokeStyle = 'rgba(20,17,28,0.45)'; a.lineWidth = 1.2; a.stroke();
    }
    a.strokeStyle = 'rgba(20,17,28,0.6)'; a.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      let px = r() * 512, py = 10 + r() * (RH - 20); a.lineWidth = 0.8 + (py / RH) * 1.2;
      a.beginPath(); a.moveTo(px, py);
      for (let k = 0; k < 6; k++) { px += 6 + r() * 14; py += (r() - 0.5) * 5; a.lineTo(px, py); if (r() < 0.3) { a.moveTo(px, py); a.lineTo(px + 6, py + (r() - 0.5) * 8); a.moveTo(px, py); } }
      a.stroke();
    }
    for (let i = 0; i < 10; i++) { const g = a.createRadialGradient(0, 0, 0, 0, 0, 1); a.save(); a.translate(r() * 512, 20 + r() * (RH - 40)); a.scale(30 + r() * 50, 4 + r() * 7); g.addColorStop(0, 'rgba(10,8,15,0.22)'); g.addColorStop(1, 'rgba(10,8,15,0)'); a.fillStyle = g; a.beginPath(); a.arc(0, 0, 1, 0, TAU); a.fill(); a.restore(); }
    wash(a, as.width, as.height, 0.2);
    /* strisce dipinte: sottili e consumate, più spesse vicino */
    const paintLine = (len, th, col, worn) => {
      const cv = mk(Math.ceil(len) + 4, Math.ceil(th) + 4), g = cv.getContext('2d');
      g.beginPath(); g.moveTo(2, 2 + r() * 0.8);
      for (let xx = 2; xx <= len; xx += 9) g.lineTo(xx, 2 + r() * 0.9);
      for (let xx = len; xx >= 2; xx -= 9) g.lineTo(xx, 2 + th - r() * 0.9);
      g.closePath(); g.fillStyle = col; g.fill();
      g.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < len * worn; k++) { g.fillStyle = 'rgba(0,0,0,' + (0.3 + r() * 0.7) + ')'; g.fillRect(2 + r() * len, 2 + r() * th, 1 + r() * 3, 1 + r() * 1.5); }
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(60,40,30,0.12)'; g.fillRect(0, 2 + th * 0.6, len + 4, th);
      return cv;
    };
    T.dash = [1, 2, 3].map(i => paintLine(4.5 * PPM, 1.6 + i * 1.0, P.lane, 0.55));
    T.edgeFar = paintLine(512, 2.4, P.edge, 0.5);
    T.edgeNear = paintLine(512, 6, P.lane, 0.45);
    /* marciapiede in primo piano: cordolo di cemento, ghiaia, ciuffi d'erba */
    const FH = H - ROAD_BOT, fg = mk(512, FH), f2 = fg.getContext('2d');
    f2.fillStyle = shade(P.walk, -0.05); f2.fillRect(0, 0, 512, 9);
    f2.fillStyle = shade(P.walk, -0.3); f2.fillRect(0, 9, 512, 14);
    f2.fillStyle = shade(P.walk, -0.12); f2.fillRect(0, 23, 512, FH - 23);
    for (let i = 0; i < 900; i++) { f2.fillStyle = r() < 0.5 ? 'rgba(30,20,15,0.3)' : 'rgba(255,250,240,0.25)'; f2.fillRect(r() * 512, 24 + r() * (FH - 24), 1 + r() * 2.5, 1 + r() * 2); }
    f2.strokeStyle = INK; f2.lineWidth = 2.5;
    f2.beginPath(); f2.moveTo(0, 1); f2.lineTo(512, 1); f2.moveTo(0, 9); f2.lineTo(512, 9); f2.moveTo(0, 23); f2.lineTo(512, 23); f2.stroke();
    f2.lineWidth = 1.6; for (let xx = 0; xx < 512; xx += 64) { f2.beginPath(); f2.moveTo(xx + 0.5, 1); f2.lineTo(xx + 2, 23); f2.stroke(); }
    for (let i = 0; i < 9; i++) {
      const gx = r() * 500, gy = 23 + 4 + r() * 6;
      for (let k = 0; k < 6; k++) { f2.beginPath(); f2.moveTo(gx + k * 2.4, FH); f2.quadraticCurveTo(gx + k * 2.4 + (r() - 0.5) * 6, gy + 10, gx + k * 2.4 + (r() - 0.5) * 10, gy + r() * 6); f2.strokeStyle = k % 2 ? P.leafDark : P.leaf; f2.lineWidth = 1.8; f2.stroke(); }
    }
    wash(f2, 512, FH, 0.3);
    T.fg = fg;
    /* blocchi delle barriere, già con la grana */
    T.blk = [0, 1].map(i => {
      const bw = 3 * PPM, cv = mk(bw + 6, 30), g = cv.getContext('2d');
      g.beginPath(); g.moveTo(5, 3); g.lineTo(bw - 1, 3); g.lineTo(bw + 3, 28); g.lineTo(1, 28); g.closePath();
      g.fillStyle = P.barrier[i]; g.fill();
      const gg = g.createLinearGradient(0, 3, 0, 28); gg.addColorStop(0, 'rgba(255,255,255,0.35)'); gg.addColorStop(0.3, 'rgba(255,255,255,0)'); gg.addColorStop(1, 'rgba(50,25,20,0.3)');
      g.fillStyle = gg; g.fill();
      wash(g, cv.width, cv.height, 0.3);
      SKETCH = true; inkStroke(g, 3); SKETCH = false;
      return cv;
    });
    T.as = as;
  }

  let ENV = 'citta', LIGHT = 'tramonto';
  function setScene(env, light) {
    ENV = env || 'citta'; LIGHT = PAL[light] ? light : 'tramonto';
    P = PAL[LIGHT];
    if (ENV === 'garda' && LIGHT === 'tramonto') P = Object.assign({}, P, { sunY: 215 });
    buildTiles();
    if (ENV === 'garda' && typeof buildGarda === 'function')
      buildGarda({ mk, rng, shade, rrect, inked, inkStroke, setSketch: v => { SKETCH = v; }, wash, palm, fd, INK, BASE, PPM, P, T, TAU, light: LIGHT });
    if (ENV === 'garda') buildGardaImg();
  }
  function setLight(name) { setScene(ENV, name); }
  function tileDraw(ctx, img, offset, y) {
    const w = img._lw || img.width, h = img._lh || img.height; let o = -(((offset % w) + w) % w);
    for (; o < W; o += w) ctx.drawImage(img, Math.round(o), y, w, h);
  }
  /* tela ad alta risoluzione: disegni in coordinate di gioco, viene salvata a RS volte la risoluzione */
  let RS = 1;
  const VIVID = 'saturate(1.12) contrast(1.04)';
  function mkHi(w, h) { const k = RS, c = mk(Math.ceil(w * k), Math.ceil(h * k)); c._lw = w; c._lh = h; const g = c.getContext('2d'); g.scale(k, k); g.imageSmoothingQuality = 'high'; try { g.filter = VIVID; } catch (e) { } return c; }

  /* ================= FOLLA ================= */
  /* Spettatori dietro le barriere al via e al traguardo. Ogni figura è disegnata una volta in 3 pose
     (braccia giù, applauso, braccia alzate); a ogni fotogramma si sceglie la posa e si fa saltare. */
  /* Persone vere disegnate a inchiostro e acquerello: vestiti normali (magliette, felpe, giacche, polo, canottiere),
     ombre e pieghe, volti con lineamenti, capelli a ciocche. Disegnate al doppio della risoluzione. */
  /* colori pieni e vivaci come nel riferimento a fumetto */
  const CR_SHIRT = ['#e23b2e', '#f6c21a', '#2f6fd6', '#f07a1a', '#2fa24a', '#d8262e', '#2a3a6a', '#1fa3b8', '#c8283f', '#ffd23f', '#3b7be0', '#f2f0e8', '#22232a', '#1f8a5a', '#ff8a1f', '#7a3cc0'];
  const CR_SKIN = ['#f1cba8', '#e6b48c', '#d29a70', '#b07a52', '#8a5a3a', '#6a4229'];
  const CR_HAIR = ['#24180f', '#4a2f1c', '#6b4526', '#a57a45', '#d0b07a', '#1a1a1c', '#7d7d80', '#bdbdbd', '#7a3a1e'];
  const CR_PANTS = ['#3b4a66', '#2a3550', '#26262b', '#5a5245', '#4a5a6a'];
  const CR_KIND = ['tee', 'race', 'hoodie', 'jacket', 'race', 'polo', 'tee', 'hoodie', 'race', 'tank'];
  const CR_N = 36, CW = 46, CHT = 80, FX = 23, FY = 77, CRS = 2;
  function crowdFigure(r, pose, v) {
    const cv = mk(CW * CRS, CHT * CRS), g = cv.getContext('2d');
    g.scale(CRS, CRS); g.lineCap = 'round'; g.lineJoin = 'round';
    const shirt = CR_SHIRT[v.shirt], skin = CR_SKIN[v.skin], hair = CR_HAIR[v.hair], skinD = shade(skin, -0.22), shirtD = shade(shirt, -0.28);
    const LW = 1.3;
    /* tratto a mano: una seconda passata leggera e sfasata, come una penna ripassata */
    const ink = (lw, a) => {
      g.strokeStyle = a ? 'rgba(20,17,28,' + a + ')' : INK; g.lineWidth = (lw || LW) * 1.12; g.stroke();
    };
    /* macchie di pigmento dentro una forma già tracciata */
    const blot = (x, y, w, h, col) => { g.save(); g.clip(); for (let k = 0; k < 5; k++) { const bx = x + r() * w, by = y + r() * h, rr = 2 + r() * 5, gr = g.createRadialGradient(bx, by, 0, bx, by, rr); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(bx - rr, by - rr, rr * 2, rr * 2); } g.restore(); };
    const shadeSide = (x0, x1) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, 'rgba(255,248,235,0.22)'); gr.addColorStop(0.45, 'rgba(255,248,235,0)'); gr.addColorStop(1, 'rgba(25,15,30,0.32)'); return gr; };
    /* braccio: parte alta con la manica, avambraccio nudo o vestito, pugno */
    const longSleeve = v.kind === 'hoodie' || v.kind === 'jacket';
    const arm = (sx, sy, ex, ey, hx, hy) => {
      const seg = (x0, y0, x1, y1, w, col) => {
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokeStyle = INK; g.lineWidth = w + 2.2; g.stroke();
        g.strokeStyle = col; g.lineWidth = w; g.stroke();
        g.beginPath(); g.moveTo(x0 + 0.9, y0 + 0.6); g.lineTo(x1 + 0.9, y1 + 0.6); g.strokeStyle = 'rgba(25,15,30,0.22)'; g.lineWidth = w * 0.4; g.stroke();
      };
      const up = v.kind === 'tank' ? skin : shirt;
      if (v.kind === 'tee' || v.kind === 'polo') {
        const mx = sx + (ex - sx) * 0.55, my = sy + (ey - sy) * 0.55;
        seg(mx, my, ex, ey, 3.6, skin); seg(ex, ey, hx, hy, 3.3, skin); seg(sx, sy, mx, my, 5, shirt);
        g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + (sx - mx) * 0.15, my + (sy - my) * 0.15); g.strokeStyle = 'rgba(20,17,28,0.5)'; g.lineWidth = 0.8; g.stroke();
      } else { seg(sx, sy, ex, ey, longSleeve ? 4.6 : 3.8, up); seg(ex, ey, hx, hy, longSleeve ? 4.2 : 3.4, longSleeve ? shade(shirt, -0.06) : skin); }
      /* pugno o mano */
      g.beginPath(); g.ellipse(hx, hy, 2.5, 2.8, 0, 0, TAU); g.fillStyle = skin; g.fill(); ink(1.1);
      g.beginPath(); g.moveTo(hx - 1.6, hy - 0.6); g.lineTo(hx + 1.6, hy - 0.6); ink(0.6, 0.6);
    };
    const L = pose === 0 ? [15.5, 29, 13.2, 41, 13.6, 51.5] : pose === 1 ? [15.5, 29, 9.5, 40, 21, 34.5] : [15.5, 29, 10, 17, 7 + v.wide, 5];
    const R = pose === 0 ? [30.5, 29, 32.8, 41, 32.4, 51.5] : pose === 1 ? [30.5, 29, 36.5, 40, 25, 34.5] : [30.5, 29, 36, 17, 39 - v.wide, 4];
    /* gambe (quasi sempre dietro le barriere) */
    g.beginPath(); g.moveTo(16, 54); g.lineTo(22.6, 54); g.lineTo(22, 77); g.lineTo(16.5, 77); g.closePath(); g.fillStyle = CR_PANTS[v.pants]; g.fill(); ink();
    g.beginPath(); g.moveTo(23.4, 54); g.lineTo(30, 54); g.lineTo(29.5, 77); g.lineTo(24, 77); g.closePath(); g.fillStyle = shade(CR_PANTS[v.pants], -0.12); g.fill(); ink();
    /* cappuccio dietro il collo */
    if (v.kind === 'hoodie') { g.beginPath(); g.ellipse(23, 26.5, 7.5, 3.6, 0, 0, TAU); g.fillStyle = shirtD; g.fill(); ink(); }
    /* capelli lunghi dietro */
    if (v.hairStyle === 'long') { g.beginPath(); g.moveTo(16.5, 12); g.quadraticCurveTo(15.5, 24, 17.5, 29); g.lineTo(28.5, 29); g.quadraticCurveTo(30.5, 24, 29.5, 12); g.closePath(); g.fillStyle = shade(hair, -0.12); g.fill(); ink(); }
    if (pose === 0) { arm(...L); arm(...R); }
    /* busto */
    const torso = () => { g.beginPath(); g.moveTo(14, 30.5); g.quadraticCurveTo(14.5, 26.6, 19, 26); g.lineTo(27, 26); g.quadraticCurveTo(31.5, 26.6, 32, 30.5); g.lineTo(30.6, 55.5); g.lineTo(15.4, 55.5); g.closePath(); };
    torso(); g.fillStyle = v.kind === 'tank' ? skin : shirt; g.fill();
    g.save(); torso(); g.clip();
    if (v.kind === 'tank') { g.fillStyle = shirt; g.beginPath(); g.moveTo(17.5, 26); g.lineTo(20, 26); g.quadraticCurveTo(23, 31, 26, 26); g.lineTo(28.5, 26); g.lineTo(30, 33); g.lineTo(31, 56); g.lineTo(15, 56); g.lineTo(16, 33); g.closePath(); g.fill(); g.beginPath(); g.moveTo(17.5, 26); g.lineTo(16, 33); g.moveTo(28.5, 26); g.lineTo(30, 33); ink(0.8, 0.6); }
    if (v.kind === 'jacket') { g.fillStyle = v.inner; g.beginPath(); g.moveTo(20.5, 26); g.lineTo(25.5, 26); g.lineTo(24.5, 56); g.lineTo(21.5, 56); g.closePath(); g.fill(); }
    if (v.print) { g.fillStyle = v.print; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(23, 38, 3.6, 2.6, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
    /* giacca da corsa: spalle e fianchi di un secondo colore, bande bianche */
    if (v.kind === 'race') {
      g.fillStyle = v.inner; g.beginPath(); g.moveTo(13, 25); g.lineTo(33, 25); g.lineTo(33, 33); g.quadraticCurveTo(23, 30, 13, 33); g.closePath(); g.fill();
      g.fillStyle = '#fff6e8'; g.fillRect(16.4, 33, 1.6, 23); g.fillRect(28, 33, 1.6, 23);
      g.fillStyle = v.inner; g.fillRect(13, 50, 20, 6);
      g.beginPath(); g.moveTo(23, 26); g.lineTo(23, 56); ink(0.7, 0.6);
      if (v.print) { g.fillStyle = v.print; g.fillRect(25, 36, 3.4, 2.2); }
    }
    /* ombra netta a destra e luce a sinistra (cel shading) */
    g.fillStyle = 'rgba(20,10,30,0.26)'; g.beginPath(); g.moveTo(27.5, 25); g.quadraticCurveTo(26, 40, 28.5, 57); g.lineTo(34, 57); g.lineTo(34, 25); g.closePath(); g.fill();
    g.fillStyle = 'rgba(20,10,30,0.2)'; g.fillRect(13, 52, 21, 5);
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.moveTo(15.5, 28.5); g.quadraticCurveTo(16.5, 36, 15.8, 44); g.lineTo(17.4, 44); g.quadraticCurveTo(18, 36, 17.2, 28.2); g.closePath(); g.fill();
    /* pieghe a inchiostro leggero e tratteggio nell'ombra */
    g.beginPath(); g.moveTo(16, 33); g.quadraticCurveTo(18, 37, 17.5, 41); g.moveTo(30, 34); g.quadraticCurveTo(28, 38, 28.6, 42); g.moveTo(19, 50); g.quadraticCurveTo(22, 48.5, 25, 50.5); ink(0.7, 0.45);
    g.restore();
    torso(); ink();
    /* dettagli dei capi */
    if (v.kind === 'tee' || v.kind === 'tank') { g.beginPath(); g.moveTo(20, 26.3); g.quadraticCurveTo(23, 29.5, 26, 26.3); ink(0.9); }
    if (v.kind === 'hoodie') { g.beginPath(); g.moveTo(21.6, 28); g.lineTo(21.2, 34); g.moveTo(24.4, 28); g.lineTo(24.8, 34.5); ink(0.8); g.beginPath(); g.moveTo(17.5, 46); g.quadraticCurveTo(23, 44, 28.5, 46); g.lineTo(28, 52); g.lineTo(18, 52); g.closePath(); ink(0.8, 0.7); }
    if (v.kind === 'jacket') { g.beginPath(); g.moveTo(20.5, 26); g.lineTo(18.5, 31); g.lineTo(21, 35); g.lineTo(21.5, 56); g.moveTo(25.5, 26); g.lineTo(27.5, 31); g.lineTo(25, 35); g.lineTo(24.5, 56); ink(0.9); }
    if (v.kind === 'polo') { g.beginPath(); g.moveTo(19.5, 26.2); g.lineTo(23, 30); g.lineTo(26.5, 26.2); g.lineTo(25.5, 24.8); g.lineTo(23, 27.6); g.lineTo(20.5, 24.8); g.closePath(); g.fillStyle = shade(shirt, 0.08); g.fill(); ink(0.9); g.fillStyle = INK; g.fillRect(22.6, 31, 0.9, 0.9); g.fillRect(22.6, 33.4, 0.9, 0.9); }
    /* collo */
    g.beginPath(); g.moveTo(20.6, 19.5); g.lineTo(20.8, 26.6); g.quadraticCurveTo(23, 28, 25.2, 26.6); g.lineTo(25.4, 19.5); g.closePath(); g.fillStyle = skin; g.fill();
    g.fillStyle = 'rgba(40,20,20,0.25)'; g.fillRect(20.8, 20, 4.6, 2.6); g.beginPath(); g.moveTo(20.8, 19.5); g.lineTo(20.9, 26); g.moveTo(25.3, 19.5); g.lineTo(25.1, 26); ink(0.9);
    /* testa: ovale con mandibola, orecchie, ombra laterale */
    const face = () => { g.beginPath(); g.moveTo(17.6, 12.5); g.bezierCurveTo(17.4, 4.5, 28.6, 4.5, 28.4, 12.5); g.bezierCurveTo(28.4, 17, 26.5, 21.3, 23, 21.6); g.bezierCurveTo(19.5, 21.3, 17.6, 17, 17.6, 12.5); g.closePath(); };
    g.beginPath(); g.ellipse(17.6, 13.6, 1.3, 2, 0, 0, TAU); g.fillStyle = skin; g.fill(); ink(0.9);
    g.beginPath(); g.ellipse(28.4, 13.6, 1.3, 2, 0, 0, TAU); g.fillStyle = skinD; g.fill(); ink(0.9);
    face(); g.fillStyle = skin; g.fill();
    g.save(); face(); g.clip();
    g.fillStyle = 'rgba(120,50,30,0.24)'; g.beginPath(); g.moveTo(26.2, 4); g.quadraticCurveTo(25.6, 14, 23.6, 22); g.lineTo(30, 22); g.lineTo(30, 4); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,250,240,0.28)'; g.beginPath(); g.ellipse(20.4, 9.6, 1.4, 0.8, -0.3, 0, TAU); g.fill();
    if (v.beard) { g.fillStyle = shade(hair, -0.05); g.globalAlpha = v.beard === 'full' ? 0.85 : 0.35; g.beginPath(); g.moveTo(17.6, 14); g.quadraticCurveTo(18.5, 22.5, 23, 22); g.quadraticCurveTo(27.5, 22.5, 28.4, 14); g.lineTo(27, 15.5); g.quadraticCurveTo(23, 18, 19, 15.5); g.closePath(); g.fill(); g.globalAlpha = 1; }
    g.restore();
    face(); ink(1.1);
    /* lineamenti */
    const browY = 10.6;
    g.beginPath(); g.moveTo(19.6, browY + 0.3); g.quadraticCurveTo(20.8, browY - 0.5, 22, browY + 0.1); g.moveTo(24, browY + 0.1); g.quadraticCurveTo(25.2, browY - 0.5, 26.4, browY + 0.3); g.strokeStyle = shade(hair, -0.2); g.lineWidth = 0.8; g.stroke();
    if (v.shades) {
      g.fillStyle = '#16141c'; g.beginPath(); g.ellipse(20.8, 12.6, 1.8, 1.25, 0, 0, TAU); g.ellipse(25.2, 12.6, 1.8, 1.25, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(22.6, 12.3); g.lineTo(23.4, 12.3); ink(0.6); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(20, 12, 0.9, 0.5); g.fillRect(24.4, 12, 0.9, 0.5);
    } else {
      g.fillStyle = '#fff8ee'; g.beginPath(); g.ellipse(20.9, 12.7, 1.1, 0.75, 0, 0, TAU); g.ellipse(25.1, 12.7, 1.1, 0.75, 0, 0, TAU); g.fill();
      g.fillStyle = '#2a1d16'; g.beginPath(); g.arc(21.1 + (pose === 2 ? 0 : 0.2), 12.6 - (pose === 2 ? 0.3 : 0), 0.62, 0, TAU); g.arc(25.3 + (pose === 2 ? 0 : 0.2), 12.6 - (pose === 2 ? 0.3 : 0), 0.62, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(19.8, 12.1); g.quadraticCurveTo(20.9, 11.6, 22, 12.1); g.moveTo(24, 12.1); g.quadraticCurveTo(25.1, 11.6, 26.2, 12.1); ink(0.55);
    }
    g.beginPath(); g.moveTo(23.2, 13.4); g.quadraticCurveTo(24.1, 15.6, 23.6, 16.2); g.lineTo(22.6, 16.2); ink(0.6, 0.7);
    if (pose !== 0) {
      g.beginPath(); g.moveTo(20.4, 17.3); g.quadraticCurveTo(23, 16.9, 25.6, 17.3); g.quadraticCurveTo(25, 21, 23, 21.1); g.quadraticCurveTo(21, 21, 20.4, 17.3); g.closePath();
      g.fillStyle = '#4a1418'; g.fill(); g.fillStyle = '#c8505a'; g.beginPath(); g.ellipse(23, 19.9, 1.1, 0.6, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff8ee'; g.fillRect(21, 17.3, 4, 0.9);
      g.beginPath(); g.moveTo(20.4, 17.3); g.quadraticCurveTo(23, 16.9, 25.6, 17.3); g.quadraticCurveTo(25, 21, 23, 21.1); g.quadraticCurveTo(21, 21, 20.4, 17.3); ink(0.8);
    } else { g.beginPath(); g.moveTo(21.4, 18.1); g.quadraticCurveTo(23, 19, 24.6, 18.1); ink(0.7); }
    g.fillStyle = 'rgba(200,90,80,0.18)'; g.beginPath(); g.ellipse(19.8, 15.6, 1.3, 0.8, 0, 0, TAU); g.ellipse(26.2, 15.6, 1.3, 0.8, 0, 0, TAU); g.fill();
    /* capelli a ciocche */
    const hs = v.hairStyle, hcol = hair, hD = shade(hair, -0.25);
    if (v.cap) {
      g.beginPath(); g.moveTo(17.2, 10.6); g.bezierCurveTo(17, 3.6, 29, 3.6, 28.8, 10.6); g.closePath(); g.fillStyle = v.cap; g.fill(); ink(1);
      g.fillStyle = 'rgba(25,15,30,0.25)'; g.beginPath(); g.moveTo(24, 4.6); g.bezierCurveTo(28.5, 5.5, 28.8, 8, 28.8, 10.6); g.lineTo(25.5, 10.6); g.closePath(); g.fill();
      g.beginPath(); if (v.capBack) { g.moveTo(17.4, 10.2); g.quadraticCurveTo(13.5, 10.4, 12.8, 11.6); g.lineTo(17.4, 11.6); } else { g.moveTo(28.6, 10.2); g.quadraticCurveTo(33, 10.2, 34, 11.8); g.lineTo(28.4, 11.8); } g.closePath(); g.fillStyle = shade(v.cap, -0.2); g.fill(); ink(0.9);
    } else if (hs === 'curly') {
      for (let k = 0; k < 11; k++) { const ang = Math.PI * (1.02 + k * 0.096), rx = 23 + Math.cos(ang) * 5.6, ry = 10.5 + Math.sin(ang) * 5.4; g.beginPath(); g.arc(rx, ry, 1.9, 0, TAU); g.fillStyle = k % 2 ? hcol : hD; g.fill(); ink(0.6, 0.8); }
      g.beginPath(); g.arc(23, 7, 3.4, 0, TAU); g.fillStyle = hcol; g.fill();
    } else if (hs !== 'bald') {
      g.beginPath(); g.moveTo(17.3, 13);
      if (hs === 'buzz') { g.bezierCurveTo(16.8, 4.4, 29.2, 4.4, 28.7, 13); g.lineTo(28, 10.4); g.quadraticCurveTo(23, 7.6, 18, 10.4); }
      else { g.bezierCurveTo(16, 2.8, 30, 2.8, 28.8, 13); g.lineTo(28, 10.2); g.lineTo(26.5, 8.6); g.lineTo(25.2, 10); g.lineTo(23.6, 8.4); g.lineTo(21.8, 9.8); g.lineTo(20, 8.6); g.lineTo(18.2, 10.6); }
      g.closePath(); g.fillStyle = hs === 'buzz' ? shade(hcol, 0.05) : hcol; g.fill(); ink(hs === 'buzz' ? 0.7 : 1);
      if (hs !== 'buzz') { g.beginPath(); for (let k = 0; k < 5; k++) { g.moveTo(19 + k * 2.2, 5.6 + (k % 2) * 0.6); g.quadraticCurveTo(20 + k * 2.2, 7.4, 19.6 + k * 2.2, 9); } ink(0.5, 0.5); g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(21, 5.8, 2.6, 0.9, -0.2, 0, TAU); g.fill(); }
      if (hs === 'long') { g.beginPath(); g.moveTo(17.4, 11); g.quadraticCurveTo(16.6, 17, 17.6, 20); g.moveTo(28.6, 11); g.quadraticCurveTo(29.4, 17, 28.4, 20); g.strokeStyle = hcol; g.lineWidth = 1.8; g.stroke(); }
      if (hs === 'bun') { g.beginPath(); g.arc(23, 3.6, 2.4, 0, TAU); g.fillStyle = hcol; g.fill(); ink(0.8); }
    } else { g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(21, 6.4, 2.2, 1, -0.3, 0, TAU); g.fill(); }
    if (pose !== 0) { arm(...L); arm(...R); }
    if (v.phone && pose !== 0) { g.save(); g.translate(R[4], R[5] - 3.4); g.rotate(0.12); rrect(g, -2.4, -4.6, 4.8, 7.6, 0.8); g.fillStyle = '#1e1c24'; g.fill(); ink(0.8); g.fillStyle = P.night ? '#9fd8ff' : '#cfe8f5'; g.fillRect(-1.6, -3.8, 3.2, 5.8); g.restore(); }
    g.setTransform(1, 0, 0, 1, 0, 0); wash(g, CW * CRS, CHT * CRS, 0.35);
    if (P.night) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(18,10,40,0.42)'; g.fillRect(0, 0, CW * CRS, CHT * CRS); g.globalCompositeOperation = 'source-over'; }
    return cv;
  }
  function crowdFlag(v) {
    /* bandiera a parte, così può sventolare sopra la testa */
    const cv = mk(40, 26), g = cv.getContext('2d');
    g.beginPath(); g.moveTo(2, 3); g.quadraticCurveTo(18, -1, 37, 4); g.lineTo(37, 22); g.quadraticCurveTo(18, 17, 2, 22); g.closePath();
    g.save(); g.clip();
    if (v.flag === 'chkr') { for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) { g.fillStyle = (r + c) % 2 ? '#d42a2a' : '#fff6e8'; g.fillRect(2 + c * 5.2, 1 + r * 6, 5.2, 6); } }
    else if (v.flag === 'chk') { for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { g.fillStyle = (r + c) % 2 ? INK : '#fff6e8'; g.fillRect(2 + c * 6, 1 + r * 7.5, 6, 7.5); } }
    else { g.fillStyle = v.flag[0]; g.fillRect(0, 0, 40, 13); g.fillStyle = v.flag[1]; g.fillRect(0, 13, 40, 13); }
    g.restore(); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke();
    if (P.night) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(18,10,40,0.42)'; g.fillRect(0, 0, 40, 26); g.globalCompositeOperation = 'source-over'; }
    return cv;
  }
  function buildCrowd() {
    const r = rng(4242), FL = ['chk', 'chk', 'chkr', 'chk'];
    const HS = ['short', 'short', 'curly', 'buzz', 'long', 'short', 'bald', 'long', 'bun', 'curly'];
    T.crowd = [];
    for (let i = 0; i < CR_N; i++) {
      const kind = CR_KIND[Math.floor(r() * CR_KIND.length)], hairStyle = HS[Math.floor(r() * HS.length)];
      const v = { kind: kind, hairStyle: hairStyle, shirt: Math.floor(r() * CR_SHIRT.length), skin: Math.floor(r() * CR_SKIN.length), hair: Math.floor(r() * CR_HAIR.length), pants: Math.floor(r() * CR_PANTS.length),
        inner: CR_SHIRT[Math.floor(r() * CR_SHIRT.length)], print: kind === 'tee' && r() < 0.35 ? CR_SHIRT[Math.floor(r() * CR_SHIRT.length)] : null,
        cap: hairStyle !== 'long' && hairStyle !== 'bun' && r() < 0.24 ? CR_SHIRT[Math.floor(r() * CR_SHIRT.length)] : null, capBack: r() < 0.4,
        beard: hairStyle !== 'long' && hairStyle !== 'bun' && r() < 0.35 ? (r() < 0.5 ? 'full' : 'stubble') : null,
        shades: r() < 0.38, wide: Math.floor(r() * 5), flag: null, phone: false };
      const acc = r(); if (acc < 0.22) v.flag = FL[Math.floor(r() * FL.length)]; else if (acc < 0.36) v.phone = true;
      T.crowd.push({ v: v, p: [0, 1, 2].map(k => crowdFigure(r, k, v)), f: v.flag ? crowdFlag(v) : null });
    }
  }
  const hash = n => { n = (n * 374761393 + 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  function crowdZone(ctx, camX, m0, m1, e, t, seed) {
    /* prima fila davanti alla folla disegnata: persone grandi, ognuna col suo tempo */
    const step = 0.95, x0 = Math.max(m0 + 0.4, Math.floor((camX - 2) / step) * step), x1 = Math.min(m1 - 0.4, camX + W / PPM + 2);
    if (x0 > x1) return;
    for (let row = 0; row < 1; row++) {
      const yb = 452, sc = 1.55, off = 0;
      for (let m = Math.ceil((x0 - off) / step) * step + off; m <= x1; m += step) {
        const id = Math.round(m / step * 2) + seed * 1000 + row * 7;
        const h = hash(id);
        if (h < 0.06) continue;
        const fig = T.crowd[Math.floor(hash(id + 31) * CR_N)];
        const ph = h * TAU, sp = 5 + hash(id + 7) * 6;
        /* ognuno cambia posa per conto suo: chi applaude, chi alza i pugni, chi riposa un attimo */
        const own = Math.sin(t * (0.6 + hash(id + 5) * 0.9) + ph * 3);
        const mood = e + 0.35 * own - 0.1 + hash(id + 3) * 0.2;
        let pose = 0;
        if (mood > 0.75) pose = Math.sin(t * sp * 0.55 + ph) > -0.35 ? 2 : 1;
        else if (mood > 0.4) pose = Math.sin(t * sp + ph) > 0 ? 1 : 0;
        else if (mood > 0.25 && Math.sin(t * 0.7 + ph * 5) > 0.85) pose = 2;
        const jump = e > 0.55 ? Math.max(0, Math.sin(t * sp * 0.9 + ph)) * 7 * (e - 0.4) : Math.max(0, Math.sin(t * 1.5 + ph)) * 0.8;
        const x = (m - camX) * PPM, w = CW * sc, hh = CHT * sc;
        const dx = Math.round(x - FX * sc), dy = Math.round(yb - FY * sc - jump * sc);
        ctx.drawImage(fig.p[pose], dx, dy, w, hh);
        if (pose === 2 && fig.f) {
          const wav = Math.sin(t * 9 + ph) * 3;
          ctx.drawImage(fig.f, dx + (39 - fig.v.wide) * sc, dy + (-20 + wav) * sc, 40 * sc * (1 - Math.abs(wav) * 0.04), 26 * sc);
          ctx.strokeStyle = INK; ctx.lineWidth = 2.5 * sc; ctx.beginPath(); ctx.moveTo(dx + (39 - fig.v.wide + 1) * sc, dy + 6 * sc); ctx.lineTo(dx + (39 - fig.v.wide + 2) * sc, dy + (-20 + wav) * sc); ctx.stroke();
        }
      }
    }
  }
  /* Folla: la striscia disegnata da Christian ripetuta dietro le barriere, una volta dritta e una specchiata.
     Ogni blocco salta un po' quando la folla esulta; i pali della rete coprono le giunture. */
  /* la vecchia striscia di folla dipinta non c'è più: restano i tifosi animati */
  const CROWD = { complete: false, width: 0 };
  /* ogni tifoso è un'immagine o una lista di fotogrammi */
  const FANIMG = (typeof FANS !== 'undefined' ? FANS : []).map(f => (Array.isArray(f) ? f : [f]).map(src => { const i = new Image(); i.src = src; return i; }));
  const mkImg = src => { const i = new Image(); i.src = src; return i; };
  const FXS = typeof FX_SMOKE !== 'undefined' ? FX_SMOKE.map(mkImg) : [], FXF = typeof FX_FLAME !== 'undefined' ? FX_FLAME.map(mkImg) : [];
  /* zona industriale: edifici di Christian, recinzione, skyline di fabbriche */
  const IND = (typeof IND_BUILDINGS !== 'undefined' ? IND_BUILDINGS : []).map(b => ({ k: b[0], m: b[1], im: mkImg(b[2]) }));
  const FENCE = typeof IND_FENCE !== 'undefined' ? mkImg(IND_FENCE) : null;
  const CURB = typeof IND_CURB !== 'undefined' ? mkImg(IND_CURB) : null;
  const ROADIMG = typeof IND_ROAD !== 'undefined' ? mkImg(IND_ROAD.img) : null;
  const DECALS = typeof ROAD_DECALS !== 'undefined' ? ROAD_DECALS.map(mkImg) : [];
  const GANTRY = typeof START_GANTRY !== 'undefined' ? mkImg(START_GANTRY.img) : null;
  const LIGHTS5 = typeof START_LIGHTS !== 'undefined' ? mkImg(START_LIGHTS) : null;
  const LAMPS = typeof LAMP_ON !== 'undefined' ? { red: mkImg(LAMP_ON.red), green: mkImg(LAMP_ON.green) } : null;

  const HFLAG = typeof HOSTESS_FLAG !== 'undefined' ? { ax: HOSTESS_FLAG.ax, f: HOSTESS_FLAG.frames.map(mkImg) } : null;
  const HFIN = typeof HOSTESS_FINISH !== 'undefined' ? { ax: HOSTESS_FINISH.ax, f: HOSTESS_FINISH.frames.map(mkImg) } : null;
  const PROPI = typeof PROPS !== 'undefined' ? PROPS.items.map(mkImg) : [];
  const GRASSI = typeof GRASS !== 'undefined' ? mkImg(GRASS.img) : null;
  const SIGNI = typeof SIGNS !== 'undefined' ? { s100: mkImg(SIGNS.s100), s200: mkImg(SIGNS.s200), blank: mkImg(SIGNS.blank) } : null;
  const okImg = i => i && i.complete && i.width;
  const ZAL = typeof ZA_DOOR_LOGO !== 'undefined' ? mkImg(ZA_DOOR_LOGO) : null;
  const NUI = typeof NITRO_UI !== 'undefined' ? { bottle: mkImg(NITRO_UI.bottle), frame: mkImg(NITRO_UI.frame), fill: mkImg(NITRO_UI.fill) } : null;
  /* cartelli delle distanze, vegetazione e recinzioni basse di Christian */
  const DSI = typeof DIST_SIGNS !== 'undefined' ? Object.fromEntries(Object.entries(DIST_SIGNS).filter(([k]) => k !== 'k').map(([k, u]) => [k, mkImg(u)])) : null;
  const VEGI = typeof VEG !== 'undefined' ? Object.fromEntries(Object.entries(VEG).filter(([k]) => k !== 'k').map(([k, u]) => [k, mkImg(u)])) : null;
  const LFI = typeof LOW_FENCE !== 'undefined' ? Object.fromEntries(Object.entries(LOW_FENCE).filter(([k]) => k !== 'k').map(([k, u]) => [k, mkImg(u)])) : null;
  function distSign(ctx, x, im) {
    if (!okImg(im)) return;
    const k = DIST_SIGNS.k / 1.25, w = im.width / k, h = im.height / k, x0 = Math.round(x - w / 2), y0 = 420 - h;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(x, 420, w * 0.3, 3, 0, 0, TAU); ctx.fill();
    ctx.drawImage(im, x0, y0, w, h);
  }
  /* oggetti sull'asfalto in posizioni casuali ma sempre uguali (un tratto ogni 18 m) */
  const dhash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  function roadDecals(ctx, camX, fin) {
    if (!DECALS.length) return;
    const seg = 18;
    for (let k = Math.floor((camX - 12) / seg); k * seg < camX + W / PPM + 4; k++) {
      if (dhash(k) > 0.55) continue;
      const m = k * seg + dhash(k + 0.31) * 10;
      if (m < 6 || Math.abs(m - fin) < 8) continue;
      const im = DECALS[Math.floor(dhash(k + 0.57) * DECALS.length) % DECALS.length]; if (!okImg(im)) continue;
      const ln = Math.floor(dhash(k + 0.83) * 4) % 4, sc = laneS(ln) / laneS(3) * (0.8 + dhash(k + 0.11) * 0.3);
      const w = im.width * sc, h = im.height * sc, x = (m - camX) * PPM;
      ctx.drawImage(im, Math.round(x - w / 2), Math.round((LB[ln] + LB[ln + 1]) / 2 - h / 2), w, h);
    }
  }
  const JERSEY = typeof IND_JERSEY !== 'undefined' ? mkImg(IND_JERSEY) : null;
  const RAIL = typeof IND_RAIL !== 'undefined' ? mkImg(IND_RAIL) : null;
  const BANNERS = (typeof IND_BANNERS !== 'undefined' ? IND_BANNERS : []).map(mkImg);
  const SKYL = typeof IND_SKYLINE !== 'undefined' ? mkImg(IND_SKYLINE) : null;
  function crowdTiles() {
    if (T.crowdT || !CROWD.complete || !CROWD.width) return T.crowdT;
    const h = 108, w = Math.round(CROWD.width * h / CROWD.height);
    T.crowdT = [false, true].map(flip => {
      const cv = mk(w, h), c = cv.getContext('2d');
      if (flip) { c.translate(w, 0); c.scale(-1, 1); }
      c.drawImage(CROWD, 0, 0, w, h);
      c.setTransform(1, 0, 0, 1, 0, 0);
      if (P.night) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(20,10,45,0.45)'; c.fillRect(0, 0, w, h); }
      else if (LIGHT === 'tramonto') { c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(255,120,60,0.12)'; c.fillRect(0, 0, w, h); }
      return cv;
    });
    return T.crowdT;
  }
  /* La striscia viene disegnata a fette verticali sottili: ogni fetta sale e scende seguendo due onde
     che scorrono lungo la folla, così le persone saltano a gruppi senza tagli netti. */
  function crowdBand(ctx, camX, m0, m1, e, t) {
    const tiles = crowdTiles();
    if (!tiles) { confetti(ctx, camX, m0, m1, e, t, BASE - 98); return; }
    const th = tiles[0].height, tw = tiles[0].width / PPM, x0 = Math.max(m0, camX - tw), x1 = Math.min(m1, camX + W / PPM + tw);
    if (x0 >= x1) return;
    const x = m => Math.round((m - camX) * PPM), top = BASE + 10 - th;
    const amp = 1.2 + Math.max(0, e - 0.2) * 9, SL = 6;
    const L = Math.max(x(m0), 0), R = Math.min(x(m1), W);
    for (let i = Math.floor((x0 - m0) / tw); m0 + i * tw < x1; i++) {
      const tx = x(m0 + i * tw), im = tiles[((i % 2) + 2) % 2];
      for (let sx = 0; sx < im.width; sx += SL) {
        const px = tx + sx; if (px + SL < L || px > R) continue;
        const wx = (m0 + i * tw) * PPM + sx;
        const off = (Math.sin(wx * 0.045 + t * 8.5) * 0.55 + Math.sin(wx * 0.013 - t * 4.7) * 0.45) * amp;
        const jump = Math.max(0, off), sw = Math.min(SL, im.width - sx, R - px);
        if (sw <= 0) continue;
        const cut = px < L ? L - px : 0;
        ctx.drawImage(im, sx + cut, 0, sw - cut, th, px + cut, Math.round(top - jump), sw - cut, th);
      }
    }
    /* pali della rete sulle giunture e alle estremità */
    const post = px => { if (px < -20 || px > W + 20) return; ctx.beginPath(); ctx.rect(px - 5, top + 4, 10, th - 4); inked(ctx, P.night ? '#4a4658' : '#8a8f9c', 2.5); ctx.beginPath(); ctx.arc(px, top + 2, 6, 0, TAU); inked(ctx, P.night ? '#4a4658' : '#8a8f9c', 2.5); };
    for (let i = Math.floor((x0 - m0) / tw); m0 + i * tw < m1 - 0.5; i++) post(x(m0 + i * tw));
    post(x(m1));
    confetti(ctx, camX, m0, m1, e, t, top);
  }
  function confetti(ctx, camX, m0, m1, e, t, top) {
    const x = m => Math.round((m - camX) * PPM);
    /* coriandoli quando la folla esulta al massimo */
    if (e > 0.7) {
      const n = Math.round((e - 0.7) * 260), cols = ['#ffd23f', '#ff2e7e', '#19c3d1', '#3cf07a', '#ff6a1f', '#ffffff', '#8a3cf0'];
      for (let k = 0; k < n; k++) {
        const h1 = Math.sin(k * 12.9898) * 43758.5453 % 1, h2 = Math.sin(k * 78.233) * 12345.678 % 1, fall = 40 + Math.abs(h2) * 60;
        const cx = x(m0) + Math.abs(h1) * (x(m1) - x(m0)) + Math.sin(t * 2 + k) * 14, cy = top - 70 + ((t * fall + Math.abs(h2) * 400) % 260);
        if (cx < -10 || cx > W + 10) continue;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 3 + k); ctx.fillStyle = cols[k % cols.length]; ctx.fillRect(-3, -1.5, 6, 3); ctx.restore();
      }
    }
  }
  /* Prima fila: i personaggi di Christian appoggiati alla balaustra. Ognuno salta, ondeggia e si schiaccia
     all'atterraggio con il suo ritmo; le gambe restano coperte da barriere e strada. */
  const FAN_H = 76; /* circa 1,75 m alla scala delle auto della corsia lontana */
  function fanTiles() {
    if (T.fanT) return T.fanT;
    if (!FANIMG.length || !FANIMG.flat().every(i => i.complete && i.width)) return null;
    const ref = FANIMG[FANIMG.length > 1 ? 1 : 0][0];
    T.fanT = FANIMG.map(list => list.map(im => [false, true].map(flip => {
      const w = Math.round(im.width * FAN_H / im.height), cv = mk(w, FAN_H), c = cv.getContext('2d');
      c.imageSmoothingQuality = 'high';
      if (flip) { c.translate(w, 0); c.scale(-1, 1); }
      c.drawImage(im, 0, 0, w, FAN_H); c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      if (P.night) { c.fillStyle = 'rgba(25,15,60,0.4)'; c.fillRect(0, 0, w, FAN_H); }
      else if (LIGHT === 'tramonto') { c.fillStyle = 'rgba(255,130,70,0.12)'; c.fillRect(0, 0, w, FAN_H); }
      return cv;
    })));
    return T.fanT;
  }
  function fanRow(ctx, camX, m0, m1, e, t, seed) {
    const tiles = fanTiles(); if (!tiles) return;
    const step = 0.9, foot = BASE + 24;
    for (let m = Math.ceil((m0 + 0.8) / step) * step; m < m1 - 0.8; m += step) {
      const x = (m - camX) * PPM; if (x < -80 || x > W + 80) continue;
      const id = Math.round(m / step) + seed * 100, h = hash(id), h2 = hash(id + 9);
      /* giro fisso tra tutti i personaggi: mai due uguali vicini */
      const k = Math.round(m / step) + seed * 3, ORD = [0, 1, 2, 3, 1, 0, 3, 2], n = ORD.length, kk = ((k % n) + n) % n;
      const seq = tiles[ORD[kk] % tiles.length], flip = (((Math.floor(k / n)) % 2) + 2) % 2;
      /* animati: velocità legata all'esultanza, ognuno parte da un fotogramma diverso */
      const fi = seq.length > 1 ? Math.floor(t * (2.5 + 9 * Math.max(0.1, e)) + hash(id + 21) * seq.length) % seq.length : 0;
      const im = seq[fi][flip], animated = seq.length > 1;
      const ph = h * TAU, sp = 6 + h2 * 4, ex = Math.max(0.12, e);
      /* salto: mezza sinusoide, più alto quando la folla esulta; a riposo solo un dondolio */
      const s = Math.sin(t * sp + ph), up = Math.max(0, s), land = Math.max(0, -s);
      const jump = up * (ex > 0.5 ? 14 * (ex - 0.3) : 2);
      const squash = 1 - land * 0.06 * ex, stretch = 1 + up * 0.04 * ex;
      const rot = Math.sin(t * sp * 0.5 + ph * 2) * (animated ? 0.01 : 0.03 + 0.06 * ex);
      const w = im.width, hh = FAN_H;
      ctx.save(); ctx.translate(x, foot - jump); ctx.rotate(rot); ctx.scale(1 / squash > 1.08 ? 1.08 : 1 / squash, squash * stretch);
      ctx.drawImage(im, -w / 2, -hh, w, hh); ctx.restore();
    }
  }
  function drawCrowd(ctx, st) {
    const c = st.crowd || { a: 0.15, b: 0.15, t: performance.now() / 1000 }, fin = st.dist;
    crowdBand(ctx, st.camX, -15, 13, c.a, c.t);
    if (fin) crowdBand(ctx, st.camX, fin - 18, fin + 28, c.b, c.t);
    fanRow(ctx, st.camX, -15, 13, c.a, c.t, 1);
    if (fin) fanRow(ctx, st.camX, fin - 18, fin + 28, c.b, c.t, 2);
  }


  /* zona industriale: recinzione dove ci sono i tifosi (via e arrivo), muro continuo altrove, striscioni ZA appesi */
  /* oggettistica sparsa davanti al muro, in posizioni casuali ma sempre uguali (niente davanti ai tifosi) */
  function sideProps(ctx, camX, fin) {
    if (!PROPI.length) return;
    const seg = 11, k = PROPS.k;
    for (let i = Math.floor((camX - 20) / seg); i * seg < camX + W / PPM + 20; i++) {
      if (dhash(i * 3.7 + 1.3) > 0.5) continue;
      const m = i * seg + dhash(i + 0.77) * 6;
      if ((m > -18 && m < 16) || (fin && m > fin - 21 && m < fin + 31)) continue;
      const pi = Math.floor(dhash(i + 0.21) * PROPI.length) % PROPI.length, im = PROPI[pi]; if (!okImg(im)) continue;
      const pk = pi === 4 ? 1.15 : 1.7, w = im.width / k * pk, h = im.height / k * pk, x = (m - camX) * PPM;
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(x, ROAD_TOP + 3, w * 0.45, 3, 0, 0, TAU); ctx.fill();
      ctx.drawImage(im, Math.round(x - w / 2), ROAD_TOP + 4 - h, w, h);
    }
  }
  function industrialBarrier(ctx, camX, fin) {
    const zones = [[-15, 13]].concat(fin ? [[fin - 18, fin + 28]] : []), xs = m => Math.round((m - camX) * PPM), base = 441;
    const left = camX, right = camX + W / PPM;
    /* muro continuo su tutta la vista, poi la recinzione sopra nei tratti coi tifosi */
    if (JERSEY && JERSEY.complete && JERSEY.width) {
      if (!T.jersey) { const h = 40, w = JERSEY.width, cv = mk(w, h), c2 = cv.getContext('2d'); c2.drawImage(JERSEY, 0, 0); if (P.night) { c2.globalCompositeOperation = 'source-atop'; c2.fillStyle = 'rgba(25,15,60,0.5)'; c2.fillRect(0, 0, w, h); } T.jersey = cv; }
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H);
      zones.forEach(z => { if (z[1] > left && z[0] < right) ctx.rect(xs(z[1]), 0, xs(z[0]) - xs(z[1]), H); });
      ctx.clip('evenodd');
      if (RAIL && RAIL.complete && RAIL.width) tileDraw(ctx, RAIL, camX * PPM, base - T.jersey.height - RAIL.height + 6);
      tileDraw(ctx, T.jersey, camX * PPM, base - T.jersey.height); ctx.restore();
    }
    zones.forEach(z => {
      if (z[1] < left || z[0] > right) return;
      ctx.save(); ctx.beginPath(); ctx.rect(xs(z[0]), 0, xs(z[1]) - xs(z[0]), H); ctx.clip();
      tileDraw(ctx, T.fence, camX * PPM, base - (T.fence._lh || T.fence.height)); ctx.restore();
    });
    /* striscioni: ogni 26 m sul muro, alternati; nei tratti dei tifosi legati alla recinzione */
    if (BANNERS.length && BANNERS.every(b => b.complete && b.width)) {
      const step = 26;
      for (let m = Math.floor(left / step) * step; m < right + step; m += step) {
        const im = BANNERS[((Math.round(m / step) % BANNERS.length) + BANNERS.length) % BANNERS.length];
        /* grandi: dal marciapiede fino alla rete in alto */
        const fh = (T.fence && (T.fence._lh || T.fence.height)) || 86, wh = (T.jersey ? T.jersey.height : 40) + (RAIL && RAIL.height ? RAIL.height - 6 : 0);
        const inZone = zones.some(z => m > z[0] && m < z[1]), h = inZone ? Math.min(54, fh - 10) : Math.max(46, wh - 4), w = im.width * h / im.height;
        const x = xs(m), y = base - h - 3;
        if (x + w < 0 || x - w > W) continue;
        if (P.night) { ctx.save(); ctx.globalAlpha = 0.78; }
        ctx.drawImage(im, x - w / 2, y, w, h);
        if (P.night) ctx.restore();
      }
    }
  }
  function drawWorld(ctx, st) {
    const camX = st.camX, off = camX * PPM;
    if (!T.sky) {
      /* cielo, sole e luna disegnati una volta sola */
      T.sky = mk(W, BASE + 2); const c2 = T.sky.getContext('2d');
      const sg = c2.createLinearGradient(0, 0, 0, BASE);
      P.sky.forEach((cc, i) => sg.addColorStop(i / (P.sky.length - 1), cc));
      c2.fillStyle = sg; c2.fillRect(0, 0, W, BASE + 2);
      if (P.sun) c2.drawImage(T.sun, P.sunX - P.sunR - 2, P.sunY - P.sunR - 2);
      if (P.plainSun && SKYI && SKYI.sun.complete && SKYI.sun.width) c2.drawImage(SKYI.sun, P.sunX - P.sunR * 1.3, P.sunY - P.sunR * 1.3, P.sunR * 2.6, P.sunR * 2.6);
      else if (P.plainSun) { c2.fillStyle = 'rgba(255,255,255,0.35)'; c2.beginPath(); c2.arc(P.sunX, P.sunY, P.sunR * 1.6, 0, TAU); c2.fill(); c2.fillStyle = P.sunC[1]; c2.beginPath(); c2.arc(P.sunX, P.sunY, P.sunR, 0, TAU); c2.fill(); }
      if (P.moon) {
        c2.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 50; i++) c2.fillRect((i * 331) % W, (i * 97) % 260, 2, 2);
        c2.fillStyle = '#fff4d6'; c2.beginPath(); c2.arc(P.sunX, P.sunY, P.sunR, 0, TAU); c2.fill();
        c2.fillStyle = P.sky[0]; c2.beginPath(); c2.arc(P.sunX + 12, P.sunY - 8, P.sunR * 0.85, 0, TAU); c2.fill();
      }
    }
      if (T.sky && !T.skyWashed) {
        T.skyWashed = true;
        /* foschia sull'orizzonte: cotta una volta nel cielo e nello sfondo lontano invece che a ogni fotogramma */
        /* niente foschia sull'orizzonte */
      }
    ctx.drawImage(T.sky, 0, 0);
    tileDraw(ctx, T.cl, off * 0.06, 0);
    if (T.hl) tileDraw(ctx, T.hl, off * 0.05, 0);
    if (T.hl2) tileDraw(ctx, T.hl2, off * 0.11, 0);
    tileDraw(ctx, T.fa, off * 0.18, 0);
    if (T.glint) {
      /* riflesso del sole o della luna sul lago, fermo sullo schermo */
      const gx = P.sunX, col = LIGHT === 'giorno' ? 'rgba(255,255,255,0.7)' : 'rgba(255,214,140,0.75)';
      ctx.fillStyle = col;
      for (let i = 0; i < 26; i++) { const y = 326 + i * 1.6, w = (6 + i * 1.8) * (0.6 + ((i * 37) % 10) / 12); ctx.fillRect(gx - w / 2 + ((i * 53) % 9) - 4, y, w, 1.2); }
    }

    tileDraw(ctx, T.bd, off * 0.35, 0);


    /* marciapiede e new jersey */
    ctx.fillStyle = P.walk; ctx.fillRect(0, BASE, W, 14);
    ctx.fillStyle = INK; ctx.fillRect(0, BASE, W, 3);
    if (ENV === 'citta' && VEGI && okImg(VEGI.tree)) {
      /* alberi dietro al muro, ogni tanto, lontano dai tifosi */
      const tr = VEGI.tree, th = 150, tw = tr.width * th / tr.height, seg = 19, fin = st.dist;
      for (let i = Math.floor((camX - 10) / seg); i * seg < camX + W / PPM + 10; i++) {
        if (dhash(i * 2.3 + 7.1) > 0.45) continue;
        const m = i * seg + dhash(i + 0.55) * 8; if ((m > -20 && m < 18) || (fin && m > fin - 22 && m < fin + 32)) continue;
        const sc = 0.85 + dhash(i + 0.12) * 0.3;
        ctx.drawImage(tr, Math.round((m - camX) * PPM - tw * sc / 2), Math.round(441 - th * sc), tw * sc, th * sc);
      }
    }
    drawCrowd(ctx, st);
    if (ENV === 'citta' && T.fence) industrialBarrier(ctx, camX, st.dist);
    if (ENV === 'citta') sideProps(ctx, camX, st.dist);
    else if (T.gok) {
      /* lungolago: pini ogni tanto e la balaustra con i vasi di fiori */
      const k = GARDA_IMG.k, tr = GIMG.tree, tw = tr.width / k, th = tr.height / k;
      for (let i = Math.floor((camX - 20) / 37); i * 37 < camX + W / PPM + 20; i++) {
        if (dhash(i * 1.9 + 0.4) > 0.6) continue;
        const x = (i * 37 + dhash(i + 0.3) * 12 - camX) * PPM; ctx.drawImage(tr, Math.round(x - tw / 2), 428 - th, tw, th);
      }
      const bl = GIMG.balu; bl._lw = bl.width / k; bl._lh = bl.height / k;
      tileDraw(ctx, bl, camX * PPM, ROAD_TOP + 3 - bl._lh);
    }
    else {
      const blk = 3, b0 = Math.floor(camX / blk) * blk;
      for (let m = b0; m < camX + W / PPM + blk; m += blk) {
        const x = (m - camX) * PPM, idx = Math.round(m / blk);
        ctx.drawImage(T.blk[((idx % 2) + 2) % 2], Math.round(x) - 1, 411);
      }
    }
    /* strada */
    const newRoad = (ENV === 'citta' || T.gok) && okImg(ROADIMG);
    if (newRoad) { tileDraw(ctx, ROADIMG, off, IND_ROAD.top); roadDecals(ctx, camX, st.dist || 402); }
    else {
      tileDraw(ctx, T.as, off, ROAD_TOP);
      ctx.fillStyle = 'rgba(20,10,25,0.3)'; ctx.fillRect(0, ROAD_TOP, W, 6);
      tileDraw(ctx, T.edgeFar, off, ROAD_TOP + 6);
    }
    /* segni di gomma dopo la linea di partenza */
    if (camX < 40) for (let i = 0; i < 4; i++) {
      const y = laneY(i) - 3, x0 = (-2 - camX) * PPM, x1 = (32 - camX) * PPM;
      const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(15,10,18,0.55)'); g.addColorStop(0.3, 'rgba(15,10,18,0.25)'); g.addColorStop(1, 'rgba(15,10,18,0)');
      ctx.fillStyle = g; ctx.fillRect(x0, y - 2, x1 - x0, 2 + i);
    }
    /* tratteggio tra le corsie: 4,5 m di striscia e 7,5 m di vuoto */
    if (!newRoad) for (let i = 1; i < 4; i++) {
      const y = LB[i] - T.dash[i - 1].height / 2, per = 12;
      for (let m = Math.floor(camX / per) * per; m < camX + W / PPM + per; m += per) ctx.drawImage(T.dash[i - 1], Math.round((m - camX) * PPM), Math.round(y));
    }
    if ((ENV === 'citta' || T.gok) && CURB && CURB.complete && CURB.width) {
      /* sotto la pista: marciapiede di cemento e prato pulito, poi l'erba di Christian sul bordo dello schermo */
      if (!T.low) {
        const lw = 512, lh = H - ROAD_BOT, cv = mkHi(lw, lh), g = cv.getContext('2d');
        const night = P.night, side = night ? '#5d5f78' : '#c9c6c0', sideD = night ? '#45475e' : '#a9a59f', lawn = night ? '#2e5a3a' : '#79b83f', lawnD = night ? '#244a2f' : '#5f9c32';
        const sw = LFI ? 6 : 34;
        g.fillStyle = side; g.fillRect(0, 0, lw, sw);
        if (!LFI) { g.fillStyle = sideD; for (let x = 0; x < lw; x += 64) g.fillRect(x, 0, 3, sw); g.fillRect(0, sw - 5, lw, 5); }
        g.fillStyle = INK; g.fillRect(0, sw, lw, 3);
        const gr = g.createLinearGradient(0, sw, 0, lh); gr.addColorStop(0, lawnD); gr.addColorStop(0.35, lawn); gr.addColorStop(1, lawn);
        g.fillStyle = gr; g.fillRect(0, sw + 3, lw, lh - sw - 3);
        if (LIGHT === 'tramonto') { g.fillStyle = 'rgba(255,130,70,0.08)'; g.fillRect(0, 0, lw, lh); }
        T.low = cv;
      }
      tileDraw(ctx, T.low, off, ROAD_BOT); tileDraw(ctx, CURB, off, ROAD_BOT - 10);
      const LF = LFI && (ENV === 'citta' ? LFI.metal : LFI.wood);
      if (okImg(LF)) {
        /* bordo basso: recinzione con la siepe di Christian e qualche cespuglio davanti */
        const fk = 92 / LF.height; LF._lw = LF.width * fk; LF._lh = 92; tileDraw(ctx, LF, off, H - LF._lh + 4);
        const bu = VEGI && VEGI.bush;
        if (okImg(bu)) {
          const seg = 9, bh = 62, bw = bu.width * bh / bu.height;
          for (let i = Math.floor((camX - 12) / seg); i * seg < camX + W / PPM + 12; i++) {
            if (dhash(i * 5.1 + 0.4) > 0.33) continue;
            const x = (i * seg + dhash(i + 0.31) * 5 - camX) * PPM, sc = 0.8 + dhash(i + 0.9) * 0.4;
            ctx.drawImage(bu, Math.round(x - bw * sc / 2), Math.round(H - bh * sc * 0.8), bw * sc, bh * sc);
          }
        }
      } else if (okImg(GRASSI)) { GRASSI._lw = GRASSI.width / GRASS.k; GRASSI._lh = GRASSI.height / GRASS.k; tileDraw(ctx, GRASSI, off, H - GRASSI._lh + 6); }
    }
    else { tileDraw(ctx, T.edgeNear, off, ROAD_BOT - 12); tileDraw(ctx, T.fg, off, ROAD_BOT); }
    const vis = m => m > camX - 8 && m < camX + W / PPM + 8, sx = m => (m - camX) * PPM;
    if (vis(0)) {
      /* linea di partenza dipinta, leggermente inclinata dalla prospettiva */
      ctx.beginPath(); ctx.moveTo(sx(0) + 6, ROAD_TOP + 10); ctx.lineTo(sx(0) + 6 + 0.3 * PPM, ROAD_TOP + 10); ctx.lineTo(sx(0) + 0.42 * PPM, ROAD_BOT - 12); ctx.lineTo(sx(0), ROAD_BOT - 12); ctx.closePath();
      ctx.fillStyle = 'rgba(245,238,222,0.9)'; ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      for (let i = 0; i < 4; i++) { const y = LB[i] + LH[i] * 0.45, fs = 20 + i * 5; ctx.font = fd(900, fs); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeText(String(4 - i), sx(1.6) + i * 3, y); ctx.fillStyle = '#f5eede'; ctx.fillText(String(4 - i), sx(1.6) + i * 3, y); }
    }
    const fin = st.dist;
    if (vis(fin)) {
      for (let i = 0; i < 4; i++) {
        const s = LH[i] / 5, y0 = LB[i] + (i ? 0 : 10), y1 = LB[i + 1] - (i === 3 ? 12 : 0);
        for (let yy = y0, row = 0; yy < y1; yy += s, row++) for (let c = 0; c < 4; c++) { ctx.fillStyle = (row + c) % 2 ? '#1e1a26' : '#f2ecde'; ctx.fillRect(sx(fin) + c * s * 0.9, yy, s * 0.9, Math.min(s, y1 - yy)); }
      }
    }
    if (DSI && (ENV === 'citta' || T.gok)) {
      for (let m = 100; m < fin - 20; m += 100) if (vis(m) && DSI['s' + m]) distSign(ctx, sx(m), DSI['s' + m]);
      if (fin === 402 && vis(fin - 3)) distSign(ctx, sx(fin - 3.2), DSI.s402);
      if (vis(fin + 10)) distSign(ctx, sx(fin + 10), DSI.arrivo);
    } else for (let m = 50; m < fin; m += 50) if (vis(m)) signBoard(ctx, sx(m), m + ' m');
    for (let m = -40; m < fin + 700; m += 32) if (vis(m) && !((ENV === 'citta' || T.gok) && Math.abs(m) < 14)) lamp(ctx, sx(m), Math.round(m / 32));
    if (vis(fin)) finishFlag(ctx, sx(fin), fin);
  }

  function signBoard(ctx, x, label) {
    if ((ENV === 'citta' || T.gok) && SIGNI && okImg(SIGNI.blank)) {
      /* cartelli di Christian: 100 e 200 sono disegnati, gli altri usano il cartello vuoto con il numero scritto sopra */
      const n = parseInt(label, 10), im = n === 100 && okImg(SIGNI.s100) ? SIGNI.s100 : n === 200 && okImg(SIGNI.s200) ? SIGNI.s200 : SIGNI.blank;
      const k = SIGNS.k, w = im.width / k, h = im.height / k, x0 = Math.round(x - w / 2), y0 = 418 - h;
      ctx.drawImage(im, x0, y0, w, h);
      if (im === SIGNI.blank) {
        const pn = SIGNS.panel, cx = x0 + (pn[0] + pn[2]) / 2 / k, cy = y0 + (pn[1] + pn[3]) / 2 / k;
        ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = fd(900, 19); ctx.fillText(String(n), cx, cy - 5); ctx.font = fd(900, 11); ctx.fillText('m', cx, cy + 10);
      }
      return;
    }
    ctx.fillStyle = INK; ctx.fillRect(x - 3, 372, 6, 44);
    rrect(ctx, x - 30, 350, 60, 28, 5); inked(ctx, '#ffd23f', 3);
    ctx.fillStyle = INK; ctx.font = fd(900, 19); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x, 365);
  }
  const SLAMPS = typeof STREET_LAMPS !== 'undefined' ? STREET_LAMPS.map(d => Object.assign({ im: mkImg(d.img) }, d)) : [];
  function lamp(ctx, x, k) {
    const L = SLAMPS.length ? SLAMPS[((k % SLAMPS.length) + SLAMPS.length) % SLAMPS.length] : null;
    if (L && okImg(L.im)) {
      const lk = L.k || 1, lw = L.im.width / lk, lh = L.im.height / lk, y0 = 437 - lh, lx = Math.round(x - L.pole);
      ctx.drawImage(L.im, lx, y0, lw, lh);
      if (P.night) L.heads.forEach(hd => {
        const hx = lx + hd[0], hy = y0 + hd[1];
        const g = ctx.createRadialGradient(hx, hy, 4, hx, hy, 170);
        g.addColorStop(0, 'rgba(255,214,130,0.45)'); g.addColorStop(1, 'rgba(255,214,130,0)');
        ctx.fillStyle = g; ctx.fillRect(hx - 170, hy - 170, 340, 560);
      });
      return;
    }
    ctx.beginPath(); ctx.rect(x - 4, 236, 8, 180); inked(ctx, P.pole, 2.5);
    ctx.beginPath(); ctx.moveTo(x, 240); ctx.quadraticCurveTo(x + 4, 222, x + 30, 224); ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = P.pole; ctx.lineWidth = 3; ctx.stroke();
    rrect(ctx, x + 20, 220, 30, 12, 5); inked(ctx, P.night ? '#fff0b8' : '#e4e1ea', 2.5);
    if (P.night) {
      const g = ctx.createRadialGradient(x + 35, 232, 4, x + 35, 232, 190);
      g.addColorStop(0, 'rgba(255,214,130,0.5)'); g.addColorStop(1, 'rgba(255,214,130,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 160, 42, 390, 670);
    }
  }
  function finishFlag(ctx, x, d) {
    ctx.beginPath(); ctx.rect(x - 4, 250, 8, 166); inked(ctx, P.pole, 2.5);
    ctx.save(); ctx.beginPath(); ctx.moveTo(x + 4, 254); ctx.quadraticCurveTo(x + 40, 244, x + 76, 256); ctx.lineTo(x + 76, 306); ctx.quadraticCurveTo(x + 40, 294, x + 4, 304); ctx.closePath();
    ctx.save(); ctx.clip();
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) { ctx.fillStyle = (r + c) % 2 ? INK : '#fff6e8'; ctx.fillRect(x + 4 + c * 9.5, 244 + r * 10, 9.5, 10); }
    ctx.restore(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    if (DSI && okImg(DSI.arrivo) && (ENV === 'citta' || T.gok)) return;
    rrect(ctx, x - 62, 340, 124, 30, 5); inked(ctx, '#ff2e7e', 3);
    ctx.fillStyle = '#fff6e8'; ctx.font = fd(900, 18); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(TX('hud.finish', d), x, 356);
  }
  function trafficLight(ctx, camX, phase, redLit) {
    const x = (-1.2 - camX) * PPM;
    if (x < -420 || x > W + 300) return;
    if ((ENV === 'citta' || T.gok) && okImg(LIGHTS5)) {
      /* pannello a 5 luci appeso a un braccio: spente al posizionamento, rosse al via, verdi in gara */
      const GN = GANTRY && okImg(GANTRY) ? GANTRY : null;
      const s = GN ? 0.85 : 0.8, pw = LIGHTS5.width * s, ph = LIGHTS5.height * s;
      let px = x + 30, py = 250;
      if (GN) {
        /* portale a traliccio centrato sulla linea di partenza, piedi sul marciapiede davanti alla rete */
        const gs = 1.25 / (START_GANTRY.k || 1), gw = GN.width * gs, gh = GN.height * gs, sl = x + 1.2 * PPM;
        const gx = Math.round(sl - gw / 2), gy = 440 - gh, hk = START_GANTRY.hooks.map(h => [h[0] * 1.25, h[1] * 1.25]);
        ctx.drawImage(GN, gx, gy, gw, gh);
        px = gx + (hk[0][0] + hk[1][0]) / 2 - pw / 2; py = gy + hk[0][1] + 10;
        ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
        [[hk[0], 66], [hk[1], 234]].forEach(([h, bx]) => { ctx.beginPath(); ctx.moveTo(gx + h[0], gy + h[1] - 2); ctx.lineTo(px + bx * s, py + 6); ctx.stroke(); });
      } else {
        ctx.beginPath(); ctx.rect(x - 6, 228, 12, 188); inked(ctx, P.pole, 3);
        ctx.beginPath(); ctx.rect(x - 6, 226, pw + 46, 10); inked(ctx, P.pole, 3);
      }
      ctx.drawImage(LIGHTS5, px, py, pw, ph);
      const key = phase === 'red' && redLit ? 'red' : (phase === 'race' || phase === 'finish') ? 'green' : null;
      if (key) { const on = key === 'red' ? '#ff3b28' : '#3cf07a', li = LAMPS && LAMPS[key];
        [40.5, 94.9, 149.2, 203.5, 257.8].forEach(lx => {
          const cx = px + lx * s, cy = py + 66.9 * s, r = 17 * s;
          const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 3); g.addColorStop(0, on + '99'); g.addColorStop(1, on + '00');
          ctx.fillStyle = g; ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
          if (okImg(li)) ctx.drawImage(li, cx - r, cy - r, r * 2, r * 2);
          else { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = on; ctx.fill(); }
        });
      }
      return;
    }
    ctx.beginPath(); ctx.rect(x - 5, 262, 10, 154); inked(ctx, P.pole, 3);
    ctx.beginPath(); ctx.rect(x - 5, 262, 92, 9); inked(ctx, P.pole, 3);
    rrect(ctx, x + 50, 282, 40, 100, 10); inked(ctx, '#211c2e', 4);
    const L = [['#ff3b28', '#5a1a14', phase === 'red' && redLit], ['#ffb22a', '#5a3d12', phase === 'stage'], ['#3cf07a', '#124a26', phase === 'race' || phase === 'finish']];
    L.forEach((l, i) => {
      const cy = 300 + i * 32;
      if (l[2]) { const g = ctx.createRadialGradient(x + 70, cy, 4, x + 70, cy, 54); g.addColorStop(0, l[0] + 'aa'); g.addColorStop(1, l[0] + '00'); ctx.fillStyle = g; ctx.fillRect(x + 16, cy - 54, 108, 108); }
      ctx.beginPath(); ctx.arc(x + 70, cy, 12, 0, TAU); inked(ctx, l[2] ? l[0] : l[1], 3);
      if (l[2]) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(x + 66, cy - 4, 4, 0, TAU); ctx.fill(); }
    });
  }

  /* ================= AUTO (immagini di Christian) ================= */
  /* Ogni auto del gioco usa una o più immagini (versioni). Le ruote sono sprite a parte e girano. */
  const CARMAP = { hatch: ['v3_hatch'], pickup: ['v3_alfa'], spider: ['v3_one'], berlina: ['v3_sedan'], e30: ['v3_e30'], gt: ['v3_e36'], golf: ['v3_golf'], rally: ['v3_delta'], coupe: ['v3_w190'] };
  const SP = {};
  const loads = [];
  function img(src) { const i = new Image(); i.src = src; loads.push(i.decode ? i.decode().catch(() => { }) : Promise.resolve()); return i; }
  Object.keys(CAR_SPRITES).forEach(k => {
    const d = CAR_SPRITES[k];
    SP[k] = Object.assign({}, d, { body: img(d.img), wheels: d.wheels.map(w => Object.assign({}, w, { im: img(w.img) })) });
  });
  Object.keys(CAR_PAINT).forEach(k => {
    const d = CAR_PAINT[k], sp = SP[k];
    sp.paint = { rest: img(d.rest), shade: img(d.shade), vmean: d.vmean, base: d.base, belt: d.belt, sill: d.sill, door: d.door, rims: d.rims.map(r => ({ im: img(r.img), vmean: r.vmean })) };
  });
  /* cerchi intercambiabili delle auto nuove e logo per gli adesivi */
  const RIMS = {}; (typeof CAR_RIMS !== 'undefined' ? CAR_RIMS : []).forEach(r => { RIMS[r.id] = img(r.img); });
  const ZAIMG = typeof ZA_LOGO !== 'undefined' ? img(ZA_LOGO) : null;
  IND.map(b => b.im).concat(JERSEY ? [JERSEY] : [], RAIL ? [RAIL] : [], BANNERS, FENCE ? [FENCE] : [], CURB ? [CURB] : [], ROADIMG ? [ROADIMG] : [], LIGHTS5 ? [LIGHTS5] : [], GANTRY ? [GANTRY] : [], LAMPS ? [LAMPS.red, LAMPS.green] : [], SLAMPS.map(l => l.im), DECALS, SKYL ? [SKYL] : [], SKYI ? [SKYI.sun].concat(SKYI.clouds) : [], GIMG ? Object.values(GIMG) : [], PROPI, GRASSI ? [GRASSI] : [], SIGNI ? [SIGNI.s100, SIGNI.s200, SIGNI.blank] : [], HFLAG ? HFLAG.f : [], HFIN ? HFIN.f : [], DSI ? Object.values(DSI) : [], VEGI ? Object.values(VEGI) : [], LFI ? Object.values(LFI) : [], BGL ? [BGL.hills, BGL.village, BGL.factories] : [], BGX, FXS, FXF, FANIMG.flat()).forEach(i => loads.push(i.decode ? i.decode().catch(() => { }) : Promise.resolve()));
  const ready = Promise.all(loads);
  const SHAPES = {};
  Object.keys(CARMAP).forEach(id => {
    const d = SP[CARMAP[id][0]];
    SHAPES[id] = { L: (d.front - d.rear) / d.ppm, wr: (d.wheels[0].x - d.rear) / d.ppm, wf: (d.wheels[1].x - d.rear) / d.ppm, top: d.ground / d.ppm };
  });
  function versions(id) { return CARMAP[id].length; }
  /* Ridimensionare 600 px a 200 px a ogni fotogramma pesa sui telefoni e fa perdere fotogrammi:
     ogni immagine viene scalata una volta per dimensione e poi riusata. */
  /* maschera di contrasto: ridà definizione ai contorni dopo la riduzione (solo per le carrozzerie, una volta per misura) */
  function sharpen(cv, amt) {
    const c = cv.getContext('2d'), w = cv.width, h = cv.height; let id;
    try { id = c.getImageData(0, 0, w, h); } catch (e) { return; }
    const d = id.data, o = new Uint8ClampedArray(d), row = w * 4;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * row + x * 4; if (o[i + 3] < 8) continue;
      for (let ch = 0; ch < 3; ch++) {
        const j = i + ch, b = (o[j - 4] + o[j + 4] + o[j - row] + o[j + row]) * 0.25;
        d[j] = o[j] + (o[j] - b) * amt;
      }
    }
    c.putImageData(id, 0, 0);
  }
  function scaled(im, w, h, sharp) {
    w = Math.max(1, Math.round(w * RS)); h = Math.max(1, Math.round(h * RS));
    const key = w + 'x' + h + (sharp ? 's' : '');
    im._c = im._c || {};
    if (im._c[key]) return im._c[key];
    let src = im, sw = im.width, sh = im.height;
    while (sw > w * 2) {
      const t = mk(Math.round(sw / 2), Math.round(sh / 2)); const tc = t.getContext('2d');
      tc.imageSmoothingQuality = 'high'; tc.drawImage(src, 0, 0, t.width, t.height);
      src = t; sw = t.width; sh = t.height;
    }
    const cv = mk(w, h), cc = cv.getContext('2d'); cc.imageSmoothingQuality = 'high'; try { cc.filter = VIVID; } catch (e) { } cc.drawImage(src, 0, 0, w, h);
    if (sharp) sharpen(cv, 0.7);
    const keys = Object.keys(im._c); if (keys.length > 12) delete im._c[keys[0]];
    im._c[key] = cv;
    return cv;
  }

  /* ---------- vernice, livree e cerchi personalizzati ---------- */
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  /* colora un'immagine di luminosità: sotto la media scurisce il colore, sopra lo schiarisce verso il bianco */
  function tint(im, hex, vmean) {
    const cv = mk(im.width, im.height), c = cv.getContext('2d');
    c.drawImage(im, 0, 0);
    const d = c.getImageData(0, 0, cv.width, cv.height), p = d.data, col = hexRgb(hex);
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const l = p[i] / vmean;
      for (let j = 0; j < 3; j++) p[i + j] = l <= 1 ? col[j] * (0.3 + 0.7 * l) : col[j] + (255 - col[j]) * Math.min(0.55, (l - 1) * 0.75);
    }
    c.putImageData(d, 0, 0);
    return cv;
  }
  function liveryDecal(c, sp, look) {
    const pa = sp.paint, Hh = pa.sill - pa.belt, B = pa.belt, a = look.accent || '#ffffff';
    const wr = sp.wheels[0], wf = sp.wheels[1], L = sp.front - sp.rear;
    c.fillStyle = a; c.strokeStyle = INK; c.lineJoin = 'round';
    switch (look.livery) {
      case 'strisce':
        c.fillRect(sp.rear - 5, B + Hh * 0.2, L + 10, Hh * 0.11);
        c.fillRect(sp.rear - 5, B + Hh * 0.36, L + 10, Hh * 0.04);
        break;
      case 'graffi': {
        const x0 = wf.x - wf.r * 1.25;
        for (let k = 0; k < 4; k++) {
          const yb = pa.sill - Hh * (0.12 + k * 0.11), len = L * (0.34 + k * 0.06);
          c.beginPath(); c.moveTo(x0 + k * 6, yb); c.lineTo(x0 - len, yb - Hh * (0.32 + k * 0.06)); c.lineTo(x0 + k * 6, yb - Hh * 0.09); c.closePath(); c.fill();
        }
        const q = Hh * 0.075;
        for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) { const f = 1 - i * 0.08; c.fillRect(x0 - L * 0.48 - i * q * 1.05, pa.sill - Hh * 0.62 + j * q, q * f, q * f); }
        break;
      }
      case 'scacchi': {
        const q = Hh * 0.11, x0 = wr.x + wr.r * 1.3, x1 = wf.x - wf.r * 1.35, y0 = pa.sill - q * 3.6;
        for (let x = x0, i = 0; x < x1; x += q, i++) for (let j = 0; j < 3; j++) {
          const edge = Math.min(x - x0, x1 - x) / (q * 4);
          if ((i + j) % 2 === 0 && (edge > 1 || ((i * 7 + j * 3) % 5) / 5 < edge)) c.fillRect(x, y0 + j * q, q + 0.5, q + 0.5);
        }
        break;
      }
      case 'duetoni':
        c.beginPath(); c.moveTo(sp.rear - 5, B + Hh * 0.5); c.lineTo(pa.door, B + Hh * 0.5); c.lineTo(pa.door + L * 0.12, B + Hh * 0.18); c.lineTo(sp.front + 5, B + Hh * 0.18);
        c.lineTo(sp.front + 5, sp.h); c.lineTo(sp.rear - 5, sp.h); c.closePath(); c.fill();
        c.lineWidth = 1.5; c.beginPath(); c.moveTo(sp.rear - 5, B + Hh * 0.5); c.lineTo(pa.door, B + Hh * 0.5); c.lineTo(pa.door + L * 0.12, B + Hh * 0.18); c.lineTo(sp.front + 5, B + Hh * 0.18); c.stroke();
        break;
      case 'fiamme': {
        const tongues = [[0.12, 0.42], [0.24, 0.62], [0.36, 0.5], [0.48, 0.7], [0.6, 0.46]];
        [[a, 1], ['#ffd23f', 0.6]].forEach(([col, k]) => {
          c.fillStyle = col; c.beginPath(); c.moveTo(sp.front + 5, B + Hh * 0.05);
          tongues.forEach(([y, len]) => { const tip = sp.front - L * len * k, yy = B + Hh * y; c.lineTo(tip + 20, yy - 4); c.quadraticCurveTo(tip - 2, yy - 2, tip, yy + 3); c.lineTo(tip + 24, yy + 6); });
          c.lineTo(sp.front + 5, B + Hh * 0.72); c.closePath(); c.fill();
        });
        break;
      }
      case 'mimetica': {
        const rr = rng(907), cols = [a, shade(a, -0.3)];
        for (let k = 0; k < 24; k++) {
          const x = sp.rear + rr() * L, y = B - Hh * 0.4 + rr() * Hh * 1.6, w = Hh * (0.1 + rr() * 0.16);
          c.fillStyle = cols[k % 2]; c.beginPath();
          for (let p = 0; p < 7; p++) { const an = p / 7 * TAU, rad = w * (0.6 + rr() * 0.6); p ? c.lineTo(x + Math.cos(an) * rad * 1.5, y + Math.sin(an) * rad) : c.moveTo(x + Math.cos(an) * rad * 1.5, y + Math.sin(an) * rad); }
          c.closePath(); c.fill();
        }
        break;
      }
      case 'numero': {
        const r = Hh * 0.27, x = pa.door, y = B + Hh * 0.42;
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.lineWidth = 2.5; c.stroke();
        c.fillStyle = luma(a) > 0.55 ? INK : '#ffffff'; c.font = fd(900, r * 1.35); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(String(look.num || 7), x, y + r * 0.05);
        break;
      }
      case 'teamza': {
        /* skin TEAM ZA dal furgone di ZA Trasporti e Scavi: davanti bianco, dietro nero con la grande ZA gialla a contorno,
           fascia gialla e nera sotto le porte, piccolo logo sulla porta */
        const Y = '#ffc21a', BLK = '#17171b', split = pa.door - L * 0.15;
        c.fillStyle = '#f4f4f2'; c.fillRect(split, -10, sp.front - split + 20, sp.h + 20);
        c.fillStyle = BLK; c.fillRect(sp.rear - 20, -10, split - sp.rear + 20, sp.h + 20);
        const logo = (x, y, w, lw, hh) => {
          const h = hh || w * 0.62, P = pts => { c.beginPath(); pts.forEach(([u, v], i) => i ? c.lineTo(x + u * w, y + v * h) : c.moveTo(x + u * w, y + v * h)); c.closePath(); c.stroke(); };
          c.strokeStyle = Y; c.lineWidth = lw; c.lineJoin = 'miter';
          P([[0.04, 0], [0.56, 0], [0.56, 0.14], [0.2, 0.84], [0.5, 0.84], [0.5, 1], [0, 1], [0, 0.86], [0.36, 0.16], [0.04, 0.16]]);
          P([[0.36, 1], [0.66, 0.12], [1, 1], [0.84, 1], [0.66, 0.5], [0.52, 1]]);
          P([[0.6, 0.86], [0.66, 0.7], [0.72, 0.86]]);
        };
        const h0 = Hh * 0.8, w0 = Math.min((split - sp.rear) * 0.88, h0 * 2.1);
        /* inclinata come sul furgone: ruotata e in corsivo, un po' più grande, tagliata dai bordi della carrozzeria */
        { const lx = sp.rear + (split - sp.rear) * 0.64 + 4, ly = B + Hh * 0.06, ww = w0 * 0.95, hh = h0 * 0.95;
          c.save(); c.beginPath(); c.rect(sp.rear - 20, -10, split - sp.rear + 20, sp.h + 20); c.clip(); c.translate(lx, ly); c.rotate(0.26); c.transform(1, 0, -0.12, 1, 0, 0);
          logo(-ww / 2, -hh / 2, ww, Math.max(2.5, hh * 0.042), hh); c.restore(); }
        /* logo piccolo e scritta sulla porta bianca */
        const dw = Hh * 0.6, dx = split + (wf.x - wf.r * 1.1 - split) * 0.5 - dw / 2;
        if (okImg(ZAL)) { c.drawImage(ZAL, dx, B + Hh * 0.06, dw, dw * ZAL.height / ZAL.width); c.drawImage(ZAL, dx, B + Hh * 0.06, dw, dw * ZAL.height / ZAL.width); } else logo(dx, B + Hh * 0.12, dw, 2);
        c.fillStyle = '#2a2a30'; c.font = fd(900, Hh * 0.12); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('TEAM ZA', dx + dw / 2, B + Hh * (okImg(ZAL) ? 0.52 : 0.5), dw * 1.2);
        /* fascia gialla e nera sotto le porte */
        const sx0 = wr.x + wr.r * 1.15, sx1 = wf.x - wf.r * 1.15, sy = pa.sill - Hh * 0.13, shh = Hh * 0.065;
        c.save(); c.beginPath(); c.rect(sx0, sy, sx1 - sx0, shh); c.clip();
        c.fillStyle = BLK; c.fillRect(sx0, sy, sx1 - sx0, shh); c.fillStyle = Y;
        for (let x = sx0 - shh; x < sx1 + shh; x += shh * 1.6) { c.beginPath(); c.moveTo(x, sy + shh); c.lineTo(x + shh * 0.8, sy + shh); c.lineTo(x + shh * 1.6, sy); c.lineTo(x + shh * 0.8, sy); c.closePath(); c.fill(); }
        c.restore();
        break;
      }
      case 'za': {
        const x = (wr.x + wf.x) / 2 + (wf.x - wr.x) * 0.06, y = B + Hh * 0.4;
        c.font = fd(900, Hh * 0.24); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 3;
        c.strokeText('ZA RACING', x, y, (wf.x - wr.x) * 0.56); c.fillText('ZA RACING', x, y, (wf.x - wr.x) * 0.56);
        break;
      }
    }
  }
  /* adesivi: si possono combinare, stanno sopra la skin */
  /* adesivi: ognuno ha un riquadro di partenza; il giocatore lo può spostare (look.stPos[id] = [dx, dy] in pixel dell'immagine) */
  function stickerBox(sp, id) {
    const pa = sp.paint, Hh = pa.sill - pa.belt, B = pa.belt, wr = sp.wheels[0], wf = sp.wheels[1];
    const doorR = wr.x + wr.r * 1.1, mid = pa.door, doorF = wf.x - wf.r * 1.05;
    if (id === 'numero') { const r = Hh * 0.26, x = (mid + doorF) / 2, y = B + Hh * 0.42; return [x - r, y - r, r * 2, r * 2]; }
    if (id === 'za') { const archTop = wf.y - wf.r, h = Math.min(Hh * 0.3, (archTop - B) * 0.8), w = h * (ZAIMG && ZAIMG.width ? ZAIMG.width / ZAIMG.height : 1.8); return [wf.x - w * 0.45, B + (archTop - B - h) * 0.45, w, h]; }
    if (id === 'zaracing') { const w = (wf.x - wr.x) * 0.45, h = Hh * 0.17; return [(wr.x + wf.x) / 2 - w / 2, pa.sill - Hh * 0.12 - h / 2, w, h]; }
    if (id === 'tricolore') { const w = Math.min(Hh * 0.3, (sp.front - wf.x - wf.r) * 0.9), h = w * 0.32; return [sp.front - w - (sp.front - wf.x - wf.r - w) * 0.6, B + Hh * 0.2, w, h]; }
    if (id === 'sponsor') { const h = Hh * 0.12; return [doorR + 4, B + Hh * 0.24, Math.min(mid - doorR - 8, h * 8), h * 2.4]; }
    if (id === 'scacchi') { const archTop = wr.y - wr.r, q = Math.max(4, (archTop - B) * 0.22); return [wr.x - wr.r * 1.1, archTop - q * 2.6, wr.r * 2.2, q * 2]; }
    return [0, 0, 0, 0];
  }
  /* riquadro finale: posizione spostata e scala intorno al centro */
  function placed(sp, id, look) {
    const b = stickerBox(sp, id), o = (look.stPos && look.stPos[id]) || [0, 0], k = (look.stScale && look.stScale[id]) || 1;
    const cx = b[0] + b[2] / 2 + o[0], cy = b[1] + b[3] / 2 + o[1];
    return [cx - b[2] * k / 2, cy - b[3] * k / 2, b[2] * k, b[3] * k];
  }
  function stickerBoxes(id, version, look) {
    const keys = CARMAP[id], sp = SP[keys[Math.min(keys.length - 1, version | 0)]];
    if (!sp || !sp.paint) return [];
    return (look.stickers || []).map(s => { const b = placed(sp, s, look); return { id: s, x: b[0], y: b[1], w: b[2], h: b[3], rot: (look.stRot && look.stRot[s]) || 0 }; });
  }
  function stickers(c, sp, look, paintCol) {
    const pa = sp.paint, Hh = pa.sill - pa.belt;
    const light = luma(paintCol) > 0.55, fg = light ? INK : '#fff6e8', bg = light ? '#fff6e8' : INK;
    (look.stickers || []).forEach(id => {
      const [x, y, w, h] = placed(sp, id, look), rot = ((look.stRot && look.stRot[id]) || 0) * Math.PI / 180;
      c.save(); c.lineJoin = 'round'; c.translate(x + w / 2, y + h / 2); c.rotate(rot); c.translate(-w / 2, -h / 2);
      if (id === 'numero') {
        const r = w / 2;
        c.beginPath(); c.arc(r, r, r, 0, TAU); c.fillStyle = bg; c.fill(); c.lineWidth = 3; c.strokeStyle = fg; c.stroke();
        c.fillStyle = fg; c.font = fd(900, r * 1.3); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(String(look.num || 7), r, r * 1.05);
      } else if (id === 'za' && ZAIMG && ZAIMG.complete) {
        c.shadowColor = 'rgba(20,17,28,0.95)'; c.shadowOffsetX = 1.5; c.shadowOffsetY = 1.5;
        c.drawImage(ZAIMG, 0, 0, w, h);
      } else if (id === 'zaracing') {
        c.font = fd(900, h * 0.88); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 3; c.strokeStyle = bg;
        c.strokeText('ZA RACING', w / 2, h / 2, w); c.fillStyle = fg; c.fillText('ZA RACING', w / 2, h / 2, w);
      } else if (id === 'tricolore') {
        [['#1f9a4a', 0], ['#fff6e8', 1], ['#d6262c', 2]].forEach(([col, i]) => { c.fillStyle = col; c.fillRect(i * w / 3, 0, w / 3 + 0.5, h); });
        c.lineWidth = 1.2; c.strokeStyle = INK; c.strokeRect(0, 0, w, h);
      } else if (id === 'sponsor') {
        const hh = h / 2.4;
        [['STREET RACERS', '#14111c', '#ffd23f'], ['ZA SRL', '#fff6e8', '#14111c']].forEach(([t, b2, f2], i) => {
          c.font = fd(900, hh * 0.78); const ww = Math.min(w, c.measureText(t).width + hh * 0.8), yy = i * hh * 1.4;
          rrect(c, 0, yy, ww, hh, hh * 0.25); c.fillStyle = b2; c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke();
          c.fillStyle = f2; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(t, hh * 0.4, yy + hh * 0.54, ww - hh * 0.8);
        });
      } else if (id === 'scacchi') {
        const q = h / 2;
        for (let i = 0; i * q < w; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) { c.fillStyle = fg; c.fillRect(i * q, j * q, q, q); }
      }
      c.restore();
    });
  }
  /* la livrea prende luci e ombre della carrozzeria: pieghe e nervature restano visibili */
  function shadeLayer(cv, shadeIm, vmean) {
    const c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height), p = d.data;
    const sc = mk(cv.width, cv.height), sx = sc.getContext('2d'); sx.drawImage(shadeIm, 0, 0, cv.width, cv.height);
    const sh = sx.getImageData(0, 0, cv.width, cv.height).data;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const l = sh[i] / vmean;
      for (let j = 0; j < 3; j++) { const col = p[i + j]; p[i + j] = l <= 1 ? col * (0.3 + 0.7 * l) : col + (255 - col) * Math.min(0.55, (l - 1) * 0.75); }
    }
    c.putImageData(d, 0, 0);
  }
  function lookKey(look) { return [look.paint, look.livery, look.accent, look.num, (look.stickers || []).join(','), JSON.stringify(look.stPos || {}), JSON.stringify(look.stScale || {}), JSON.stringify(look.stRot || {}), look.skinRot || 0].join('|'); }
  function bodyFor(sp, look) {
    const plain = l => !l || l === 'orig' || l === 'nessuna';
    if (!look || !sp.paint || ((look.paint || 'orig') === 'orig' && plain(look.livery) && !(look.stickers && look.stickers.length))) return sp.body;
    sp._looks = sp._looks || {};
    const key = lookKey(look);
    if (sp._looks[key]) return sp._looks[key];
    const pa = sp.paint;
    if (!pa.shade.complete || !pa.rest.complete) return sp.body;
    const col = look.paint && look.paint !== 'orig' ? look.paint : pa.base;
    const cv = tint(pa.shade, col, pa.vmean), c = cv.getContext('2d');
    if (!plain(look.livery) || (look.stickers && look.stickers.length)) {
      const l2 = mk(cv.width, cv.height), lc = l2.getContext('2d');
      if (!plain(look.livery)) {
        /* la skin si può ruotare intorno al centro della fiancata */
        lc.save();
        if (look.skinRot) { const cx = (sp.rear + sp.front) / 2, cy = (sp.paint.belt + sp.paint.sill) / 2; lc.translate(cx, cy); lc.rotate(look.skinRot * Math.PI / 180); lc.translate(-cx, -cy); }
        liveryDecal(lc, sp, look); lc.restore();
      }
      if (look.stickers && look.stickers.length) stickers(lc, sp, look, col);
      lc.globalCompositeOperation = 'destination-in'; lc.drawImage(cv, 0, 0);
      shadeLayer(l2, pa.shade, pa.vmean);
      c.drawImage(l2, 0, 0);
    }
    c.drawImage(pa.rest, 0, 0);
    const keys = Object.keys(sp._looks); if (keys.length > 6) delete sp._looks[keys[0]];
    if (look.livery !== 'teamza' || okImg(ZAL)) sp._looks[key] = cv;
    return cv;
  }
  function wheelFor(sp, i, look) {
    const wh = sp.wheels[i];
    if (!look || !look.rim || look.rim === 'orig' || !sp.paint) return wh.im;
    wh._rims = wh._rims || {};
    if (wh._rims[look.rim]) return wh._rims[look.rim];
    const rs = sp.paint.rims[i];
    if (!rs || !rs.im.complete) return wh.im;
    const cv = mk(wh.im.width, wh.im.height), c = cv.getContext('2d');
    c.drawImage(wh.im, 0, 0);
    c.drawImage(tint(rs.im, look.rim, rs.vmean), 0, 0, cv.width, cv.height);
    wh._rims[look.rim] = cv;
    return cv;
  }

  /* o.x, o.y = muso a terra (pixel); o.sc = pixel per metro */
  function drawCar(c, id, o) {
    const keys = CARMAP[id], sp = SP[keys[Math.min(keys.length - 1, o.version | 0)]];
    if (!sp || !sp.body.complete) return;
    /* assetto: le auto nuove si abbassano sulle ruote (0 di serie, 1 sport, 2 ribassato) */
    const drop = sp.v2 && o.look ? [0, 5.7, 12.8][o.look.ride | 0] || 0 : 0;
    const k = o.sc / sp.ppm, x0 = Math.round((o.x - sp.front * k) * RS) / RS, y0 = Math.round((o.y - (sp.ground - drop) * k) * RS) / RS; /* allineate ai pixel veri: niente sfocatura */
    const midX = x0 + (sp.rear + sp.front) / 2 * k, halfL = (sp.front - sp.rear) / 2 * k;
    c.save();
    if (P.night) {
      const g = c.createRadialGradient(midX, o.y, 4, midX, o.y, halfL * 1.2);
      g.addColorStop(0, (o.glow || '#ff2e7e') + '99'); g.addColorStop(1, (o.glow || '#ff2e7e') + '00');
      c.fillStyle = g; c.fillRect(midX - halfL * 1.3, o.y - o.sc * 0.3, halfL * 2.6, o.sc * 0.55);
    }
    c.fillStyle = P.shadow; c.beginPath(); c.ellipse(midX, o.y + o.sc * 0.02, halfL * 1.04, o.sc * 0.13, 0, 0, TAU); c.fill();
    /* fiammata dallo scarico, dietro alla carrozzeria */
    if (o.flame > 0) {
      const fx = x0 + (sp.rear + 6) * k, fy = o.y - o.sc * 0.36;
      if (o.nitro) {
        /* nitro: alone azzurro lungo dietro lo scarico */
        const L = o.sc * (2.6 + Math.random() * 0.6), g = c.createLinearGradient(fx, 0, fx - L, 0);
        g.addColorStop(0, 'rgba(230,255,255,0.95)'); g.addColorStop(0.25, 'rgba(70,200,255,0.85)'); g.addColorStop(1, 'rgba(40,90,255,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(fx, fy - o.sc * 0.13); c.quadraticCurveTo(fx - L * 0.5, fy - o.sc * 0.2, fx - L, fy); c.quadraticCurveTo(fx - L * 0.5, fy + o.sc * 0.2, fx, fy + o.sc * 0.13); c.fill();
      }
      const fi = Math.min(7, Math.floor((1 - o.flame) * 8)), fim = FXF[fi];
      if (fim && fim.complete && fim.width) {
        /* fiammata disegnata da Christian: il beccuccio blu sta sullo scarico */
        const sz = o.sc * (o.nitro ? 2.4 : 1.7); c.drawImage(fim, fx - sz * 0.958, fy - sz * 0.524, sz, sz);
      } else {
        const len = o.sc * (0.7 + o.flame * 0.7);
        [['#ff6a1f', 0.14, 1], ['#ffd23f', 0.07, 0.6], ['#ffffff', 0.03, 0.3]].forEach(([col, w, m]) => {
          c.beginPath(); c.moveTo(fx, fy - o.sc * w); c.quadraticCurveTo(fx - len * m * 0.5, fy - o.sc * w * 1.4, fx - len * m, fy); c.quadraticCurveTo(fx - len * m * 0.5, fy + o.sc * w * 1.4, fx, fy + o.sc * w); c.closePath(); c.fillStyle = col; c.fill();
        });
      }
    }
    const bw = Math.round(sp.w * k), bh = Math.round(sp.h * k);
    const drawBody = () => { const bi = scaled(bodyFor(sp, o.look), bw, bh, true); c.drawImage(bi, x0, y0, bi.width / RS, bi.height / RS); };
    if (!sp.v2) drawBody();
    /* ruote che girano */
    const ang = o.wheelAng || 0, blur = o.blur || 0;
    const rimK = o.look && o.look.inch ? 1 + (o.look.inch - 18) * 0.045 : 1;
    sp.wheels.forEach((wh, i) => {
      if (!wh.im.complete) return;
      const rs = sp.v2 && o.look && o.look.rimStyle && RIMS[o.look.rimStyle];
      const src = sp.v2 ? (rs && rs.complete ? rs : wh.im) : wheelFor(sp, i, o.look);
      const s = sp.v2 ? Math.round(wh.r * 2 * k) : Math.round(wh.im.width * k * rimK);
      const cx = x0 + wh.x * k, cy = y0 + (wh.y - drop) * k, wi = scaled(src, s, s);
      const one = (a, alpha) => { c.save(); c.globalAlpha = alpha; c.translate(cx, cy); c.rotate(a); c.drawImage(wi, -s / 2, -s / 2, s, s); c.restore(); };
      one(ang, 1);
      if (blur > 0.3) { one(ang + 0.21, blur * 0.45); one(ang + 0.42, blur * 0.3); }
    });
    /* nelle auto nuove la carrozzeria copre la parte alta delle ruote */
    if (sp.v2) drawBody();
    /* luce dei freni e fari */
    if (o.brake) {
      const bx = x0 + (sp.rear + 10) * k, by = y0 + sp.h * 0.38 * k, g = c.createRadialGradient(bx, by, 2, bx, by, o.sc * 0.8);
      g.addColorStop(0, 'rgba(255,40,30,0.65)'); g.addColorStop(1, 'rgba(255,40,30,0)'); c.fillStyle = g; c.fillRect(bx - o.sc, by - o.sc, o.sc * 2, o.sc * 2);
    }
    if (P.night) {
      const hx = x0 + sp.front * k - 4, hy = y0 + sp.h * 0.45 * k, g = c.createLinearGradient(hx, 0, hx + o.sc * 6, 0);
      g.addColorStop(0, 'rgba(255,240,200,0.42)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(hx, hy - o.sc * 0.06); c.lineTo(hx + o.sc * 6, hy - o.sc * 0.4); c.lineTo(hx + o.sc * 6, o.y); c.lineTo(hx, hy + o.sc * 0.08); c.fill();
    }
    c.restore();
  }

  /* ================= PARTICELLE ================= */
  const parts = [];
  function puff(xm, y, sc) {
    if (parts.length > 240) return;
    if (FXS.length) { parts.push({ spr: 1, x: xm, y: y, vx: -2 - Math.random() * 2, vy: 0, r: sc, life: 1, max: 0.75 + Math.random() * 0.25 }); return; }
    parts.push({ x: xm, y: y, vx: -1.5 - Math.random() * 2, vy: -10 - Math.random() * 16, r: 10 * sc + Math.random() * 8, life: 1, max: 0.9 + Math.random() * 0.8 });
  }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt / p.max; p.x += p.vx * dt; p.y += p.vy * dt; p.r += 30 * dt;
      if (p.life <= 0) parts.splice(i, 1);
    }
  }
  function drawParts(ctx, camX) {
    parts.forEach(p => {
      if (p.spr) {
        /* sgommata disegnata da Christian: 8 fotogrammi lungo la vita della nuvola, ancorata alla ruota */
        const im = FXS[Math.min(7, Math.floor((1 - p.life) * 8))]; if (!im.complete || !im.width) return;
        const sz = 20 * p.r, x = (p.x - camX) * PPM; ctx.globalAlpha = 0.55 * Math.min(1, p.life * 2.5);
        ctx.drawImage(im, x - sz * 0.9, p.y - sz * 0.93, sz, sz); ctx.globalAlpha = 1; return;
      }
      const x = (p.x - camX) * PPM, a = Math.min(1, p.life * 1.3);
      ctx.fillStyle = 'rgba(200,196,214,' + (a * 0.6) + ')'; ctx.beginPath(); ctx.arc(x + p.r * 0.15, p.y + p.r * 0.2, p.r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.85) + ')'; ctx.beginPath(); ctx.arc(x, p.y, p.r * 0.92, 0, TAU); ctx.fill();
    });
  }
  function clearParts() { parts.length = 0; }

  /* ================= CRUSCOTTO ================= */
  function tach(c, cx, cy, R, st) {
    const p = st.player, car = p.car, zone = st.phase === 'red' || st.phase === 'stage' ? st.lz : st.sz;
    const max = Math.ceil((car.redline + 600) / 1000) * 1000;
    const a0 = Math.PI * 0.74, a1 = Math.PI * 2.26, A = v => a0 + (a1 - a0) * Math.max(0, Math.min(1, v / max));
    c.save(); c.lineJoin = 'round';
    c.fillStyle = INK; c.beginPath(); c.arc(cx, cy, R + 17, 0, TAU); c.fill();
    const bz = c.createLinearGradient(cx, cy - R, cx, cy + R); bz.addColorStop(0, '#80808c'); bz.addColorStop(1, '#2a2a31');
    c.fillStyle = bz; c.beginPath(); c.arc(cx, cy, R + 13, 0, TAU); c.fill();
    c.fillStyle = INK; c.beginPath(); c.arc(cx, cy, R + 4, 0, TAU); c.fill();
    c.fillStyle = '#121216'; c.beginPath(); c.arc(cx, cy, R + 1, 0, TAU); c.fill();
    const band = (a, b, col, r0, r1) => { c.beginPath(); c.arc(cx, cy, r1, A(a), A(b)); c.arc(cx, cy, r0, A(b), A(a), true); c.closePath(); c.fillStyle = col; c.fill(); };
    const inZone = p.rpm >= zone.lo && p.rpm <= zone.hi;
    band(car.redline, max, '#d8262a', R - 22, R - 4);
    band(zone.lo - 350, zone.hi + 350, '#0f5a26', R - 22, R - 4);
    band(zone.lo, zone.hi, inZone ? '#7dff4a' : '#2fd04a', R - 24, R - 3);
    c.strokeStyle = '#121216'; c.lineWidth = 2.5;
    for (let v = zone.lo - 350; v <= zone.hi + 350; v += (zone.hi - zone.lo + 700) / 6) { const a = A(v); c.beginPath(); c.moveTo(cx + Math.cos(a) * (R - 25), cy + Math.sin(a) * (R - 25)); c.lineTo(cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2)); c.stroke(); }
    c.strokeStyle = '#f4f4f6'; c.fillStyle = '#f4f4f6'; c.lineCap = 'butt';
    c.font = fd(900, R * 0.22); c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let v = 0; v <= max + 1; v += 250) {
      const a = A(v), maj = v % 1000 === 0, half = v % 500 === 0;
      c.lineWidth = maj ? 6 : half ? 3 : 2;
      const r1 = R - 4, r0 = R - (maj ? 24 : half ? 16 : 11);
      c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke();
      if (maj) c.fillText(String(v / 1000), cx + Math.cos(a) * (R - 44), cy + Math.sin(a) * (R - 44));
    }
    c.font = fd(900, R * 0.14); c.fillText('RPM', cx, cy + R * 0.5);
    c.font = fd(800, R * 0.1); c.fillText('x1000', cx, cy + R * 0.63);
    /* marcia */
    c.font = fd(900, R * 0.3); c.fillStyle = inZone && st.phase === 'race' ? '#7dff4a' : '#2fd04a';
    c.fillText(p.gear ? String(p.gear) : 'N', cx, cy + R * 0.27);
    /* lancetta */
    const a = A(p.rpm), ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca, L = R - 8;
    c.beginPath(); c.moveTo(cx - ca * 14 + nx * 7, cy - sa * 14 + ny * 7); c.lineTo(cx + ca * L + nx * 1.5, cy + sa * L + ny * 1.5); c.lineTo(cx + ca * L - nx * 1.5, cy + sa * L - ny * 1.5); c.lineTo(cx - ca * 14 - nx * 7, cy - sa * 14 - ny * 7); c.closePath();
    inked(c, '#ff2a2a', 3);
    c.beginPath(); c.arc(cx, cy, 17, 0, TAU); inked(c, '#4a4a54', 4);
    c.fillStyle = '#6a6a76'; c.beginPath(); c.arc(cx - 3, cy - 3, 7, 0, TAU); c.fill();
    c.restore();
  }

  const Q_COLOR = { perfetta: '#7dff4a', buona: '#fff3a8', anticipata: '#7fd8ff', tardiva: '#ffa23a', fuorigiri: '#ff4b3e', lenta: '#7fd8ff', eccessiva: '#ffa23a' };
  const Q_LABEL = new Proxy({}, { get: (o, k) => TX('q.' + String(k)) });

  function skewPanel(c, x, y, w, h, k, fill) {
    c.beginPath(); c.moveTo(x + k, y); c.lineTo(x + w, y); c.lineTo(x + w - k, y + h); c.lineTo(x, y + h); c.closePath();
    c.fillStyle = INK; c.save(); c.translate(0, 5); c.fill(); c.restore();
    inked(c, fill, 4);
  }

  function drawHud(c, st) {
    const p = st.player;
    tach(c, 152, 154, 118, st);
    /* pannello centrale */
    const px = 330, py = 16, pw = 640, ph = 140;
    skewPanel(c, px, py, pw, ph, 18, '#1d1733');
    c.save(); c.beginPath(); c.moveTo(px + 18, py); c.lineTo(px + pw, py); c.lineTo(px + pw - 18, py + ph); c.lineTo(px, py + ph); c.closePath(); c.clip();
    c.fillStyle = '#ff2e7e'; c.fillRect(px, py, pw, 7); c.restore();
    c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(px + 18, py); c.lineTo(px + pw, py); c.lineTo(px + pw - 18, py + ph); c.lineTo(px, py + ph); c.closePath(); c.stroke();
    const ph2 = st.phase;
    for (let i = 0; i < 3; i++) {
      let col = '#3a3150';
      if (ph2 === 'stage' && i === 0) col = '#ffb22a';
      if (ph2 === 'red') col = st.redLit ? '#ff3b28' : '#5a1a14';
      if (ph2 === 'race' || ph2 === 'finish') col = '#3cf07a';
      c.beginPath(); c.arc(px + 64 + i * 44, py + 46, 16, 0, TAU); inked(c, col, 3.5);
      if (col !== '#3a3150') { c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(px + 59 + i * 44, py + 41, 5, 0, TAU); c.fill(); }
    }
    c.fillStyle = '#b4a9dc'; c.font = fd(800, 16); c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(ph2 === 'stage' ? TX('race.ready') : ph2 === 'red' ? TX('hud.red') : TX('hud.green'), px + 44, py + 80, 300);
    const hx = px + 220, hw = 160;
    c.fillText(TX('hud.engine', Math.round(p.health)), hx, py + 30);
    rrect(c, hx, py + 42, hw, 14, 4); inked(c, '#2a2148', 3);
    if (p.health > 0) { rrect(c, hx + 2, py + 44, (hw - 4) * p.health / 100, 10, 3); c.fillStyle = p.health > 60 ? '#3cf07a' : p.health > 40 ? '#ffd23f' : '#ff4b3e'; c.fill(); }
    if (p.blown) { c.fillStyle = '#ff4b3e'; c.fillText(TX('race.blown'), hx, py + 80, 200); }
    else if (p.shifts.length) { const l = p.shifts[p.shifts.length - 1]; c.fillStyle = Q_COLOR[l.q]; c.fillText(TX('hud.last', Q_LABEL[l.q]), hx, py + 80, 200); }
    else if (p.launch) { c.fillStyle = Q_COLOR[p.launch.q]; c.fillText(TX('race.launch', Q_LABEL[p.launch.q]), hx, py + 80, 200); }
    c.textAlign = 'right'; c.fillStyle = '#fff6e8'; c.font = fd(900, 50);
    c.fillText((p.finished ? p.finishTime : p.time).toFixed(3), px + pw - 40, py + 50);
    c.font = fd(800, 15); c.fillStyle = '#b4a9dc'; c.fillText(TX('hud.secs', Math.round(p.v * 3.6)), px + pw - 44, py + 82);
    /* mini pista */
    const tx = px + 30, tw = pw - 70, ty = py + ph - 26;
    rrect(c, tx, ty - 5, tw, 10, 5); inked(c, '#2a2148', 3);
    for (let k = 0; k < 4; k++) { c.fillStyle = k % 2 ? '#fff6e8' : INK; c.fillRect(tx + tw - 8, ty - 9 + k * 4.5, 8, 4.5); }
    st.racers.forEach(r => {
      const f = Math.min(1, RX(r) / st.dist), me = r === p;
      c.beginPath(); c.arc(tx + f * tw, ty - (r.lane - 1.5) * 2.5, me ? 10 : 7, 0, TAU); inked(c, r.paint, me ? 3.5 : 2.5);
      if (me) { c.fillStyle = INK; c.font = fd(900, 11); c.textAlign = 'center'; c.fillText(TX('hud.you'), tx + f * tw, ty - (r.lane - 1.5) * 2.5 + 1, 26); }
    });
    if (st.leadGap) { c.fillStyle = '#b4a9dc'; c.font = fd(800, 14); c.textAlign = 'center'; c.fillText(st.leadGap, tx + tw / 2, ty + 18); }
    /* posizione */
    skewPanel(c, 1006, 22, 150, 96, 16, '#ffd23f');
    c.fillStyle = INK; c.textAlign = 'center'; c.font = fd(900, 66); c.fillText(st.pos + '°', 1081, 64);
    c.font = fd(800, 17); c.fillText(TX('hud.ofN', st.racers.length), 1076, 104);
    /* livello della nitro */
    if (typeof SIM !== 'undefined' && SIM.nitroLeft) {
      const nl = SIM.nitroLeft(p), nx = 1004, ny = 140, nw = 156;
      if (NUI && okImg(NUI.frame) && okImg(NUI.bottle) && okImg(NUI.fill)) {
        /* bombola e barra disegnate da Christian */
        const bh = 52, bw = NUI.bottle.width * bh / NUI.bottle.height; c.drawImage(NUI.bottle, nx - 6, ny - 14, bw, bh);
        const fx = nx + bw + 2, fw = nw - bw + 6, fh = NUI.frame.height * fw / NUI.frame.width, fy = ny + 10 - fh / 2, inn = NITRO_UI.inner;
        c.drawImage(NUI.frame, fx, fy, fw, fh);
        const ix = fx + inn[0] * fw, iy = fy + inn[1] * fh, iw = (inn[2] - inn[0]) * fw, ih = (inn[3] - inn[1]) * fh;
        if (nl > 0) { c.save(); if (p.nitroT > 0) c.globalAlpha = 0.65 + 0.35 * Math.abs(Math.sin(performance.now() / 60)); c.drawImage(NUI.fill, ix, iy, iw * nl, ih); c.restore(); }
      } else {
        c.textAlign = 'left'; c.font = fd(900, 15); c.fillStyle = '#5fd8ff'; c.strokeStyle = INK; c.lineWidth = 3; c.strokeText('NITRO', nx, ny + 8); c.fillText('NITRO', nx, ny + 8);
        rrect(c, nx + 50, ny, nw - 50, 16, 5); inked(c, '#1d1733', 3);
        if (nl > 0) { rrect(c, nx + 52, ny + 2, (nw - 54) * nl, 12, 4); c.fillStyle = p.nitroT > 0 ? '#e8ffff' : '#2ab8f0'; c.fill(); }
      }
    }

    /* messaggio grande */
    if (st.msg && st.msg.t > 0) {
      const a = Math.min(1, st.msg.t / 0.25), s = 1 + (1 - Math.min(1, (st.msg.d - st.msg.t) / 0.12)) * 0.3;
      c.save(); c.globalAlpha = a; c.translate(W / 2, 236); c.scale(s, s); c.rotate(-0.03);
      c.font = fd(900, 76); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.fillStyle = INK; c.fillText(st.msg.text, 4, 6);
      c.lineWidth = 12; c.strokeStyle = INK; c.strokeText(st.msg.text, 0, 0);
      c.fillStyle = st.msg.color; c.fillText(st.msg.text, 0, 0);
      if (st.msg.sub) { c.font = fd(800, 26); c.lineWidth = 7; c.strokeText(st.msg.sub, 0, 52); c.fillStyle = '#fff6e8'; c.fillText(st.msg.sub, 0, 52); }
      c.restore();
    }
  }

  /* ================= FOTOGRAMMA ================= */
  /* ragazze della gara, sul marciapiede davanti alle transenne:
     al via una arriva camminando, si ferma davanti alle auto e sventola la bandiera verde al verde;
     all'arrivo un'altra sventola la bandiera a scacchi quando arrivano le auto */
  let hostT0 = null, hostPh = null, greenT0 = null;
  function girl(ctx, im, xm, camX, h, ax) {
    if (!okImg(im)) return;
    const x = (xm - camX) * PPM, w = im.width * h / im.height; if (x < -w - 40 || x > W + w + 40) return;
    const y = ROAD_TOP + 5;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 11, 2.5, 0, 0, TAU); ctx.fill();
    ctx.drawImage(im, Math.round(x - w * ax), Math.round(y - h), w, h);
  }
  function hostess(ctx, st) {
    const now = performance.now();
    if (st.phase === 'stage' && hostPh !== 'stage') { hostT0 = now; greenT0 = null; }
    if (st.phase === 'race' && hostPh !== 'race') greenT0 = now;
    hostPh = st.phase;
    const racing = st.phase === 'stage' || st.phase === 'red' || st.phase === 'race' || st.phase === 'finish';
    if (!racing || hostT0 == null) return;
    /* partenza */
    const SPOT = 1.5;
    if (HFLAG) {
      const n = HFLAG.f.length, k = greenT0 == null ? 0 : Math.min(n - 1, Math.floor((now - greenT0) / 1000 * 13));
      girl(ctx, HFLAG.f[k], SPOT, st.camX, 112, HFLAG.ax);
    }
    /* arrivo */
    if (HFIN && st.dist) {
      const lead = Math.max.apply(null, st.racers.map(r => r.x || 0)), near = lead > st.dist - 70;
      const n = HFIN.f.length, k = near ? Math.floor(now / 1000 * 12) % n : 0;
      girl(ctx, HFIN.f[k], st.dist + 4, st.camX, 112, HFIN.ax);
    }
  }
  function frame(ctx, st) {
    drawWorld(ctx, st);
    trafficLight(ctx, st.camX, st.phase, st.redLit);
    hostess(ctx, st);
    const order = st.racers.slice().sort((a, b) => a.lane - b.lane);
    order.forEach(r => {
      const sc = PPM * laneS(r.lane) * CK, x = (RX(r) - st.camX) * PPM, y = laneY(r.lane);
      const S = SHAPES[r.car.id];
      if (x < -S.L * sc - 60 || x > W + 80) return;
      const cs = r.cosm || {};
      drawCar(ctx, r.car.id, {
        x: x, y: y, sc: sc, version: cs.version, glow: cs.glow, look: cs, wheelAng: r.rang !== undefined ? r.rang : r.wheelAng,
        brake: r.finished || r.blown, nitro: r.nitroT > 0, flame: r.nitroT > 0 ? 0.55 + 0.45 * Math.abs(Math.sin(performance.now() / 45)) : r.flameT > 0 ? Math.min(1, r.flameT / 0.4) : 0, blur: Math.min(1, r.v / 22)
      });
      if (r.blown) { ctx.fillStyle = 'rgba(70,64,80,0.6)'; ctx.beginPath(); ctx.arc(x - S.L * sc * 0.15, y - 2 * sc, 22, 0, TAU); ctx.fill(); }
      if (r === st.player && st.hud && (st.phase === 'stage' || st.phase === 'red' || r.time < 1.2)) {
        const tx = x - S.L * sc - 46, ty = y - 0.6 * sc;
        ctx.beginPath(); ctx.moveTo(tx - 30, ty - 16); ctx.lineTo(tx + 18, ty - 16); ctx.lineTo(tx + 34, ty); ctx.lineTo(tx + 18, ty + 16); ctx.lineTo(tx - 30, ty + 16); ctx.closePath(); inked(ctx, '#ffd23f', 3);
        ctx.fillStyle = INK; ctx.font = fd(900, 22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(TX('hud.you'), tx - 4, ty + 1, 46);
      }
      /* nome del pilota dietro la sua auto, prima del via e nei primi secondi */
      else if (st.hud && r.name && (st.phase === 'stage' || st.phase === 'red' || r.time < 1.6)) {
        ctx.font = fd(900, 15); const nm = r.name.toUpperCase(), tw = Math.min(150, ctx.measureText(nm).width + 18);
        const tx = x - S.L * sc - 12 - tw / 2, ty = y - 0.55 * sc;
        rrect(ctx, tx - tw / 2, ty - 12, tw, 24, 8); inked(ctx, cs.glow || '#ffffff', 2.5);
        ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(nm, tx, ty + 1, tw - 10);
      }
    });
    drawParts(ctx, st.camX);
    st.racers.forEach(r => {
      const x = (RX(r) - st.camX) * PPM;
      if (st.hud && (x < 0 || x - SHAPES[r.car.id].L * PPM * CK > W)) {
        const right = x > W, y = laneY(r.lane) - 30;
        rrect(ctx, right ? W - 104 : 10, y - 17, 94, 34, 8); inked(ctx, '#1d1733', 3);
        ctx.beginPath(); ctx.arc(right ? W - 86 : 28, y, 8, 0, TAU); inked(ctx, r.paint, 2.5);
        ctx.fillStyle = '#fff6e8'; ctx.font = fd(900, 19); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const gap = RX(r) - RX(st.player);
        ctx.fillText((gap > 0 ? '+' : '') + gap.toFixed(1) + ' m', right ? W - 50 : 64, y);
      }
    });
    /* grana della carta su tutta la scena, ferma come in un'illustrazione */
    if (!PAPER) { PAPER = mk(W, H); const pc = PAPER.getContext('2d'); pc.fillStyle = pc.createPattern(noiseTex(), 'repeat'); pc.fillRect(0, 0, W, H); }
    /* grana di carta sulla scena tolta: grafica pulita */
    if (st.hud) drawHud(ctx, st);
  }

  function carFrame(id, o) {
    const keys = CARMAP[id], sp = SP[keys[Math.min(keys.length - 1, o.version | 0)]];
    const drop = sp.v2 && o.look ? [0, 5.7, 12.8][o.look.ride | 0] || 0 : 0, k = o.sc / sp.ppm;
    return { x0: o.x - sp.front * k, y0: o.y - (sp.ground - drop) * k, k: k };
  }
  function setRS(k) { if (Math.abs(k - RS) < 0.01) return; RS = k; if (T) setScene(ENV, LIGHT); }
  return { setRS, get RS() { return RS; }, carFrame, stickerBoxes, RIMS, RIMS_SERIE: id => { const sp = SP[CARMAP[id][0]]; return sp && sp.wheels[0].img; }, W, H, PPM, CK, INK, wash, noiseTex, setScene, PAL, SHAPES, ready, versions, setLight, frame, drawCar, puff, stepParts, clearParts, laneY, laneS, Q_COLOR, Q_LABEL, shade, rrect, inked, fd, get night() { return P.night; } };
})();
