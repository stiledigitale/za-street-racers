/* ============================================================
   ZA STREET RACERS · TRACCIATO "GARDESANA" (Lago di Garda)
   Dietro la strada il lago; sull'altra sponda il Monte Baldo e i
   paesi sull'acqua. In mezzo il lungolago: ringhiera, cipressi,
   ulivi, palme, barche ormeggiate, case color pastello con le
   persiane verdi. Stesso stile della città: inchiostro e acquerello.
   ============================================================ */
const GARDA = {
  tramonto: { far: '#9a6f9e', farHi: '#c98fa8', snow: '#ffd9cf', near: '#5f6f5c', nearHi: '#7f8b66', rock: '#4a4f48', woods: '#3f5a42',
    waterTop: '#f2a77a', waterBot: '#5b5f8f', shimmer: 'rgba(255,220,170,0.55)', village: ['#f0c9a0', '#e8a88c', '#f6dfb4', '#d9b3c0'], stone: '#d9c7ad', stone2: '#c7b398', iron: '#2b2833' },
  giorno: { far: '#8fa7c4', farHi: '#b8c9dc', snow: '#ffffff', near: '#6f8f5e', nearHi: '#8fae72', rock: '#7d8273', woods: '#4d7046',
    waterTop: '#8fd0e6', waterBot: '#2f7fa8', shimmer: 'rgba(255,255,255,0.65)', village: ['#f3d9a6', '#efb79a', '#fbf0d6', '#e6c2c8'], stone: '#e2d7c3', stone2: '#cfc2aa', iron: '#2b2a30' },
  notte: { far: '#2a2350', farHi: '#3a2f66', snow: '#9a92c0', near: '#1f2640', nearHi: '#2b3352', rock: '#191d33', woods: '#18203a',
    waterTop: '#2a2656', waterBot: '#0d0f26', shimmer: 'rgba(255,214,140,0.5)', village: ['#5a4a5a', '#584552', '#5e5560', '#4c4558'], stone: '#5a5466', stone2: '#4b4657', iron: '#0f0d18' }
};

function buildGarda(R) {
  const { mk, rng, shade, rrect, inked, inkStroke, setSketch, wash, palm, fd, INK, BASE, PPM, P, T, TAU, light } = R;
  const G = GARDA[light] || GARDA.tramonto;
  const r = rng(1974), TW = 2400, WL = 322;
  const per = (x, terms) => terms.reduce((s, [a, k, ph]) => s + a * Math.sin(2 * Math.PI * k * x / TW + ph), 0);
  const ridgeFar = x => 150 + per(x, [[42, 2, 1.1], [26, 3, 0.3], [16, 7, 2.2], [7, 17, 0.7], [3, 41, 1.9]]);
  const ridgeNear = x => 238 + per(x, [[24, 3, 2.0], [16, 5, 0.4], [9, 11, 1.3], [4, 29, 2.6], [2, 67, 0.2]]);

  /* ---------- sponda opposta: montagne, paesi, acqua (parallasse 18%) ---------- */
  const fa = mk(TW, 420), f = fa.getContext('2d');
  f.lineJoin = 'round';
  const ridgePath = (fn, yb) => { f.beginPath(); f.moveTo(0, yb); for (let x = 0; x <= TW; x += 6) f.lineTo(x, fn(x)); f.lineTo(TW, yb); f.closePath(); };
  /* catena lontana */
  ridgePath(ridgeFar, WL);
  let g = f.createLinearGradient(0, 90, 0, WL); g.addColorStop(0, G.farHi); g.addColorStop(1, G.far);
  f.fillStyle = g; f.fill();
  f.save(); ridgePath(ridgeFar, WL); f.clip();
  if (light !== 'notte') {
    f.fillStyle = G.snow; f.globalAlpha = 0.85;
    f.beginPath(); let first = true;
    for (let x = 0; x <= TW; x += 6) { const y = ridgeFar(x); if (y < 132) { const d = 132 - y; if (first) { f.moveTo(x, y); first = false; } f.lineTo(x, y + Math.min(14, d * 0.6) + Math.sin(x * 0.3) * 3); } else if (!first) { f.closePath(); f.fill(); f.beginPath(); first = true; } }
    if (!first) { f.closePath(); f.fill(); }
    f.globalAlpha = 1;
  }
  /* canaloni */
  f.strokeStyle = shade(G.far, -0.12); f.lineWidth = 1.2; f.globalAlpha = 0.5;
  for (let i = 0; i < 50; i++) { const x = r() * TW, y = ridgeFar(x) + 4; f.beginPath(); f.moveTo(x, y); f.quadraticCurveTo(x + (r() - 0.5) * 12, y + 10, x + (r() - 0.5) * 20, y + 12 + r() * 18); f.stroke(); }
  f.globalAlpha = 1;
  f.restore();
  /* catena vicina: Monte Baldo, rocce e boschi */
  ridgePath(ridgeNear, WL);
  g = f.createLinearGradient(0, 200, 0, WL); g.addColorStop(0, G.nearHi); g.addColorStop(1, G.near);
  f.fillStyle = g; f.fill();
  f.save(); ridgePath(ridgeNear, WL); f.clip();
  for (let i = 0; i < 160; i++) { const x = r() * TW, y = ridgeNear(x) + 4 + r() * 30; f.strokeStyle = 'rgba(30,25,30,0.25)'; f.lineWidth = 1 + r(); f.beginPath(); f.moveTo(x, y); f.lineTo(x + (r() - 0.5) * 6, y + 6 + r() * 14); f.stroke(); }
  for (let i = 0; i < 900; i++) { const x = r() * TW, y = WL - r() * r() * 70; f.fillStyle = r() < 0.5 ? G.woods : shade(G.woods, 0.15); f.beginPath(); f.arc(x, y, 2.5 + r() * 3.5, 0, TAU); f.fill(); }
  f.restore();
  ridgePath(ridgeNear, WL); setSketch(true); inkStroke(f, 2.5); setSketch(false);
  /* paesi sulla riva opposta */
  for (let v = 0; v < 6; v++) {
    let x = 120 + v * 400 + r() * 160; const n = 5 + ((r() * 6) | 0), bell = (r() * n) | 0;
    for (let k = 0; k < n; k++) {
      const w = 9 + r() * 9, h = 9 + r() * 14, col = G.village[(r() * 4) | 0];
      f.fillStyle = col; f.fillRect(x, WL - h, w, h);
      f.fillStyle = shade('#b4573e', light === 'notte' ? -0.6 : 0); f.fillRect(x - 1, WL - h - 3, w + 2, 3);
      if (light === 'notte' && r() < 0.6) { f.fillStyle = '#ffd36b'; f.fillRect(x + 2, WL - h + 3, 2, 2); f.fillRect(x + w - 4, WL - h + 3, 2, 2); }
      f.strokeStyle = 'rgba(20,17,28,0.7)'; f.lineWidth = 1; f.strokeRect(x, WL - h - 3, w, h + 3);
      if (k === bell) { f.fillStyle = col; f.fillRect(x + w, WL - 38, 6, 38); f.beginPath(); f.moveTo(x + w - 1, WL - 38); f.lineTo(x + w + 3, WL - 47); f.lineTo(x + w + 7, WL - 38); f.closePath(); f.fillStyle = shade('#b4573e', light === 'notte' ? -0.6 : 0); f.fill(); f.strokeRect(x + w, WL - 38, 6, 38); x += 7; }
      x += w + 1;
    }
  }
  /* il lago */
  g = f.createLinearGradient(0, WL, 0, 420); g.addColorStop(0, G.waterTop); g.addColorStop(1, G.waterBot);
  f.fillStyle = g; f.fillRect(0, WL, TW, 420 - WL);
  f.save(); f.globalAlpha = light === 'notte' ? 0.25 : 0.22; f.translate(0, WL * 2); f.scale(1, -1);
  ridgePath(x => WL - (WL - ridgeNear(x)) * 0.45, WL); f.fillStyle = G.near; f.fill();
  f.restore();
  f.fillStyle = 'rgba(255,255,255,0.35)'; f.fillRect(0, WL, TW, 1.5);
  for (let i = 0; i < 1400; i++) {
    const y = WL + 3 + Math.pow(r(), 1.4) * (420 - WL), t = (y - WL) / (420 - WL);
    f.fillStyle = r() < 0.6 ? G.shimmer : 'rgba(10,20,40,0.18)';
    const len = 4 + t * 22 * r();
    f.fillRect(r() * TW, y, len, 0.8 + t * 1.4);
  }
  /* barche a vela */
  for (let i = 0; i < 9; i++) {
    const x = r() * (TW - 60) + 30, y = WL + 12 + r() * 34, s = 0.7 + (y - WL) / 60;
    f.beginPath(); f.moveTo(x - 9 * s, y); f.lineTo(x + 11 * s, y); f.lineTo(x + 7 * s, y + 4 * s); f.lineTo(x - 6 * s, y + 4 * s); f.closePath(); inked(f, light === 'notte' ? '#8a86a0' : '#fffaf0', 1.2);
    f.beginPath(); f.moveTo(x, y - 1); f.lineTo(x, y - 22 * s); f.lineTo(x + 10 * s, y - 2); f.closePath(); inked(f, light === 'notte' ? '#b8b4d0' : '#ffffff', 1.2);
    if (r() < 0.6) { f.beginPath(); f.moveTo(x - 1, y - 3); f.lineTo(x - 1, y - 18 * s); f.lineTo(x - 8 * s, y - 3); f.closePath(); inked(f, ['#ff7b54', '#4fb0b3', '#f2c14e'][i % 3], 1.2); }
  }
  wash(f, TW, 420, 0.6);
  T.fa = fa;

  /* ---------- lungolago (parallasse 35%) ---------- */
  const bd = mk(TW, 420), b = bd.getContext('2d');
  b.lineJoin = 'round'; b.lineCap = 'round';
  const QT = 386; /* sommità del muro del lungolago */
  /* barche ormeggiate, metà nascoste dal muro */
  for (let i = 0; i < 7; i++) {
    const x = 80 + i * 340 + r() * 120, w = 46 + r() * 24, hull = ['#ffffff', '#2f6fb8', '#c8323c', '#3c8f50', '#f2c14e'][(r() * 5) | 0];
    const col = light === 'notte' ? shade(hull, -0.5) : hull;
    b.beginPath(); b.moveTo(x, QT - 12); b.lineTo(x + w, QT - 14); b.quadraticCurveTo(x + w + 4, QT - 4, x + w - 6, QT + 4); b.lineTo(x + 6, QT + 4); b.closePath(); inked(b, col, 2);
    b.fillStyle = shade(col, -0.3); b.fillRect(x + 4, QT - 9, w - 6, 3);
    if (r() < 0.6) { rrect(b, x + w * 0.35, QT - 24, w * 0.32, 11, 2); inked(b, light === 'notte' ? '#6a6680' : '#f4efe4', 1.6); }
    b.strokeStyle = 'rgba(20,17,28,0.6)'; b.lineWidth = 1; b.beginPath(); b.moveTo(x - 4, QT - 8); b.lineTo(x - 20, QT + 2); b.stroke();
  }
  /* muro del lungolago in pietra */
  b.fillStyle = G.stone; b.fillRect(0, QT, TW, BASE - QT);
  b.fillStyle = G.stone2; b.fillRect(0, QT, TW, 5);
  b.strokeStyle = 'rgba(20,17,28,0.35)'; b.lineWidth = 1.2;
  for (let row = 0; row < 3; row++) for (let x = (row % 2) * 18; x < TW; x += 36) { b.strokeRect(x, QT + 5 + row * 4.5, 36, 4.5); }
  b.fillStyle = INK; b.fillRect(0, QT - 1, TW, 2.5);
  /* ringhiera in ferro */
  const railY = QT - 24;
  b.strokeStyle = G.iron; b.lineWidth = 3;
  b.beginPath(); b.moveTo(0, railY); b.lineTo(TW, railY); b.moveTo(0, railY + 11); b.lineTo(TW, railY + 11); b.stroke();
  b.lineWidth = 2;
  for (let x = 6; x < TW; x += 14) { b.beginPath(); b.moveTo(x, railY); b.lineTo(x, QT); b.stroke(); }
  b.lineWidth = 3.5; for (let x = 0; x < TW; x += 84) { b.beginPath(); b.moveTo(x, railY - 4); b.lineTo(x, QT); b.stroke(); b.beginPath(); b.arc(x, railY - 6, 3, 0, TAU); b.fillStyle = G.iron; b.fill(); }

  const shadeCol = c => P.bldShade ? shade(c, P.bldShade) : c;
  function cypress(x, h) {
    const w = 11 + h * 0.07;
    b.beginPath(); b.moveTo(x, QT - 2); b.quadraticCurveTo(x - w * 1.2, QT - h * 0.45, x - 1, QT - h); b.quadraticCurveTo(x + w * 1.2, QT - h * 0.45, x, QT - 2); b.closePath();
    inked(b, shadeCol('#2f5a3a'), 2.2);
    b.strokeStyle = shadeCol('#4a7a50'); b.lineWidth = 1.5;
    for (let k = 0; k < 7; k++) { const yy = QT - h * (0.15 + k * 0.11); b.beginPath(); b.moveTo(x - w * 0.5, yy); b.quadraticCurveTo(x, yy - 6, x + w * 0.4, yy - 2); b.stroke(); }
  }
  function olive(x, h) {
    b.beginPath(); b.moveTo(x - 4, QT); b.bezierCurveTo(x - 10, QT - h * 0.25, x + 8, QT - h * 0.35, x - 2, QT - h * 0.55); b.lineTo(x + 5, QT - h * 0.55); b.bezierCurveTo(x + 14, QT - h * 0.35, x + 2, QT - h * 0.2, x + 6, QT); b.closePath();
    inked(b, shadeCol('#7a5a3c'), 2);
    const blobs = [[-26, 0.62, 22], [0, 0.78, 28], [24, 0.64, 22], [-12, 0.86, 20], [14, 0.9, 18]];
    blobs.forEach(([dx, fy, rr]) => { b.beginPath(); b.ellipse(x + dx, QT - h * fy, rr, rr * 0.72, 0, 0, TAU); inked(b, shadeCol('#8a9a6a'), 2); });
    blobs.forEach(([dx, fy, rr]) => { b.fillStyle = shadeCol('#a9b88a'); b.beginPath(); b.ellipse(x + dx - rr * 0.25, QT - h * fy - rr * 0.25, rr * 0.45, rr * 0.3, 0, 0, TAU); b.fill(); });
  }
  function oleander(x, w) {
    for (let k = 0; k < 4; k++) { b.beginPath(); b.arc(x + k * w / 4, QT - 12 - (k % 2) * 6, w / 4, 0, TAU); inked(b, shadeCol('#3f7a45'), 1.8); }
    for (let k = 0; k < 14; k++) { b.fillStyle = light === 'notte' ? '#8a4a6a' : (k % 3 ? '#ff7fae' : '#ffffff'); b.beginPath(); b.arc(x - w * 0.15 + r() * w * 1.1, QT - 10 - r() * 22, 2.4, 0, TAU); b.fill(); }
  }
  function lantern(x) {
    b.fillStyle = G.iron; b.fillRect(x - 2.5, QT - 120, 5, 120);
    b.fillRect(x - 6, QT - 8, 12, 8);
    b.beginPath(); b.moveTo(x - 9, QT - 122); b.lineTo(x + 9, QT - 122); b.lineTo(x + 6, QT - 142); b.lineTo(x - 6, QT - 142); b.closePath(); inked(b, light === 'notte' ? '#ffe39a' : '#f4efe4', 2);
    b.beginPath(); b.moveTo(x - 11, QT - 142); b.lineTo(x + 11, QT - 142); b.lineTo(x, QT - 152); b.closePath(); inked(b, G.iron, 2);
    if (light === 'notte') { const gg = b.createRadialGradient(x, QT - 132, 2, x, QT - 132, 70); gg.addColorStop(0, 'rgba(255,214,130,0.45)'); gg.addColorStop(1, 'rgba(255,214,130,0)'); b.fillStyle = gg; b.fillRect(x - 70, QT - 202, 140, 140); }
  }
  const SIGNS = ['HOTEL LIMONE', 'GELATERIA', 'BAR DEL PORTO', 'TRATTORIA', 'LIMONAIA', 'NOLEGGIO BARCHE', 'ZA SRL · DAL 1960', 'PASTICCERIA'];
  const HOUSE = ['#f2c27a', '#ef9f7e', '#f6e3b8', '#e8a7a0', '#f3d08a', '#d9b58c', '#f0b8a0'];
  let si = 0;
  function houses(x0, wTot) {
    let x = x0;
    while (x < x0 + wTot - 40) {
      const w = Math.min(x0 + wTot - x, 64 + r() * 46), floors = 2 + ((r() * 3) | 0), h = 46 + floors * 40, top = QT - h, col = shadeCol(HOUSE[(r() * HOUSE.length) | 0]);
      b.fillStyle = col; b.fillRect(x, top, w, h);
      const lg = b.createLinearGradient(0, top, 0, QT); lg.addColorStop(0, 'rgba(255,244,225,0.2)'); lg.addColorStop(1, 'rgba(60,25,20,0.2)'); b.fillStyle = lg; b.fillRect(x, top, w, h);
      b.beginPath(); b.rect(x, top, w, h); setSketch(true); inkStroke(b, 2.5); setSketch(false);
      /* tetto di coppi */
      b.beginPath(); b.moveTo(x - 6, top + 2); b.lineTo(x + w + 6, top + 2); b.lineTo(x + w + 2, top - 10); b.lineTo(x - 2, top - 10); b.closePath(); inked(b, shadeCol('#b4573e'), 2.2);
      b.strokeStyle = 'rgba(20,17,28,0.35)'; b.lineWidth = 1; for (let k = x; k < x + w; k += 7) { b.beginPath(); b.moveTo(k, top - 9); b.lineTo(k + 1, top + 1); b.stroke(); }
      /* finestre con persiane verdi aperte */
      const cols = w > 90 ? 2 : 1;
      for (let fl = 0; fl < floors; fl++) for (let c = 0; c < cols; c++) {
        const ww = 14, wh = 22, wx = x + (c + 0.5) * w / cols - ww / 2, wy = top + 16 + fl * 40;
        const lit = light === 'notte' && r() < 0.45;
        b.fillStyle = lit ? '#ffd36b' : (P.glass || '#3a74d6'); b.fillRect(wx, wy, ww, wh);
        b.strokeStyle = INK; b.lineWidth = 1.8; b.strokeRect(wx, wy, ww, wh);
        const sh = shadeCol('#3f7a4a');
        [[wx - 8, wx - 1], [wx + ww + 1, wx + ww + 8]].forEach(([a1]) => { b.fillStyle = sh; b.fillRect(a1, wy, 7, wh); b.strokeRect(a1, wy, 7, wh); b.strokeStyle = 'rgba(20,17,28,0.4)'; b.lineWidth = 1; for (let yy = wy + 3; yy < wy + wh; yy += 3) { b.beginPath(); b.moveTo(a1, yy); b.lineTo(a1 + 7, yy); b.stroke(); } b.strokeStyle = INK; b.lineWidth = 1.8; });
        if (fl > 0 && r() < 0.45) { b.fillStyle = shadeCol('#c9b79a'); b.fillRect(wx - 10, wy + wh, ww + 20, 4); b.strokeStyle = G.iron; b.lineWidth = 1.3; b.strokeRect(wx - 10, wy + wh - 9, ww + 20, 13); for (let k = wx - 8; k < wx + ww + 10; k += 4) { b.beginPath(); b.moveTo(k, wy + wh - 9); b.lineTo(k, wy + wh); b.stroke(); } }
        if (r() < 0.25) { b.fillStyle = light === 'notte' ? '#7a3a5a' : '#ff5a8a'; for (let k = 0; k < 5; k++) { b.beginPath(); b.arc(wx - 2 + k * 4.5, wy + wh + 2, 2.6, 0, TAU); b.fill(); } }
      }
      /* piano terra: portico con tenda e insegna */
      const ac = ['#c8323c', '#2b8f9a', '#e0a020', '#3c8f50'][(r() * 4) | 0];
      const ay = QT - 38;
      for (let k = 0; k * 12 < w - 6; k++) { b.fillStyle = k % 2 ? '#fff6e8' : shadeCol(ac); b.fillRect(x + 3 + k * 12, ay, Math.min(12, w - 6 - k * 12), 12); }
      b.strokeStyle = INK; b.lineWidth = 2; b.strokeRect(x + 3, ay, w - 6, 12);
      b.fillStyle = light === 'notte' ? '#3a2e2a' : '#5b4a3c'; b.fillRect(x + 8, ay + 12, w - 16, 26 - 0);
      if (w > 70 && r() < 0.7) {
        const text = SIGNS[si++ % SIGNS.length];
        b.font = fd(900, 11); b.textAlign = 'center'; b.textBaseline = 'middle';
        rrect(b, x + 6, ay - 18, w - 12, 15, 3); inked(b, light === 'notte' ? shade(ac, -0.2) : '#fff6e8', 1.8);
        if (light === 'notte') { b.save(); b.shadowColor = ac; b.shadowBlur = 14; }
        b.fillStyle = light === 'notte' ? '#fff3c8' : INK; b.fillText(text, x + w / 2, ay - 10, w - 18);
        if (light === 'notte') b.restore();
      }
      x += w;
    }
    return x;
  }

  /* sequenza del lungolago */
  let x = 20;
  while (x < TW - 60) {
    const k = r();
    if (k < 0.22 && x < TW - 300) { x = houses(x, 180 + r() * 120) + 18; continue; }
    if (k < 0.42) { cypress(x + 14, 110 + r() * 60); if (r() < 0.6) cypress(x + 34, 90 + r() * 50); x += 60; }
    else if (k < 0.6) { olive(x + 34, 96 + r() * 30); x += 80; }
    else if (k < 0.72) { R.palm(b, x + 30, QT, 150 + r() * 50, r); x += 70; }
    else if (k < 0.86) { oleander(x, 46); x += 60; }
    else { lantern(x + 10); x += 40; }
    x += r() * 30;
  }
  setSketch(false);
  wash(b, TW, 420, 0.85);
  T.bd = bd;

  /* ---------- muretto in pietra al posto del new jersey ---------- */
  T.blk = [0, 1].map(i => {
    const bw = 3 * PPM, cv = mk(bw + 6, 30), c = cv.getContext('2d'), rr = rng(31 + i);
    c.fillStyle = i ? G.stone2 : G.stone; c.fillRect(1, 5, bw + 2, 24);
    c.fillStyle = shade(i ? G.stone2 : G.stone, 0.12); c.fillRect(0, 2, bw + 4, 6);
    c.strokeStyle = 'rgba(20,17,28,0.45)'; c.lineWidth = 1.2;
    let yy = 8; while (yy < 28) { let xx = 1 + rr() * 6; const hh = 6 + rr() * 4; while (xx < bw) { const ww = 12 + rr() * 16; c.strokeRect(xx, yy, Math.min(ww, bw + 2 - xx), Math.min(hh, 28 - yy)); xx += ww; } yy += hh; }
    wash(c, cv.width, cv.height, 1);
    c.beginPath(); c.rect(1, 2, bw + 2, 26); inkStroke(c, 2.5);
    return cv;
  });

  /* ---------- primo piano: oleandri al posto dei ciuffi d'erba ---------- */
  const fg = mk(T.fg.width, T.fg.height), c = fg.getContext('2d'), FH = fg.height;
  c.drawImage(T.fg, 0, 0);
  for (let i = 0; i < 6; i++) {
    const xx = 20 + i * 85 + r() * 30, w = 40 + r() * 20;
    for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(xx + k * w / 4, FH - 4 - (k % 2) * 5, w / 4, Math.PI, 0); c.closePath(); inked(c, shadeCol('#3f7a45'), 1.8); }
    for (let k = 0; k < 10; k++) { c.fillStyle = light === 'notte' ? '#8a4a6a' : (k % 3 ? '#ff7fae' : '#ffffff'); c.beginPath(); c.arc(xx - 6 + r() * w, FH - 6 - r() * 16, 2.3, 0, TAU); c.fill(); }
  }
  T.fg = fg;
  T.glint = true;
}
