// Joueur automatique : mode Bot (il joue la partie en cours) et simulations éclair BOT(secondes, options).
G.bot = (function () {
  let acc = 0;
  const api = { active: false };

  function has(t) { return G.logic.count(t); }
  function flow(r) { const f = G.flow[r] || { p: 0, c: 0 }; return f.p - f.c; }

  function freeTiles(filter) {
    const run = G.run, out = [];
    for (let y = 0; y < run.L; y++) {
      const h = G.beast.hw(y);
      for (let x = run.cx - h; x <= run.cx + h; x++) if (filter(x, y)) out.push({ x, y });
    }
    return out;
  }

  function place(type) {
    const run = G.run, d = G.BUILDINGS[type];
    if (!G.logic.unlocked(type) || !G.logistics.canPay(G.logic.buildCost(type))) return false;
    let tiles = freeTiles((x, y) => !G.logic.placeError(type, x, y));
    if (!tiles.length) return false;
    const nq = { x: run.cx, y: 0 };
    let score;
    if (d.flank) {
      // Les rangées les plus larges d'abord ; alterner les côtés.
      const left = run.buildings.filter(b => (G.BUILDINGS[b.type].harvest || G.BUILDINGS[b.type].harpoon) && b.x < run.cx).length;
      const right = run.buildings.filter(b => (G.BUILDINGS[b.type].harvest || G.BUILDINGS[b.type].harpoon) && b.x > run.cx).length;
      const pref = left <= right ? -1 : 1;
      score = t => G.beast.hw(t.y) * 10 + (Math.sign(t.x - run.cx) === pref ? 5 : 0) - Math.abs(t.y - run.L * 0.45) * 0.3;
    } else if (d.tower) {
      score = t => (G.beast.isSpine(t.x, t.y) ? 8 : 0) - Math.abs(t.y - run.L * 0.6) * 0.5 - (G.beast.isFlank(t.x, t.y) ? 20 : 0) + Math.random();
    } else {
      score = t => (G.beast.isVein(t.x, t.y) && d.recipe ? 6 : 0) - (G.beast.isFlank(t.x, t.y) ? 30 : 0) - Math.hypot(t.x - nq.x, t.y - nq.y) * 0.6;
    }
    tiles.sort((a, b) => score(b) - score(a));
    const t = tiles[0];
    return G.logic.build(type, t.x, t.y).ok;
  }

  function decide() {
    const run = G.run;
    if (!run || run.ended) return;
    // Choix en attente
    while (run.pending.length) {
      const p = run.pending[0];
      if (p.kind === 'event') {
        const ev = G.EVENTS_BY[p.id];
        let idx = ev.choices.findIndex(c => c.cost && G.chronicle.canChoose(c) && !c.fx.gamble);
        if (idx < 0) idx = ev.choices.findIndex(c => G.chronicle.canChoose(c));
        G.logic.choosePending(idx);
        if (G.ui && G.ui.state.modal === 'pending') G.ui.closeModal();
        continue;
      }
      const prefer = ['p_paslourd', 'p_bras', 'p_contes', 'p_porteurs', 'p_moisson', 'o_recolte', 'o_vigueur', 'o_croit', 'o_recits'];
      let i = p.options.findIndex(o => prefer.includes(o));
      G.logic.choosePending(Math.max(0, i));
      if (G.ui && G.ui.state.modal === 'pending') G.ui.closeModal();
    }
    // Allure
    const fourrage = run.res.fourrage || 0;
    if (run.satiete < 15 && fourrage < 10) G.logic.setPace('halte');
    else if (G.route.atPass(run) && G.logic.passMissing().length > 1) G.logic.setPace('marche');
    else if (run.satiete > 50) G.logic.setPace('marche');
    // S'ébrouer quand le dos grouille
    const onBack = run.enemies.filter(e => G.beast.inBack(Math.floor(e.x), Math.floor(e.y))).length;
    if (onBack >= 3 && G.beast.canShake()) G.beast.shake();
    // Pause des ateliers dont toutes les sorties débordent (libère leurs intrants)
    for (const b of run.buildings) {
      const d = G.BUILDINGS[b.type];
      if (!d.recipe) continue;
      const outs = Object.keys(d.recipe.out).filter(r => !G.RESOURCES[r].abstract);
      if (!outs.length) continue;
      if (outs.every(r => (run.res[r] || 0) > 250)) b.paused = true;
      else if (outs.some(r => (run.res[r] || 0) < 120)) b.paused = false;
    }
    // Réparations
    for (const b of run.buildings) if (b.ruined) G.logic.repair(b);
    // Passe
    if (!G.logic.passMissing().length) { G.logic.crossPass(); return; }
    // Recherche
    const ready = Object.keys(G.TECHS).filter(id => G.logic.techState(id) === 'ready');
    if (ready.length) {
      const key = ready.find(id => G.TECHS[id].key);
      G.logic.research(key || ready.sort((a, b) => G.TECHS[a].cost - G.TECHS[b].cost)[0]);
    } else if (G.logic.infOpen() && !Object.keys(G.TECHS).some(id => G.logic.techState(id) === 'poor')) {
      const inf = Object.keys(G.INFINITE).filter(id => !G.INFINITE[id].waves || G.defense.wavesOn()).sort((a, b) => G.logic.infCost(a) - G.logic.infCost(b))[0];
      G.logic.buyInf(inf);
    }
    // Construction : une ou deux actions par décision.
    const reg = run.region, wf = run._wf;
    const need = [];
    const flankSlots = freeTiles((x, y) => G.beast.isFlank(x, y) && !G.economy.at(x, y)).length;
    if (wf < 0.95 && (run.res.vivres || 0) > 10) need.push('tente');
    if (flow('vivres') < 0.02 && has('fumoir') < 2 + reg * 2) need.push('fumoir');
    if (has('grue') < Math.min(3 + reg * 3 + Math.floor(run.L / 3), 20) && flankSlots > 1) need.push('grue');
    if (has('harpon') < 1 + Math.floor(run.L / 7) + reg && flankSlots > 0) need.push('harpon');
    if (has('corderie') < 1 + (flow('cordes') < 0 ? 1 : 0) + reg) need.push('corderie');
    if (has('conteur') < 1 + reg + (run.L > 15 ? 1 : 0)) need.push('conteur');
    if (has('grenier') < (run.buildings.length > 12 ? 1 : 0) + (run.buildings.length > 28 ? 1 : 0)) need.push('grenier');
    if (has('depeceur') < 1 + reg) need.push('depeceur');
    if (has('atelier') < 1 + reg * 2) need.push('atelier');
    if (reg >= 1) { if (has('lanternier') < 2) need.push('lanternier'); if (has('forge') < 2) need.push('forge'); }
    if (G.defense.wavesOn()) {
      if (has('lanceur') < 2 + Math.floor(run.wave.n / 2)) need.push('lanceur');
      if (has('epouilleurs') < 1 + reg) need.push('epouilleurs');
      if (reg >= 1 && has('baliste') < 2 + Math.floor(run.wave.n / 4)) need.push('baliste');
    }
    let built = 0;
    for (const t of need) { if (built >= 2) break; if (place(t)) built++; }
    // Niveaux quand on est riche
    if (!built) {
      const order = ['grue', 'harpon', 'fumoir', 'corderie', 'conteur', 'atelier', 'depeceur', 'tente', 'lanternier', 'forge', 'lanceur'];
      for (const t of order) {
        const b = run.buildings.filter(x => x.type === t && !G.logic.levelError(x)).sort((a, z) => a.level - z.level)[0];
        if (!b) continue;
        const c = G.logic.levelCost(b), dbl = {};
        for (const r in c) dbl[r] = c[r] * 2;
        if (G.logistics.canPay(dbl)) { G.logic.levelUp(b); break; }
      }
    }
  }

  api.tick = function (dt) {
    if (!api.active) return;
    acc += dt;
    if (acc >= 2) { acc = 0; decide(); }
  };
  api.start = function () { api.active = true; G.ui && G.ui.toast('Mode Bot : le bot joue.', 'good'); };
  api.stop = function () { api.active = false; };
  api.decide = decide;

  // Simulation éclair : ne touche pas à la sauvegarde du joueur.
  window.BOT = function (seconds, opts) {
    opts = opts || {};
    const raw = localStorage.getItem(G.SAVE_KEY);
    const keepMeta = JSON.parse(JSON.stringify(G.meta)), keepRun = G.run;
    G.botSim = true;
    const log = [];
    try {
      G.logic.newGame(opts.rig || 0);
      G.run.botRun = true;
      let lastReg = 0, lastL = G.run.L, lastLayer = 0, t = 0;
      while (t < seconds && !G.run.ended) {
        for (let k = 0; k < 4; k++) G.defense.update(0.05);
        G.economy.tick(0.2);
        t += 0.2;
        if (Math.round(t * 5) % 10 === 0) decide();
        const run = G.run;
        if (run.route.l !== lastLayer) { lastLayer = run.route.l; log.push(Math.round(t) + 's étape ' + run.route.l + ' : ' + G.NODES[G.route.current(run).type].name); }
        if (run.region !== lastReg) { lastReg = run.region; log.push(Math.round(t) + 's ★ région ' + G.REGIONS[run.region].name); }
        if (run.L !== lastL && run.L % 3 === 0) { log.push(Math.round(t) + 's vertèbres ' + run.L); }
        lastL = run.L;
      }
      const run = G.run;
      log.push('FIN ' + Math.round(t) + 's · ' + (run.ended ? run.endReason : 'en cours') + ' · région ' + run.region + ' · L ' + run.L +
        ' · bâtiments ' + run.buildings.length + ' · vagues ' + run.stats.waves + ' · vigueur ' + Math.round(run.vigueur) + ' · récits ' + Math.round(run.recits) +
        ' · techs ' + run.techs.length);
      log.push('Stocks : ' + G.RES_ORDER.map(r => r + ' ' + Math.round(run.res[r] || 0)).join(', '));
      log.push('Passe manque : ' + G.logic.passMissing().join(' | '));
    } finally {
      G.botSim = false;
      G.meta = keepMeta; G.run = keepRun;
      if (raw) localStorage.setItem(G.SAVE_KEY, raw);
      G.mods.compute(); G.economy.rebuildGrid();
    }
    return log.join('\n');
  };

  return api;
})();
