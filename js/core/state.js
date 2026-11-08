// État : méta (persistante d'une bête à l'autre) et partie en cours (run), sauvegarde.
G.SAVE_KEY = 'derive_save_v1';
G.SAVE_V = 1;

G.state = (function () {
  function newMeta() {
    return {
      heritage: {}, memory: 0, totalMemory: 0, maxRig: 1,
      stats: { runs: 0, bestRegion: 0, triumphs: 0 },
      settings: { lore: true, rateUnit: 'min' },
      history: []
    };
  }

  // Veines : marches aléatoires depuis le cœur vers la tête, les flancs et la queue.
  function makeVeins(r, cx, heartY, maxLen, maxHW) {
    const set = {};
    const dirs = [[0, -1], [-1, 0.25], [1, 0.25], [0, 1], [r() < 0.5 ? -1 : 1, 0.8]];
    for (const [dx, dy] of dirs) {
      let x = cx, y = heartY, len = 6 + Math.floor(r() * 10);
      for (let i = 0; i < len; i++) {
        if (Math.abs(dx) > Math.abs(dy) || (dy === 0.25 || dy === 0.8)) {
          if (r() < Math.abs(dx) * 0.7) x += Math.sign(dx);
          if (r() < Math.abs(dy) * 0.7 + 0.15) y += dy > 0 ? 1 : -1;
        } else {
          y += Math.sign(dy);
          if (r() < 0.35) x += r() < 0.5 ? -1 : 1;
        }
        if (Math.abs(x - cx) > maxHW || y < 0 || y >= maxLen) break;
        set[x + ',' + y] = 1;
      }
    }
    delete set[cx + ',' + heartY];
    return Object.keys(set);
  }

  function newRun(rig) {
    const meta = G.meta, B = G.BEAST;
    const seed = Math.floor(Math.random() * 1e9);
    const r = G.util.rng(seed);
    const lvl = id => meta.heritage[id] || 0;
    const W = B.maxHW * 2 + 1, cx = B.maxHW;
    const L = B.startLen + lvl('h_echine');
    const heartY = Math.round(L * 0.45);
    const run = {
      v: G.SAVE_V, seed, time: 0, rig: rig || 0, region: 0,
      W, cx, L, heart: { x: cx, y: heartY },
      veins: makeVeins(r, cx, heartY, B.maxLen, B.maxHW),
      buildings: [], nextBid: 1, transit: [],
      deposits: [], nextDid: 1, travel: 0, stepDist: 0, spawnAcc: 0,
      route: null,
      pace: 'marche', satiete: 75, vigueur: B.vigueur, growth: 0, shakeAt: -999,
      techs: [], pacts: [], offerings: [], recits: lvl('h_contes') * 25,
      wave: { n: 0, next: G.WAVES.first, side: null, active: false, start: 0 },
      enemies: [], soldiers: [], shots: [], fx: [],
      pending: [], market: null,
      stats: { waves: 0, killed: 0, prodTotal: 0, growths: 0, built: 0 },
      ended: false
    };
    const startMult = 1 + 0.4 * lvl('h_reserves');
    const start = { bois: 90, pierre: 40, cordes: 28, fourrage: 70, vivres: 60, os: 30 };
    const store = {};
    for (const k in start) store[k] = Math.round(start[k] * startMult);
    run.buildings.push(mkBuilding(run, 'nuque', cx, 0, { store }));
    run.buildings.push(mkBuilding(run, 'tente', cx - 1, 2));
    run.route = G.route.generate(run, r);
    return run;
  }

  function mkBuilding(run, type, x, y, extra) {
    const def = G.BUILDINGS[type];
    const b = Object.assign({
      bid: run.nextBid++, type, x, y, level: 1, hp: def.hp, ruined: false,
      out: {}, inp: {}, inc: {}, trips: [], cd: 0, paused: false, prio: 1
    }, extra || {});
    if (def.store && !b.store) b.store = {};
    return b;
  }

  function save() {
    if (!G.meta || G.wiping) return;
    try {
      localStorage.setItem(G.SAVE_KEY, JSON.stringify({ v: G.SAVE_V, meta: G.meta, run: G.run, savedAt: Date.now() }));
    } catch (e) { console.warn('Sauvegarde impossible', e); }
  }

  function load() {
    try {
      const raw = localStorage.getItem(G.SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { console.warn('Lecture impossible', e); return null; }
  }

  function wipe() {
    G.wiping = true;
    try { localStorage.removeItem(G.SAVE_KEY); } catch (e) { /* rien */ }
    location.reload();
  }

  return { newMeta, newRun, mkBuilding, save, load, wipe };
})();
