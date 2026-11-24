const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' }); const pg = await b.newPage();
await pg.goto('file://' + process.cwd() + '/dist/index.html'); await pg.waitForTimeout(1500);
const out = await pg.evaluate(() => { const res = [];
  const full = { centralina: 3, aspirazione: 3, scarico: 3, turbo: 3, rapporti: 3, frizione: 3, pneumatici: 3, peso: 3, motore: 3 };
  const mid = { centralina: 2, aspirazione: 2, scarico: 2, turbo: 2, frizione: 2, pneumatici: 2, peso: 2, motore: 2 };
  for (const base of SIM.CARS) for (const [lab, mods] of [['serie', {}], ['medio', mid], ['max', full]]) for (const dist of [402, 804]) {
    const car = SIM.buildCar(base, mods), cfg = Object.assign({}, SIM.DEFAULT_CFG, { dist });
    const r = SIM.makeRacer(car, {}); const z = SIM.launchZone(car, cfg); r.rpm = z.c; SIM.launch(r, cfg);
    let g = 0, lim6 = 0, t6 = null;
    while (!r.finished && g++ < 120 * 60) { if (r.gear < 6 && !r.slipping && r.shiftT <= 0 && r.rpm >= SIM.shiftZone(car, cfg, r.gear).c) SIM.tryShift(r, cfg); SIM.stepRace(r, SIM.DT, cfg, Math.random); if (r.gear === 6 && t6 === null) t6 = r.x; if (r.gear === 6 && r.onLimiter) lim6++; }
    res.push([base.id, lab, dist, r.finishTime.toFixed(2), Math.round(r.trap * 3.6), r.gear, Math.round(r.rpm / car.redline * 100) + '%', t6 === null ? '-' : Math.round(t6), lim6 ? 'LIMITATORE ' + (lim6 / 120).toFixed(1) + 's' : '']);
  } return res; });
console.log(out.map(r => r.join('\t')).join('\n')); await b.close(); })();
